from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status
from app.core.auth import get_current_user
from app.db.clients import get_async_supabase_client
from app.models.models import Profile
from app.models.schemas import ProfileCreate, ProfileResponse, ProfileUpdate, StandardResponse, StandardJSONResponse
from app.core.structured_logger import get_structured_logger
from app.core.services.hired_agent_service import HiredAgentService

logger = get_structured_logger(__name__)

router = APIRouter(prefix="/profiles", tags=["profiles"])

async def get_hired_agent_service():
    """
    Dependency to get a HiredAgentService instance.
    This helps reduce the overhead of creating a new service for each request.
    """
    client = await get_async_supabase_client()
    return HiredAgentService(client=client)

@router.post("", response_model=StandardResponse[ProfileResponse], response_class=StandardJSONResponse, status_code=status.HTTP_201_CREATED)
async def create_profile(
    profile: ProfileCreate,
    current_user: Profile = Depends(get_current_user)
):
    """
    Create a new user profile.
    
    This endpoint is typically called after a user is created in the auth system.
    """
    try:
        # Check if profile already exists
        client = await get_async_supabase_client()
        existing_profile = await client.table("profiles").select("*").eq("id", current_user.id).execute()
        if existing_profile.data:
            logger.warning("Profile creation failed - profile already exists",
                         user_id=str(current_user.id))
            return StandardJSONResponse(StandardResponse(
                success=False,
                status_code=status.HTTP_400_BAD_REQUEST,
                message="Profile already exists",
                data=None
            ), status_code=status.HTTP_400_BAD_REQUEST)
        
        # Create the profile
        await client.table("profiles").insert(profile.model_dump()).execute()
        
        logger.info("Profile created successfully",
                   user_id=str(current_user.id))
        
        return StandardJSONResponse(StandardResponse(
            success=True,
            status_code=status.HTTP_201_CREATED,
            message="Profile created successfully",
            data=profile
        ), status_code=status.HTTP_201_CREATED)
    except Exception as e:
        logger.exception("Error creating profile",
                        exception_type=type(e).__name__,
                        error_message=str(e),
                        user_id=str(current_user.id))
        return StandardJSONResponse(StandardResponse(
            success=False,
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            message=f"Error creating profile: {str(e)}",
            data=None
        ), status_code=status.HTTP_500_INTERNAL_SERVER_ERROR)

@router.get("", response_model=StandardResponse[ProfileResponse], response_class=StandardJSONResponse)
async def get_my_profile(
    current_user: Profile = Depends(get_current_user),
    hired_agent_service: HiredAgentService = Depends(get_hired_agent_service)
):
    """Get the current user's profile"""
    try:
        # Get hired agents for the user
        hired_agents = await hired_agent_service.get_hired_agents(str(current_user.id))
        
        # Convert Profile model to ProfileResponse for proper serialization
        profile_data = {
            "id": str(current_user.id),
            "full_name": current_user.full_name,
            "email": current_user.email,
            "created_at": current_user.created_at,
            "updated_at": current_user.updated_at
        }
        
        # Extract hired agent IDs
        hired_agent_ids = [str(agent.id) for agent in hired_agents] if hired_agents else []
        profile_data["hired_agents"] = hired_agent_ids
        
        profile_response = ProfileResponse(**profile_data)
        
        logger.info("Profile retrieved successfully",
                   user_id=str(current_user.id))
        
        return StandardJSONResponse(StandardResponse(
            success=True,
            status_code=status.HTTP_200_OK,
            message="Profile retrieved successfully",
            data=profile_response
        ))
    except Exception as e:
        logger.exception("Error retrieving profile",
                        exception_type=type(e).__name__,
                        error_message=str(e),
                        user_id=str(current_user.id))
        return StandardJSONResponse(StandardResponse(
            success=False,
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            message=f"Error retrieving profile: {str(e)}",
            data=None
        ), status_code=status.HTTP_500_INTERNAL_SERVER_ERROR)

@router.put("", response_model=StandardResponse[ProfileResponse], response_class=StandardJSONResponse)
async def update_my_profile(
    profile_update: ProfileUpdate,
    current_user: Profile = Depends(get_current_user)
):
    """Update the current user's profile"""
    try:
        # Log the update request with fields being updated
        update_fields = {k: v for k, v in profile_update.model_dump().items() if v is not None}
        logger.info("Profile update requested", 
                   user_id=str(current_user.id),
                   update_fields=list(update_fields.keys()))
        
        client = await get_async_supabase_client()
        
        # Only include fields that are not None in the update
        update_data = {}
        if profile_update.full_name is not None:
            update_data["full_name"] = profile_update.full_name
        if profile_update.email is not None:
            update_data["email"] = profile_update.email
        
        # Only perform update if there are fields to update
        if update_data:
            await client.table("profiles").update(update_data).eq("id", current_user.id).execute()
            logger.info("Profile updated successfully", 
                       user_id=str(current_user.id),
                       fields_updated=list(update_data.keys()))
        else:
            logger.info("No fields to update in profile", user_id=str(current_user.id))
        
        # Get the updated profile to return
        updated_profile = await client.table("profiles").select("*").eq("id", current_user.id).single().execute()
        
        if updated_profile.data:
            return StandardJSONResponse(StandardResponse(
                success=True,
                status_code=status.HTTP_200_OK,
                message="Profile updated successfully",
                data=ProfileResponse(**updated_profile.data)
            ))
        
        # Fallback to returning the current user if we can't get the updated profile
        logger.warning("Could not retrieve updated profile, using current user data", 
                      user_id=str(current_user.id))
        return StandardJSONResponse(StandardResponse(
            success=True,
            status_code=status.HTTP_200_OK,
            message="Profile updated successfully (using current data)",
            data=current_user
        ))
    except Exception as e:
        logger.exception("Error updating profile",
                        exception_type=type(e).__name__,
                        error_message=str(e),
                        user_id=str(current_user.id))
        return StandardJSONResponse(StandardResponse(
            success=False,
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            message=f"Error updating profile: {str(e)}",
            data=None
        ), status_code=status.HTTP_500_INTERNAL_SERVER_ERROR)
