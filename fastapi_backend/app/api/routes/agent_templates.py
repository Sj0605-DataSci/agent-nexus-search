from typing import List
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status, Query

from app.core.auth import get_current_user
from app.db.clients import get_async_supabase_client
from app.models.models import Profile
from app.models.schemas import AgentTemplateCreate, AgentTemplateResponse, AgentTemplateUpdate
from app.models.schemas import StandardResponse, StandardJSONResponse
from app.core.services.agent_template_service import AgentTemplateService
from app.core.utils.cache import (
    get_cached_item, cache_item, invalidate_cache_item, invalidate_cache_pattern
)

# Set up structured logging
from app.core.structured_logger import get_structured_logger
from app.core.profiling import profile_async
logger = get_structured_logger(__name__)

router = APIRouter(prefix="/agent_templates", tags=["agent_templates"])

async def get_agent_template_service():
    """
    Dependency to get a AgentTemplateService instance.
    This helps reduce the overhead of creating a new service for each request.
    """
    client = await get_async_supabase_client()
    return AgentTemplateService(client=client)



@router.post("", response_model=StandardResponse[AgentTemplateResponse], status_code=status.HTTP_201_CREATED, response_class=StandardJSONResponse)
@profile_async("routes.agent_templates.create_agent_template")
async def create_agent_template(
    template: AgentTemplateCreate,
    current_user: Profile = Depends(get_current_user),
    agent_template_service: AgentTemplateService = Depends(get_agent_template_service)
):
    """Create a new agent template"""
    try:
        template_response = await agent_template_service.create_template(template)
        
        # Invalidate template list cache after creation
        invalidate_cache_pattern("agent_templates:list:*")
        
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
@profile_async("routes.agent_templates.get_agent_templates")
async def get_agent_templates(
    skip: int = Query(0, ge=0, description="Number of items to skip"),
    limit: int = Query(100, ge=1, le=1000, description="Number of items to return"),
    agent_template_service: AgentTemplateService = Depends(get_agent_template_service)
):
    """Get all agent templates with caching"""
    try:
        # Create cache key including pagination info
        cache_key = f"agent_templates:list:{skip}:{limit}"
        
        # Try to get from cache first
        cached_templates = get_cached_item(cache_key)
        if cached_templates is not None:
            logger.info("Agent templates retrieved from cache",
                       count=len(cached_templates) if cached_templates else 0,
                       skip=skip,
                       limit=limit,
                       cache_key=cache_key)
            
            return StandardJSONResponse(StandardResponse(
                success=True,
                status_code=status.HTTP_200_OK,
                message="Agent templates retrieved from cache",
                data=cached_templates
            ))
        
        # If not in cache, get from database
        logger.info(f"Cache miss for templates {cache_key}, fetching from database")
        template_responses = await agent_template_service.get_templates(skip, limit)
        
        # Cache the results with 15 minutes TTL (templates don't change frequently)
        if template_responses is not None:
            cache_item(cache_key, template_responses, ttl=900)
            logger.info("Agent templates cached", cache_key=cache_key)
        
        logger.info("Agent templates retrieved successfully",
                   count=len(template_responses) if template_responses else 0,
                   skip=skip,
                   limit=limit)
        
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
@profile_async("routes.agent_templates.get_agent_template")
async def get_agent_template(
    template_id: UUID,
    agent_template_service: AgentTemplateService = Depends(get_agent_template_service)
):
    """Get a specific agent template by ID with caching"""
    try:
        # Create cache key for individual template
        cache_key = f"agent_template:{str(template_id)}"
        
        # Try to get from cache first
        cached_template = get_cached_item(cache_key)
        if cached_template is not None:
            logger.info("Agent template retrieved from cache",
                       template_id=str(template_id),
                       cache_key=cache_key)
            
            return StandardJSONResponse(StandardResponse(
                success=True,
                status_code=status.HTTP_200_OK,
                message="Agent template retrieved from cache",
                data=cached_template
            ))
        
        # If not in cache, get from database
        logger.info(f"Cache miss for template {cache_key}, fetching from database")
        template_response = await agent_template_service.get_template_by_id(template_id)
        
        if template_response is None:
            return StandardJSONResponse(StandardResponse(
                success=False,
                status_code=status.HTTP_404_NOT_FOUND,
                message="Agent template not found",
                data=None
            ))
        
        # Cache the results with 15 minutes TTL
        cache_item(cache_key, template_response, ttl=900)
        logger.info("Agent template cached", cache_key=cache_key)
        
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
@profile_async("routes.agent_templates.update_agent_template")
async def update_agent_template(
    template_id: UUID,
    template_update: AgentTemplateUpdate,
    agent_template_service: AgentTemplateService = Depends(get_agent_template_service),
    current_user: Profile = Depends(get_current_user)
):
    """Update an agent template"""
    try:
        # Use the service to update the template
        template_response = await agent_template_service.update_template(template_id, template_update)
        
        if template_response is None:
            return StandardJSONResponse(StandardResponse(
                success=False,
                status_code=status.HTTP_404_NOT_FOUND,
                message="Agent template not found",
                data=None
            ))
        
        # Invalidate caches after successful update
        template_cache_key = f"agent_template:{str(template_id)}"
        invalidate_cache_item(template_cache_key)
        invalidate_cache_pattern("agent_templates:list:*")
        
        logger.info("Agent template cache invalidated after update",
                   template_id=str(template_id))
        
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
@profile_async("routes.agent_templates.delete_agent_template")
async def delete_agent_template(
    template_id: UUID,
    agent_template_service: AgentTemplateService = Depends(get_agent_template_service),
    current_user: Profile = Depends(get_current_user)
):
    """Delete an agent template"""
    try:
        
        # Use the service to delete the template
        success = await agent_template_service.delete_template(template_id)
        
        if not success:
            return StandardJSONResponse(StandardResponse(
                success=False,
                status_code=status.HTTP_404_NOT_FOUND,
                message="Agent template not found",
                data=None
            ))
        
        # Invalidate caches after successful deletion
        template_cache_key = f"agent_template:{str(template_id)}"
        invalidate_cache_item(template_cache_key)
        invalidate_cache_pattern("agent_templates:list:*")
        
        logger.info("Agent template cache invalidated after deletion",
                   template_id=str(template_id))
        
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
