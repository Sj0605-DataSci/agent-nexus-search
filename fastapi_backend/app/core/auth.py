from datetime import datetime, timedelta
from typing import Optional, Dict, Tuple, Any
import logging
import jwt
from fastapi import Depends, HTTPException, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from uuid import UUID
from jose import JWTError
import time
from functools import lru_cache

from app.core.config import settings
from app.db.clients import get_async_supabase_client
from app.models.models import Profile
from app.models.schemas import TokenData, StandardResponse, StandardJSONResponse
from app.core.structured_logger import get_structured_logger
from app.core.profiling import record_execution_time, record_request_time

# Setup structured logging
logger = get_structured_logger(__name__)

# Use HTTPBearer instead of OAuth2PasswordBearer since we're validating Supabase JWTs
# and not generating tokens ourselves
security = HTTPBearer()
# Pre-compile JWT verification options
JWT_VERIFICATION_OPTIONS = {
    "verify_signature": True,
    "verify_exp": True,
    "verify_aud": False
}

# This function is kept for potential future use, but not actively used
# since authentication is handled by Supabase
def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.SUPABASE_JWT_SECRET, algorithm=settings.ALGORITHM)
    return encoded_jwt

async def verify_supabase_token(token: str, credentials_exception):
    try:
        # First, check if the token is empty or malformed
        if not token or len(token) < 10:  # Basic sanity check
            logger.log_auth_event("token_validation_failed", 
                                 success=False, 
                                 reason="token_empty_or_malformed")
            return StandardJSONResponse(credentials_exception)
            
        # Decode the Supabase JWT using the project's JWT secret
        # Make sure we're using proper verification
        payload = jwt.decode(
            token, 
            settings.SUPABASE_JWT_SECRET, 
            algorithms=[settings.ALGORITHM],
            options=JWT_VERIFICATION_OPTIONS
        )
        
        # Extract user ID from the 'sub' claim in the Supabase JWT
        user_id: str = payload.get("sub")
            
        # Ensure the token is for the correct Supabase project
        expected_issuer = f"https://{settings.SUPABASE_PROJECT_ID}.supabase.co/auth/v1"
        if payload.get("iss") != expected_issuer:
            logger.log_auth_event("token_validation_failed",
                                 success=False,
                                 reason="invalid_issuer",
                                 expected_issuer=expected_issuer,
                                 actual_issuer=payload.get('iss'))
            return StandardJSONResponse(credentials_exception)
            
        token_data = TokenData(user_id=UUID(user_id))
        return token_data
    except jwt.exceptions.ExpiredSignatureError as e:
        logger.log_auth_event("token_validation_failed",
                             success=False,
                             reason="token_expired",
                             error_message=str(e))
        return StandardJSONResponse(credentials_exception)
    except jwt.exceptions.InvalidSignatureError as e:
        logger.log_auth_event("token_validation_failed",
                             success=False,
                             reason="invalid_signature",
                             error_message=str(e))
        return StandardJSONResponse(credentials_exception)
    except jwt.exceptions.DecodeError as e:
        logger.log_auth_event("token_validation_failed",
                             success=False,
                             reason="decode_error",
                             error_message=str(e))
        return StandardJSONResponse(credentials_exception)
    except JWTError as e:
        logger.log_auth_event("token_validation_failed",
                             success=False,
                             reason="jwt_error",
                             error_message=str(e))
        return StandardJSONResponse(credentials_exception)
    except Exception as e:
        # Log the error for debugging
        logger.exception("Unexpected error in token verification",
                        exception_type=type(e).__name__,
                        error_message=str(e))
        # Return our standardized response
        return StandardJSONResponse(credentials_exception)

class OptionalAuthDependency:
    """Custom dependency that makes authentication optional for OPTIONS requests"""
    
    async def __call__(
        self,
        request: Request,
        credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)
    ):
        # Allow OPTIONS requests to bypass authentication
        if request.method == "OPTIONS":
            return None
            
        # For all other requests, require authentication
        if not credentials:
            # Raise HTTPException instead of returning StandardJSONResponse
            # This will be caught by our global exception handler
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Not authenticated"
            )
        
        # Start timing for JWT validation
        jwt_start_time = time.time()
            
        credentials_exception = StandardResponse(
            success=False,
            status_code=status.HTTP_401_UNAUTHORIZED,
            message="Could not validate credentials, please login again for fresh token",
            data=None
        )
        
        token_data = await verify_supabase_token(credentials.credentials, credentials_exception)
        
        # Record JWT validation time
        jwt_validation_time = time.time() - jwt_start_time
        jwt_validation_time_ms = round(jwt_validation_time * 1000, 2)
        record_execution_time("auth.jwt_validation", jwt_validation_time_ms)
        
        if hasattr(request, "state"):
            request.state.jwt_validation_time = jwt_validation_time_ms
            
        # If verify_supabase_token returned a StandardJSONResponse, raise an HTTPException
        if isinstance(token_data, StandardJSONResponse):
            # This will cause FastAPI to use this response directly
            # Instead of continuing with the dependency chain
            raise HTTPException(status_code=401, detail="Could not validate credentials, please login again for fresh token")
        
        # Start timing for profile retrieval
        profile_start_time = time.time()
        
        # Cache miss - get from database
        # Get Supabase client
        client = await get_async_supabase_client(request)
        
        # Query the profiles table using Supabase client - select only needed fields
        response = await client.table("profiles").select("id, email, full_name, created_at, has_connections, user_subscriptions_id, linkedin_url").eq("id", str(token_data.user_id)).execute()
        
        # Record profile retrieval time
        profile_time = time.time() - profile_start_time
        profile_time_ms = round(profile_time * 1000, 2)
        record_execution_time("auth.profile_retrieval.db", profile_time_ms)
        
        if hasattr(request, "state"):
            request.state.profile_retrieval_time = profile_time_ms
            
        # Check if user exists
        if not response.data or len(response.data) == 0:
            raise HTTPException(status_code=401, detail="User not found")
            
        # Create a Profile object from the response data
        user_data = response.data[0]
        user = Profile(**user_data)
        
        # Record total auth time
        total_auth_time_ms = jwt_validation_time_ms + profile_time_ms
        record_request_time(request.method, f"{request.url.path}.auth_total", total_auth_time_ms)
        
        return user

async def get_current_user(
    request: Request,
    user = Depends(OptionalAuthDependency(),use_cache=True)
):
    # This will be None for OPTIONS requests
    if user is None and request.method != "OPTIONS":
        # Raise HTTPException to stop the request chain
        # Our global exception handler will convert this to StandardJSONResponse
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required"
        )
    return user
