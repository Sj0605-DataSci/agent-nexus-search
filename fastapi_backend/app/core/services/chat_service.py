from typing import Dict, Any, List, Union
from langsmith import Client
from app.core.services.agent.graph import graph
from app.core.services.agent.graph_2 import graph_2
from langchain_core.messages import HumanMessage, AIMessage
import uuid
import json
from app.core.services.credit_service import CreditService
from app.core.utils.llm_utils import GroqChatModel
from app.core.services.agent.prompts import query_title_system_instruction
from app.models.schemas import TitleAndIntentGeneratorOutput
from app.core.structured_logger import get_structured_logger
from app.core.profiling import profile_async, AsyncTimer
from app.core.services.email_service import email_service
from app.core.services.pdf_service import pdf_service
from pathlib import Path
from app.core.utils.cache import (
    invalidate_chat_threads_cache, invalidate_chat_messages_cache
)
from app.db.redis_client import redis_client
# from app.core.utils.maxim_logger import maxim_langchain_tracer, max_logger
# from maxim.decorators import trace, current_trace

logger = get_structured_logger(__name__)
langsmithclient = Client(api_key="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")
# trace=current_trace()
# print(trace)

class ChatService:
    """Service for handling agent template operations"""
    
    _instance = None
    _initialized = False
    
    def __new__(cls, client=None):
        """Singleton pattern implementation"""
        if cls._instance is None:
            cls._instance = super(ChatService, cls).__new__(cls)
        return cls._instance
    
    def __init__(self, client=None):
        """Initialize the service with a Supabase client if provided"""
        # Only initialize once
        if not self._initialized and client is not None:
            self.client = client
            self._initialized = True
        # If client is provided and we're already initialized, update the client
        elif client is not None:
            self.client = client
    
    async def get_initial_stream_events(self, request_id: str) -> List[Dict[str, Any]]:
        """
        Retrieve initial stream events for late-connecting clients
        
        Args:
            request_id: The unique request ID for the stream
            
        Returns:
            List of initial events in order
        """
        try:
            redis_client_instance = await redis_client.get_client()
            
            # Get events from Redis sorted set
            events_data = await redis_client_instance.zrange(
                f"stream:{request_id}:events", 
                0, -1, 
                withscores=False
            )
            
            # Parse JSON events
            events = []
            for event_json in events_data:
                try:
                    event = json.loads(event_json)
                    events.append(event)
                except json.JSONDecodeError:
                    logger.warning("Failed to parse stream event", 
                                  request_id=request_id,
                                  event_data=event_json)
                    continue
            
            logger.info("Retrieved initial stream events",
                       request_id=request_id,
                       events_count=len(events))
            
            return events
            
        except Exception as e:
            logger.error("Failed to retrieve initial stream events",
                        request_id=request_id,
                        error=str(e))
            return []

    @profile_async("chat_service.get_agent_config")
    async def get_agent_config(self, user_id: str, agent_id: str) -> Dict[str, Any]:
        """
        Fetch agent configuration from Supabase
        """
        try:
            # Query Supabase for agent configuration
            logger.log_database_operation("select", "hired_agents",
                                         user_id=user_id,
                                         agent_id=agent_id)
            
            # Try with the regular query first
            async with AsyncTimer("supabase.select.hired_agents.config"):
                response = await self.client.table("hired_agents").select("*").eq("id", agent_id).eq("user_id", user_id).execute()
            
            # Log the raw response for debugging
            logger.debug("Supabase query response received",
                        response_count=len(response.data) if response.data else 0,
                        user_id=user_id,
                        agent_id=agent_id)
            
            # If no results, try with simpler queries to debug
            if not response.data:
                logger.info("Trying with simplified queries")
                try:
                    # Try querying just by ID to see if the record exists at all
                    id_only_response = await self.client.table("hired_agents").select("*").eq("id", agent_id).execute()
                    logger.info(f"ID-only query response: {id_only_response.data}")
                    
                    # Try querying just by user_id to see if any records exist for this user
                    user_only_response = await self.client.table("hired_agents").select("*").eq("user_id", user_id).execute()
                    logger.info(f"User-only query response: {user_only_response.data}")
                    
                    # Get all records to see what's in the table
                    all_records = await self.client.table("hired_agents").select("*").limit(5).execute()
                    logger.info(f"Sample records in hired_agents: {all_records.data}")
                except Exception as e:
                    logger.error(f"Error in simplified queries: {str(e)}")
            
            
            if not response.data:
                logger.warning("No agent found for user",
                              user_id=user_id,
                              agent_id=agent_id,
                              table="hired_agents")
                # Return a default config instead of empty dict to avoid errors
                return {
                    "id": agent_id,
                    "user_id": user_id,
                    "name": "Research Assistant",
                    "personality": "helpful",
                    "tone": "professional",
                    "response_length": "medium",
                    "expertise": "research",
                    "number_of_results_returned": 5,
                    "max_research_loops": 3,
                    "initial_search_query_count": 3,
                    "can_hire_unhire": True
                }
            
            return response.data[0]
        except Exception as e:
            logger.error(f"Error fetching agent config: {str(e)}")
            raise
    
    async def chat(self, user_id: str, agent_id: str, messages: Union[str, List[Dict[str, Any]]], format: str = "table", search_mode: str = "basic", world_connections: str = "world") -> 'ChatResponse':
        """
        Chat with the research agent
        
        Args:
            user_id: User ID
            agent_id: Agent ID
            messages: List of messages in the conversation
            
        Returns:
            Formatted ChatResponse object
        """
        try:
            # Fetch agent configuration
            agent_config = await self.get_agent_config(user_id, agent_id)
            
            # Convert string messages to HumanMessage objects if needed
            formatted_messages = []
            if isinstance(messages, str):
                formatted_messages = [HumanMessage(content=messages)]
            elif isinstance(messages, list):
                # If it's already a list of BaseMessage objects, use as is
                if messages and hasattr(messages[0], 'content'):
                    formatted_messages = messages
                # Otherwise convert dict messages to BaseMessage objects
                else:
                    for msg in messages:
                        if isinstance(msg, dict) and 'content' in msg:
                            role = msg.get('role', 'human').lower()
                            if role == 'assistant':
                                formatted_messages.append(AIMessage(content=msg['content']))
                            else:
                                formatted_messages.append(HumanMessage(content=msg['content']))
            
            # Create initial state with agent configuration
            initial_state = {
                "messages": formatted_messages,
                "agent_config": agent_config,
                "research_loop_count": 0,
                "web_research_result": [],
                "sources_gathered": [],
                "search_query": [],
                "number_of_results_returned":1,
                "format": format,
                "search_mode": search_mode,
                "world_connections": world_connections
            }
            
            # Execute the graph
            result = await graph.ainvoke(initial_state)
            
            # Format and return the response
            return self._format_chat_response(result)
        except Exception as e:
            logger.error(f"Error in research agent chat: {str(e)}")
            raise
    
    # @traceable(project_name="Discoverminds",name="stream_chat")
    # @trace(name="stream_chat",logger=max_logger)
    async def stream_chat(self, user_id: str, agent_id: str, messages: Union[str, List[Dict[str, Any]]], format: str = "table", search_mode: str = "basic", world_connections: str = "world", thread_id: str = "", device_id: str = "", device_type: str = "", client_ip: str = ""):
        """
        Stream chat with the research agent using LangGraph's streaming capabilities
        
        Args:
            user_id: User ID
            agent_id: Agent ID
            messages: List of messages in the conversation
            
        Returns:
            Async generator yielding streaming updates
        """
        try:
            # Capture the Weave operation ID
                # Check if user can perform this search
            credit_service = CreditService(client=self.client)
            # run_tree = get_current_run_tree()
            # if run_tree:
            #     workspace_id = settings.LANGSMITH_WORKSPACE_ID
            #     project_id=settings.LANGSMITH_PROJ_ID  # fetch from LangSmith API

            #     run_url =""
                    
            limit_check = await credit_service.check_search_limit(user_id, search_mode=search_mode)
            # trace_id = current_trace()
                    
            if not limit_check.get("can_search", False):
                        # User cannot perform search, yield error and return
                error_msg = limit_check.get("error", "Search limit reached")
                        
                yield {
                    "type": "error",
                    "content": {
                        "message": f"❌ {error_msg}",
                        "tier": limit_check.get("tier", "unknown"),
                        "credits_available": limit_check.get("credits_available", 0),
                        "credits_needed": limit_check.get("credits_needed", 0),
                        "search_mode": search_mode
                    }
                }
                return

            weave_url = ""
            
            # Fetch agent configuration
            agent_config = await self.get_agent_config(user_id, agent_id)
            
            # Log agent config for debugging
            logger.info("Agent config retrieved",
                       user_id=user_id,
                       agent_id=agent_id,
                       agent_name=agent_config.get('name', 'Unknown'),
                       has_number_of_results=('number_of_results_returned' in agent_config),
                       number_of_results_returned=agent_config.get('number_of_results_returned', 'Missing'))
            
            # Get the latest user message for intent classification and title generation
            latest_message = ""
            if isinstance(messages, str):
                latest_message = messages
            elif isinstance(messages, list) and messages:
                last_message = messages[-1]
                if isinstance(last_message, dict):
                    latest_message = last_message.get("content", "")
                else:
                    latest_message = last_message.content if hasattr(last_message, "content") else ""
                
            # Generate thread_id if needed (before any database operations)
            if thread_id == "new":
                thread_id = str(uuid.uuid4())
            
            # Generate trace_id early (before any LLM calls)
            trace_id = f"chat:{thread_id}:msg:{uuid.uuid4()}"
            weave_url = trace_id
            # Metadata for title/intent generation LLM call
            title_metadata = {
                "_user": user_id,
                "agent_id": agent_id,
                "chat_thread_id": thread_id,
                "node_name": "title_intent_generator",
                "node_number": "0",  # Pre-graph node
                "query": latest_message[:200]
            }
                
            llm = GroqChatModel(
                model="meta-llama/llama-4-maverick-17b-128e-instruct", 
                temperature=0,
                system_instruction=query_title_system_instruction,
                trace_id=trace_id,
                metadata=title_metadata
            )
            response_title, usage_metadata = await llm.with_structured_output(schema_type=TitleAndIntentGeneratorOutput, prompt=latest_message)
            title = response_title.title
            intent = response_title.intent
            direct_answer_response = response_title.direct_answer_response
            print("Title:", title)
            print("Intent:", intent)
            print("Direct Answer Response:", direct_answer_response)
                
            # Create the thread in the database
            # Check if thread already exists
            existing_thread = await self.client.table("chat_threads").select("id").eq("id", thread_id).execute()
            
            if not existing_thread.data:
                # Thread doesn't exist, create it
                await self.client.table("chat_threads").insert({
                    "user_id": user_id, 
                    "id": thread_id,
                    "title": title,
                    "weave_url": weave_url,
                    "device_id": device_id,
                    "device_type": device_type,
                    "client_ip": client_ip
                }).execute()
                
                logger.info("Created new chat thread",
                           user_id=user_id,
                           agent_id=agent_id,
                           chat_thread_id=thread_id,
                           device_id=device_id,
                           device_type=device_type,
                           client_ip=client_ip,
                           title=title)
                
                # Invalidate chat threads cache for this user
                invalidate_chat_threads_cache(user_id)
            else:
                # Thread exists, update it if needed
                await self.client.table("chat_threads").update({
                    "title": title,
                    "weave_url": weave_url,
                    "device_id": device_id,
                    "device_type": device_type,
                    "client_ip": client_ip
                }).eq("id", thread_id).execute()
                
                logger.info("Updated existing chat thread",
                           user_id=user_id,
                           agent_id=agent_id,
                           chat_thread_id=thread_id,
                           title=title)
                
                # Invalidate chat threads cache for this user
                invalidate_chat_threads_cache(user_id)
                
            # Initialize message_id variable
            message_id = ""
            
            # trace_id already generated above (before title/intent LLM call)
            
            # Record the message in the database
            try:
                response = await self.client.table("chat_messages").insert({
                    "user_id": user_id, 
                    "agent_id": agent_id, 
                    "chat_thread_id": thread_id, 
                    "sub_queries": "", 
                    "main_query": latest_message,
                    "message": direct_answer_response,
                    "weave_url": weave_url,
                    "format": format,
                    "search_mode":search_mode,
                    "world_connections":world_connections,
                    "device_id": device_id,
                    "device_type": device_type,
                    "client_ip": client_ip
                }).execute()
                
                # Extract the message ID from the response
                if response and response.data and len(response.data) > 0:
                    message_id = response.data[0].get("id")
                    
                    # Invalidate chat messages cache for this thread
                    invalidate_chat_messages_cache(thread_id)
                    
                    # Log token usage
                    input_tokens = usage_metadata.get("input_tokens") or usage_metadata["input_tokens"]
                    output_tokens = usage_metadata.get("output_tokens") or usage_metadata["output_tokens"]
                    
                    cost_dollar = (input_tokens/1000000) * 0.15 + (output_tokens/1000000) * 0.60
                    cost_rupees = cost_dollar * 85.86
                    await self.client.table("chat_costs").insert({
                        "user_id": user_id, 
                        "agent_id": agent_id, 
                        "chat_thread_id": thread_id,
                        "message_id": message_id,
                        "model": "gemini-2.5-flash",
                        "node": "title_intent_direct_response_generator",
                        "model_input_tokens": float(input_tokens), 
                        "model_output_tokens": float(output_tokens), 
                        "model_cost_dollar": float(cost_dollar),
                        "model_cost_rupees": float(cost_rupees),
                        "weave_url": weave_url,
                    }).execute()
            except Exception as e:
                logger.error(f"Error recording message: {e}",
                            user_id=user_id,
                            agent_id=agent_id,
                            chat_thread_id=thread_id)
            
            # Send guaranteed initial events for ALL intents (both direct_answer and search)
            thinking_event = {
                "type": "thinking",
                "content": {"message": "Thinking..."}
            }
            yield thinking_event
            
            thread_id_event = {
                "type": "thread_id", 
                "content": {"thread_id": thread_id}
            }
            yield thread_id_event
            
            # Convert string messages to HumanMessage objects if needed
            formatted_messages = []
            if isinstance(messages, str):
                formatted_messages = [HumanMessage(content=messages)]
            elif isinstance(messages, list):
                # If it's already a list of BaseMessage objects, use as is
                if messages and hasattr(messages[0], 'content'):
                    formatted_messages = messages
                # Otherwise convert dict messages to BaseMessage objects
                else:
                    for msg in messages:
                        if isinstance(msg, dict) and 'content' in msg:
                            role = msg.get('role', 'human').lower()
                            if role == 'assistant':
                                formatted_messages.append(AIMessage(content=msg['content']))
                            else:
                                formatted_messages.append(HumanMessage(content=msg['content']))
            
            # If intent is direct_answer, generate a direct response without search
            if intent == "direct_answer":
                
                # Consume credits for direct answer (similar to search but different mode)
                consumption_result = await credit_service.consume_search_credits(
                    user_id=user_id,
                    search_mode=search_mode,
                    thread_id=thread_id,
                    message_id=message_id,
                    query=latest_message
                )
                
                if not consumption_result.get("success", False):
                    # Failed to consume credits
                    yield {
                        "type": "error",
                        "content": {
                            "message": f"❌ Failed to process direct answer: {consumption_result.get('error', 'Unknown error')}",
                            "search_mode": search_mode
                        }
                    }
                    return
                
                # Stream the direct answer to the client
                yield {
                    "type": "token",
                    "content": direct_answer_response,
                    "node": "direct_answer",
                    "tags": []
                    }
                
                # Get updated user subscription for final credit info
                user_subscription = await credit_service.get_user_subscription_optimized(user_id)
                credit_info = {
                    "credits_remaining": user_subscription.credits if user_subscription else 0,
                    "tier": user_subscription.tier if user_subscription else "free",
                    "credits_used": consumption_result.get("credits_used", 0),
                    "search_mode": search_mode
                }
                
                # Send completion signal
                yield {
                    "type": "done",
                    "content": {
                        "message": "Chat response complete",
                        "message_id": message_id,
                        "query": latest_message,
                        "user_id": user_id,
                        "agent_id": agent_id,
                        "chat_thread_id": thread_id,
                        "credit_info": credit_info
                    }
                }
            elif intent == "search":
                # Initial events already sent above for all intents
                
                # Create initial state based on search mode and world connections
                if search_mode == "basic" and world_connections == "world":
                    initial_state = {
                        "messages": formatted_messages,
                        "agent_config": agent_config,
                        "current_message_id": message_id,
                        "user_id": user_id,
                        "weave_url": weave_url,
                        "initial_search_query_count": 3,
                        "research_loop_count": 0,
                        "max_research_loops": 0,
                        "chat_thread_id": thread_id,
                        "web_research_result": [],
                        "sources_gathered": [],
                        "search_query": [],
                        "number_of_results_returned":5,
                        "format": format,
                        "world_connections": world_connections,
                        "sql_queries": [],
                        "intent": intent  # Add the classified intent to the initial state
                    }
                elif search_mode == "basic" and world_connections == "connections":
                    initial_state = {
                        "messages": formatted_messages,
                        "agent_config": agent_config,
                        "current_message_id": message_id,
                        "user_id": user_id,
                        "weave_url": weave_url,
                        "initial_search_query_count": 3,
                        "research_loop_count": 0,
                        "max_research_loops": 0,
                        "chat_thread_id": thread_id,
                        "web_research_result": [],
                        "sources_gathered": [],
                        "search_query": [],
                        "number_of_results_returned":5,
                        "format": format,
                        "world_connections": world_connections,
                        "sql_queries": [],
                        "intent": intent  # Add the classified intent to the initial state
                    }
                elif search_mode == "deep" and world_connections == "world":
                    initial_state = {
                        "messages": formatted_messages,
                        "agent_config": agent_config,
                        "current_message_id": message_id,
                        "user_id": user_id,
                        "weave_url": weave_url,
                        "initial_search_query_count": agent_config["initial_search_query_count"],
                        "research_loop_count": 0,
                        "max_research_loops": agent_config["max_research_loops"],
                        "chat_thread_id": thread_id,
                        "web_research_result": [],
                        "sources_gathered": [],
                        "search_query": [],
                        "number_of_results_returned":agent_config["number_of_results_returned"],
                        "format": format,
                        "world_connections": world_connections,
                        "sql_queries": [],
                        "intent": intent  # Add the classified intent to the initial state
                    }
                elif search_mode == "deep" and world_connections == "connections":
                    initial_state = {
                        "messages": formatted_messages,
                        "agent_config": agent_config,
                        "current_message_id": message_id,
                        "user_id": user_id,
                        "weave_url": weave_url,
                        "initial_search_query_count": agent_config["initial_search_query_count"],
                        "research_loop_count": 0,
                        "max_research_loops": agent_config["max_research_loops"],
                        "chat_thread_id": thread_id,
                        "web_research_result": [],
                        "sources_gathered": [],
                        "search_query": [],
                        "number_of_results_returned":agent_config["number_of_results_returned"],
                        "format": format,
                        "world_connections": world_connections,
                        "sql_queries": [],
                        "intent": intent  # Add the classified intent to the initial state
                    }
                else:
                    raise ValueError(f"Invalid search mode: {search_mode}")
            
                # Check credits and limits before starting search (only for search intent)
                if intent == "search":
                    # Consume credits for the search
                    consumption_result = await credit_service.consume_search_credits(
                        user_id=user_id,
                        search_mode=search_mode,
                        thread_id=thread_id,
                        message_id=message_id,
                        query=latest_message
                    )
                    
                    if not consumption_result.get("success", False):
                        # Failed to consume credits
                        yield {
                            "type": "error",
                            "content": {
                                "message": f"❌ Failed to process search: {consumption_result.get('error', 'Unknown error')}",
                                "search_mode": search_mode
                            }
                        }
                        return
                    
                    # Yield credit consumption info
                    yield {
                        "type": "credit_info",
                        "content": {
                            "message": f"🔍 Starting {search_mode} search (Cost: {consumption_result.get('credits_used', 0)} credits)",
                            "credits_used": consumption_result.get("credits_used", 0),
                            "remaining_credits": consumption_result.get("remaining_credits", 0),
                            "search_mode": search_mode
                        }
                    }
                    
                    # Stream the graph execution
                    # async for chunk in graph_2.astream(initial_state, stream_mode=["messages", "updates"], config={"callbacks": [maxim_langchain_tracer], "trace_id": trace_id}):
                    async for chunk in graph_2.astream(initial_state, stream_mode=["messages", "updates"]):
                        chunk_type, chunk_data = chunk
                        
                        # Handle different types of streaming chunks
                        if chunk_type == "messages":
                            # This is a token from an LLM
                            message_chunk, metadata = chunk_data
                            if metadata.get("langgraph_node") == "finalize_sql_answer":
                                if message_chunk.content:
                                    yield {
                                        "type": "token",
                                        "content": message_chunk.content,
                                        "node": metadata.get("langgraph_node"),
                                        "tags": metadata.get("tags", [])
                                    }
                        
                        elif chunk_type == "updates":
                            # This is a state update from a node
                            node_name = list(chunk_data.keys())[0] if chunk_data else "unknown"
                            node_data = chunk_data.get(node_name, {})
                            
                            # Handle only graph_2.py nodes
                            if node_name == "query_analysis":
                                # Stream keyphrases, traits, filters from query analysis
                                if "query_analysis" in node_data:
                                    analysis = node_data["query_analysis"]
                                    yield {
                                        "type": "query_analysis",
                                        "content": {
                                            "keyphrases": analysis.get("keyphrases", {}),
                                            "traits": analysis.get("traits", {}),
                                            "filters": analysis.get("filters", {})                                        }
                                    }
                            
                            elif node_name == "vector_search":
                                # Stream vector search progress and results
                                if "vector_results" in node_data:
                                    yield {
                                        "type": "vector_search_results",
                                        "content": {
                                            "message": f"🔍 Found {len(node_data['vector_results'])} semantic matches"
                                        }
                                    }
                            
                            elif node_name == "sql_search":
                                # Stream SQL queries and keyword search results
                                if "sql_queries" in node_data:
                                    for sql_query in node_data["sql_queries"]:
                                        if isinstance(sql_query, str):
                                            yield {
                                                "type": "sql_query",
                                                "content": {"query": sql_query}
                                            }
                                
                                if "sql_results" in node_data:
                                    yield {
                                        "type": "sql_search_results",
                                        "content": {
                                            "message": f"📊 Found {len(node_data['sql_results'])} keyword matches"
                                        }
                                    }
                            
                            elif node_name == "finalize_sql_answer":
                                # Stream fusion ranking results
                                if "final_results" in node_data:
                                    yield {
                                        "type": "final_answer",
                                        "content": {
                                            "message": node_data["messages"]
                                        }
                                    }       
            
                # Get updated user subscription for final credit info
                user_subscription = await credit_service.get_user_subscription_optimized(user_id)
                final_credit_info = {
                    "credits_remaining": user_subscription.credits if user_subscription else 0,
                    "tier": user_subscription.tier if user_subscription else "free",
                    "credits_used": consumption_result.get("credits_used", 0) if 'consumption_result' in locals() else 0,
                    "search_mode": search_mode if 'search_mode' in locals() else "unknown"
                }
                
                yield {
                        "type": "done",
                        "content": {
                            "message": "Chat response complete",
                            "message_id": message_id,
                            "query": latest_message,
                            "user_id": user_id,
                            "agent_id": agent_id,
                            "chat_thread_id": thread_id,
                            "credit_info": final_credit_info
                        }
                    }
            
        except Exception as e:
            logger.exception("Error in stream_chat",
                            exception_type=type(e).__name__,
                            error_message=str(e))
            
            # Send error message
            yield {
                "type": "error",
                "content": {"message": f"Error: {str(e)}"}
            }            
    
    async def generate_and_email_pdf_results(
        self,
        user_id: str,
        agent_id: str,
        chat_thread_id: str,
        message_id: str,
        query: str
    ) -> bool:
        """
        Generate PDF with chat results and email it to the user
        
        Args:
            user_id: User ID
            agent_id: Agent ID  
            chat_thread_id: Chat thread ID
            message_id: Message ID to get results from
            query: Original user query
            
        Returns:
            bool: True if successful, False otherwise
        """
        try:
            logger.info("Starting PDF generation and email process",
                       user_id=user_id,
                       agent_id=agent_id,
                       chat_thread_id=chat_thread_id,
                       message_id=message_id)
            
            # Get user profile and email
            user_profile = await self.client.table("profiles").select("email, full_name, email_subscription").eq("id", user_id).execute()
            if not user_profile.data or not user_profile.data[0].get("email"):
                logger.warning("User email not found, cannot send PDF",
                             user_id=user_id)
                return False
            user_email_subscription=user_profile.data[0].get("email_subscription", False)
            if not user_email_subscription:
                logger.warning("User email subscription not found, cannot send PDF",
                             user_id=user_id)
                return False
            user_email = user_profile.data[0]["email"]
            user_name = user_profile.data[0].get("full_name", "")
            
            # Get agent configuration
            agent_config = await self.get_agent_config(user_id, agent_id)
            agent_name = agent_config.get('name', 'Unknown Agent')
            
            # Get chat message with results
            chat_message = await self.client.table("chat_messages").select("message, sources_gathered").eq("id", message_id).execute()
            if not chat_message.data:
                logger.warning("Chat message not found",
                             message_id=message_id)
                return False
            
            chat_response = chat_message.data[0].get("message", "")
            sources_gathered = chat_message.data[0].get("sources_gathered", [])
            
            # Parse sources if they're stored as JSON string
            if isinstance(sources_gathered, str):
                try:
                    import json
                    sources_gathered = json.loads(sources_gathered)
                except:
                    sources_gathered = []
            
            if not isinstance(sources_gathered, list):
                sources_gathered = []
            
            logger.info("Retrieved chat data for PDF generation",
                       chat_response_length=len(chat_response) if chat_response else 0,
                       sources_count=len(sources_gathered))
            
            # Generate PDF
            try:
                pdf_path = await pdf_service.create_chat_pdf(
                    query=query,
                    agent_name=agent_name,
                    chat_response=chat_response,
                    sources=sources_gathered,
                    user_name=user_name,
                    chat_thread_id=chat_thread_id
                )
                
                logger.info("PDF generated successfully",
                           pdf_path=pdf_path)
                
            except Exception as e:
                logger.error("Failed to generate PDF",
                           error=str(e),
                           user_id=user_id,
                           chat_thread_id=chat_thread_id)
                return False
            
            # Create email content
            email_subject = f"Your Search Results - {query[:50]}{'...' if len(query) > 50 else ''}"
            email_body = email_service.create_chat_summary_email(
                user_name=user_name,
                query=query,
                agent_name=agent_name
            )
            
            # Send email with PDF attachment
            try:
                pdf_filename = f"search_results_{chat_thread_id}.pdf"
                email_success = await email_service.send_email(
                    to_email=user_email,
                    subject=email_subject,
                    body=email_body,
                    pdf_path=pdf_path,
                    pdf_filename=pdf_filename
                )
                
                if email_success:
                    logger.info("PDF email sent successfully",
                               user_email=user_email,
                               chat_thread_id=chat_thread_id)
                    
                    # Clean up the PDF file after sending
                    try:
                        Path(pdf_path).unlink()
                        logger.info("PDF file cleaned up", pdf_path=pdf_path)
                    except Exception as cleanup_error:
                        logger.warning("Failed to clean up PDF file",
                                     pdf_path=pdf_path,
                                     error=str(cleanup_error))
                    
                    return True
                else:
                    logger.error("Failed to send PDF email",
                               user_email=user_email,
                               chat_thread_id=chat_thread_id)
                    return False
                    
            except Exception as e:
                logger.error("Error sending PDF email",
                           error=str(e),
                           user_email=user_email,
                           chat_thread_id=chat_thread_id)
                return False
                
        except Exception as e:
            logger.error("Error in PDF generation and email process",
                        error=str(e),
                        user_id=user_id,
                        chat_thread_id=chat_thread_id)
            return False

    def _format_chat_response(self, result: Dict[str, Any]) -> 'ChatResponse':
        """
        Format raw chat result into a proper ChatResponse object
        
        Args:
            result: Raw result from the research agent graph
            
        Returns:
            Formatted ChatResponse object
        """
        from app.models.chat import ChatResponse
        
        # Convert LangChain message objects to dictionaries
        messages = []
        for msg in result.get("messages", []):
            if hasattr(msg, "content") and hasattr(msg, "type"):
                # It's a LangChain message object
                msg_dict = {
                    "content": msg.content,
                    "type": msg.type,
                }
                messages.append(msg_dict)
            else:
                # It's already a dictionary
                messages.append(msg)
        
        # Ensure sources have the required score field
        sources = []
        for source in result.get("sources_gathered", []):
            if isinstance(source, dict):
                if "score" not in source:
                    source["score"] = 1.0  # Default score
                sources.append(source)
        
        return ChatResponse(
            messages=messages,
            sources_gathered=sources,
            search_query=[q["query"] if isinstance(q, dict) and "query" in q else q 
                         for q in result.get("search_query", []) if q],
            web_research_result=result.get("web_research_result", [])
        )
    
    @profile_async("chat_service.get_chat_threads")
    async def get_chat_threads(self, user_id: str, limit: int = 10, offset: int = 0) -> Dict[str, Any]:
        """
        Get chat threads for a specific user with pagination
        
        Args:
            user_id: User ID
            limit: Maximum number of threads to return
            offset: Number of threads to skip
            
        Returns:
            Dictionary containing total count and paginated list of chat thread objects
        """
        try:
            logger.info("Fetching chat threads with pagination",
                       user_id=user_id,
                       limit=limit,
                       offset=offset)
            
            # Query Supabase for chat threads where the user is a participant
            response = await self.client.table("chat_threads") \
                .select("id, created_at, updated_at, title", count="exact") \
                .eq("user_id", user_id) \
                .order("updated_at", desc=True) \
                .range(offset, offset + limit - 1) \
                .execute()

            # Ensure total_count is always an integer, even if response.count is None
            total_count = response.count if hasattr(response, 'count') and response.count is not None else 0
            
            return {
                "total": total_count,
                "threads": response.data
            }
        
        except Exception as e:
            logger.exception("Error fetching chat threads",
                            exception_type=type(e).__name__,
                            error_message=str(e))
            raise
    
    @profile_async("chat_service.get_messages_for_thread")
    async def get_messages_for_thread(self, user_id: str, chat_thread_id: str, limit: int = 10, offset: int = 0) -> Dict[str, Any]:
        """
        Get messages for a specific chat thread and user with pagination
        
        Args:
            user_id: User ID
            chat_thread_id: Chat thread ID
            limit: Maximum number of messages to return
            offset: Number of messages to skip
            
        Returns:
            Dictionary containing total count and paginated list of message objects
        """
        try:
            logger.info("Fetching messages for chat_thread_id={chat_thread_id} and user_id={user_id} with pagination",
                       chat_thread_id=chat_thread_id,
                       user_id=user_id,
                       limit=limit,
                       offset=offset)
            
            # Convert "new" to empty string to avoid UUID syntax error
            if chat_thread_id == "new":
                # If this is a new thread, there are no messages to fetch yet
                return {"total": 0, "messages": []}
            
            # Query Supabase for messages in the specified chat thread with pagination
            async with AsyncTimer("supabase.select.chat_messages.list"):
                response = await self.client.table("chat_messages") \
                    .select("id, user_id, agent_id, main_query, message, sources_gathered, created_at, updated_at, is_positive, comment, format, search_mode, world_connections", count="exact") \
                    .eq("chat_thread_id", chat_thread_id) \
                    .eq("user_id", user_id) \
                    .order("created_at", desc=False) \
                    .range(offset, offset + limit - 1) \
                    .execute()
            
            return {
                "total": response.count,
                "messages": response.data
            }
        
        except Exception as e:
            logger.exception("Error fetching messages for thread",
                            exception_type=type(e).__name__,
                            error_message=str(e),
                            chat_thread_id=chat_thread_id,
                            user_id=user_id)
            raise

    @profile_async("chat_service.get_feedback_for_thread_message")
    async def get_feedback_for_thread_message(self, user_id: str, message_id: str) -> List[Dict[str, Any]]:
        try:
            logger.info("Fetching feedback for thread message",
                       user_id=user_id,
                       message_id=message_id)
            
            # Query Supabase for feedback in the specified chat thread message
            async with AsyncTimer("supabase.select.chat_messages.feedback"):
                response = await self.client.table("chat_messages") \
                    .select("id, user_id, chat_thread_id,is_positive, comment, created_at, updated_at") \
                    .eq("user_id", user_id) \
                    .eq("id", message_id) \
                    .execute()

            return response.data
        
        except Exception as e:
            logger.exception("Error fetching feedback for thread message",
                            exception_type=type(e).__name__,
                            error_message=str(e),
                            user_id=user_id,
                            message_id=message_id)
            raise 


    @profile_async("chat_service.patch_feedback_for_thread_message")
    async def patch_feedback_for_thread_message(self, user_id: str, message_id: str, is_positive: bool, comment: str) -> Dict[str, Any]:
        try:
            logger.info("Posting feedback for thread message",
                       user_id=user_id,
                       message_id=message_id,
                       is_positive=is_positive,
                       comment=comment)
            
            # Insert the feedback into the database
            async with AsyncTimer("supabase.update.chat_messages.feedback"):
                response = await self.client.table("chat_messages") \
                    .update({
                        "is_positive": is_positive,
                        "comment": comment
                    }) \
                    .eq("user_id", user_id) \
                    .eq("id", message_id) \
                    .execute()
            
            return response.data[0]
        
        except Exception as e:
            logger.exception("Error posting feedback for thread message",
                            exception_type=type(e).__name__,
                            error_message=str(e),
                            user_id=user_id,
                            message_id=message_id,
                            is_positive=is_positive,
                            comment=comment)
            raise