from datetime import datetime, timedelta
from typing import Optional
import logging
import jwt
from fastapi import Depends, HTTPException, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from uuid import UUID
from jose import JWTError

from app.core.config import settings
from app.db.database import get_db
from app.models.models import Profile
from app.models.schemas import TokenData, StandardResponse, StandardJSONResponse

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

def verify_supabase_token(token: str, credentials_exception):
    try:
        # First, check if the token is empty or malformed
        if not token or len(token) < 10:  # Basic sanity check
            logging.error("Token is empty or too short")
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
            logging.error(f"Invalid issuer: {payload.get('iss')} != {expected_issuer}")
            return StandardJSONResponse(credentials_exception)
            
        token_data = TokenData(user_id=UUID(user_id))
        return token_data
    except jwt.exceptions.ExpiredSignatureError as e:
        logging.error(f"JWT Error: Token expired - {str(e)}")
        return StandardJSONResponse(credentials_exception)
    except jwt.exceptions.InvalidSignatureError as e:
        logging.error(f"JWT Error: Invalid signature - {str(e)}")
        return StandardJSONResponse(credentials_exception)
    except jwt.exceptions.DecodeError as e:
        logging.error(f"JWT Error: Could not decode token - {str(e)}")
        return StandardJSONResponse(credentials_exception)
    except JWTError as e:
        logging.error(f"JWT Error: Generic JWT error - {str(e)}")
        return StandardJSONResponse(credentials_exception)
    except Exception as e:
        # Log the error for debugging
        logging.error(f"Unexpected error in token verification: {str(e)}")
        # Return our standardized response
        return StandardJSONResponse(credentials_exception)

class OptionalAuthDependency:
    """Custom dependency that makes authentication optional for OPTIONS requests"""
    
    async def __call__(
        self,
        request: Request,
        credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
        db: Session = Depends(get_db)
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
            message="Could not validate credentials",
            data=None
        )
        
        token_data = verify_supabase_token(credentials.credentials, credentials_exception)
        
        # If verify_supabase_token returned a StandardJSONResponse, raise an HTTPException
        if isinstance(token_data, StandardJSONResponse):
            # This will cause FastAPI to use this response directly
            # Instead of continuing with the dependency chain
            raise HTTPException(status_code=401, detail="Could not validate credentials")
            
        user = db.query(Profile).filter(Profile.id == token_data.user_id).first()
        
        # If user doesn't exist in profiles table but JWT is valid,
        # we could optionally create the profile here
        if user is None:
            raise HTTPException(status_code=401, detail="User not found")
            
        return user

# Create an instance of the dependency
get_current_user_optional = OptionalAuthDependency()

async def get_current_user(
    request: Request,
    user = Depends(get_current_user_optional)
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
