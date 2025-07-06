from typing import List
from uuid import UUID
import logging
import traceback
from fastapi import APIRouter, Depends, HTTPException, status
from datetime import datetime

from app.core.auth import get_current_user
from app.db.clients import get_async_supabase_client
from app.models.models import Profile
from app.models.schemas import AgentTemplateCreate, AgentTemplateResponse, AgentTemplateUpdate
from app.models.schemas import StandardResponse, StandardJSONResponse
from app.core.services.agent_template_service import AgentTemplateService

# Set up logging
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/agent_templates", tags=["agent_templates"])

@router.post("", response_model=StandardResponse[AgentTemplateResponse], status_code=status.HTTP_201_CREATED, response_class=StandardJSONResponse)
async def create_agent_template(
    template: AgentTemplateCreate,
    current_user: Profile = Depends(get_current_user)
):
    """Create a new agent template"""
    try:
        # Initialize the service with the Supabase client
        service = AgentTemplateService(client=await get_async_supabase_client())
        
        # Use the service to create the template
        template_response = await service.create_template(template)
        
        return StandardJSONResponse(StandardResponse(
            success=True,
            status_code=status.HTTP_201_CREATED,
            message="Agent template created successfully",
            data=template_response
        ))
    except HTTPException as e:
        return StandardJSONResponse(StandardResponse(
            success=False,
            status_code=e.status_code,
            message=str(e.detail),
            data=None
        ))
    except Exception as e:
        logger.error(f"Error in create_agent_template: {str(e)}")
        logger.error(traceback.format_exc())
        return StandardJSONResponse(StandardResponse(
            success=False,
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            message=f"An unexpected error occurred: {str(e)}",
            data=None
        ))

@router.get("", response_model=StandardResponse[List[AgentTemplateResponse]], response_class=StandardJSONResponse, status_code=status.HTTP_200_OK)
async def get_agent_templates(
    skip: int = 0,
    limit: int = 100,
):
    """Get all agent templates"""
    try:
        # Initialize the service with the Supabase client
        service = AgentTemplateService(client=await get_async_supabase_client())
        
        # Use the service to get templates
        template_responses = await service.get_templates(skip, limit)
        
        return StandardJSONResponse(StandardResponse(
            success=True,
            status_code=status.HTTP_200_OK,
            message="Agent templates retrieved successfully",
            data=template_responses
        ))
    except HTTPException as e:
        return StandardJSONResponse(StandardResponse(
            success=False,
            status_code=e.status_code,
            message=str(e.detail),
            data=None
        ))
    except Exception as e:
        logger.error(f"Error in get_agent_templates: {str(e)}")
        logger.error(traceback.format_exc())
        return StandardJSONResponse(StandardResponse(
            success=False,
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            message=f"An unexpected error occurred: {str(e)}",
            data=None
        ))        

@router.get("/{template_id}", response_model=StandardResponse[AgentTemplateResponse], response_class=StandardJSONResponse, status_code=status.HTTP_200_OK)
async def get_agent_template(
    template_id: UUID,
):
    """Get a specific agent template by ID"""
    try:
        # Initialize the service with the Supabase client
        service = AgentTemplateService(client=await get_async_supabase_client())
        
        # Use the service to get the template
        template_response = await service.get_template_by_id(template_id)
        if template_response is None:
            return StandardJSONResponse(StandardResponse(
                success=False,
                status_code=status.HTTP_404_NOT_FOUND,
                message="Agent template not found",
                data=None
            ))
        
        return StandardJSONResponse(StandardResponse(
            success=True,
            status_code=status.HTTP_200_OK,
            message="Agent template retrieved successfully",
            data=template_response
        ))
    except HTTPException as e:
        return StandardJSONResponse(StandardResponse(
            success=False,
            status_code=e.status_code,
            message=str(e.detail),
            data=None
        ))
    except Exception as e:
        logger.error(f"Error in get_agent_template: {str(e)}")
        logger.error(traceback.format_exc())
        return StandardJSONResponse(StandardResponse(
            success=False,
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            message=f"An unexpected error occurred: {str(e)}",
            data=None
        ))

@router.put("/{template_id}", response_model=StandardResponse[AgentTemplateResponse], response_class=StandardJSONResponse, status_code=status.HTTP_200_OK)
async def update_agent_template(
    template_id: UUID,
    template_update: AgentTemplateUpdate,
    current_user: Profile = Depends(get_current_user)
):
    """Update an agent template"""
    try:
        # Initialize the service with the Supabase client
        service = AgentTemplateService(client=await get_async_supabase_client())
        
        # Use the service to update the template
        template_response = await service.update_template(template_id, template_update)
        if template_response is None:
            return StandardJSONResponse(StandardResponse(
                success=False,
                status_code=status.HTTP_404_NOT_FOUND,
                message="Agent template not found",
                data=None
            ))
        
        return StandardJSONResponse(StandardResponse(
            success=True,
            status_code=status.HTTP_200_OK,
            message="Agent template updated successfully",
            data=template_response
        ))
    except HTTPException as e:
        return StandardJSONResponse(StandardResponse(
            success=False,
            status_code=e.status_code,
            message=str(e.detail),
            data=None
        ))
    except Exception as e:
        logger.error(f"Error in update_agent_template: {str(e)}")
        logger.error(traceback.format_exc())
        return StandardJSONResponse(StandardResponse(
            success=False,
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            message=f"An unexpected error occurred: {str(e)}",
            data=None
        ))

@router.delete("/{template_id}", response_model=StandardResponse[None], response_class=StandardJSONResponse, status_code=status.HTTP_200_OK)
async def delete_agent_template(
    template_id: UUID,
    current_user: Profile = Depends(get_current_user)
):
    """Delete an agent template"""
    try:
        # Initialize the service with the Supabase client
        service = AgentTemplateService(client=await get_async_supabase_client())
        
        # Use the service to delete the template
        success = await service.delete_template(template_id)
        if not success:
            return StandardJSONResponse(StandardResponse(
                success=False,
                status_code=status.HTTP_404_NOT_FOUND,
                message="Agent template not found",
                data=None
            ))
        
        return StandardJSONResponse(StandardResponse(
            success=True,
            status_code=status.HTTP_200_OK,
            message="Agent template deleted successfully",
            data=None
        ))
    except HTTPException as e:
        return StandardJSONResponse(StandardResponse(
            success=False,
            status_code=e.status_code,
            message=str(e.detail),
            data=None
        ))
    except Exception as e:
        logger.error(f"Error in delete_agent_template: {str(e)}")
        logger.error(traceback.format_exc())
        return StandardJSONResponse(StandardResponse(
            success=False,
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            message=f"An unexpected error occurred: {str(e)}",
            data=None
        ))
