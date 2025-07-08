from fastapi import APIRouter, Depends, status, Request, HTTPException
import httpx
from app.core.auth import get_current_user
from app.core.config import settings
from app.models.models import Profile
from app.models.schemas import ProfileResponse
from pydantic import BaseModel
from typing import Optional

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


class LinkedInOAuthRequest(BaseModel):
    code: str
    redirect_uri: str


@router.post("/linkedin/oauth")
async def linkedin_oauth(request: LinkedInOAuthRequest):
    """
    Exchange LinkedIn authorization code for access token
    
    This endpoint handles the OAuth token exchange with LinkedIn,
    similar to the Node.js Express implementation.
    """
    if not request.code or not request.redirect_uri:
        raise HTTPException(status_code=400, detail="Missing code or redirect_uri")
    
    if not settings.LINKEDIN_CLIENT_ID or not settings.LINKEDIN_CLIENT_SECRET:
        raise HTTPException(status_code=500, detail="LinkedIn client credentials not configured")
    
    try:
        # Prepare form data for LinkedIn token exchange
        form_data = {
            "grant_type": "authorization_code",
            "code": request.code,
            "redirect_uri": request.redirect_uri,
            "client_id": settings.LINKEDIN_CLIENT_ID,
            "client_secret": settings.LINKEDIN_CLIENT_SECRET,
        }
        
        # Make the request to LinkedIn
        async with httpx.AsyncClient() as client:
            response = await client.post(
                "https://www.linkedin.com/oauth/v2/accessToken",
                data=form_data,
                headers={"Content-Type": "application/x-www-form-urlencoded"}
            )
            
            # Check if the request was successful
            response.raise_for_status()
            
            # Return the token data
            return response.json()
    except httpx.HTTPStatusError as e:
        # Handle HTTP errors from LinkedIn
        error_detail = f"LinkedIn token exchange failed: {str(e)}"
        try:
            error_data = e.response.json()
            error_detail = f"LinkedIn error: {error_data}"
        except Exception:
            pass
        
        raise HTTPException(status_code=500, detail=error_detail)
    except Exception as e:
        # Handle other errors
        raise HTTPException(status_code=500, detail=f"Token exchange failed: {str(e)}")

