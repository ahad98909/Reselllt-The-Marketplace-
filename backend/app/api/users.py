from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List
from app.core.database import get_db
from app.models import models
from app.schemas import schemas
from app.api import deps
from app.core import security

router = APIRouter(prefix="/users", tags=["Users"])

@router.get("/{user_id}", response_model=schemas.UserResponse)
def get_user_profile(user_id: int, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

@router.put("/profile", response_model=schemas.UserResponse)
def update_profile(
    profile_data: schemas.UserUpdate,
    current_user: models.User = Depends(deps.get_current_user),
    db: Session = Depends(get_db)
):
    if profile_data.name is not None:
        current_user.name = profile_data.name
    if profile_data.profile_picture is not None:
        current_user.profile_picture = profile_data.profile_picture
    if profile_data.password is not None:
        current_user.password_hash = security.get_password_hash(profile_data.password)
        
    db.commit()
    db.refresh(current_user)
    return current_user

@router.post("/{user_id}/reviews", response_model=schemas.ReviewResponse)
def write_review(
    user_id: int,
    review_in: schemas.ReviewCreate,
    current_user: models.User = Depends(deps.get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.id == user_id:
        raise HTTPException(status_code=400, detail="You cannot review yourself")
        
    # Check if target user exists
    target_user = db.query(models.User).filter(models.User.id == user_id).first()
    if not target_user:
        raise HTTPException(status_code=404, detail="Target user not found")
        
    # Check if review already exists
    existing = db.query(models.Review).filter(
        models.Review.reviewer_id == current_user.id,
        models.Review.reviewee_id == user_id
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="You have already reviewed this seller")
        
    # Create review
    review = models.Review(
        reviewer_id=current_user.id,
        reviewee_id=user_id,
        rating=review_in.rating,
        comment=review_in.comment
    )
    db.add(review)
    db.commit()
    db.refresh(review)
    
    # Recalculate average rating of reviewee
    avg_rating = db.query(func.avg(models.Review.rating)).filter(
        models.Review.reviewee_id == user_id
    ).scalar()
    
    target_user.rating = round(float(avg_rating), 1) if avg_rating else 0.0
    db.commit()
    
    return review

@router.get("/{user_id}/reviews", response_model=List[schemas.ReviewResponse])
def get_user_reviews(user_id: int, db: Session = Depends(get_db)):
    reviews = db.query(models.Review).filter(models.Review.reviewee_id == user_id).all()
    return reviews
