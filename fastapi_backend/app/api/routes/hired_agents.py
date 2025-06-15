from typing import List
from uuid import UUID
import logging
import traceback
from fastapi import APIRouter, Depends, HTTPException, status, Query, Request
from sqlalchemy.orm import Session

from app.core.auth import get_current_user
from app.db.database import get_db
from app.models.models import HiredAgent, Profile
from app.models.schemas import HiredAgentCreate, HiredAgentResponse, HiredAgentUpdate

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/hired_agents", tags=["hired_agents"])

@router.post("/", response_model=HiredAgentResponse, status_code=status.HTTP_201_CREATED)
def hire_agent(
    request: Request,
    agent: HiredAgentCreate,
    db: Session = Depends(get_db),
    current_user: Profile = Depends(get_current_user)
):
    """Hire a new agent for the user"""
    try:
        logger.info(f"Hire agent request received: {agent.model_dump()}")
        logger.info(f"Current user: {current_user.id if current_user else 'None'}")
        
        # Log request headers for debugging
        logger.info(f"Request headers: {request.headers}")
        
        # Handle OPTIONS requests or unauthenticated requests
        if current_user is None:
            logger.error("Authentication failed: No current user")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Authentication required"
            )
        
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
            existing = db.query(HiredAgent).filter(
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
        db.add(db_agent)
        db.commit()
        db.refresh(db_agent)
        logger.info(f"Agent hired successfully: {db_agent.id}")
        return db_agent
    except HTTPException as e:
        # Re-raise HTTP exceptions as they are already properly formatted
        logger.error(f"HTTP Exception in hire_agent: {e.detail}")
        raise
    except Exception as e:
        # Log the full stack trace for unexpected errors
        logger.error(f"Unexpected error in hire_agent: {str(e)}")
        logger.error(traceback.format_exc())
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An unexpected error occurred: {str(e)}"
        )

@router.get("/", response_model=List[HiredAgentResponse])
def get_hired_agents(
    request: Request,
    user_id: UUID = Query(None),
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: Profile = Depends(get_current_user)
):
    """Get all hired agents for a user"""
    try:
        logger.info(f"Get hired agents request received")
        logger.info(f"Request headers: {request.headers}")
        logger.info(f"Query params: user_id={user_id}, skip={skip}, limit={limit}")
        logger.info(f"Current user: {current_user.id if current_user else 'None'}")
        
        # Handle OPTIONS requests or unauthenticated requests
        if current_user is None:
            logger.warning("No authenticated user, returning empty list")
            return []
            
        # If user_id is provided, ensure it's the current user or return 403
        if user_id and user_id != current_user.id:
            logger.error(f"Authorization failed: User {current_user.id} tried to view agents for user {user_id}")
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only view your own hired agents"
            )
        
        # Use the current user's ID if no user_id is provided
        user_id = user_id or current_user.id
        logger.info(f"Fetching hired agents for user {user_id}")
        
        agents = db.query(HiredAgent).filter(HiredAgent.user_id == user_id).offset(skip).limit(limit).all()
        logger.info(f"Found {len(agents)} hired agents for user {user_id}")
        return agents
    except HTTPException as e:
        # Re-raise HTTP exceptions as they are already properly formatted
        logger.error(f"HTTP Exception in get_hired_agents: {e.detail}")
        raise
    except Exception as e:
        # Log the full stack trace for unexpected errors
        logger.error(f"Unexpected error in get_hired_agents: {str(e)}")
        logger.error(traceback.format_exc())
        # Return an empty list instead of failing
        return []

@router.get("/{agent_id}", response_model=HiredAgentResponse)
def get_hired_agent(
    agent_id: UUID,
    db: Session = Depends(get_db),
    current_user: Profile = Depends(get_current_user)
):
    """Get a specific hired agent by ID"""
    agent = db.query(HiredAgent).filter(HiredAgent.id == agent_id).first()
    if agent is None:
        raise HTTPException(status_code=404, detail="Hired agent not found")
    
    # Ensure the user can only view their own hired agents
    if agent.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only view your own hired agents"
        )
    
    return agent

@router.put("/{agent_id}", response_model=HiredAgentResponse)
def update_hired_agent(
    agent_id: UUID,
    agent_update: HiredAgentUpdate,
    db: Session = Depends(get_db),
    current_user: Profile = Depends(get_current_user)
):
    """Update a hired agent"""
    db_agent = db.query(HiredAgent).filter(HiredAgent.id == agent_id).first()
    if db_agent is None:
        raise HTTPException(status_code=404, detail="Hired agent not found")
    
    # Ensure the user can only update their own hired agents
    if db_agent.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only update your own hired agents"
        )
    
    update_data = agent_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_agent, key, value)
    
    db.commit()
    db.refresh(db_agent)
    return db_agent

@router.delete("/{agent_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_hired_agent(
    agent_id: UUID,
    db: Session = Depends(get_db),
    current_user: Profile = Depends(get_current_user)
):
    """Delete a hired agent"""
    db_agent = db.query(HiredAgent).filter(HiredAgent.id == agent_id).first()
    if db_agent is None:
        raise HTTPException(status_code=404, detail="Hired agent not found")
    
    # Ensure the user can only delete their own hired agents
    if db_agent.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only delete your own hired agents"
        )
    
    db.delete(db_agent)
    db.commit()
    return None
