from datetime import datetime, timedelta
from typing import Optional
import logging
import jwt
from fastapi import Depends, HTTPException, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from uuid import UUID
from jose import JWTError

from app.core.config import settings
from app.db.clients import get_async_supabase_client
from app.models.models import Profile
from app.models.schemas import TokenData, StandardResponse, StandardJSONResponse
from app.core.structured_logger import get_structured_logger

# Setup structured logging
logger = get_structured_logger(__name__)

# Use HTTPBearer instead of OAuth2PasswordBearer since we're validating Supabase JWTs
# and not generating tokens ourselves
security = HTTPBearer()

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
            options={
                "verify_signature": True,  # Explicitly verify signature
                "verify_exp": True,       # Verify expiration
                "verify_aud": False       # Supabase JWTs use 'aud' claim which might not match our API
            }
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
            
        credentials_exception = StandardResponse(
            success=False,
            status_code=status.HTTP_401_UNAUTHORIZED,
            message="Could not validate credentials, please login again for fresh token",
            data=None
        )
        
        token_data = await verify_supabase_token(credentials.credentials, credentials_exception)
        
        # If verify_supabase_token returned a StandardJSONResponse, raise an HTTPException
        if isinstance(token_data, StandardJSONResponse):
            # This will cause FastAPI to use this response directly
            # Instead of continuing with the dependency chain
            raise HTTPException(status_code=401, detail="Could not validate credentials, please login again for fresh token")
        
        # Get Supabase client
        client = await get_async_supabase_client()
        
        # Query the profiles table using Supabase client
        response = await client.table("profiles").select("*").eq("id", str(token_data.user_id)).execute()
        
        # Check if user exists
        if not response.data or len(response.data) == 0:
            raise HTTPException(status_code=401, detail="User not found")
            
        # Create a Profile object from the response data
        user = Profile(**response.data[0])
            
        return user

async def get_current_user(
    request: Request,
    user = Depends(OptionalAuthDependency())
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
