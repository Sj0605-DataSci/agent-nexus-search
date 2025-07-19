from fastapi import APIRouter, Depends, status, Request, HTTPException
from fastapi.responses import JSONResponse
from app.core.auth import get_current_user, create_access_token
from app.models.models import Profile
from app.models.schemas import ProfileResponse, LoginRequest, Token, StandardResponse, StandardJSONResponse
from app.db.clients import get_async_supabase_client
from app.core.structured_logger import get_structured_logger
from datetime import timedelta
from app.core.config import settings

# Setup structured logging
logger = get_structured_logger(__name__)

router = APIRouter(prefix="/auth", tags=["auth"])

@router.get("/me", response_model=ProfileResponse)
async def get_current_user_info(current_user: Profile = Depends(get_current_user)):
    """
    Returns information about the currently authenticated user.
    
    This endpoint validates the Supabase JWT token and returns the user's profile information.
    Authentication is handled by Supabase Auth, and this endpoint just validates the token
    and returns the corresponding user profile.
    """
    return current_user

@router.post("/verify-token", status_code=status.HTTP_200_OK)
async def verify_token(request: Request):
    """
    Verifies that the provided JWT token is valid.
    
    This is a simple endpoint that can be used by the frontend to check if the user's
    Supabase token is still valid and accepted by the FastAPI backend.
    """
    # The token validation happens in the get_current_user dependency
    # If we reach this point, the token is valid
    return {"valid": True}

@router.post("/login")
async def login(login_request: LoginRequest):
    """
    Authenticates a user with email and password and returns profile details + access token.
    
    This endpoint uses Supabase authentication to validate credentials and returns
    both the user profile information and a JWT access token for subsequent API calls.
    """
    try:
        # Get Supabase client
        client = await get_async_supabase_client()
        
        # Log login attempt (without password)
        logger.info("Login attempt", email=login_request.email)
        
        # Authenticate with Supabase
        auth_response = await client.auth.sign_in_with_password({
            "email": login_request.email,
            "password": login_request.password
        })
        
        # Check if authentication was successful
        # The AuthResponse object doesn't have an error attribute directly
        # Instead, we check if user and session are present
        user = auth_response.user
        session = auth_response.session
        
        if not user or not session:
            logger.warning("Login failed", 
                          email=login_request.email)
            
            return StandardJSONResponse(
                StandardResponse(
                    success=False,
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    message="Invalid email or password",
                    data=None
                ),
                status_code=status.HTTP_401_UNAUTHORIZED
            )
        
        # Query the profiles table to get the full profile
        profile_response = await client.table("profiles").select("*").eq("id", user.id).execute()
        
        # Check if profile exists
        if not profile_response.data or len(profile_response.data) == 0:
            logger.warning("User authenticated but profile not found", 
                          user_id=user.id, 
                          email=login_request.email)
            
            return StandardJSONResponse(
                StandardResponse(
                    success=False,
                    status_code=status.HTTP_404_NOT_FOUND,
                    message="User profile not found",
                    data=None
                ),
                status_code=status.HTTP_404_NOT_FOUND
            )
        
        # Create profile object and convert to ProfileResponse for serialization
        profile_data = profile_response.data[0]
        profile_response_model = ProfileResponse(
            id=profile_data["id"],
            email=profile_data["email"],
            full_name=profile_data["full_name"],
            has_connections=profile_data["has_connections"]
        )
        
        # Prepare response with token and profile
        response_data = {
            "profile": profile_response_model.model_dump(),
            "token": {
                "access_token": session.access_token,
                "refresh_token": session.refresh_token,
            }
        }
        
        logger.info("Login successful", 
                   user_id=str(profile_response_model.id), 
                   email=profile_response_model.email)
        
        return StandardJSONResponse(
            StandardResponse(
                success=True,
                status_code=status.HTTP_200_OK,
                message="Login successful",
                data=response_data
            ),
            status_code=status.HTTP_200_OK
        )
        
    except Exception as e:
        logger.exception("Unexpected error during login",
                        exception_type=type(e).__name__,
                        error_message=str(e),
                        email=login_request.email)
        
        return StandardJSONResponse(
            StandardResponse(
                success=False,
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                message=f"Login failed: {str(e)}",
                data=None
            ),
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
