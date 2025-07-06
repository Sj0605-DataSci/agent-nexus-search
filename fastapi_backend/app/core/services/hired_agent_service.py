from typing import List, Optional
from uuid import UUID
import logging
import traceback
from fastapi import HTTPException, status

from app.models.models import HiredAgent, Profile
from app.models.schemas import HiredAgentCreate, HiredAgentResponse, HiredAgentUpdate

logger = logging.getLogger(__name__)

class HiredAgentService:
    """Service for handling agent template operations"""
    
    _instance = None
    _initialized = False
    
    def __new__(cls, client=None):
        """Singleton pattern implementation"""
        if cls._instance is None:
            cls._instance = super(HiredAgentService, cls).__new__(cls)
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
    
    async def hire_agent(self, agent: HiredAgentCreate, current_user: Profile) -> HiredAgentResponse:
        """Hire a new agent for the user"""
        try:
            logger.info(f"Hire agent request received: {agent.model_dump()}")
            
            # If user_id is not provided, use the current user's ID
            if agent.user_id is None:
                logger.info(f"No user_id provided, using current user ID: {current_user.id}")
                agent.user_id = current_user.id
            
            # Ensure the user can only hire agents for themselves
            if agent.user_id != current_user.id:
                logger.error(f"Authorization failed: User {current_user.id} tried to hire agent for user {agent.user_id}")
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="You can only hire agents for your own account"
                )
            
            # Check if the user already hired this template
            if agent.template_id:
                logger.info(f"Checking if user {agent.user_id} already hired template {agent.template_id}")
                response = await self.client.table("hired_agents").select("*").eq("user_id", str(agent.user_id)).eq("template_id", str(agent.template_id)).execute()
                
                if response.data and len(response.data) > 0:
                    logger.info(f"User {agent.user_id} already hired template {agent.template_id}")
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="You have already hired this agent template"
                    )
            
            # Convert template_id to UUID if it's a string
            try:
                if agent.template_id and isinstance(agent.template_id, str):
                    logger.info(f"Converting template_id from string to UUID: {agent.template_id}")
                    agent.template_id = UUID(agent.template_id)
            except ValueError as e:
                logger.error(f"Invalid UUID format for template_id: {agent.template_id}")
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Invalid UUID format for template_id: {str(e)}"
                )
                
            # Create the hired agent
            logger.info(f"Creating hired agent for user {agent.user_id} with template {agent.template_id}")
            agent_data = agent.model_dump()
            
            # Convert UUIDs to strings for Supabase
            if agent_data.get('user_id'):
                agent_data['user_id'] = str(agent_data['user_id'])
            if agent_data.get('template_id'):
                agent_data['template_id'] = str(agent_data['template_id'])
            
            response = await self.client.table("hired_agents").insert(agent_data).execute()
            
            if not response.data or len(response.data) == 0:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Failed to create hired agent"
                )
                
            logger.info(f"Agent hired successfully: {response.data[0]['id']}")
            
            # Convert to Pydantic model for JSON serialization
            return HiredAgentResponse(**response.data[0])
        except Exception as e:
            logger.error(f"Error in hire_agent: {str(e)}")
            logger.error(traceback.format_exc())
            raise
    
    async def get_hired_agents(self, user_id: UUID, current_user: Profile) -> List[HiredAgentResponse]:
        """Get all hired agents for a user"""
        try:
            # If user_id is provided, ensure it's the current user or raise 403
            if user_id and user_id != current_user.id:
                logger.error(f"Authorization failed: User {current_user.id} tried to view agents for user {user_id}")
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="You can only view your own hired agents"
                )
            
            # Use the current user's ID if no user_id is provided
            user_id = user_id or current_user.id
            logger.info(f"Fetching hired agents for user {user_id}")

            response = await self.client.table("hired_agents").select("*").eq("user_id", str(user_id)).execute()
            
            logger.info(f"Found {len(response.data)} hired agents for user {user_id}")
            
            # Convert to Pydantic models for JSON serialization
            return [HiredAgentResponse(**agent) for agent in response.data]
        except Exception as e:
            logger.error(f"Error in get_hired_agents: {str(e)}")
            logger.error(traceback.format_exc())
            raise
    
    async def get_hired_agent_by_id(self, agent_id: UUID, current_user: Profile) -> Optional[HiredAgentResponse]:
        """Get a specific hired agent by ID"""
        try:
            response = await self.client.table("hired_agents").select("*").eq("id", str(agent_id)).execute()
            
            if not response.data or len(response.data) == 0:
                return None
            
            agent = response.data[0]
            
            # Ensure the user can only view their own hired agents
            if agent["user_id"] != str(current_user.id):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="You can only view your own hired agents"
                )
            
            # Convert to Pydantic model for JSON serialization
            return HiredAgentResponse(**agent)
        except Exception as e:
            logger.error(f"Error in get_hired_agent_by_id: {str(e)}")
            logger.error(traceback.format_exc())
            raise
    
    async def update_hired_agent(self, agent_id: UUID, agent_update: HiredAgentUpdate, current_user: Profile) -> Optional[HiredAgentResponse]:
        """Update a hired agent"""
        try:
            # First get the agent to check permissions
            response = await self.client.table("hired_agents").select("*").eq("id", str(agent_id)).execute()
            
            if not response.data or len(response.data) == 0:
                return None
            
            agent = response.data[0]
            
            # Ensure the user can only update their own hired agents
            if agent["user_id"] != str(current_user.id):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="You can only update your own hired agents"
                )
            
            # Prepare update data
            update_data = agent_update.model_dump(exclude_unset=True)
            
            # Convert UUIDs to strings for Supabase
            for key, value in update_data.items():
                if isinstance(value, UUID):
                    update_data[key] = str(value)
            
            # Update in Supabase
            update_response = await self.client.table("hired_agents").update(update_data).eq("id", str(agent_id)).execute()
            
            if not update_response.data or len(update_response.data) == 0:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Failed to update hired agent"
                )
            
            # Convert to Pydantic model for JSON serialization
            return HiredAgentResponse(**update_response.data[0])
        except Exception as e:
            logger.error(f"Error in update_hired_agent: {str(e)}")
            logger.error(traceback.format_exc())
            raise
    
    async def delete_hired_agent(self, agent_id: UUID, current_user: Profile) -> bool:
        """Delete a hired agent"""
        try:
            # First get the agent to check permissions
            response = await self.client.table("hired_agents").select("*").eq("id", str(agent_id)).eq("can_hire_unhire", True).execute()
            
            if not response.data or len(response.data) == 0:
                return False
            
            agent = response.data[0]
            
            # Ensure the user can only delete their own hired agents
            if agent["user_id"] != str(current_user.id):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="You can only delete your own hired agents"
                )
            
            # Delete from Supabase
            delete_response = await self.client.table("hired_agents").delete().eq("id", str(agent_id)).execute()
            
            return len(delete_response.data) > 0
        except Exception as e:
            logger.error(f"Error in delete_hired_agent: {str(e)}")
            logger.error(traceback.format_exc())
            raise
