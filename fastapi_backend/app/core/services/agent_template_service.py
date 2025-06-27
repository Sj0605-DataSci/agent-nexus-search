from typing import List, Optional
from uuid import UUID
import logging
from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from app.models.models import AgentTemplate, Profile
from app.models.schemas import AgentTemplateCreate, AgentTemplateResponse, AgentTemplateUpdate

logger = logging.getLogger(__name__)

class AgentTemplateService:
    """Service for handling agent template operations"""
    
    _instance = None
    
    def __new__(cls, db: Session):
        """Singleton pattern implementation"""
        if cls._instance is None:
            cls._instance = super(AgentTemplateService, cls).__new__(cls)
            cls._instance.db = db
        else:
            cls._instance.db = db  # Update DB session on each call
        return cls._instance
    
    def create_template(self, template: AgentTemplateCreate) -> AgentTemplateResponse:
        """Create a new agent template"""
        try:
            db_template = AgentTemplate(**template.model_dump())
            self.db.add(db_template)
            self.db.commit()
            self.db.refresh(db_template)
            
            # Convert SQLAlchemy model to Pydantic model for JSON serialization
            return AgentTemplateResponse.model_validate(db_template)
        except Exception as e:
            self.db.rollback()
            logger.error(f"Error creating agent template: {str(e)}")
            raise
    
    def get_templates(self, skip: int = 0, limit: int = 100) -> List[AgentTemplateResponse]:
        """Get all agent templates with pagination"""
        try:
            templates = self.db.query(AgentTemplate).offset(skip).limit(limit).all()
            
            # Convert SQLAlchemy models to Pydantic models for JSON serialization
            return [AgentTemplateResponse.model_validate(template) for template in templates]
        except Exception as e:
            logger.error(f"Error retrieving agent templates: {str(e)}")
            raise
    
    def get_template_by_id(self, template_id: UUID) -> Optional[AgentTemplateResponse]:
        """Get a specific agent template by ID"""
        try:
            template = self.db.query(AgentTemplate).filter(AgentTemplate.id == template_id).first()
            if template is None:
                return None
            
            # Convert SQLAlchemy model to Pydantic model for JSON serialization
            return AgentTemplateResponse.model_validate(template)
        except Exception as e:
            logger.error(f"Error retrieving agent template {template_id}: {str(e)}")
            raise
    
    def update_template(self, template_id: UUID, template_update: AgentTemplateUpdate) -> Optional[AgentTemplateResponse]:
        """Update an agent template"""
        try:
            db_template = self.db.query(AgentTemplate).filter(AgentTemplate.id == template_id).first()
            if db_template is None:
                return None
            
            update_data = template_update.model_dump(exclude_unset=True)
            for key, value in update_data.items():
                setattr(db_template, key, value)
            
            self.db.commit()
            self.db.refresh(db_template)
            
            # Convert SQLAlchemy model to Pydantic model for JSON serialization
            return AgentTemplateResponse.model_validate(db_template)
        except Exception as e:
            self.db.rollback()
            logger.error(f"Error updating agent template {template_id}: {str(e)}")
            raise
    
    def delete_template(self, template_id: UUID) -> bool:
        """Delete an agent template"""
        try:
            db_template = self.db.query(AgentTemplate).filter(AgentTemplate.id == template_id).first()
            if db_template is None:
                return False
            
            self.db.delete(db_template)
            self.db.commit()
            return True
        except Exception as e:
            self.db.rollback()
            logger.error(f"Error deleting agent template {template_id}: {str(e)}")
            raise
