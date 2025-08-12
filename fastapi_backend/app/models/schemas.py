from datetime import datetime, date
from typing import Generic, TypeVar, Optional, List, Dict, Any, Union
from pydantic import BaseModel, Field, EmailStr
from fastapi.responses import JSONResponse
from uuid import UUID
from app.core.profiling import Timer
import logging
import json

logger = logging.getLogger(__name__)

# Standard API Response Schemas
T = TypeVar('T')

class StandardResponse(BaseModel, Generic[T]):
    """Standard response format for all API endpoints"""
    success: bool
    status_code: int
    message: str
    data: Optional[T] = None


# Custom JSON encoder to handle UUID and datetime objects
class CustomJSONEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, UUID):
            return str(obj)
        if isinstance(obj, datetime):
            return obj.isoformat()
        if isinstance(obj, date):
            return obj.isoformat()
        return super().default(obj)

# Custom response class to handle StandardResponse objects
class StandardJSONResponse(JSONResponse):
    def __init__(self, content, *args, **kwargs):
        with Timer("response.standard_json_response.init"):
            if isinstance(content, StandardResponse):
                # Extract status code from the StandardResponse
                status_code = content.status_code
                # Convert Pydantic model to dict for proper JSON serialization
                content = content.model_dump()
                kwargs["status_code"] = status_code
                
                # Log the response for debugging
                logger.info(f"Returning StandardJSONResponse with status code {status_code} and content: {content}")
            super().__init__(content, *args, **kwargs)
        
    def render(self, content) -> bytes:
        with Timer("response.standard_json_response.render"):
            return json.dumps(
                content,
                ensure_ascii=False,
                allow_nan=False,
                indent=None,
                separators=(",", ":"),
                cls=CustomJSONEncoder,
            ).encode("utf-8")


# Agent Template Schemas
class AgentTemplateBase(BaseModel):
    name: str
    category: str
    description: Optional[str] = None
    can_hire_unhire: Optional[bool] = False
    image_urls: Optional[str] = None


class AgentTemplateCreate(AgentTemplateBase):
    pass


class AgentTemplateUpdate(BaseModel):
    name: Optional[str] = None
    category: Optional[str] = None
    description: Optional[str] = None
    image_urls: Optional[str] = None

class AgentTemplateResponse(AgentTemplateBase):
    id: UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# Hired Agent Schemas
class HiredAgentBase(BaseModel):
    user_id: Optional[UUID] = None
    template_id: Optional[UUID] = None
    name: Optional[str] = None
    personality: Optional[str] = "helpful"
    tone: Optional[str] = "professional"
    response_length: Optional[str] = "medium"
    expertise: Optional[str] = "general"
    can_hire_unhire: Optional[bool] = False
    image_urls: Optional[str] = None


class HiredAgentCreate(HiredAgentBase):
    pass


class HiredAgentUpdate(BaseModel):
    name: Optional[str] = None
    personality: Optional[str] = None
    tone: Optional[str] = None
    response_length: Optional[str] = None
    expertise: Optional[str] = None
    can_hire_unhire: Optional[bool] = False
    image_urls: Optional[str] = None

class HiredAgentResponse(HiredAgentBase):
    id: UUID
    hired_at: datetime
    updated_at: datetime
    can_hire_unhire: Optional[bool] = False
    image_urls: Optional[str] = None

    class Config:
        from_attributes = True


# Profile Schemas
class ProfileBase(BaseModel):
    email: Optional[EmailStr] = None
    full_name: Optional[str] = None
    created_at: datetime



class ProfileCreate(ProfileBase):
    id: UUID


class ProfileUpdate(BaseModel):
    email: Optional[EmailStr] = None
    full_name: Optional[str] = None
    linkedin_url: Optional[str] = None
    email_subscription: Optional[bool] = None
    


class ProfileResponse(ProfileBase):
    id: UUID
    has_connections: Optional[bool] = False
    user_subscriptions_id: Optional[UUID] = None
    linkedin_url: Optional[str] = None
    email_subscription: Optional[bool] = True
    class Config:
        from_attributes = True


# User Subscription Schemas
class UserSubscriptionBase(BaseModel):
    tier: str = "Hunter"  # Changed from 'free' to 'hunter'
    credits: int = 5  # Default credits for hunter tier
    total_credits_purchased: int = 0
    credit_reset_period: str = "daily"  # 'daily', 'monthly', or 'unlimited'
    last_credit_reset: Optional[date] = None
    monthly_credits_allocated: int = 5  # Credits allocated per reset period
    is_unlimited: bool = False  # Whether user has unlimited credits
    subscription_start_date: Optional[datetime] = None
    subscription_end_date: Optional[datetime] = None
    auto_renew: bool = False


class UserSubscriptionCreate(UserSubscriptionBase):
    profile_id: UUID


class UserSubscriptionUpdate(BaseModel):
    tier: Optional[str] = None
    credits: Optional[int] = None
    credit_reset_period: Optional[str] = None
    monthly_credits_allocated: Optional[int] = None
    is_unlimited: Optional[bool] = None
    auto_renew: Optional[bool] = None


class UserSubscriptionResponse(UserSubscriptionBase):
    id: UUID
    profile_id: UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# Token Schemas
class Token(BaseModel):
    access_token: str
    refresh_token: str


class TokenData(BaseModel):
    user_id: Optional[UUID] = None


# Login Schema
class LoginRequest(BaseModel):
    email: EmailStr
    password: str

# Signup Schema
class SignupRequest(BaseModel):
    email: EmailStr
    password: str
    full_name: Optional[str] = None
    linkedin_url: Optional[str] = None

# Refresh Token Schema
class RefreshTokenRequest(BaseModel):
    refresh_token: str

# Waitlist Schema
class WaitlistRequest(BaseModel):
    name: str
    email: EmailStr
    phone_number: str
    beta_tester: Optional[bool] = False
    linkedin_url: Optional[str] = None

class ResetPasswordRequest(BaseModel):
    """Request schema for initiating password reset"""
    email: EmailStr = Field(..., description="Email address to send password reset link")
    redirect_url: Optional[str] = Field(None, description="URL to redirect after password reset")

class UpdatePasswordRequest(BaseModel):
    """Request schema for updating password after reset"""
    new_password: str = Field(..., min_length=8, description="New password (minimum 8 characters)")
    access_token: str = Field(..., description="Access token from password reset email")
    refresh_token: str = Field(..., description="Refresh token from password reset email")

class PersonDetails(BaseModel):
    """Pydantic model for person details in table format."""
    fname: str = Field(description="First name of the person")
    lname: str = Field(description="Last name of the person")
    social_links: List[str] = Field(description="List of social media links (LinkedIn, GitHub, etc.)")
    email: str = Field(description="Email address of the person")
    phone_no: str = Field(description="Phone number of the person")
    score: int = Field(description="Score of the person")
    reason: str = Field(description="Reason for the score")

class PersonDetailsResponse(BaseModel):
    """Pydantic model for response containing one or more person details."""
    content: List[PersonDetails] = Field(description="List of person details")

class TitleGeneratorOutput(BaseModel):
    """Pydantic model for title generator output."""
    title: str = Field(description="Title of the chat thread")
