from fastapi import APIRouter, Depends, status, Request
from typing import Dict
from app.core.auth import get_current_user
from app.models.models import Profile
from app.models.schemas import ProfileResponse, LoginRequest, StandardResponse, StandardJSONResponse, WaitlistRequest
from app.models.schemas import SignupRequest, RefreshTokenRequest, ResetPasswordRequest, UpdatePasswordRequest
from app.db.clients import get_async_supabase_client
from app.core.structured_logger import get_structured_logger
from app.core.profiling import profile_async, AsyncTimer
from supabase.client import AsyncClient
from app.core.config import settings

# Setup structured logging
logger = get_structured_logger(__name__)

router = APIRouter(prefix="/auth", tags=["auth"])

async def get_login_client():
    """
    Dependency to get a AsyncClient instance.
    This helps reduce the overhead of creating a new service for each request.
    """
    client = await get_async_supabase_client()
    return client

@router.get("/me", response_model=ProfileResponse)
@profile_async("auth.get_current_user_info")
async def get_current_user_info(current_user: Profile = Depends(get_current_user)):
    """
    Returns information about the currently authenticated user.
    
    This endpoint validates the Supabase JWT token and returns the user's profile information.
    Authentication is handled by Supabase Auth, and this endpoint just validates the token
    and returns the corresponding user profile.
    """
    return current_user

@router.post("/verify-token", status_code=status.HTTP_200_OK)
@profile_async("auth.verify_token")
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
@profile_async("auth.login")
async def login(login_request: LoginRequest, client: AsyncClient = Depends(get_login_client)):
    """
    Authenticates a user with email and password and returns profile details + access token.
    
    This endpoint uses Supabase authentication to validate credentials and returns
    both the user profile information and a JWT access token for subsequent API calls.
    """
    try:
        # Log login attempt (without password)
        logger.info("Login attempt", email=login_request.email)
        
        try:
            # Authenticate with Supabase
            logger.info("Attempting authentication with Supabase")
            
            async with AsyncTimer("supabase.auth.sign_in_with_password"):
                auth_response = await client.auth.sign_in_with_password(
                    {
                        "email": login_request.email,
                        "password": login_request.password
                    }
                )
            
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
        
        # Prepare response with token and profile
        response_data = {
                "access_token": session.access_token,
                "refresh_token": session.refresh_token,
            }
        
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
@profile_async("auth.signup")
async def signup(signup_request: SignupRequest, client: AsyncClient = Depends(get_login_client)):
    """
    Creates a new user account with email and password.
    
    This endpoint uses Supabase authentication to create a new user account
    and sends a confirmation email. The profile will be created only after
    the user confirms their email address.
    """
    try:
        # Log signup attempt (without password)
        logger.info("Signup attempt", email=signup_request.email)
        
        # Check if email already exists in profiles table
        try:
            async with AsyncTimer("supabase.select.profiles.check_email"):
                email_check = await client.table("profiles").select("id").eq("email", signup_request.email).execute()
            
            if email_check.data and len(email_check.data) > 0:
                logger.warning("Signup failed - email already exists", 
                              email=signup_request.email)
                
                return StandardJSONResponse(
                    StandardResponse(
                        success=False,
                        status_code=status.HTTP_400_BAD_REQUEST,
                        message="Email already registered. Please use a different email or try logging in.",
                        data=None
                    ),
                    status_code=status.HTTP_400_BAD_REQUEST
                )
        except Exception as db_error:
            logger.warning("Failed to check email existence", 
                          email=signup_request.email,
                          error=str(db_error))
            # Continue with signup attempt even if check fails
        
        try:
            # Create user with Supabase - this will automatically send a confirmation email
            # if email confirmation is enabled in your Supabase project settings
            async with AsyncTimer("supabase.auth.sign_up"):
                auth_response = await client.auth.sign_up({
                    "email": signup_request.email,
                    "password": signup_request.password,
                    "options": {
                        "data": {
                            "full_name": signup_request.full_name or "",
                            "linkedin_url": signup_request.linkedin_url or "",
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
            
            return StandardJSONResponse(
                StandardResponse(
                    success=False,
                    status_code=status.HTTP_400_BAD_REQUEST,
                    message=f"Signup failed: {str(auth_error)}",
                    data=None
                ),
                status_code=status.HTTP_400_BAD_REQUEST
            )
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
@profile_async("auth.logout")
async def logout(request: Request, current_user: Profile = Depends(get_current_user), client: AsyncClient = Depends(get_login_client)):
    """
    Logs out the current user by invalidating their session.
    
    This endpoint uses Supabase authentication to invalidate the user's session.
    """
    try:
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
            async with AsyncTimer("supabase.auth.sign_out"):
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
@profile_async("auth.refresh_token")
async def refresh_token(refresh_request: RefreshTokenRequest, client: AsyncClient = Depends(get_login_client)):
    """
    Refreshes an expired access token using a valid refresh token.
    
    This endpoint uses Supabase authentication to generate a new access token
    using the provided refresh token.
    """
    try:
        logger.info("Token refresh attempt")
        
        try:
            # Refresh the token
            async with AsyncTimer("supabase.auth.refresh_session"):
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
                "access_token": session.access_token,
                "refresh_token": session.refresh_token,
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
@profile_async("auth.join_waitlist")
async def join_waitlist(waitlist_request: WaitlistRequest, client: AsyncClient = Depends(get_login_client)):
    """
    Adds a user to the waitlist.
    
    This endpoint stores the user's information in the invitees table.
    """
    try:
        # Log waitlist join attempt
        logger.info("Waitlist join attempt", 
                   email=waitlist_request.email, 
                   user_name=waitlist_request.name)
        
        try:
            # Check if email already exists in invitees
            async with AsyncTimer("supabase.select.invitees.check_email"):
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
            async with AsyncTimer("supabase.select.invitees.check_phone"):
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
                "beta_tester": waitlist_request.beta_tester,
                "linkedin_url": waitlist_request.linkedin_url,
            }
            
            async with AsyncTimer("supabase.insert.invitees"):
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

@router.post("/reset-password", response_model=StandardResponse[Dict[str, str]], response_class=StandardJSONResponse)
@profile_async("auth.reset_password")
async def reset_password(request: ResetPasswordRequest, client: AsyncClient = Depends(get_login_client)):
    """
    Initiates password reset by sending a reset email to the user.
    
    This endpoint sends a password reset email using Supabase Auth.
    The user will receive an email with a link to reset their password.
    """
    try:
        # Set default redirect URL if not provided
        redirect_url = settings.RESET_PASSWORD_FRONTEND_URL
        
        # Send password reset email using Supabase Auth
        response = await client.auth.reset_password_for_email(
            email=request.email,
            options={
                "redirect_to": redirect_url
            }
        )
        
        logger.info("Password reset email sent successfully",
                   email=request.email,
                   redirect_url=redirect_url)
        
        return StandardJSONResponse(StandardResponse(
            success=True,
            status_code=status.HTTP_200_OK,
            message="Password reset email sent successfully. Please check your email.",
            data={"email": request.email}
        ))
        
    except Exception as e:
        logger.error("Error sending password reset email",
                    email=request.email,
                    error=str(e),
                    exception_type=type(e).__name__)
        
        return StandardJSONResponse(StandardResponse(
            success=False,
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            message=f"Failed to send password reset email: {str(e)}",
            data=None
        ))

@router.post("/update-password", response_model=StandardResponse[Dict[str, str]], response_class=StandardJSONResponse)
@profile_async("auth.update_password")
async def update_password(request: UpdatePasswordRequest, client: AsyncClient = Depends(get_login_client)):
    """
    Updates the user's password after they click the reset link.
    
    This endpoint should be called after the user clicks the password reset link
    and provides their new password along with the tokens from the URL.
    """
    try:
        # Set the session using the tokens from the password reset email
        session_response = await client.auth.set_session(
            access_token=request.access_token,
            refresh_token=request.refresh_token
        )
        
        if not session_response.user:
            return StandardJSONResponse(StandardResponse(
                success=False,
                status_code=status.HTTP_401_UNAUTHORIZED,
                message="Invalid or expired reset tokens",
                data=None
            ))
        
        # Update the user's password
        update_response = await client.auth.update_user({
            "password": request.new_password
        })
        
        if not update_response.user:
            return StandardJSONResponse(StandardResponse(
                success=False,
                status_code=status.HTTP_400_BAD_REQUEST,
                message="Failed to update password",
                data=None
            ))
        
        logger.info("Password updated successfully",
                   user_id=str(update_response.user.id),
                   email=update_response.user.email)
        
        # Invalidate profile cache for this user since password change might affect sessions
        from app.core.utils.cache import invalidate_profile_cache
        invalidate_profile_cache(str(update_response.user.id))
        
        return StandardJSONResponse(StandardResponse(
            success=True,
            status_code=status.HTTP_200_OK,
            message="Password updated successfully",
            data={
                "user_id": str(update_response.user.id),
                "email": update_response.user.email
            }
        ))
        
    except Exception as e:
        logger.error("Error updating password",
                    error=str(e),
                    exception_type=type(e).__name__)
        
        return StandardJSONResponse(StandardResponse(
            success=False,
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            message=f"Failed to update password: {str(e)}",
            data=None
        ))

