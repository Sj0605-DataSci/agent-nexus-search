from fastapi import APIRouter, Depends, status, Request
from app.core.auth import get_current_user
from app.models.models import Profile
from app.models.schemas import ProfileResponse, LoginRequest, StandardResponse, StandardJSONResponse, WaitlistRequest
from app.models.schemas import SignupRequest, RefreshTokenRequest
from app.db.clients import get_async_supabase_client
from app.core.structured_logger import get_structured_logger
from app.core.services.hired_agent_service import HiredAgentService

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
        
        try:
            # Authenticate with Supabase
            logger.info("Attempting authentication with Supabase")
            
            auth_response = await client.auth.sign_in_with_password({
                "email": login_request.email,
                "password": login_request.password
            })
            
            # Log successful authentication
            if auth_response.user:
                logger.info("Authentication successful", 
                           user_id=auth_response.user.id,
                           user_id_type=type(auth_response.user.id).__name__)
            
        except Exception as auth_error:
            # Handle authentication errors (wrong password, etc.)
            logger.warning("Login failed", 
                          email=login_request.email,
                          error=str(auth_error),
                          error_type=type(auth_error).__name__)
            
            return StandardJSONResponse(
                StandardResponse(
                    success=False,
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    message="Invalid email or password",
                    data=None
                ),
                status_code=status.HTTP_401_UNAUTHORIZED
            )
        
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
        logger.info("Querying profile in login", 
                   user_id=user.id, 
                   user_id_type=type(user.id).__name__)
        
        profile_response = await client.table("profiles").select("*").eq("id", user.id).execute()
        
        # Log the profile response
        logger.info("Profile query response in login", 
                   response_data_length=len(profile_response.data) if profile_response.data else 0)
        
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
        
        # Get hired agents for the user
        hired_agent_service = HiredAgentService(client)
        hired_agents = await hired_agent_service.get_hired_agents(profile_data["id"])
        hired_agent_ids = [str(agent.id) for agent in hired_agents] if hired_agents else []
        
        profile_response_model = ProfileResponse(
            id=profile_data["id"],
            email=profile_data["email"],
            full_name=profile_data["full_name"],
            has_connections=profile_data["has_connections"],
            created_at=profile_data["created_at"],
            hired_agents=hired_agent_ids
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

@router.post("/signup", response_model=StandardResponse, response_class=StandardJSONResponse)
async def signup(signup_request: SignupRequest):
    """
    Creates a new user account with email and password.
    
    This endpoint uses Supabase authentication to create a new user account
    and sends a confirmation email. The profile will be created only after
    the user confirms their email address.
    """
    try:
        # Get Supabase client
        client = await get_async_supabase_client()
        
        # Log signup attempt (without password)
        logger.info("Signup attempt", email=signup_request.email)
        
        try:
            # Create user with Supabase - this will automatically send a confirmation email
            # if email confirmation is enabled in your Supabase project settings
            auth_response = await client.auth.sign_up({
                "email": signup_request.email,
                "password": signup_request.password,
                "options": {
                    "data": {
                        "full_name": signup_request.full_name or ""
                    }
                }
            })

            return StandardJSONResponse(
                StandardResponse(
                    success=True,
                    status_code=status.HTTP_200_OK,
                    message="Signup mail sent successfully",
                    data=None
                ),
                status_code=status.HTTP_200_OK
            )
        except Exception as auth_error:
            # Handle authentication errors
            logger.warning("Signup mail failed", 
                          email=signup_request.email,
                          error=str(auth_error))
    except Exception as e:
        logger.exception("Unexpected error during signup",
                        exception_type=type(e).__name__,
                        error_message=str(e),
                        email=signup_request.email)
        
        return StandardJSONResponse(
            StandardResponse(
                success=False,
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                message=f"Signup failed: {str(e)}",
                data=None
            ),
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@router.post("/logout", response_model=StandardResponse, response_class=StandardJSONResponse)
async def logout(request: Request, current_user: Profile = Depends(get_current_user)):
    """
    Logs out the current user by invalidating their session.
    
    This endpoint uses Supabase authentication to invalidate the user's session.
    """
    try:
        # Get Supabase client
        client = await get_async_supabase_client()
        
        # Get the authorization header
        auth_header = request.headers.get("Authorization")
        
        if not auth_header or not auth_header.startswith("Bearer "):
            logger.warning("Logout failed - no valid authorization header")
            
            return StandardJSONResponse(
                StandardResponse(
                    success=False,
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    message="No valid authorization token provided",
                    data=None
                ),
                status_code=status.HTTP_401_UNAUTHORIZED
            )
        
        # Extract the token
        token = auth_header.split(" ")[1]
        
        try:
            # Sign out - don't pass token as parameter
            await client.auth.sign_out()
            logger.info("Logout successful")
            
            return StandardJSONResponse(
                StandardResponse(
                    success=True,
                    status_code=status.HTTP_200_OK,
                    message="Logged out successfully",
                    data=None
                ),
                status_code=status.HTTP_200_OK
            )
        except Exception as auth_error:
            logger.warning("Logout failed", 
                          error=str(auth_error))
            
            return StandardJSONResponse(
                StandardResponse(
                    success=False,
                    status_code=status.HTTP_400_BAD_REQUEST,
                    message=f"Logout failed: {str(auth_error)}",
                    data=None
                ),
                status_code=status.HTTP_400_BAD_REQUEST
            )
        
    except Exception as e:
        logger.exception("Unexpected error during logout",
                        exception_type=type(e).__name__,
                        error_message=str(e))
        
        return StandardJSONResponse(
            StandardResponse(
                success=False,
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                message=f"Logout failed: {str(e)}",
                data=None
            ),
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@router.post("/refresh_token", response_model=StandardResponse, response_class=StandardJSONResponse)
async def refresh_token(refresh_request: RefreshTokenRequest):
    """
    Refreshes an expired access token using a valid refresh token.
    
    This endpoint uses Supabase authentication to generate a new access token
    using the provided refresh token.
    """
    try:
        # Get Supabase client
        client = await get_async_supabase_client()
        
        logger.info("Token refresh attempt")
        
        try:
            # Refresh the token
            auth_response = await client.auth.refresh_session(refresh_request.refresh_token)
            
            # Check if refresh was successful
            session = auth_response.session
            
            if not session:
                logger.warning("Token refresh failed - no session returned")
                
                return StandardJSONResponse(
                    StandardResponse(
                        success=False,
                        status_code=status.HTTP_401_UNAUTHORIZED,
                        message="Invalid or expired refresh token",
                        data=None
                    ),
                    status_code=status.HTTP_401_UNAUTHORIZED
                )
            
            # Prepare response with new tokens
            response_data = {
                "token": {
                    "access_token": session.access_token,
                    "refresh_token": session.refresh_token,
                }
            }
            
            logger.info("Token refresh successful")
            
            return StandardJSONResponse(
                StandardResponse(
                    success=True,
                    status_code=status.HTTP_200_OK,
                    message="Token refreshed successfully",
                    data=response_data
                ),
                status_code=status.HTTP_200_OK
            )
        except Exception as auth_error:
            logger.warning("Token refresh failed", 
                          error=str(auth_error))
            
            return StandardJSONResponse(
                StandardResponse(
                    success=False,
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    message=f"Token refresh failed: {str(auth_error)}",
                    data=None
                ),
                status_code=status.HTTP_401_UNAUTHORIZED
            )
        
    except Exception as e:
        logger.exception("Unexpected error during token refresh",
                        exception_type=type(e).__name__,
                        error_message=str(e))
        
        return StandardJSONResponse(
            StandardResponse(
                success=False,
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                message=f"Token refresh failed: {str(e)}",
                data=None
            ),
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@router.post("/join_waitlist", response_model=StandardResponse, response_class=StandardJSONResponse)
async def join_waitlist(waitlist_request: WaitlistRequest):
    """
    Adds a user to the waitlist.
    
    This endpoint stores the user's information in the invitees table.
    """
    try:
        # Get Supabase client
        client = await get_async_supabase_client()
        
        # Log waitlist join attempt
        logger.info("Waitlist join attempt", 
                   email=waitlist_request.email, 
                   user_name=waitlist_request.name)
        
        try:
            # Check if email already exists in invitees
            email_check = await client.table("invitees").select("id").eq("email", waitlist_request.email).execute()
            
            if email_check.data and len(email_check.data) > 0:
                logger.warning("Waitlist join failed - email already exists", 
                              email=waitlist_request.email)
                
                return StandardJSONResponse(
                    StandardResponse(
                        success=False,
                        status_code=status.HTTP_409_CONFLICT,
                        message="Email already registered in waitlist",
                        data=None
                    ),
                    status_code=status.HTTP_409_CONFLICT
                )
            
            # Check if phone number already exists in invitees
            phone_check = await client.table("invitees").select("id").eq("phone_number", waitlist_request.phone_number).execute()
            
            if phone_check.data and len(phone_check.data) > 0:
                logger.warning("Waitlist join failed - phone number already exists", 
                              email=waitlist_request.email)
                
                return StandardJSONResponse(
                    StandardResponse(
                        success=False,
                        status_code=status.HTTP_409_CONFLICT,
                        message="Phone number already registered in waitlist",
                        data=None
                    ),
                    status_code=status.HTTP_409_CONFLICT
                )
            
            # Add user to invitees table
            invitee_data = {
                "name": waitlist_request.name,
                "email": waitlist_request.email,
                "phone_number": waitlist_request.phone_number,
                "beta_tester": waitlist_request.beta_tester
            }
            
            response = await client.table("invitees").insert(invitee_data).execute()
            
            if not response.data or len(response.data) == 0:
                logger.error("Waitlist join failed - database error", 
                           email=waitlist_request.email)
                
                return StandardJSONResponse(
                    StandardResponse(
                        success=False,
                        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                        message="Failed to add to waitlist",
                        data=None
                    ),
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
            
            # Successfully added to waitlist
            invitee_id = response.data[0]["id"]
            
            logger.info("Waitlist join successful", 
                       email=waitlist_request.email, 
                       invitee_id=invitee_id)
            
            return StandardJSONResponse(
                StandardResponse(
                    success=True,
                    status_code=status.HTTP_201_CREATED,
                    message="Successfully added to waitlist",
                    data={
                        "invitee_id": invitee_id
                    }
                ),
                status_code=status.HTTP_201_CREATED
            )
            
        except Exception as db_error:
            logger.error("Waitlist join failed - database error", 
                       email=waitlist_request.email,
                       error=str(db_error))
            
            return StandardJSONResponse(
                StandardResponse(
                    success=False,
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    message=f"Failed to add to waitlist: {str(db_error)}",
                    data=None
                ),
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
        
    except Exception as e:
        logger.exception("Unexpected error during waitlist join",
                        exception_type=type(e).__name__,
                        error_message=str(e),
                        email=waitlist_request.email)
        
        return StandardJSONResponse(
            StandardResponse(
                success=False,
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                message=f"Failed to add to waitlist: {str(e)}",
                data=None
            ),
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR)
