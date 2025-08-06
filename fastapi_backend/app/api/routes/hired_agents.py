from typing import List
from uuid import UUID
import logging
import traceback
from fastapi import APIRouter, Depends, HTTPException, status, Query, Request

from app.core.auth import get_current_user
from app.db.clients import get_async_supabase_client
from app.core.utils.cache import (
    get_cached_agent, cache_agent, invalidate_agent_cache,
    get_cached_user_agents, cache_user_agents, invalidate_user_agents_cache
)
from app.models.models import Profile
from app.models.schemas import HiredAgentCreate, HiredAgentResponse, HiredAgentUpdate, StandardResponse, StandardJSONResponse
from app.core.services.hired_agent_service import HiredAgentService
# from app.db.redis_client import cache_get, cache_set, cache_delete, cache_invalidate_pattern

# Set up structured logging
from app.core.structured_logger import get_structured_logger
from app.core.profiling import profile_async
logger = get_structured_logger(__name__)

router = APIRouter(prefix="/hired_agents", tags=["hired_agents"])

# Using StandardJSONResponse from schemas.py

async def get_hired_agent_service():
    """
    Dependency to get a HiredAgentService instance.
    This helps reduce the overhead of creating a new service for each request.
    """
    client = await get_async_supabase_client()
    return HiredAgentService(client=client)

@router.post("", response_model=StandardResponse[HiredAgentResponse], response_class=StandardJSONResponse, status_code=status.HTTP_201_CREATED)
@profile_async("routes.hired_agents.hire_agent")
async def hire_agent(
    request: Request,
    agent: HiredAgentCreate,
    current_user: Profile = Depends(get_current_user,use_cache=True),
    hired_agent_service: HiredAgentService = Depends(get_hired_agent_service,use_cache=True)
):
    """Hire a new agent for the user"""
    try:
        logger.info("Hire agent request received",
                   template_id=str(agent.template_id) if agent.template_id else None,
                   user_id=str(current_user.id) if current_user else None,
                   agent_name=agent.name if hasattr(agent, 'name') else None)
        
        # Use the service to hire the agent
        agent_response = await hired_agent_service.hire_agent(agent, current_user)
        
        # Invalidate any cached hired agents lists for this user
        invalidate_user_agents_cache(str(current_user.id))
        logger.info("Agent hired successfully",
                   user_id=str(current_user.id),
                   agent_id=str(agent_response.id) if hasattr(agent_response, 'id') else None,
                   agent_template_id=str(agent.template_id))
        
        return StandardJSONResponse(StandardResponse(
            success=True,
            status_code=status.HTTP_201_CREATED,
            message="Agent hired successfully",
            data=agent_response
        ))
    except HTTPException as e:
        # Convert HTTP exceptions to StandardResponse format
        logger.error("HTTP exception in hire_agent",
                    exception_type="HTTPException",
                    status_code=e.status_code,
                    detail=str(e.detail),
                    user_id=str(current_user.id) if current_user else None,
                    agent_template_id=str(agent.template_id))
        return StandardJSONResponse(StandardResponse(
            success=False,
            status_code=e.status_code,
            message=str(e.detail),
            data=None
        ))
    except Exception as e:
        # Log the full stack trace for unexpected errors
        logger.exception("Unexpected error in hire_agent",
                        exception_type=type(e).__name__,
                        error_message=str(e),
                        user_id=str(current_user.id) if current_user else None,
                        agent_template_id=str(agent.template_id))
        return StandardJSONResponse(StandardResponse(
            success=False,
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            message=f"An unexpected error occurred: {str(e)}",
            data=None
        ))

@router.get("", response_model=StandardResponse[List[HiredAgentResponse]], response_class=StandardJSONResponse, status_code=status.HTTP_200_OK)
@profile_async("routes.hired_agents.get_hired_agents")
async def get_hired_agents(
    request: Request,
    current_user: Profile = Depends(get_current_user,use_cache=True),
    hired_agent_service: HiredAgentService = Depends(get_hired_agent_service,use_cache=True)
):
    """Get all hired agents for a user"""
    try:
        logger.info("Get hired agents request received",
                   current_user_id=str(current_user.id) if current_user else None)
        
        # Try to get data from cache first
        user_id_str = str(current_user.id)
        cached_data = get_cached_user_agents(user_id_str)
        if cached_data is not None:
            logger.info(f"Returning hired agents from cache for user {user_id_str}")
            return StandardJSONResponse(StandardResponse(
                success=True,
                status_code=status.HTTP_200_OK,
                message="Hired agents retrieved from cache",
                data=cached_data
            ))
        
        # If not in cache, get from database
        logger.info(f"Cache miss for user {user_id_str}, fetching from database")
        agent_responses = await hired_agent_service.get_hired_agents(str(current_user.id))
        
        logger.info("Hired agents retrieved successfully",
                   target_user_id=str(current_user.id),
                   agent_count=len(agent_responses) if agent_responses else 0,
                   current_user_id=str(current_user.id))
        
        # Store in cache for future requests
        cache_user_agents(user_id_str, agent_responses)
        logger.info(f"Stored hired agents in cache for user {user_id_str}")
        
        return StandardJSONResponse(StandardResponse(
            success=True,
            status_code=status.HTTP_200_OK,
            message="Hired agents retrieved successfully",
            data=agent_responses
        ))
    except HTTPException as e:
        # Convert HTTP exceptions to StandardResponse format
        logger.error("HTTP exception in get_hired_agents",
                    exception_type="HTTPException",
                    status_code=e.status_code,
                    detail=str(e.detail),
                    current_user_id=str(current_user.id) if current_user else None)
        return StandardJSONResponse(StandardResponse(
            success=False,
            status_code=e.status_code,
            message=str(e.detail),
            data=None
        ))
    except Exception as e:
        # Log the full stack trace for unexpected errors
        logger.exception("Unexpected error in get_hired_agents",
                        exception_type=type(e).__name__,
                        error_message=str(e),
                        current_user_id=str(current_user.id) if current_user else None)
        return StandardJSONResponse(StandardResponse(
            success=False,
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            message=f"An unexpected error occurred: {str(e)}",
            data=None
        ))

@router.get("/{agent_id}", response_model=StandardResponse[HiredAgentResponse], response_class=StandardJSONResponse, status_code=status.HTTP_200_OK)
@profile_async("routes.hired_agents.get_hired_agent")
async def get_hired_agent(
    agent_id: UUID,
    current_user: Profile = Depends(get_current_user,use_cache=True),
    hired_agent_service: HiredAgentService = Depends(get_hired_agent_service,use_cache=True)
):
    """Get a specific hired agent by ID"""
    try:
        
        # Try to get from cache first
        agent_id_str = str(agent_id)
        cached_agent = get_cached_agent(agent_id_str)
        if cached_agent is not None:
            logger.info(f"Returning hired agent {agent_id} from cache")
            return StandardJSONResponse(StandardResponse(
                success=True,
                status_code=status.HTTP_200_OK,
                message="Hired agent retrieved from cache",
                data=cached_agent
            ))
        
        # If not in cache, get from database
        logger.info(f"Cache miss for hired agent {agent_id}, fetching from database")
        agent_response = await hired_agent_service.get_hired_agent_by_id(agent_id)
        
        if agent_response is not None:
            # Store in cache for future requests
            cache_agent(agent_id_str, agent_response)
            logger.info(f"Stored hired agent {agent_id} in cache")
        if agent_response is None:
            return StandardJSONResponse(StandardResponse(
                success=False,
                status_code=status.HTTP_404_NOT_FOUND,
                message="Hired agent not found",
                data=None
            ))
        
        return StandardJSONResponse(StandardResponse(
            success=True,
            status_code=status.HTTP_200_OK,
            message="Hired agent retrieved successfully",
            data=agent_response
        ))
    except HTTPException as e:
        # Convert HTTP exceptions to StandardResponse format
        logger.error("HTTP exception in get_hired_agent",
                    exception_type="HTTPException",
                    status_code=e.status_code,
                    detail=str(e.detail),
                    agent_id=str(agent_id),
                    current_user_id=str(current_user.id) if current_user else None)
        return StandardJSONResponse(StandardResponse(
            success=False,
            status_code=e.status_code,
            message=str(e.detail),
            data=None
        ))
    except Exception as e:
        # Log the full stack trace for unexpected errors
        logger.exception("Unexpected error in get_hired_agent",
                        exception_type=type(e).__name__,
                        error_message=str(e),
                        agent_id=str(agent_id),
                        current_user_id=str(current_user.id) if current_user else None)
        return StandardJSONResponse(StandardResponse(
            success=False,
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            message=f"An unexpected error occurred: {str(e)}",
            data=None
        ))

@router.put("/{agent_id}", response_model=StandardResponse[HiredAgentResponse], response_class=StandardJSONResponse, status_code=status.HTTP_200_OK)
@profile_async("routes.hired_agents.update_hired_agent")
async def update_hired_agent(
    agent_id: UUID,
    agent_update: HiredAgentUpdate,
    current_user: Profile = Depends(get_current_user,use_cache=True),
    hired_agent_service: HiredAgentService = Depends(get_hired_agent_service,use_cache=True)
):
    """Update a hired agent"""
    try:
        
        # Use the service to update the hired agent
        agent_response = await hired_agent_service.update_hired_agent(agent_id, agent_update)
        
        if agent_response is not None:
            # Invalidate both the specific agent cache and the user's list cache
            invalidate_agent_cache(str(agent_id))
            invalidate_user_agents_cache(str(current_user.id))
            logger.info(f"Invalidated cache for hired agent {agent_id} after update")
        if agent_response is None:
            logger.warning("Hired agent not found for update",
                          agent_id=str(agent_id),
                          current_user_id=str(current_user.id))
            return StandardJSONResponse(StandardResponse(
                success=False,
                status_code=status.HTTP_404_NOT_FOUND,
                message="Hired agent not found",
                data=None
            ))
        
        logger.info("Hired agent updated successfully",
                   agent_id=str(agent_id),
                   current_user_id=str(current_user.id),
                   updated_fields=list(agent_update.model_dump(exclude_unset=True).keys()))
        
        return StandardJSONResponse(StandardResponse(
            success=True,
            status_code=status.HTTP_200_OK,
            message="Hired agent updated successfully",
            data=agent_response
        ))
    except HTTPException as e:
        # Convert HTTP exceptions to StandardResponse format
        logger.error("HTTP exception in update_hired_agent",
                    exception_type="HTTPException",
                    status_code=e.status_code,
                    detail=str(e.detail),
                    agent_id=str(agent_id),
                    current_user_id=str(current_user.id) if current_user else None)
        return StandardJSONResponse(StandardResponse(
            success=False,
            status_code=e.status_code,
            message=str(e.detail),
            data=None
        ))
    except Exception as e:
        # Log the full stack trace for unexpected errors
        logger.exception("Unexpected error in update_hired_agent",
                        exception_type=type(e).__name__,
                        error_message=str(e),
                        agent_id=str(agent_id),
                        current_user_id=str(current_user.id) if current_user else None)
        return StandardJSONResponse(StandardResponse(
            success=False,
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            message=f"An unexpected error occurred: {str(e)}",
            data=None
        ))

@router.delete("/{agent_id}", response_model=StandardResponse, response_class=StandardJSONResponse, status_code=status.HTTP_200_OK)
@profile_async("routes.hired_agents.delete_hired_agent")
async def delete_hired_agent(
    agent_id: UUID,
    current_user: Profile = Depends(get_current_user,use_cache=True),
    hired_agent_service: HiredAgentService = Depends(get_hired_agent_service,use_cache=True)
):
    """Delete a hired agent"""
    try:
        # Use the service to delete the hired agent
        success = await hired_agent_service.delete_hired_agent(agent_id)

        
        if success:
            # Invalidate both the specific agent cache and the user's list cache
            invalidate_agent_cache(str(agent_id))
            invalidate_user_agents_cache(str(current_user.id))
            logger.info(f"Invalidated cache for hired agent {agent_id} after deletion")
        if not success:
            logger.warning("Hired agent deleted",
                          agent_id=str(agent_id),
                          current_user_id=str(current_user.id))
            return StandardJSONResponse(StandardResponse(
                success=False,
                status_code=status.HTTP_404_NOT_FOUND,
                message="Hired agent not found",
                data=None
            ))
        
        logger.info("Hired agent deleted successfully",
                   agent_id=str(agent_id),
                   current_user_id=str(current_user.id))
        return StandardJSONResponse(StandardResponse(
            success=True,
            status_code=status.HTTP_200_OK,
            message="Hired agent deleted successfully",
            data=None
        ))
    except HTTPException as e:
        # Convert HTTP exceptions to StandardResponse format
        logger.error("HTTP exception in delete_hired_agent",
                    exception_type="HTTPException",
                    status_code=e.status_code,
                    detail=str(e.detail),
                    agent_id=str(agent_id),
                    current_user_id=str(current_user.id) if current_user else None)
        return StandardJSONResponse(StandardResponse(
            success=False,
            status_code=e.status_code,
            message=str(e.detail),
            data=None
        ))
    except Exception as e:
        # Log the full stack trace for unexpected errors
        logger.exception("Unexpected error in delete_hired_agent",
                        exception_type=type(e).__name__,
                        error_message=str(e),
                        agent_id=str(agent_id),
                        current_user_id=str(current_user.id) if current_user else None)
        return StandardJSONResponse(StandardResponse(
            success=False,
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            message=f"An unexpected error occurred: {str(e)}",
            data=None
        ))
