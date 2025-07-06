from typing import List, Optional
from uuid import UUID
import logging
from fastapi import HTTPException, status

from app.models.models import AgentTemplate, Profile
from app.models.schemas import AgentTemplateCreate, AgentTemplateResponse, AgentTemplateUpdate

logger = logging.getLogger(__name__)

class AgentTemplateService:
    """Service for handling agent template operations"""
    
    _instance = None
    _initialized = False
    
    def __new__(cls, client=None):
        """Singleton pattern implementation"""
        if cls._instance is None:
            cls._instance = super(AgentTemplateService, cls).__new__(cls)
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
    
    async def create_template(self, template: AgentTemplateCreate) -> AgentTemplateResponse:
        """Create a new agent template"""
        try:
            # Convert Pydantic model to dict for Supabase
            template_data = template.model_dump()
            
            # Insert into Supabase
            response = await self.client.table("agent_templates").insert(template_data).execute()
            
            # Get the created template
            if not response.data or len(response.data) == 0:
                logger.error("Error creating agent template: No data returned")
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Error creating agent template: No data returned"
                )
            
            created_template = response.data[0]
            
            # Convert to Pydantic model for JSON serialization
            return AgentTemplateResponse(**created_template)
        except Exception as e:
            logger.error(f"Error creating agent template: {str(e)}")
            raise
    
    async def get_templates(self, skip: int = 0, limit: int = 100) -> List[AgentTemplateResponse]:
        """Get all agent templates with pagination"""
        try:
            # Query Supabase with pagination
            response = await self.client.table("agent_templates").select("*").range(skip, skip + limit - 1).execute()
            
            # Convert to Pydantic models for JSON serialization
            return [AgentTemplateResponse(**template) for template in response.data]
        except Exception as e:
            logger.error(f"Error retrieving agent templates: {str(e)}")
            raise
    
    async def get_template_by_id(self, template_id: UUID) -> Optional[AgentTemplateResponse]:
        """Get a specific agent template by ID"""
        try:
            # Query Supabase for the specific template
            response = await self.client.table("agent_templates").select("*").eq("id", str(template_id)).execute()
            
            if not response.data:
                return None
            
            # Convert to Pydantic model for JSON serialization
            return AgentTemplateResponse(**response.data[0])
        except Exception as e:
            logger.error(f"Error retrieving agent template {template_id}: {str(e)}")
            raise
    
    async def update_template(self, template_id: UUID, template_update: AgentTemplateUpdate) -> Optional[AgentTemplateResponse]:
        """Update an agent template"""
        try:
            # Convert Pydantic model to dict for Supabase, excluding unset values
            update_data = template_update.model_dump(exclude_unset=True)
            
            # Update in Supabase
            response = await self.client.table("agent_templates").update(update_data).eq("id", str(template_id)).execute()
            
            if not response.data:
                return None
            
            # Convert to Pydantic model for JSON serialization
            return AgentTemplateResponse(**response.data[0])
        except Exception as e:
            logger.error(f"Error updating agent template {template_id}: {str(e)}")
            raise
    
    async def delete_template(self, template_id: UUID) -> bool:
        """Delete an agent template"""
        try:
            # Delete from Supabase
            response = await self.client.table("agent_templates").delete().eq("id", str(template_id)).execute()
            
            # If no data was returned, the template didn't exist
            return len(response.data) > 0
        except Exception as e:
            logger.error(f"Error deleting agent template {template_id}: {str(e)}")
            raise
