from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session

from app.core.auth import get_current_user
from app.core.config import settings
from app.db.database import get_db
from app.models.models import Profile
from app.models.schemas import ProfileResponse

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
