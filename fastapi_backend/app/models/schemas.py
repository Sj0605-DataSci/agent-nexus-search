from datetime import datetime
from typing import Optional, List
from uuid import UUID
from pydantic import BaseModel, EmailStr


# Agent Template Schemas
class AgentTemplateBase(BaseModel):
    name: str
    category: str
    description: Optional[str] = None


class AgentTemplateCreate(AgentTemplateBase):
    pass


class AgentTemplateUpdate(BaseModel):
    name: Optional[str] = None
    category: Optional[str] = None
    description: Optional[str] = None


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


class HiredAgentCreate(HiredAgentBase):
    pass


class HiredAgentUpdate(BaseModel):
    name: Optional[str] = None
    personality: Optional[str] = None
    tone: Optional[str] = None
    response_length: Optional[str] = None
    expertise: Optional[str] = None


class HiredAgentResponse(HiredAgentBase):
    id: UUID
    hired_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# Profile Schemas
class ProfileBase(BaseModel):
    email: Optional[EmailStr] = None
    full_name: Optional[str] = None


class ProfileCreate(ProfileBase):
    id: UUID


class ProfileUpdate(BaseModel):
    email: Optional[EmailStr] = None
    full_name: Optional[str] = None


class ProfileResponse(ProfileBase):
    id: UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# Token Schemas
class Token(BaseModel):
    access_token: str
    token_type: str


class TokenData(BaseModel):
    user_id: Optional[UUID] = None
