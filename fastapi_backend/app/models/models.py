import uuid
from datetime import datetime
from sqlalchemy import Column, Text, DateTime, ForeignKey, UniqueConstraint, Boolean
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.db.database import Base

class AgentTemplate(Base):
    __tablename__ = "agent_templates"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(Text, nullable=False)
    category = Column(Text, nullable=False)
    description = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=datetime.now)
    updated_at = Column(DateTime(timezone=True), default=datetime.now, onupdate=datetime.now)
    
    # Relationship
    hired_agents = relationship("HiredAgent", back_populates="template", cascade="all, delete")


class HiredAgent(Base):
    __tablename__ = "hired_agents"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("profiles.id", ondelete="CASCADE"), nullable=False)
    hired_at = Column(DateTime(timezone=True), default=datetime.now)
    template_id = Column(UUID(as_uuid=True), ForeignKey("agent_templates.id", ondelete="CASCADE"), nullable=True)
    name = Column(Text, nullable=True)
    personality = Column(Text, default="helpful")
    tone = Column(Text, default="professional")
    response_length = Column(Text, default="medium")
    expertise = Column(Text, default="general")
    updated_at = Column(DateTime(timezone=True), default=datetime.now, onupdate=datetime.now)
    can_hire_unhire = Column(Boolean, default=True)

    
    # Relationships
    user = relationship("Profile", back_populates="hired_agents")
    template = relationship("AgentTemplate", back_populates="hired_agents")
    
    # Constraints
    __table_args__ = (
        UniqueConstraint('user_id', 'template_id', name='hired_agents_user_id_template_id_key'),
    )


class Profile(Base):
    __tablename__ = "profiles"
    
    id = Column(UUID(as_uuid=True), primary_key=True)
    email = Column(Text, nullable=True)
    full_name = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=datetime.now)
    updated_at = Column(DateTime(timezone=True), default=datetime.now, onupdate=datetime.now)
    has_connections = Column(Boolean, default=False)
    
    # Relationships
    hired_agents = relationship("HiredAgent", back_populates="user", cascade="all, delete")
