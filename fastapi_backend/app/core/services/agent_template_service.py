from typing import List, Optional
from uuid import UUID
import logging
from fastapi import HTTPException, status

from app.models.models import AgentTemplate, Profile
from app.models.schemas import AgentTemplateCreate, AgentTemplateResponse, AgentTemplateUpdate
from app.core.structured_logger import get_structured_logger

logger = get_structured_logger(__name__)

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
                logger.error("Error creating agent template: No data returned",
                           template_name=template.name,
                           template_category=template.category)
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Error creating agent template: No data returned"
                )
            
            created_template = response.data[0]
            
            logger.info("Agent template created successfully",
                       template_id=str(created_template.get('id')),
                       template_name=template.name,
                       template_category=template.category)
            
            # Convert to Pydantic model for JSON serialization
            return AgentTemplateResponse(**created_template)
        except Exception as e:
            logger.exception("Error creating agent template",
                           exception_type=type(e).__name__,
                           error_message=str(e),
                           template_name=template.name,
                           template_category=template.category)
            raise
    
    async def get_templates(self, skip: int = 0, limit: int = 100) -> List[AgentTemplateResponse]:
        """Get all agent templates with pagination"""
        try:
            # Query Supabase with pagination
            response = await self.client.table("agent_templates").select("*").range(skip, skip + limit - 1).execute()
            
            logger.info("Agent templates retrieved successfully",
                       skip=skip,
                       limit=limit,
                       count=len(response.data))
            
            # Convert to Pydantic models for JSON serialization
            return [AgentTemplateResponse(**template) for template in response.data]
        except Exception as e:
            logger.exception("Error retrieving agent templates",
                           exception_type=type(e).__name__,
                           error_message=str(e),
                           skip=skip,
                           limit=limit)
            raise
    
    async def get_template_by_id(self, template_id: UUID) -> Optional[AgentTemplateResponse]:
        """Get a specific agent template by ID"""
        try:
            # Query Supabase for the specific template
            response = await self.client.table("agent_templates").select("*").eq("id", str(template_id)).execute()
            
            if not response.data:
                logger.warning("Agent template not found",
                              template_id=str(template_id))
                return None
            
            logger.info("Agent template retrieved successfully",
                       template_id=str(template_id),
                       template_name=response.data[0].get('name'))
            
            # Convert to Pydantic model for JSON serialization
            return AgentTemplateResponse(**response.data[0])
        except Exception as e:
            logger.exception("Error retrieving agent template",
                           exception_type=type(e).__name__,
                           error_message=str(e),
                           template_id=str(template_id))
            raise
    
    async def update_template(self, template_id: UUID, template_update: AgentTemplateUpdate) -> Optional[AgentTemplateResponse]:
        """Update an agent template"""
        try:
            # Convert Pydantic model to dict for Supabase, excluding unset values
            update_data = template_update.model_dump(exclude_unset=True)
            
            # Update in Supabase
            response = await self.client.table("agent_templates").update(update_data).eq("id", str(template_id)).execute()
            
            if not response.data:
                logger.warning("Agent template not found for update",
                              template_id=str(template_id),
                              update_fields=list(update_data.keys()))
                return None
            
            logger.info("Agent template updated successfully",
                       template_id=str(template_id),
                       updated_fields=list(update_data.keys()),
                       template_name=response.data[0].get('name'))
            
            # Convert to Pydantic model for JSON serialization
            return AgentTemplateResponse(**response.data[0])
        except Exception as e:
            logger.exception("Error updating agent template",
                           exception_type=type(e).__name__,
                           error_message=str(e),
                           template_id=str(template_id),
                           update_fields=list(template_update.model_dump(exclude_unset=True).keys()))
            raise
    
    async def delete_template(self, template_id: UUID) -> bool:
        """Delete an agent template"""
        try:
            # Delete from Supabase
            response = await self.client.table("agent_templates").delete().eq("id", str(template_id)).execute()
            
            # If no data was returned, the template didn't exist
            success = len(response.data) > 0
            
            if success:
                logger.info("Agent template deleted successfully",
                           template_id=str(template_id))
            else:
                logger.warning("Agent template not found for deletion",
                              template_id=str(template_id))
            
            return success
        except Exception as e:
            logger.exception("Error deleting agent template",
                           exception_type=type(e).__name__,
                           error_message=str(e),
                           template_id=str(template_id))
            raise
