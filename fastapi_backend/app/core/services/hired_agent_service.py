from typing import List, Optional
from uuid import UUID
import logging
import traceback
from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from app.models.models import HiredAgent, Profile
from app.models.schemas import HiredAgentCreate, HiredAgentResponse, HiredAgentUpdate

logger = logging.getLogger(__name__)

class HiredAgentService:
    """Service for handling hired agent operations"""
    
    _instance = None
    
    def __new__(cls, db: Session):
        """Singleton pattern implementation"""
        if cls._instance is None:
            cls._instance = super(HiredAgentService, cls).__new__(cls)
            cls._instance.db = db
        else:
            cls._instance.db = db  # Update DB session on each call
        return cls._instance
    
    def hire_agent(self, agent: HiredAgentCreate, current_user: Profile) -> HiredAgentResponse:
        """Hire a new agent for the user"""
        try:
            logger.info(f"Hire agent request received: {agent.model_dump()}")
            
            # If user_id is not provided, use the current user's ID
            if agent.user_id is None:
                logger.info(f"No user_id provided, using current user ID: {current_user.id}")
                agent.user_id = current_user.id
            
            # Ensure the user can only hire agents for themselves
            if agent.user_id != current_user.id:
                logger.error(f"Authorization failed: User {current_user.id} tried to hire agent for user {agent.user_id}")
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="You can only hire agents for your own account"
                )
            
            # Check if the user already hired this template
            if agent.template_id:
                logger.info(f"Checking if user {agent.user_id} already hired template {agent.template_id}")
                existing = self.db.query(HiredAgent).filter(
                    HiredAgent.user_id == agent.user_id,
                    HiredAgent.template_id == agent.template_id
                ).first()
                
                if existing:
                    logger.info(f"User {agent.user_id} already hired template {agent.template_id}")
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="You have already hired this agent template"
                    )
            
            # Convert template_id to UUID if it's a string
            try:
                if agent.template_id and isinstance(agent.template_id, str):
                    logger.info(f"Converting template_id from string to UUID: {agent.template_id}")
                    agent.template_id = UUID(agent.template_id)
            except ValueError as e:
                logger.error(f"Invalid UUID format for template_id: {agent.template_id}")
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Invalid UUID format for template_id: {str(e)}"
                )
                
            # Create the hired agent
            logger.info(f"Creating hired agent for user {agent.user_id} with template {agent.template_id}")
            db_agent = HiredAgent(**agent.model_dump())
            self.db.add(db_agent)
            self.db.commit()
            self.db.refresh(db_agent)
            logger.info(f"Agent hired successfully: {db_agent.id}")
            
            # Convert SQLAlchemy model to Pydantic model for JSON serialization
            return HiredAgentResponse.model_validate(db_agent)
        except Exception as e:
            self.db.rollback()
            logger.error(f"Error in hire_agent: {str(e)}")
            logger.error(traceback.format_exc())
            raise
    
    def get_hired_agents(self, user_id: UUID, current_user: Profile) -> List[HiredAgentResponse]:
        """Get all hired agents for a user"""
        try:
            # If user_id is provided, ensure it's the current user or raise 403
            if user_id and user_id != current_user.id:
                logger.error(f"Authorization failed: User {current_user.id} tried to view agents for user {user_id}")
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="You can only view your own hired agents"
                )
            
            # Use the current user's ID if no user_id is provided
            user_id = user_id or current_user.id
            logger.info(f"Fetching hired agents for user {user_id}")
            
            agents = self.db.query(HiredAgent).filter(HiredAgent.user_id == user_id).all()
            logger.info(f"Found {len(agents)} hired agents for user {user_id}")
            
            # Convert SQLAlchemy models to Pydantic models for JSON serialization
            return [HiredAgentResponse.model_validate(agent) for agent in agents]
        except Exception as e:
            logger.error(f"Error in get_hired_agents: {str(e)}")
            logger.error(traceback.format_exc())
            raise
    
    def get_hired_agent_by_id(self, agent_id: UUID, current_user: Profile) -> Optional[HiredAgentResponse]:
        """Get a specific hired agent by ID"""
        try:
            agent = self.db.query(HiredAgent).filter(HiredAgent.id == agent_id).first()
            if agent is None:
                return None
            
            # Ensure the user can only view their own hired agents
            if agent.user_id != current_user.id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="You can only view your own hired agents"
                )
            
            # Convert SQLAlchemy model to Pydantic model for JSON serialization
            return HiredAgentResponse.model_validate(agent)
        except Exception as e:
            logger.error(f"Error in get_hired_agent_by_id: {str(e)}")
            logger.error(traceback.format_exc())
            raise
    
    def update_hired_agent(self, agent_id: UUID, agent_update: HiredAgentUpdate, current_user: Profile) -> Optional[HiredAgentResponse]:
        """Update a hired agent"""
        try:
            db_agent = self.db.query(HiredAgent).filter(HiredAgent.id == agent_id).first()
            if db_agent is None:
                return None
            
            # Ensure the user can only update their own hired agents
            if db_agent.user_id != current_user.id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="You can only update your own hired agents"
                )
            
            update_data = agent_update.model_dump(exclude_unset=True)
            for key, value in update_data.items():
                setattr(db_agent, key, value)
            
            self.db.commit()
            self.db.refresh(db_agent)
            
            # Convert SQLAlchemy model to Pydantic model for JSON serialization
            return HiredAgentResponse.model_validate(db_agent)
        except Exception as e:
            self.db.rollback()
            logger.error(f"Error in update_hired_agent: {str(e)}")
            logger.error(traceback.format_exc())
            raise
    
    def delete_hired_agent(self, agent_id: UUID, current_user: Profile) -> bool:
        """Delete a hired agent"""
        try:
            db_agent = self.db.query(HiredAgent).filter(HiredAgent.id == agent_id).first()
            if db_agent is None:
                return False
            
            # Ensure the user can only delete their own hired agents
            if db_agent.user_id != current_user.id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="You can only delete your own hired agents"
                )
            
            self.db.delete(db_agent)
            self.db.commit()
            return True
        except Exception as e:
            self.db.rollback()
            logger.error(f"Error in delete_hired_agent: {str(e)}")
            logger.error(traceback.format_exc())
            raise
