from uuid import UUID
from typing import Dict, Any
import httpx
from fastapi import APIRouter, Depends, HTTPException, status
from app.core.auth import get_current_user, invalidate_profile_cache
from app.core.config import settings
from app.db.clients import get_async_supabase_client
from app.core.utils.cache import (
    get_cached_item, cache_item, invalidate_cache_item,
    get_cached_subscription, cache_subscription, invalidate_subscription_cache,
    get_cached_usage_stats, cache_usage_stats, invalidate_usage_stats_cache
)
from app.models.models import Profile
from app.models.schemas import (
    ProfileCreate, ProfileUpdate, ProfileResponse, StandardResponse, StandardJSONResponse,
    UserSubscriptionResponse, LinkedInTokenRequest, LinkedInTokenResponse,
    LinkedInProfileRequest, LinkedInProfileResponse
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
        
        # Invalidate any cached profile data for this user
        invalidate_profile_cache(current_user.id)
        profile_cache_key = f"profile_data:{str(current_user.id)}"
        invalidate_cache_item(profile_cache_key)
        logger.info(f"Invalidated profile cache for user {str(current_user.id)} after creation")
        
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
        # Try to get data from cache first
        user_id_str = str(current_user.id)
        profile_cache_key = f"profile_data:{user_id_str}"
        cached_profile_data = get_cached_item(profile_cache_key)
        if cached_profile_data is not None:
            logger.info(f"Returning profile from cache for user {user_id_str}")
            # Create ProfileResponse from cached data
            cached_profile_response = ProfileResponse(**cached_profile_data)
            return StandardJSONResponse(StandardResponse(
                success=True,
                status_code=status.HTTP_200_OK,
                message="Profile retrieved from cache",
                data=cached_profile_response
            ))
        
        # If not in cache, create profile response from current_user
        logger.info(f"Cache miss for user {user_id_str}, using current user data")
        profile_data = {
            "id": str(current_user.id),
            "full_name": current_user.full_name,
            "email": current_user.email,
            "created_at": current_user.created_at,
            "updated_at": current_user.updated_at,
            "has_connections": current_user.has_connections,
            "user_subscriptions_id": current_user.user_subscriptions_id,
            "linkedin_url": current_user.linkedin_url,
            "email_subscription": current_user.email_subscription,
            "phone_number": current_user.phone_number
        }
        
        profile_response = ProfileResponse(**profile_data)
        
        # Store serializable data in cache for future requests (not the Pydantic model)
        profile_cache_key = f"profile_data:{user_id_str}"
        cache_item(profile_cache_key, profile_data)
        logger.info(f"Stored profile in cache for user {user_id_str}")
        
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
        if profile_update.phone_number is not None:
            update_data["phone_number"] = profile_update.phone_number    
        
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
            # Invalidate both auth cache and profile cache
            invalidate_profile_cache(current_user.id)
            profile_cache_key = f"profile_data:{str(current_user.id)}"
            invalidate_cache_item(profile_cache_key)
            logger.info(f"Invalidated profile cache for user {str(current_user.id)} after update")
            
            # Cache the updated profile data
            updated_profile_data = {
                "id": str(updated_profile.data["id"]),
                "full_name": updated_profile.data.get("full_name"),
                "email": updated_profile.data.get("email"),
                "created_at": updated_profile.data.get("created_at"),
                "updated_at": updated_profile.data.get("updated_at"),
                "has_connections": updated_profile.data.get("has_connections", "no_data"),
                "user_subscriptions_id": updated_profile.data.get("user_subscriptions_id"),
                "linkedin_url": updated_profile.data.get("linkedin_url"),
                "email_subscription": updated_profile.data.get("email_subscription", False),
                "phone_number": updated_profile.data.get("phone_number")
            }
            cache_item(profile_cache_key, updated_profile_data)
            
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
        # Try to get data from cache first
        user_id_str = str(current_user.id)
        cached_subscription = get_cached_subscription(user_id_str)
        if cached_subscription is not None:
            logger.info(f"Returning subscription from cache for user {user_id_str}")
            return StandardJSONResponse(StandardResponse(
                success=True,
                status_code=status.HTTP_200_OK,
                message="Subscription retrieved from cache",
                data=cached_subscription
            ))
        
        # If not in cache, get from database
        logger.info(f"Cache miss for subscription {user_id_str}, fetching from database")
        subscription = await credit_service.get_user_subscription_optimized(current_user.id)
        
        if not subscription:
            return StandardJSONResponse(StandardResponse(
                success=False,
                status_code=status.HTTP_404_NOT_FOUND,
                message="Subscription not found",
                data=None
            ), status_code=status.HTTP_404_NOT_FOUND)
        
        # Store in cache for future requests
        cache_subscription(user_id_str, subscription)
        logger.info(f"Stored subscription in cache for user {user_id_str}")
        
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
        
        # Try to get data from cache first
        user_id_str = str(current_user.id)
        cache_key = f"{user_id_str}:{days}"
        cached_stats = get_cached_usage_stats(cache_key)
        if cached_stats is not None:
            logger.info(f"Returning usage stats from cache for user {user_id_str}, days {days}")
            return StandardJSONResponse(StandardResponse(
                success=True,
                status_code=status.HTTP_200_OK,
                message="Usage statistics retrieved from cache",
                data=cached_stats
            ))
        
        # If not in cache, get from database
        logger.info(f"Cache miss for usage stats {cache_key}, fetching from database")
        usage_stats = await credit_service.get_usage_stats(current_user.id, days)
        
        # Store in cache for future requests
        cache_usage_stats(cache_key, usage_stats)
        logger.info(f"Stored usage stats in cache for key {cache_key}")
        
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
        
        # Invalidate subscription and usage stats caches after credit addition
        invalidate_subscription_cache(current_user.id)
        invalidate_usage_stats_cache(current_user.id)
        logger.info(f"Invalidated subscription and usage stats cache for user {str(current_user.id)} after adding credits")
        
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
        valid_tiers = ["Hunter", "Pro", "Enterprise","Community"]
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
        
        # Invalidate subscription and usage stats caches after tier upgrade
        invalidate_subscription_cache(current_user.id)
        invalidate_usage_stats_cache(current_user.id)
        logger.info(f"Invalidated subscription and usage stats cache for user {str(current_user.id)} after tier upgrade")
        
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


# LinkedIn OAuth Endpoints

@router.post("/linkedin/token", response_model=StandardResponse[LinkedInTokenResponse], response_class=StandardJSONResponse)
@profile_async("routes.profiles.linkedin_token_exchange")
async def linkedin_token_exchange(token_request: LinkedInTokenRequest):
    """
    Exchange LinkedIn OAuth authorization code for access token.
    
    This endpoint handles the OAuth token exchange flow for LinkedIn integration.
    """
    try:
        logger.info("LinkedIn token exchange request received",
                   code_present=bool(token_request.code),
                   redirect_uri=token_request.redirect_uri)

        if not settings.LINKEDIN_CLIENT_ID or not settings.LINKEDIN_CLIENT_SECRET:
            logger.error("LinkedIn OAuth credentials not configured")
            return StandardJSONResponse(StandardResponse(
                success=False,
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                message="LinkedIn OAuth is not properly configured",
                data=None
            ), status_code=status.HTTP_500_INTERNAL_SERVER_ERROR)

        # Prepare token exchange request
        token_data = {
            "grant_type": "authorization_code",
            "code": token_request.code,
            "redirect_uri": token_request.redirect_uri,
            "client_id": settings.LINKEDIN_CLIENT_ID,
            "client_secret": settings.LINKEDIN_CLIENT_SECRET,
        }

        logger.info("Exchanging code for token with LinkedIn...")

        # Exchange code for access token
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(
                "https://www.linkedin.com/oauth/v2/accessToken",
                data=token_data,
                headers={
                    "Content-Type": "application/x-www-form-urlencoded",
                    "Accept": "application/json",
                }
            )

        if response.status_code != 200:
            logger.error("LinkedIn token exchange failed",
                        status_code=response.status_code,
                        response_text=response.text)
            return StandardJSONResponse(StandardResponse(
                success=False,
                status_code=response.status_code,
                message="LinkedIn token exchange failed",
                data={"details": response.text}
            ), status_code=response.status_code)

        token_data = response.json()
        logger.info("LinkedIn token exchange successful")

        # Return token data
        linkedin_response = LinkedInTokenResponse(
            access_token=token_data.get("access_token"),
            expires_in=token_data.get("expires_in"),
            token_type=token_data.get("token_type", "Bearer"),
            scope=token_data.get("scope")
        )

        return StandardJSONResponse(StandardResponse(
            success=True,
            status_code=status.HTTP_200_OK,
            message="LinkedIn token exchange successful",
            data=linkedin_response
        ))

    except httpx.TimeoutException:
        logger.error("LinkedIn token exchange timeout")
        return StandardJSONResponse(StandardResponse(
            success=False,
            status_code=status.HTTP_408_REQUEST_TIMEOUT,
            message="LinkedIn API request timeout",
            data=None
        ), status_code=status.HTTP_408_REQUEST_TIMEOUT)
    
    except httpx.RequestError as e:
        logger.error("LinkedIn token exchange network error", error=str(e))
        return StandardJSONResponse(StandardResponse(
            success=False,
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            message="Network error connecting to LinkedIn",
            data={"details": str(e)}
        ), status_code=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    except Exception as e:
        logger.exception("LinkedIn token exchange error",
                        exception_type=type(e).__name__,
                        error_message=str(e))
        return StandardJSONResponse(StandardResponse(
            success=False,
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            message=f"Token exchange failed: {str(e)}",
            data=None
        ), status_code=status.HTTP_500_INTERNAL_SERVER_ERROR)


@router.post("/linkedin/profile", response_model=StandardResponse[LinkedInProfileResponse], response_class=StandardJSONResponse)
@profile_async("routes.profiles.linkedin_profile_fetch")
async def linkedin_profile_fetch(profile_request: LinkedInProfileRequest):
    """
    Fetch LinkedIn profile using access token.
    
    This endpoint retrieves the user's LinkedIn profile information using their access token.
    """
    try:
        logger.info("LinkedIn profile fetch request received")

        if not profile_request.access_token:
            return StandardJSONResponse(StandardResponse(
                success=False,
                status_code=status.HTTP_400_BAD_REQUEST,
                message="Access token is required",
                data=None
            ), status_code=status.HTTP_400_BAD_REQUEST)

        # Fetch profile using LinkedIn userinfo endpoint
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(
                "https://api.linkedin.com/v2/userinfo",
                headers={
                    "Authorization": f"Bearer {profile_request.access_token}",
                    "Accept": "application/json",
                }
            )

        if response.status_code != 200:
            logger.error("LinkedIn profile fetch failed",
                        status_code=response.status_code,
                        response_text=response.text)
            return StandardJSONResponse(StandardResponse(
                success=False,
                status_code=response.status_code,
                message="LinkedIn profile fetch failed",
                data={"details": response.text}
            ), status_code=response.status_code)

        profile_data = response.json()
        logger.info("LinkedIn profile fetch successful",
                   profile_id=profile_data.get("sub", "unknown"))

        # Return profile data
        linkedin_response = LinkedInProfileResponse(
            profile=profile_data,
            success=True
        )

        return StandardJSONResponse(StandardResponse(
            success=True,
            status_code=status.HTTP_200_OK,
            message="LinkedIn profile fetch successful",
            data=linkedin_response
        ))

    except httpx.TimeoutException:
        logger.error("LinkedIn profile fetch timeout")
        return StandardJSONResponse(StandardResponse(
            success=False,
            status_code=status.HTTP_408_REQUEST_TIMEOUT,
            message="LinkedIn API request timeout",
            data=None
        ), status_code=status.HTTP_408_REQUEST_TIMEOUT)
    
    except httpx.RequestError as e:
        logger.error("LinkedIn profile fetch network error", error=str(e))
        return StandardJSONResponse(StandardResponse(
            success=False,
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            message="Network error connecting to LinkedIn",
            data={"details": str(e)}
        ), status_code=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    except Exception as e:
        logger.exception("LinkedIn profile fetch error",
                        exception_type=type(e).__name__,
                        error_message=str(e))
        return StandardJSONResponse(StandardResponse(
            success=False,
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            message=f"Profile fetch failed: {str(e)}",
            data=None
        ), status_code=status.HTTP_500_INTERNAL_SERVER_ERROR)
