from uuid import UUID
from typing import Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status
from app.core.auth import get_current_user, invalidate_profile_cache
from app.db.clients import get_async_supabase_client
from app.models.models import Profile
from app.models.schemas import (
    ProfileCreate, ProfileUpdate, ProfileResponse, StandardResponse, StandardJSONResponse,
    UserSubscriptionResponse
)
from app.core.services.credit_service import CreditService
from app.core.profiling import profile_async
from app.core.structured_logger import get_structured_logger

logger = get_structured_logger(__name__)

router = APIRouter(prefix="/profiles", tags=["profiles"])

async def get_credit_service():
    """
    Dependency to get a CreditService instance.
    This helps reduce the overhead of creating a new service for each request.
    """
    client = await get_async_supabase_client()
    return CreditService(client=client)

@router.post("", response_model=StandardResponse[ProfileResponse], response_class=StandardJSONResponse, status_code=status.HTTP_201_CREATED)
@profile_async("routes.profiles.create_profile")
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
@profile_async("routes.profiles.get_my_profile")
async def get_my_profile(
    current_user: Profile = Depends(get_current_user)):
    """Get the current user's profile"""
    try:
        profile_data = {
            "id": str(current_user.id),
            "full_name": current_user.full_name,
            "email": current_user.email,
            "created_at": current_user.created_at,
            "updated_at": current_user.updated_at,
            "has_connections": current_user.has_connections,
            "user_subscriptions_id": current_user.user_subscriptions_id,
            "linkedin_url": current_user.linkedin_url,
            "email_subscription": current_user.email_subscription
        }
        
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
@profile_async("routes.profiles.update_my_profile")
async def update_my_profile(
    profile_update: ProfileUpdate,
    current_user: Profile = Depends(get_current_user)
):
    """Update the current user's profile"""
    try:
        update_fields = {k: v for k, v in profile_update.model_dump().items() if v is not None}
        logger.info("Profile update requested", 
                   user_id=str(current_user.id),
                   update_fields=list(update_fields.keys()))
        
        client = await get_async_supabase_client()
        
        update_data = {}
        if profile_update.full_name is not None:
            update_data["full_name"] = profile_update.full_name
        if profile_update.email is not None:
            update_data["email"] = profile_update.email
        if profile_update.linkedin_url is not None:
            update_data["linkedin_url"] = profile_update.linkedin_url
        if profile_update.email_subscription is not None:
            update_data["email_subscription"] = profile_update.email_subscription    
        
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
            invalidate_profile_cache(current_user.id)
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


# Credit and Subscription Management Endpoints

@router.get("/subscription", response_model=StandardResponse[UserSubscriptionResponse], response_class=StandardJSONResponse)
@profile_async("routes.profiles.get_subscription")
async def get_my_subscription(
    current_user: Profile = Depends(get_current_user),
    credit_service: CreditService = Depends(get_credit_service)
):
    """
    Get the current user's subscription details including credits, tier, and usage stats.
    Uses optimized query with direct profile->subscription relationship.
    """
    try:
        # Use optimized method that leverages the direct foreign key relationship
        subscription = await credit_service.get_user_subscription_optimized(current_user.id)
        
        if not subscription:
            return StandardJSONResponse(StandardResponse(
                success=False,
                status_code=status.HTTP_404_NOT_FOUND,
                message="Subscription not found",
                data=None
            ), status_code=status.HTTP_404_NOT_FOUND)
        
        logger.info("Subscription retrieved successfully (optimized)", user_id=str(current_user.id))
        
        return StandardJSONResponse(StandardResponse(
            success=True,
            status_code=status.HTTP_200_OK,
            message="Subscription retrieved successfully",
            data=subscription
        ))
        
    except Exception as e:
        logger.exception("Error retrieving subscription",
                        exception_type=type(e).__name__,
                        error_message=str(e),
                        user_id=str(current_user.id))
        return StandardJSONResponse(StandardResponse(
            success=False,
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            message=f"Error retrieving subscription: {str(e)}",
            data=None
        ), status_code=status.HTTP_500_INTERNAL_SERVER_ERROR)

@router.get("/usage_stats", response_model=StandardResponse[Dict[str, Any]], response_class=StandardJSONResponse)
@profile_async("routes.profiles.get_usage_stats")
async def get_usage_stats(
    days: int = 30,
    current_user: Profile = Depends(get_current_user),
    credit_service: CreditService = Depends(get_credit_service)
):
    """
    Get the current user's usage statistics for the specified number of days.
    """
    try:
        if days < 1 or days > 365:
            return StandardJSONResponse(StandardResponse(
                success=False,
                status_code=status.HTTP_400_BAD_REQUEST,
                message="Days must be between 1 and 365",
                data=None
            ), status_code=status.HTTP_400_BAD_REQUEST)
        
        usage_stats = await credit_service.get_usage_stats(current_user.id, days)
        
        logger.info("Usage stats retrieved successfully", 
                   user_id=str(current_user.id),
                   days=days)
        
        return StandardJSONResponse(StandardResponse(
            success=True,
            status_code=status.HTTP_200_OK,
            message="Usage statistics retrieved successfully",
            data=usage_stats
        ))
        
    except Exception as e:
        logger.exception("Error retrieving usage stats",
                        exception_type=type(e).__name__,
                        error_message=str(e),
                        user_id=str(current_user.id))
        return StandardJSONResponse(StandardResponse(
            success=False,
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            message=f"Error retrieving usage stats: {str(e)}",
            data=None
        ), status_code=status.HTTP_500_INTERNAL_SERVER_ERROR)


@router.post("/add_credits", response_model=StandardResponse[Dict[str, Any]], response_class=StandardJSONResponse)
@profile_async("routes.profiles.add_credits")
async def add_credits(
    credits: int,
    description: str = "Credit purchase",
    reference_id: str = None,
    current_user: Profile = Depends(get_current_user),
    credit_service: CreditService = Depends(get_credit_service) 
):
    """
    Add credits to the current user's account.
    This endpoint would typically be called after a successful payment.
    """
    try:
        if credits <= 0:
            return StandardJSONResponse(StandardResponse(
                success=False,
                status_code=status.HTTP_400_BAD_REQUEST,
                message="Credits must be greater than 0",
                data=None
            ), status_code=status.HTTP_400_BAD_REQUEST)
        
        if credits > 10000:  # Reasonable upper limit
            return StandardJSONResponse(StandardResponse(
                success=False,
                status_code=status.HTTP_400_BAD_REQUEST,
                message="Cannot add more than 10,000 credits at once",
                data=None
            ), status_code=status.HTTP_400_BAD_REQUEST)
        
        result = await credit_service.add_credits(
            user_id=current_user.id,
            credits=credits,
            description=description,
            reference_id=reference_id
        )
        
        if not result.get("success", False):
            return StandardJSONResponse(StandardResponse(
                success=False,
                status_code=status.HTTP_400_BAD_REQUEST,
                message=result.get("error", "Failed to add credits"),
                data=None
            ), status_code=status.HTTP_400_BAD_REQUEST)
        
        logger.info("Credits added successfully", 
                   user_id=str(current_user.id),
                   credits_added=credits,
                   new_balance=result.get("new_balance", 0))
        
        return StandardJSONResponse(StandardResponse(
            success=True,
            status_code=status.HTTP_200_OK,
            message="Credits added successfully",
            data=result
        ))
        
    except Exception as e:
        logger.exception("Error adding credits",
                        exception_type=type(e).__name__,
                        error_message=str(e),
                        user_id=str(current_user.id))
        return StandardJSONResponse(StandardResponse(
            success=False,
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            message=f"Error adding credits: {str(e)}",
            data=None
        ), status_code=status.HTTP_500_INTERNAL_SERVER_ERROR)


@router.patch("/upgrade_tier", response_model=StandardResponse[Dict[str, Any]], response_class=StandardJSONResponse)
@profile_async("routes.profiles.upgrade_tier")
async def upgrade_tier(
    new_tier: str,
    current_user: Profile = Depends(get_current_user),
    credit_service: CreditService = Depends(get_credit_service)
):
    """
    Upgrade the current user's tier.
    This endpoint would typically be called after a successful subscription payment.
    """
    try:
        valid_tiers = ["free", "pro", "enterprise"]
        if new_tier not in valid_tiers:
            return StandardJSONResponse(StandardResponse(
                success=False,
                status_code=status.HTTP_400_BAD_REQUEST,
                message=f"Invalid tier. Must be one of: {', '.join(valid_tiers)}",
                data=None
            ), status_code=status.HTTP_400_BAD_REQUEST)
        
        result = await credit_service.upgrade_tier(
            user_id=current_user.id,
            new_tier=new_tier
        )
        
        if not result.get("success", False):
            return StandardJSONResponse(StandardResponse(
                success=False,
                status_code=status.HTTP_400_BAD_REQUEST,
                message=result.get("error", "Failed to upgrade tier"),
                data=None
            ), status_code=status.HTTP_400_BAD_REQUEST)
        
        logger.info("Tier upgraded successfully", 
                   user_id=str(current_user.id),
                   old_tier=result.get("old_tier"),
                   new_tier=result.get("new_tier"))
        
        return StandardJSONResponse(StandardResponse(
            success=True,
            status_code=status.HTTP_200_OK,
            message="Tier upgraded successfully",
            data=result
        ))
        
    except Exception as e:
        logger.exception("Error upgrading tier",
                        exception_type=type(e).__name__,
                        error_message=str(e),
                        user_id=str(current_user.id))
        return StandardJSONResponse(StandardResponse(
            success=False,
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            message=f"Error upgrading tier: {str(e)}",
            data=None
        ), status_code=status.HTTP_500_INTERNAL_SERVER_ERROR)
