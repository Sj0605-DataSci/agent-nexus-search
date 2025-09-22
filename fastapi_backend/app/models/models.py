import uuid
import secrets
from datetime import datetime, date, timedelta
from sqlalchemy import Column, Text, DateTime, ForeignKey, UniqueConstraint, Boolean, Integer, Date, Numeric, JSON, Enum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.db.database import Base
import enum

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
    has_connections = Column(Text, nullable=True, default="no data")
    user_subscriptions_id = Column(UUID(as_uuid=True), ForeignKey("user_subscriptions.id"), nullable=True)
    email_subscription = Column(Boolean, default=False)
    phone_number = Column(Text, nullable=True)
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
    tier = Column(Text, nullable=False, default='hunter')  # Changed from 'free' to 'hunter'
    credits = Column(Integer, nullable=False, default=5)  # Default credits for hunter tier
    total_credits_purchased = Column(Integer, nullable=False, default=0)
    
    # Credit Management (New credit-only system)
    credit_reset_period = Column(Text, nullable=False, default='daily')  # 'daily', 'monthly', 'unlimited'
    last_credit_reset = Column(Date, nullable=True, default=date.today)
    monthly_credits_allocated = Column(Integer, nullable=False, default=5)  # Credits per reset period
    is_unlimited = Column(Boolean, nullable=False, default=False)  # Unlimited credits flag
    
    # Legacy Search Limits (kept for backward compatibility, not used in credit-only system)
    daily_searches_allowed = Column(Integer, nullable=False, default=999999)
    daily_searches_used = Column(Integer, nullable=False, default=0)
    last_search_date = Column(Date, nullable=True, default=date.today)
    deep_searches_allowed = Column(Integer, nullable=False, default=999999)
    deep_searches_used = Column(Integer, nullable=False, default=0)
    basic_searches_allowed = Column(Integer, nullable=False, default=999999)
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


class FriendshipStatus(str, enum.Enum):
    PENDING = "pending"
    ACCEPTED = "accepted"
    REJECTED = "rejected"


class Friendship(Base):
    __tablename__ = "friendships"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    requester_id = Column(UUID(as_uuid=True), ForeignKey("profiles.id", ondelete="CASCADE"), nullable=False)
    addressee_id = Column(UUID(as_uuid=True), ForeignKey("profiles.id", ondelete="CASCADE"), nullable=False)
    status = Column(Enum(FriendshipStatus), nullable=False, default=FriendshipStatus.PENDING)
    created_at = Column(DateTime(timezone=True), default=datetime.now)
    updated_at = Column(DateTime(timezone=True), default=datetime.now, onupdate=datetime.now)
    
    # Relationships
    requester = relationship("Profile", foreign_keys=[requester_id], backref="sent_friendships")
    addressee = relationship("Profile", foreign_keys=[addressee_id], backref="received_friendships")
    
    # Constraints
    __table_args__ = (
        UniqueConstraint('requester_id', 'addressee_id', name='friendship_requester_addressee_unique'),
    )


class InviteStatus(str, enum.Enum):
    PENDING = "pending"
    ACCEPTED = "accepted"
    EXPIRED = "expired"
    CANCELLED = "cancelled"


class Invite(Base):
    __tablename__ = "invites"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    inviter_id = Column(UUID(as_uuid=True), ForeignKey("profiles.id", ondelete="CASCADE"), nullable=False)
    invitee_email = Column(Text, nullable=True)
    invitee_phone = Column(Text, nullable=True)
    invite_token = Column(Text, unique=True, default=lambda: secrets.token_urlsafe(32))
    group_id = Column(UUID(as_uuid=True), nullable=True)  # Will be a foreign key when groups are implemented
    status = Column(Enum(InviteStatus), nullable=False, default=InviteStatus.PENDING)
    created_at = Column(DateTime(timezone=True), default=datetime.now)
    expires_at = Column(DateTime(timezone=True), default=lambda: datetime.now() + timedelta(days=7))
    
    # Relationships
    inviter = relationship("Profile", foreign_keys=[inviter_id], backref="sent_invites")
