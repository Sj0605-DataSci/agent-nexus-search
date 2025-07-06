from typing import Dict, Any, List, Union
import logging
from app.core.services.agent.graph import graph
from langchain_core.messages import HumanMessage, AIMessage

# Configure logging
logger = logging.getLogger(__name__)

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
            logger.info(f"Querying Supabase for agent_id={agent_id} and user_id={user_id}")
            
            # Try with the regular query first
            response = await self.client.table("hired_agents").select("*").eq("id", agent_id).eq("user_id", user_id).execute()
            
            # Log the raw response for debugging
            logger.info(f"Supabase response: {response}")
            logger.info(f"Response data: {response.data}")
            
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
                logger.warning(f"No agent found for agent_id={agent_id} and user_id={user_id}")
                # Return a default config instead of empty dict to avoid errors
                return {
                    "id": agent_id,
                    "user_id": user_id,
                    "name": "Research Assistant",
                    "personality": "helpful",
                    "tone": "professional",
                    "response_length": "medium",
                    "expertise": "research"
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
            
    async def stream_chat(self, user_id: str, agent_id: str, messages: Union[str, List[Dict[str, Any]]], format: str = "table", search_mode: str = "basic", world_connections: str = "world"):
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
            
            if search_mode == "basic" and world_connections == "world":
                initial_state = {
                "messages": formatted_messages,
                "agent_config": agent_config,
                "user_id": user_id,
                "initial_search_query_count": 3,
                "research_loop_count": 0,
                "max_research_loops": 0,
                "chat_thread_id": None,
                "web_research_result": [],
                "sources_gathered": [],
                "search_query": [],
                "number_of_results_returned":6,
                "format": format,
                "world_connections": world_connections,
                "sql_queries": []
            }
            elif search_mode == "basic" and world_connections == "connections":
                initial_state = {
                "messages": formatted_messages,
                "agent_config": agent_config,
                "user_id": user_id,
                "initial_search_query_count": 3,
                "research_loop_count": 0,
                "max_research_loops": 0,
                "chat_thread_id": None,
                "web_research_result": [],
                "sources_gathered": [],
                "search_query": [],
                "number_of_results_returned":6,
                "format": format,
                "world_connections": world_connections,
                "sql_queries": []
            }
            elif search_mode == "deep" and world_connections == "world":
                initial_state = {
                "messages": formatted_messages,
                "agent_config": agent_config,
                "user_id": user_id,
                "initial_search_query_count": agent_config["initial_search_query_count"],
                "research_loop_count": 0,
                "max_research_loops": agent_config["max_research_loops"],
                "chat_thread_id": None,
                "web_research_result": [],
                "sources_gathered": [],
                "search_query": [],
                "number_of_results_returned":agent_config["number_of_results_returned"],
                "format": format,
                "world_connections": world_connections,
                "sql_queries": []
            }
            elif search_mode == "deep" and world_connections == "connections":
                initial_state = {
                "messages": formatted_messages,
                "agent_config": agent_config,
                "user_id": user_id,
                "initial_search_query_count": agent_config["initial_search_query_count"],
                "research_loop_count": 0,
                "max_research_loops": agent_config["max_research_loops"],
                "chat_thread_id": None,
                "web_research_result": [],
                "sources_gathered": [],
                "search_query": [],
                "number_of_results_returned":agent_config["number_of_results_returned"],
                "format": format,
                "world_connections": world_connections,
                "sql_queries": []
            }
            else:
                raise ValueError(f"Invalid search mode: {search_mode}")
            
            # Use LangGraph's astream method to stream results
            # Stream both messages (LLM tokens) and updates (state changes)
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
                        # Stream sources
                        for source in node_data["sources_gathered"]:
                            yield {
                                "type": "source",
                                "content": source
                            }
            
            # Send completion signal
            yield {
                "type": "done",
                "content": {"message": "Chat response complete"}
            }
            
        except Exception as e:
            logger.error(f"Error in stream_chat: {str(e)}")
            import traceback
            logger.error(traceback.format_exc())
            
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
    
    