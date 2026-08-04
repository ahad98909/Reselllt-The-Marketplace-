from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.core.database import get_db
from app.models import models
from app.schemas import schemas
from app.api import deps

router = APIRouter(prefix="/notifications", tags=["Notifications"])

@router.get("", response_model=List[schemas.NotificationResponse])
def get_notifications(
    current_user: models.User = Depends(deps.get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get all active notifications for the current user
    """
    notifications = db.query(models.Notification).filter(
        models.Notification.user_id == current_user.id
    ).order_by(models.Notification.created_at.desc()).all()
    return notifications

@router.post("/{notification_id}/read")
def mark_notification_as_read(
    notification_id: int,
    current_user: models.User = Depends(deps.get_current_user),
    db: Session = Depends(get_db)
):
    """
    Mark a single notification as read
    """
    notification = db.query(models.Notification).filter(
        models.Notification.id == notification_id,
        models.Notification.user_id == current_user.id
    ).first()

    if not notification:
        raise HTTPException(status_code=404, detail="Notification not found")

    notification.is_read = True
    db.commit()
    return {"message": "Notification marked as read."}

@router.post("/read-all")
def mark_all_notifications_as_read(
    current_user: models.User = Depends(deps.get_current_user),
    db: Session = Depends(get_db)
):
    """
    Mark all unread notifications as read
    """
    db.query(models.Notification).filter(
        models.Notification.user_id == current_user.id,
        models.Notification.is_read == False
    ).update({models.Notification.is_read: True})
    
    db.commit()
    return {"message": "All notifications marked as read."}
