from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.auth import get_current_user
from app.db.database import get_db
from app.models.models import Profile
from app.models.schemas import ProfileCreate, ProfileResponse, ProfileUpdate

router = APIRouter(prefix="/profiles", tags=["profiles"])

@router.post("", response_model=ProfileResponse, status_code=status.HTTP_201_CREATED)
def create_profile(
    profile: ProfileCreate,
    db: Session = Depends(get_db)
):
    """
    Create a new user profile.
    
    This endpoint is typically called after a user is created in the auth system.
    """
    # Check if profile already exists
    existing_profile = db.query(Profile).filter(Profile.id == profile.id).first()
    if existing_profile:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Profile already exists"
        )
    
    db_profile = Profile(**profile.model_dump())
    db.add(db_profile)
    db.commit()
    db.refresh(db_profile)
    return db_profile

@router.get("", response_model=ProfileResponse)
def get_my_profile(
    current_user: Profile = Depends(get_current_user)
):
    """Get the current user's profile"""
    return current_user

@router.get("/{user_id}", response_model=ProfileResponse)
def get_profile(
    user_id: UUID,
    db: Session = Depends(get_db),
    current_user: Profile = Depends(get_current_user)
):
    """Get a specific user profile by ID"""
    # For privacy reasons, users can only view their own profile
    # In a real app, you might want to allow viewing public profiles
    if user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only view your own profile"
        )
    
    profile = db.query(Profile).filter(Profile.id == user_id).first()
    if profile is None:
        raise HTTPException(status_code=404, detail="Profile not found")
    
    return profile

@router.put("/me", response_model=ProfileResponse)
def update_my_profile(
    profile_update: ProfileUpdate,
    db: Session = Depends(get_db),
    current_user: Profile = Depends(get_current_user)
):
    """Update the current user's profile"""
    update_data = profile_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(current_user, key, value)
    
    db.commit()
    db.refresh(current_user)
    return current_user
