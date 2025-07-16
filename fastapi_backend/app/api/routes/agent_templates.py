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
from app.db.redis_client import cache_get, cache_set, cache_delete, cache_invalidate_pattern

# Set up structured logging
from app.core.structured_logger import get_structured_logger
logger = get_structured_logger(__name__)

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
        
        # Invalidate the agent templates list cache
        # await cache_invalidate_pattern("agent_templates:list:*")
        logger.info("Agent template created successfully",
                   template_name=template.name,
                   template_category=template.category)
        
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
        logger.exception("Error creating agent template",
                        exception_type=type(e).__name__,
                        error_message=str(e),
                        template_name=template.name if hasattr(template, 'name') else None)
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
    """Get all agent templates with Redis caching"""
    try:
        # # Create a cache key based on the query parameters
        # cache_key = f"agent_templates:list:skip{skip}:limit{limit}"
        
        # # Try to get data from cache first
        # cached_data = await cache_get(cache_key)
        # if cached_data is not None:
        #     logger.info(f"Returning agent templates from cache: {cache_key}")
        #     return StandardJSONResponse(StandardResponse(
        #         success=True,
        #         status_code=status.HTTP_200_OK,
        #         message="Agent templates retrieved from cache",
        #         data=cached_data
        #     ))
        
        # # If not in cache, get from database
        # logger.info(f"Cache miss for {cache_key}, fetching from database")
        service = AgentTemplateService(client=await get_async_supabase_client())
        template_responses = await service.get_templates(skip, limit)
        
        logger.info("Agent templates retrieved successfully",
                   count=len(template_responses) if template_responses else 0,
                   skip=skip,
                   limit=limit)
        
        # Store in cache for future requests (expire in 5 minutes)
        # await cache_set(cache_key, template_responses, expire=300)
        
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
        logger.exception("Error retrieving agent templates",
                        exception_type=type(e).__name__,
                        error_message=str(e),
                        skip=skip,
                        limit=limit)
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
    """Get a specific agent template by ID with Redis caching"""
    try:
        # # Create a cache key for this specific template
        # cache_key = f"agent_templates:id:{template_id}"
        
        # # Try to get from cache first
        # cached_template = await cache_get(cache_key)
        # if cached_template is not None:
        #     logger.info(f"Returning template {template_id} from cache")
        #     return StandardJSONResponse(StandardResponse(
        #         success=True,
        #         status_code=status.HTTP_200_OK,
        #         message="Agent template retrieved from cache",
        #         data=cached_template
        #     ))
        
        # # If not in cache, get from database
        # logger.info(f"Cache miss for template {template_id}, fetching from database")
        service = AgentTemplateService(client=await get_async_supabase_client())
        template_response = await service.get_template_by_id(template_id)
        
        # if template_response is not None:
        #     # Store in cache for future requests (expire in 10 minutes)
        #     # await cache_set(cache_key, template_response, expire=600)
            
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
        logger.exception("Error retrieving agent template",
                        exception_type=type(e).__name__,
                        error_message=str(e),
                        template_id=str(template_id))
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
        
        # Invalidate both the specific template cache and the list cache
        # await cache_delete(f"agent_templates:id:{template_id}")
        # await cache_invalidate_pattern("agent_templates:list:*")
        # logger.info(f"Invalidated cache for template {template_id} after update")
        
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
        logger.exception("Error updating agent template",
                        exception_type=type(e).__name__,
                        error_message=str(e),
                        template_id=str(template_id))
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
        
        # Invalidate both the specific template cache and the list cache
        # await cache_delete(f"agent_templates:id:{template_id}")
        # await cache_invalidate_pattern("agent_templates:list:*")
        # logger.info(f"Invalidated cache for template {template_id} after deletion")
        
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
        logger.exception("Error deleting agent template",
                        exception_type=type(e).__name__,
                        error_message=str(e),
                        template_id=str(template_id))
        return StandardJSONResponse(StandardResponse(
            success=False,
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            message=f"An unexpected error occurred: {str(e)}",
            data=None
        ))
