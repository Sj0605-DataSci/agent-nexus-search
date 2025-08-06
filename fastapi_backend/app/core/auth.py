from datetime import datetime, timedelta
from typing import Optional, Dict, Tuple, Any, List
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
from app.core.utils.cache import (
    get_cached_profile, cache_profile, invalidate_profile_cache,
    get_cached_agent, cache_agent, invalidate_agent_cache,
    get_cached_user_agents, cache_user_agents, invalidate_user_agents_cache,
    clear_all_caches, get_cache_stats
)

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

EXPECTED_ISSUER = f"https://{settings.SUPABASE_PROJECT_ID}.supabase.co/auth/v1"

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
    """
    Optimized Supabase JWT verification using local validation.
    Based on Supabase best practices - avoids network calls to auth.get_user()
    which can take up to 600ms per request.
    """
    try:
        # First, check if the token is empty or malformed
        if not token or len(token) < 10:  # Basic sanity check
            logger.log_auth_event("token_validation_failed", 
                                 success=False, 
                                 reason="token_empty_or_malformed")
            return StandardJSONResponse(credentials_exception)
            
        # Decode the Supabase JWT using optimized verification
        # Use audience="authenticated" as per Supabase best practices
        payload = jwt.decode(
            token, 
            settings.SUPABASE_JWT_SECRET, 
            algorithms=[settings.ALGORITHM],
            audience="authenticated",  # Supabase standard audience
            options=JWT_VERIFICATION_OPTIONS
        )
        
        # Extract user ID from the 'sub' claim in the Supabase JWT
        user_id: str = payload.get("sub")
        if not user_id:
            logger.log_auth_event("token_validation_failed",
                                 success=False,
                                 reason="missing_sub_claim")
            return StandardJSONResponse(credentials_exception)
            
        # Ensure the token is for the correct Supabase project (use pre-computed issuer)
        if payload.get("iss") != EXPECTED_ISSUER:
            logger.log_auth_event("token_validation_failed",
                                 success=False,
                                 reason="invalid_issuer",
                                 expected_issuer=EXPECTED_ISSUER,
                                 actual_issuer=payload.get('iss'))
            return StandardJSONResponse(credentials_exception)
        
        # Additional Supabase-specific validations
        # Check token role (should be 'authenticated' for user tokens)
        token_role = payload.get("role")
        if token_role != "authenticated":
            logger.log_auth_event("token_validation_failed",
                                 success=False,
                                 reason="invalid_role",
                                 token_role=token_role)
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
    except jwt.exceptions.InvalidAudienceError as e:
        logger.log_auth_event("token_validation_failed",
                             success=False,
                             reason="invalid_audience",
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
    except ValueError as e:
        # Handle UUID conversion errors
        logger.log_auth_event("token_validation_failed",
                             success=False,
                             reason="invalid_user_id_format",
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
    """Optimized custom dependency that makes authentication optional for OPTIONS requests"""
    
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
            raise HTTPException(status_code=401, detail="Could not validate credentials, please login again for fresh token")
        
        # Start timing for profile retrieval
        profile_start_time = time.time()
        
        # Get Supabase client
        client = await get_async_supabase_client(request)
        
        # Use optimized profile retrieval with caching
        user = await _get_profile_from_db(client, token_data.user_id)
        
        # Record profile retrieval time
        profile_time = time.time() - profile_start_time
        profile_time_ms = round(profile_time * 1000, 2)
        record_execution_time("auth.profile_retrieval.db", profile_time_ms)
        
        if hasattr(request, "state"):
            request.state.profile_retrieval_time = profile_time_ms
            
        # Check if user exists
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        
        # Record total auth time
        total_auth_time_ms = jwt_validation_time_ms + profile_time_ms
        record_request_time(request.method, f"{request.url.path}.auth_total", total_auth_time_ms)
        
        return user 

# Create a cached instance of the dependency
_auth_dependency_instance = OptionalAuthDependency()

async def get_current_user(
    request: Request,
    user = Depends(_auth_dependency_instance)
):
    # This will be None for OPTIONS requests
    if user is None and request.method != "OPTIONS":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required"
        )
    return user

async def _get_profile_from_db(client, user_id: UUID) -> Optional[Profile]:
    """Optimized profile retrieval from database"""
    user_id_str = str(user_id)
    
    # Check cache first
    cached_profile = get_cached_profile(user_id_str)
    if cached_profile:
        record_execution_time("auth.profile_retrieval.cache_hit", 0.1)
        return cached_profile
    
    # Cache miss - get from database with optimized query
    try:
        # Use single query with minimal fields for faster response
        response = await client.table("profiles").select(
            "id, email, full_name, created_at, has_connections, user_subscriptions_id, linkedin_url"
        ).eq("id", user_id_str).limit(1).single().execute()
        
        if response.data:
            user = Profile(**response.data)
            cache_profile(user_id_str, user)
            record_execution_time("auth.profile_retrieval.cache_miss", 0)
            return user
        else:
            return None
            
    except Exception as e:
        logger.error("Database error in profile retrieval", 
                    user_id=user_id_str, 
                    error=str(e))
        return None
