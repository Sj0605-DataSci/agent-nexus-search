from datetime import datetime
from typing import Generic, TypeVar, Optional, List, Dict, Any, Union
from pydantic import BaseModel, Field, EmailStr
from fastapi.responses import JSONResponse
from uuid import UUID
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
        return super().default(obj)

# Custom response class to handle StandardResponse objects
class StandardJSONResponse(JSONResponse):
    def __init__(self, content, *args, **kwargs):
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


class ProfileResponse(ProfileBase):
    id: UUID
    has_connections: Optional[bool] = False

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

# Refresh Token Schema
class RefreshTokenRequest(BaseModel):
    refresh_token: str

# Waitlist Schema
class WaitlistRequest(BaseModel):
    name: str
    email: EmailStr
    phone_number: str
    beta_tester: Optional[bool] = False


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
