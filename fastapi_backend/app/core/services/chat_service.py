import os
from typing import Dict, Any, List, Union
import logging
from langchain_openai import ChatOpenAI
from langgraph.graph import StateGraph
from app.core.agent.graph import graph
from app.models.chat import OverallState
from langchain_core.messages import BaseMessage, HumanMessage, AIMessage

# Configure logging
logger = logging.getLogger(__name__)

class ChatService:
    """
    Service for handling chat functionality using LangGraph research agent
    """
    
    def __init__(self, supabase_client):
        """
        Initialize the chat service with a Supabase client
        """
        self.supabase_client = supabase_client
        
        # Initialize OpenAI client with OpenRouter
        self.llm = ChatOpenAI(
            base_url="https://openrouter.ai/api/v1",
            api_key=os.environ.get("OPENROUTER_API_KEY", ""),
            model="google/gemini-2.0-flash-exp:free",
            headers={
                "HTTP-Referer": "https://agent-nexus-search.com",  # Replace with your site URL
                "X-Title": "Discover new Minds"  # Replace with your site name
            }
        )
    
    async def get_agent_config(self, user_id: str, agent_id: str) -> Dict[str, Any]:
        """
        Fetch agent configuration from Supabase
        """
        try:
            # Query Supabase for agent configuration
            logger.info(f"Querying Supabase for agent_id={agent_id} and user_id={user_id}")
            
            # Try with the regular query first
            response = await self.supabase_client.table("hired_agents").select("*").eq("id", agent_id).eq("user_id", user_id).execute()
            
            # Log the raw response for debugging
            logger.info(f"Supabase response: {response}")
            logger.info(f"Response data: {response.data}")
            
            # If no results, try with simpler queries to debug
            if not response.data:
                logger.info("Trying with simplified queries")
                try:
                    # Try querying just by ID to see if the record exists at all
                    id_only_response = await self.supabase_client.table("hired_agents").select("*").eq("id", agent_id).execute()
                    logger.info(f"ID-only query response: {id_only_response.data}")
                    
                    # Try querying just by user_id to see if any records exist for this user
                    user_only_response = await self.supabase_client.table("hired_agents").select("*").eq("user_id", user_id).execute()
                    logger.info(f"User-only query response: {user_only_response.data}")
                    
                    # Get all records to see what's in the table
                    all_records = await self.supabase_client.table("hired_agents").select("*").limit(5).execute()
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


    async def chat(self, user_id: str, agent_id: str, messages: Union[str, List[Dict[str, Any]]]) -> OverallState:
        """
        Chat with the research agent
        
        Args:
            user_id: User ID
            agent_id: Agent ID
            messages: List of messages in the conversation
            
        Returns:
            Final state of the research agent graph
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
                "initial_search_query_count": 3,
                "research_loop_count": 1,
                "web_research_result": [],
                "sources_gathered": [],
                "search_query": []
            }
            
            # Execute the graph
            result = await graph.ainvoke(initial_state)
            
            # Return the final state
            return result
        except Exception as e:
            logger.error(f"Error in research agent chat: {str(e)}")
            raise
    
    