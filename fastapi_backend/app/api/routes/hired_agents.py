from typing import List
from uuid import UUID
import logging
import traceback
from fastapi import APIRouter, Depends, HTTPException, status, Query, Request

from app.core.auth import get_current_user
from app.db.clients import get_async_supabase_client
from app.models.models import Profile
from app.models.schemas import HiredAgentCreate, HiredAgentResponse, HiredAgentUpdate, StandardResponse, StandardJSONResponse
from app.core.services.hired_agent_service import HiredAgentService

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/hired_agents", tags=["hired_agents"])

# Using StandardJSONResponse from schemas.py

@router.post("", response_model=StandardResponse[HiredAgentResponse], response_class=StandardJSONResponse, status_code=status.HTTP_201_CREATED)
async def hire_agent(
    request: Request,
    agent: HiredAgentCreate,
    current_user: Profile = Depends(get_current_user)
):
    """Hire a new agent for the user"""
    try:
        logger.info(f"Hire agent request received: {agent.model_dump()}")
        logger.info(f"Current user: {current_user.id if current_user else 'None'}")
        
        # Log request headers for debugging
        logger.info(f"Request headers: {request.headers}")
        
        # Initialize the service
        service = HiredAgentService(client=await get_async_supabase_client())
        
        # Use the service to hire the agent
        agent_response = service.hire_agent(agent, current_user)
        
        return StandardJSONResponse(StandardResponse(
            success=True,
            status_code=status.HTTP_201_CREATED,
            message="Agent hired successfully",
            data=agent_response
        ))
    except HTTPException as e:
        # Convert HTTP exceptions to StandardResponse format
        logger.error(f"HTTP Exception in hire_agent: {e.detail}")
        return StandardJSONResponse(StandardResponse(
            success=False,
            status_code=e.status_code,
            message=str(e.detail),
            data=None
        ))
    except Exception as e:
        # Log the full stack trace for unexpected errors
        logger.error(f"Unexpected error in hire_agent: {str(e)}")
        logger.error(traceback.format_exc())
        return StandardJSONResponse(StandardResponse(
            success=False,
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            message=f"An unexpected error occurred: {str(e)}",
            data=None
        ))

@router.get("", response_model=StandardResponse[List[HiredAgentResponse]], response_class=StandardJSONResponse, status_code=status.HTTP_200_OK)
async def get_hired_agents(
    request: Request,
    user_id: UUID = Query(None),
    current_user: Profile = Depends(get_current_user)
):
    """Get all hired agents for a user"""
    try:
        logger.info(f"Get hired agents request received")
        logger.info(f"Request headers: {request.headers}")
        logger.info(f"Query params: user_id={user_id}")
        logger.info(f"Current user: {current_user.id if current_user else 'None'}")
        
        # Initialize the service
        service = HiredAgentService(client=await get_async_supabase_client())
        
        # Use the service to get hired agents
        agent_responses = await service.get_hired_agents(user_id, current_user)
        
        return StandardJSONResponse(StandardResponse(
            success=True,
            status_code=status.HTTP_200_OK,
            message="Hired agents retrieved successfully",
            data=agent_responses
        ))
    except HTTPException as e:
        # Convert HTTP exceptions to StandardResponse format
        logger.error(f"HTTP Exception in get_hired_agents: {e.detail}")
        return StandardJSONResponse(StandardResponse(
            success=False,
            status_code=e.status_code,
            message=str(e.detail),
            data=None
        ))
    except Exception as e:
        # Log the full stack trace for unexpected errors
        logger.error(f"Unexpected error in get_hired_agents: {str(e)}")
        logger.error(traceback.format_exc())
        return StandardJSONResponse(StandardResponse(
            success=False,
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            message=f"An unexpected error occurred: {str(e)}",
            data=None
        ))

@router.get("/{agent_id}", response_model=StandardResponse[HiredAgentResponse], response_class=StandardJSONResponse, status_code=status.HTTP_200_OK)
async def get_hired_agent(
    agent_id: UUID,
    current_user: Profile = Depends(get_current_user)
):
    """Get a specific hired agent by ID"""
    try:
        # Initialize the service
        service = HiredAgentService(client=await get_async_supabase_client())
        
        # Use the service to get the hired agent
        agent_response = await service.get_hired_agent_by_id(agent_id, current_user)
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
        logger.error(f"HTTP Exception in get_hired_agent: {e.detail}")
        return StandardJSONResponse(StandardResponse(
            success=False,
            status_code=e.status_code,
            message=str(e.detail),
            data=None
        ))
    except Exception as e:
        # Log the full stack trace for unexpected errors
        logger.error(f"Unexpected error in get_hired_agent: {str(e)}")
        logger.error(traceback.format_exc())
        return StandardJSONResponse(StandardResponse(
            success=False,
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            message=f"An unexpected error occurred: {str(e)}",
            data=None
        ))

@router.put("/{agent_id}", response_model=StandardResponse[HiredAgentResponse], response_class=StandardJSONResponse, status_code=status.HTTP_200_OK)
async def update_hired_agent(
    agent_id: UUID,
    agent_update: HiredAgentUpdate,
    current_user: Profile = Depends(get_current_user)
):
    """Update a hired agent"""
    try:
        # Initialize the service
        service = HiredAgentService(client=await get_async_supabase_client())
        
        # Use the service to update the hired agent
        agent_response = await service.update_hired_agent(agent_id, agent_update, current_user)
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
            message="Hired agent updated successfully",
            data=agent_response
        ))
    except HTTPException as e:
        # Convert HTTP exceptions to StandardResponse format
        logger.error(f"HTTP Exception in update_hired_agent: {e.detail}")
        return StandardJSONResponse(StandardResponse(
            success=False,
            status_code=e.status_code,
            message=str(e.detail),
            data=None
        ))
    except Exception as e:
        # Log the full stack trace for unexpected errors
        logger.error(f"Unexpected error in update_hired_agent: {str(e)}")
        logger.error(traceback.format_exc())
        return StandardJSONResponse(StandardResponse(
            success=False,
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            message=f"An unexpected error occurred: {str(e)}",
            data=None
        ))

@router.delete("/{agent_id}", response_model=StandardResponse[None], response_class=StandardJSONResponse, status_code=status.HTTP_200_OK)
async def delete_hired_agent(
    agent_id: UUID,
    current_user: Profile = Depends(get_current_user)
):
    """Delete a hired agent"""
    try:
        # Initialize the service
        service = HiredAgentService(client=await get_async_supabase_client())
        
        # Use the service to delete the hired agent
        success = await service.delete_hired_agent(agent_id, current_user)
        if not success:
            return StandardJSONResponse(StandardResponse(
                success=False,
                status_code=status.HTTP_404_NOT_FOUND,
                message="Hired agent not found",
                data=None
            ))
        
        return StandardJSONResponse(StandardResponse(
            success=True,
            status_code=status.HTTP_200_OK,
            message="Hired agent deleted successfully",
            data=None
        ))
    except HTTPException as e:
        # Convert HTTP exceptions to StandardResponse format
        logger.error(f"HTTP Exception in delete_hired_agent: {e.detail}")
        return StandardJSONResponse(StandardResponse(
            success=False,
            status_code=e.status_code,
            message=str(e.detail),
            data=None
        ))
    except Exception as e:
        # Log the full stack trace for unexpected errors
        logger.error(f"Unexpected error in delete_hired_agent: {str(e)}")
        logger.error(traceback.format_exc())
        return StandardJSONResponse(StandardResponse(
            success=False,
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            message=f"An unexpected error occurred: {str(e)}",
            data=None
        ))
