from datetime import datetime, timedelta
from typing import Optional
from uuid import UUID

from fastapi import Depends, HTTPException, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt
from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.database import get_db
from app.models.models import Profile
from app.models.schemas import TokenData

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
        # Decode the Supabase JWT using the project's JWT secret
        payload = jwt.decode(
            token, 
            settings.SUPABASE_JWT_SECRET, 
            algorithms=[settings.ALGORITHM],
            options={"verify_aud": False}  # Supabase JWTs use 'aud' claim which might not match our API
        )
        
        # Extract user ID from the 'sub' claim in the Supabase JWT
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
            
        # Ensure the token is for the correct Supabase project
        if payload.get("iss") != f"https://{settings.SUPABASE_PROJECT_ID}.supabase.co/auth/v1":
            raise credentials_exception
            
        token_data = TokenData(user_id=UUID(user_id))
        return token_data
    except JWTError as e:
        print(f"JWT Error: {e}")
        raise credentials_exception

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
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Not authenticated",
                headers={"WWW-Authenticate": "Bearer"},
            )
            
        credentials_exception = HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
        
        token_data = verify_supabase_token(credentials.credentials, credentials_exception)
        user = db.query(Profile).filter(Profile.id == token_data.user_id).first()
        
        # If user doesn't exist in profiles table but JWT is valid,
        # we could optionally create the profile here
        if user is None:
            raise credentials_exception
            
        return user

# Create an instance of the dependency
get_current_user_optional = OptionalAuthDependency()

async def get_current_user(
    request: Request,
    user = Depends(get_current_user_optional)
):
    # This will be None for OPTIONS requests
    if user is None and request.method != "OPTIONS":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user
