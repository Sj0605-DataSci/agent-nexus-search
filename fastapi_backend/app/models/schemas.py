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

# Pydantic models for enhanced search
class ScoringTrait(BaseModel):
    traitTitle: str = Field(..., description="Title of the scoring trait")
    traitDescription: str = Field(..., description="Description of the scoring trait")
    filter: Optional[str] = Field(..., description="Filter for the scoring trait")
    confidence: float = Field(..., ge=0, le=1, description="Confidence score between 0 and 1")

class ScoredProfile(BaseModel):
    profile_id: str = Field(..., description="Unique identifier for the profile")
    linkedin_url: str = Field(..., description="URL of the LinkedIn profile")
    all_quotes: List[str] = Field(..., description="List of quotes related to this profile")
    scoring: List[ScoringTrait] = Field(
        default_factory=list,
        description="List of scoring traits with confidence, traitTitle, and traitDescription"
    )

class ScoredProfilesResponse(BaseModel):
    profiles: List[ScoredProfile]

class SectionFilters(BaseModel):
    basic_info: Optional[List[str]] = []
    experience: Optional[List[str]] = []
    education: Optional[List[str]] = []
    skills: Optional[List[str]] = []

class SearchFilters(BaseModel):
    # Legacy fields for backward compatibility
    location: Optional[List[str]] = []
    work_experience: Optional[List[str]] = []
    company: Optional[List[str]] = []
    position: Optional[List[str]] = []
    skills: Optional[List[str]] = []
    
    # New section-based filters
    sections: Optional[SectionFilters] = None
    
    def __init__(self, **data):
        super().__init__(**data)
        # Initialize sections if not provided
        if self.sections is None:
            self.sections = SectionFilters()

class SearchTraits(BaseModel):
    traits: List[str] = []
    descriptions: List[str] = []

class SearchKeyphrases(BaseModel):
    keyphrases: List[str] = []

class QueryAnalysis(BaseModel):
    filters: SearchFilters
    traits: SearchTraits
    keyphrases: SearchKeyphrases

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
    phone_number: Optional[str] = None
    


class ProfileResponse(ProfileBase):
    id: UUID
    has_connections: Optional[bool] = False
    user_subscriptions_id: Optional[UUID] = None
    linkedin_url: Optional[str] = None
    email_subscription: Optional[bool] = True
    phone_number: Optional[str] = None
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
    phone_number: Optional[str] = None

# Refresh Token Schema
class RefreshTokenRequest(BaseModel):
    refresh_token: str

# Waitlist Schema
class WaitlistRequest(BaseModel):
    email: EmailStr
    beta_tester: Optional[bool] = False

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
    fname: Optional[str] = Field(description="First name of the person")
    lname: Optional[str] = Field(description="Last name of the person")
    social_links: Optional[List[str]] = Field(description="List of social media links (LinkedIn, GitHub, etc.)")
    email: Optional[str] = Field(description="Email address of the person")
    phone_no: Optional[str] = Field(description="Phone number of the person")
    score: Optional[int] = Field(description="Score of the person")
    reason: Optional[str] = Field(description="Reason for the score")
    
    def format_for_display(self) -> dict:
        """Format the person's details with 'NULL' for None values."""
        return {
            'fname': self.fname if self.fname is not None else 'NULL',
            'lname': self.lname if self.lname is not None else 'NULL',
            'social_links': self.social_links if self.social_links is not None else 'NULL',
            'email': self.email if self.email is not None else 'NULL',
            'phone_no': self.phone_no if self.phone_no is not None else 'NULL',
            'score': self.score if self.score is not None else 'NULL',
            'reason': self.reason if self.reason is not None else 'NULL'
        }

class PersonDetailsResponse(BaseModel):
    """Pydantic model for response containing one or more person details."""
    content: List[PersonDetails] = Field(description="List of person details")


# LinkedIn OAuth Schemas
class LinkedInTokenRequest(BaseModel):
    """Request schema for LinkedIn OAuth token exchange"""
    code: str = Field(..., description="Authorization code from LinkedIn OAuth")
    redirect_uri: str = Field(..., description="Redirect URI used in OAuth flow", alias="redirectUri")
    
    class Config:
        populate_by_name = True

class LinkedInTokenResponse(BaseModel):
    """Response schema for LinkedIn OAuth token exchange"""
    access_token: str = Field(..., description="LinkedIn access token")
    expires_in: int = Field(..., description="Token expiration time in seconds")
    token_type: str = Field(default="Bearer", description="Token type")
    scope: Optional[str] = Field(None, description="Token scope")

class LinkedInProfileRequest(BaseModel):
    """Request schema for LinkedIn profile fetch"""
    access_token: str = Field(..., description="LinkedIn access token")

class LinkedInProfileResponse(BaseModel):
    """Response schema for LinkedIn profile data"""
    profile: Dict[str, Any] = Field(..., description="LinkedIn profile data")
    success: bool = Field(default=True, description="Success status")

class TitleAndIntentGeneratorOutput(BaseModel):
    """Pydantic model for title and intent generator output."""
    title: str = Field(description="Title of the chat thread")
    intent: str = Field(description="Intent of the chat thread")
    direct_answer_response: Optional[str] = Field(default=None, description="Direct answer response if intent is direct_answer")
