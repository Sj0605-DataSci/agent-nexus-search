import uuid
from datetime import datetime, date
from sqlalchemy import Column, Text, DateTime, ForeignKey, UniqueConstraint, Boolean, Integer, Date, Numeric, JSON
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
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(Text, nullable=True)
    full_name = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=datetime.now)
    updated_at = Column(DateTime(timezone=True), default=datetime.now, onupdate=datetime.now)
    has_connections = Column(Boolean, default=False)
    user_subscriptions_id = Column(UUID(as_uuid=True), ForeignKey("user_subscriptions.id"), nullable=True)
    email_subscription = Column(Boolean, default=False)
    linkedin_url = Column(Text, nullable=True)

    # Relationships
    hired_agents = relationship("HiredAgent", back_populates="user", cascade="all, delete")
    user_subscription = relationship(
        "UserSubscription", 
        foreign_keys=[user_subscriptions_id],
        uselist=False
    )


class UserSubscription(Base):
    __tablename__ = "user_subscriptions"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    profile_id = Column(UUID(as_uuid=True), ForeignKey("profiles.id", ondelete="CASCADE"), nullable=False)
    tier = Column(Text, nullable=False, default='free')
    credits = Column(Integer, nullable=False, default=10)
    total_credits_purchased = Column(Integer, nullable=False, default=0)
    
    # Daily Search Limits and Tracking
    daily_searches_allowed = Column(Integer, nullable=False, default=5)
    daily_searches_used = Column(Integer, nullable=False, default=0)
    last_search_date = Column(Date, nullable=True, default=date.today)
    
    # Search Type Limits (for different tiers)
    deep_searches_allowed = Column(Integer, nullable=False, default=1)
    deep_searches_used = Column(Integer, nullable=False, default=0)
    basic_searches_allowed = Column(Integer, nullable=False, default=5)
    basic_searches_used = Column(Integer, nullable=False, default=0)
    
    # Subscription Management
    subscription_start_date = Column(DateTime(timezone=True), nullable=True)
    subscription_end_date = Column(DateTime(timezone=True), nullable=True)
    auto_renew = Column(Boolean, nullable=False, default=False)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), default=datetime.now)
    updated_at = Column(DateTime(timezone=True), default=datetime.now, onupdate=datetime.now)
    
    # Relationships
    profile = relationship(
        "Profile", 
        foreign_keys=[profile_id]
    )


class SearchUsage(Base):
    __tablename__ = "search_usage"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("profiles.id", ondelete="CASCADE"), nullable=False)
    credits_used = Column(Integer, nullable=False, default=0)
    search_date = Column(DateTime(timezone=True), default=datetime.now)
    thread_id = Column(UUID(as_uuid=True), nullable=True)
    message_id = Column(UUID(as_uuid=True), nullable=True)
    search_mode = Column(Text, nullable=False)
    success = Column(Boolean, nullable=False, default=True)
    error_message = Column(Text, nullable=True)
    
    # Relationships
    user = relationship("Profile")


class CreditTransaction(Base):
    __tablename__ = "credit_transactions"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("profiles.id", ondelete="CASCADE"), nullable=False)
    transaction_type = Column(Text, nullable=False)  # 'purchase', 'usage', 'refund', 'bonus'
    credits = Column(Integer, nullable=False)
    description = Column(Text, nullable=True)
    reference_id = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=datetime.now)
    
    # Relationships
    user = relationship("Profile")


class TierConfig(Base):
    __tablename__ = "tier_configs"
    
    tier = Column(Text, primary_key=True)
    daily_basic_searches = Column(Integer, nullable=False)
    daily_deep_searches = Column(Integer, nullable=False)
    basic_search_credit_cost = Column(Integer, nullable=False)
    deep_search_credit_cost = Column(Integer, nullable=False)
    monthly_price_usd = Column(Numeric(10, 2), nullable=True)
    features = Column(JSON, nullable=True)
    created_at = Column(DateTime(timezone=True), default=datetime.now)
    updated_at = Column(DateTime(timezone=True), default=datetime.now, onupdate=datetime.now)
