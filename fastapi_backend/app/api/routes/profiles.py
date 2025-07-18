from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status
from app.core.auth import get_current_user
from app.db.clients import get_async_supabase_client
from app.models.models import Profile
from app.models.schemas import ProfileCreate, ProfileResponse, ProfileUpdate
from app.core.structured_logger import get_structured_logger

logger = get_structured_logger(__name__)

router = APIRouter(prefix="/profiles", tags=["profiles"])

@router.post("", response_model=ProfileResponse, status_code=status.HTTP_201_CREATED)
async def create_profile(
    profile: ProfileCreate,
    current_user: Profile = Depends(get_current_user)
):
    """
    Create a new user profile.
    
    This endpoint is typically called after a user is created in the auth system.
    """
    # Check if profile already exists
    client = await get_async_supabase_client()
    existing_profile = await client.table("profiles").select("*").eq("id", current_user.id).execute()
    if existing_profile.data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Profile already exists"
        )
    
    await client.table("profiles").insert(profile.model_dump()).execute()
    return profile

@router.get("", response_model=ProfileResponse)
def get_my_profile(
    current_user: Profile = Depends(get_current_user)
):
    """Get the current user's profile"""
    return current_user

@router.put("", response_model=ProfileResponse)
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
            return ProfileResponse(**updated_profile.data)
        
        # Fallback to returning the current user if we can't get the updated profile
        logger.warning("Could not retrieve updated profile, using current user data", 
                      user_id=str(current_user.id))
        return current_user
    except Exception as e:
        logger.exception("Error updating profile",
                        exception_type=type(e).__name__,
                        error_message=str(e),
                        user_id=str(current_user.id))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error updating profile: {str(e)}"
        )
