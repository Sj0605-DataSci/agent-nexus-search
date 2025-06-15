from typing import List
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.auth import get_current_user
from app.db.database import get_db
from app.models.models import AgentTemplate, Profile
from app.models.schemas import AgentTemplateCreate, AgentTemplateResponse, AgentTemplateUpdate

router = APIRouter(prefix="/agent_templates", tags=["agent_templates"])

@router.post("/", response_model=AgentTemplateResponse, status_code=status.HTTP_201_CREATED)
def create_agent_template(
    template: AgentTemplateCreate,
    db: Session = Depends(get_db),
    current_user: Profile = Depends(get_current_user)
):
    """Create a new agent template"""
    db_template = AgentTemplate(**template.model_dump())
    db.add(db_template)
    db.commit()
    db.refresh(db_template)
    return db_template

@router.get("/", response_model=List[AgentTemplateResponse])
def get_agent_templates(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    """Get all agent templates"""
    templates = db.query(AgentTemplate).offset(skip).limit(limit).all()
    return templates

@router.get("/{template_id}", response_model=AgentTemplateResponse)
def get_agent_template(
    template_id: UUID,
    db: Session = Depends(get_db)
):
    """Get a specific agent template by ID"""
    template = db.query(AgentTemplate).filter(AgentTemplate.id == template_id).first()
    if template is None:
        raise HTTPException(status_code=404, detail="Agent template not found")
    return template

@router.put("/{template_id}", response_model=AgentTemplateResponse)
def update_agent_template(
    template_id: UUID,
    template_update: AgentTemplateUpdate,
    db: Session = Depends(get_db),
    current_user: Profile = Depends(get_current_user)
):
    """Update an agent template"""
    db_template = db.query(AgentTemplate).filter(AgentTemplate.id == template_id).first()
    if db_template is None:
        raise HTTPException(status_code=404, detail="Agent template not found")
    
    update_data = template_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_template, key, value)
    
    db.commit()
    db.refresh(db_template)
    return db_template

@router.delete("/{template_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_agent_template(
    template_id: UUID,
    db: Session = Depends(get_db),
    current_user: Profile = Depends(get_current_user)
):
    """Delete an agent template"""
    db_template = db.query(AgentTemplate).filter(AgentTemplate.id == template_id).first()
    if db_template is None:
        raise HTTPException(status_code=404, detail="Agent template not found")
    
    db.delete(db_template)
    db.commit()
    return None
