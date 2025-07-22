from typing import Dict, Any, List, Union
from app.core.services.agent.graph import graph
from langchain_core.messages import HumanMessage, AIMessage
import weave, wandb
from app.core.config import settings
from app.db.clients import get_async_supabase_client
from app.core.utils.llm_utils import GeminiChatModel
from app.models.chat import IntentClassification
from app.core.services.agent.prompts import query_title_generation
from app.models.schemas import TitleGeneratorOutput
from app.core.structured_logger import get_structured_logger
logger = get_structured_logger(__name__)

wandb.login(key=settings.WANDB_API_KEY)
weave.init("Deep-Search")

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
    
    @weave.op
    async def stream_chat(self, user_id: str, agent_id: str, messages: Union[str, List[Dict[str, Any]]], format: str = "table", search_mode: str = "basic", world_connections: str = "world", thread_id: str = ""):
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
            op = weave.get_current_call()
            op_id = op.id
            weave_url = f"https://wandb.ai/sanyam0605/deep-search/r/call/{op_id}" if op_id else None
            
            # Fetch agent configuration
            agent_config = await self.get_agent_config(user_id, agent_id)
            
            # Log agent config for debugging
            logger.info("Agent config retrieved",
                       user_id=user_id,
                       agent_id=agent_id,
                       agent_name=agent_config.get('name', 'Unknown'),
                       has_number_of_results=('number_of_results_returned' in agent_config),
                       number_of_results_returned=agent_config.get('number_of_results_returned', 'Missing'))
                
            # Generate a new thread_id if one doesn't exist
            supabase_client = await get_async_supabase_client()
            
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
                
            # Generate a title for the thread
            llm = GeminiChatModel(model="gemini-2.5-flash", temperature=0)
            title_gen_prompt = query_title_generation.format(latest_message=latest_message)
            response_title, _ = llm.with_structured_output(schema_type=TitleGeneratorOutput, prompt=title_gen_prompt)
            title = response_title.title
                
            # Create the thread in the database
            try:
                await supabase_client.table("chat_threads").insert({
                    "user_id": user_id, 
                    "id": thread_id,
                    "title": title,
                    "weave_url": weave_url
                }).execute()
                
                logger.info("Created new chat thread",
                           user_id=user_id,
                           agent_id=agent_id,
                           chat_thread_id=thread_id,
                           title=title)
            except Exception as e:
                logger.error(f"Error creating chat thread: {e}",
                            user_id=user_id,
                            agent_id=agent_id)
            
            # Perform intent classification
            intent = "search"  # Default to search
            if latest_message:
                llm = GeminiChatModel(model="gemini-2.5-flash", temperature=0)
                
                # Create a prompt for intent classification
                prompt_content = f"""
                    Classify the user's message intent. Is this a greeting, general question, or search query?
                    
                    User message: "{latest_message}"
                    
                    If this is a greeting (like hello, hi) or a simple question that doesn't require web search,
                    respond with "direct_answer".
                    
                    If this is a search query or requires looking up information, respond with "search".
                    
                    Just respond with either "direct_answer" or "search" - nothing else.
                    """
                
                # Get the classification
                response, usage_metadata = llm.with_structured_output(schema_type=IntentClassification, prompt=prompt_content)
                intent = response.answer

                # Log the intent classification
                logger.info("Intent classified",
                           user_id=user_id,
                           agent_id=agent_id,
                           intent=intent,
                           chat_thread_id=thread_id)
                
                # Record the message in the database
                try:
                    response = await supabase_client.table("chat_messages").insert({
                        "user_id": user_id, 
                        "agent_id": agent_id, 
                        "chat_thread_id": thread_id, 
                        "sub_queries": "", 
                        "main_query": latest_message,
                        "weave_url": weave_url,
                    }).execute()
                    
                    # Extract the message ID from the response
                    message_id = ""
                    if response and response.data and len(response.data) > 0:
                        message_id = response.data[0].get("id")
                        
                        # Log token usage
                        input_tokens = usage_metadata.get("input_tokens") or usage_metadata["input_tokens"]
                        output_tokens = usage_metadata.get("output_tokens") or usage_metadata["output_tokens"]
                        
                        cost_dollar = (input_tokens/1000000) * 0.3 + (output_tokens/1000000) * 2.5
                        cost_rupees = cost_dollar * 85.86
                        await supabase_client.table("chat_costs").insert({
                            "user_id": user_id, 
                            "agent_id": agent_id, 
                            "chat_thread_id": thread_id,
                            "message_id": message_id,
                            "model": "gemini-2.5-flash",
                            "node": "intent_classifier",
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
                # Create a prompt for direct answer based on agent config and latest message
                llm = GeminiChatModel(model="gemini-2.5-flash", temperature=0.2)
                
                # Build a prompt based on agent config and the latest message
                direct_answer_prompt = f"""
                You are a helpful assistant with the following configuration:
                {agent_config}
                
                Please respond directly to the following user message:
                "{latest_message}"
                
                Provide a concise and helpful response without conducting any web searches.
                """
                
                # Generate the direct answer
                response_message = llm.invoke(direct_answer_prompt)
                direct_answer = response_message.content
                usage_metadata = response_message.usage_metadata
                
                # Record the response in the database
                try:
                    await supabase_client.table("chat_messages").update({
                        "message": direct_answer,
                    }).eq("id", message_id).execute()
                    input_tokens = usage_metadata.get("input_tokens") or usage_metadata["input_tokens"]
                    output_tokens = usage_metadata.get("output_tokens") or usage_metadata["output_tokens"]
                        
                    cost_dollar = (input_tokens/1000000) * 0.3 + (output_tokens/1000000) * 2.5
                    cost_rupees = cost_dollar * 85.86
                    await supabase_client.table("chat_costs").insert({
                        "user_id": user_id, 
                        "agent_id": agent_id, 
                        "chat_thread_id": thread_id,
                        "message_id": message_id,
                        "model": "gemini-2.5-flash",
                        "node": "direct_answer",
                        "model_input_tokens": float(input_tokens), 
                        "model_output_tokens": float(output_tokens), 
                        "model_cost_dollar": float(cost_dollar),
                        "model_cost_rupees": float(cost_rupees),
                        "weave_url": weave_url,
                        }).execute()
                except Exception as e:
                    logger.error(f"Error recording direct answer: {e}",
                                user_id=user_id,
                                agent_id=agent_id,
                                chat_thread_id=thread_id)
                
                # Stream the direct answer to the client
                yield {
                    "type": "token",
                    "content": direct_answer,
                    "node": "direct_answer",
                    "tags": []
                    }
                
                # Send completion signal
                yield {
                    "type": "done",
                    "content": {"message": "Chat response complete"}
                }
            elif intent == "search":
                # Create initial state based on search mode and world connections
                if search_mode == "basic" and world_connections == "world":
                    initial_state = {
                        "messages": formatted_messages,
                        "agent_config": agent_config,
                        "user_id": user_id,
                        "weave_url": weave_url,
                        "initial_search_query_count": 3,
                        "research_loop_count": 0,
                        "max_research_loops": 0,
                        "chat_thread_id": thread_id,
                        "web_research_result": [],
                        "sources_gathered": [],
                        "search_query": [],
                        "number_of_results_returned":6,
                        "format": format,
                        "world_connections": world_connections,
                        "sql_queries": [],
                        "intent": intent  # Add the classified intent to the initial state
                    }
                elif search_mode == "basic" and world_connections == "connections":
                    initial_state = {
                        "messages": formatted_messages,
                        "agent_config": agent_config,
                        "user_id": user_id,
                        "weave_url": weave_url,
                        "initial_search_query_count": 3,
                        "research_loop_count": 0,
                        "max_research_loops": 0,
                        "chat_thread_id": thread_id,
                        "web_research_result": [],
                        "sources_gathered": [],
                        "search_query": [],
                        "number_of_results_returned":6,
                        "format": format,
                        "world_connections": world_connections,
                        "sql_queries": [],
                        "intent": intent  # Add the classified intent to the initial state
                    }
                elif search_mode == "deep" and world_connections == "world":
                    initial_state = {
                        "messages": formatted_messages,
                        "agent_config": agent_config,
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
            
                async for chunk_type, chunk_data in graph.astream(
                    initial_state, 
                    stream_mode=["messages", "updates"]
                ):
                # Handle different types of streaming chunks
                    if chunk_type == "messages":
                        # This is a token from an LLM
                        message_chunk, metadata = chunk_data
                        if message_chunk.content:
                            # Stream the token with metadata about which node it came from
                            yield {
                            "type": "token",
                            "content": message_chunk.content,
                            "node": metadata.get("node_name", "unknown"),
                            "tags": metadata.get("tags", [])
                        }
                    
                    elif chunk_type == "updates":
                        # This is a state update from a node
                        node_name = list(chunk_data.keys())[0] if chunk_data else "unknown"
                        node_data = chunk_data.get(node_name, {})
                        
                        # Handle different types of updates based on the node
                        if "search_query" in node_data:
                            # Stream search queries
                            for query in node_data["search_query"]:
                                if isinstance(query, dict) and "query" in query:
                                    yield {
                                        "type": "search_query",
                                    "content": {"query": query["query"]}
                                }
                                elif isinstance(query, str):
                                    yield {
                                        "type": "search_query",
                                        "content": {"query": query}
                                    }
                    
                        if "sources_gathered" in node_data:
                            yield {
                                "type": "source",
                                "content": {"sources": node_data["sources_gathered"]}
                            }
            
                yield {
                        "type": "done",
                        "content": {"message": "Chat response complete"}
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
            
            # First get the total count of threads
            count_response = await self.client.table("chat_threads") \
                .select("id", count="exact") \
                .eq("user_id", user_id) \
                .execute()
            
            total_count = count_response.count if hasattr(count_response, 'count') else 0
            
            # Query Supabase for chat threads where the user is a participant
            response = await self.client.table("chat_threads") \
                .select("id, created_at, updated_at, title") \
                .eq("user_id", user_id) \
                .order("updated_at", desc=True) \
                .range(offset, offset + limit - 1) \
                .execute()
            
            # Extract unique chat thread IDs with their latest timestamps
            thread_map = {}
            for item in response.data:
                thread_id = item.get("id")
                created_at = item.get("created_at")
                updated_at = item.get("updated_at")
                title = item.get("title")
                
                if thread_id not in thread_map or updated_at > thread_map[thread_id]["last_message_at"]:
                    thread_map[thread_id] = {
                        "id": thread_id,
                        "title":title,
                        "created_at": created_at,
                        "last_message_at": updated_at,
                    }
            
            # Convert to list and sort by most recent activity
            threads = list(thread_map.values())
            threads.sort(key=lambda x: x["last_message_at"], reverse=True)
            
            return {
                "total": total_count,
                "threads": threads
            }
        
        except Exception as e:
            logger.exception("Error fetching chat threads",
                            exception_type=type(e).__name__,
                            error_message=str(e))
            raise
    
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
            
            # First get the total count of messages
            count_response = await self.client.table("chat_messages") \
                .select("id", count="exact") \
                .eq("chat_thread_id", chat_thread_id) \
                .eq("user_id", user_id) \
                .execute()
            
            total_count = count_response.count if hasattr(count_response, 'count') else 0
            
            # Query Supabase for messages in the specified chat thread with pagination
            response = await self.client.table("chat_messages") \
                .select("id, user_id, agent_id, main_query, message, sources_gathered, created_at, updated_at", "is_positive, comment") \
                .eq("chat_thread_id", chat_thread_id) \
                .eq("user_id", user_id) \
                .order("created_at", desc=False) \
                .range(offset, offset + limit - 1) \
                .execute()
            
            return {
                "total": total_count,
                "messages": response.data
            }
        
        except Exception as e:
            logger.exception("Error fetching messages for thread",
                            exception_type=type(e).__name__,
                            error_message=str(e),
                            chat_thread_id=chat_thread_id,
                            user_id=user_id)
            raise

    async def get_feedback_for_thread_message(self, user_id: str, message_id: str) -> List[Dict[str, Any]]:
        try:
            logger.info("Fetching feedback for thread message",
                       user_id=user_id,
                       message_id=message_id)
            
            # Query Supabase for feedback in the specified chat thread message
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


    async def patch_feedback_for_thread_message(self, user_id: str, message_id: str, is_positive: bool, comment: str) -> Dict[str, Any]:
        try:
            logger.info("Posting feedback for thread message",
                       user_id=user_id,
                       message_id=message_id,
                       is_positive=is_positive,
                       comment=comment)
            
            # Insert the feedback into the database
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