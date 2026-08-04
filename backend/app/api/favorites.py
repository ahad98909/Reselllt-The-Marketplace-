from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.core.database import get_db
from app.models import models
from app.schemas import schemas
from app.api import deps

router = APIRouter(prefix="/favorites", tags=["Favorites"])

@router.get("", response_model=List[schemas.FavoriteResponse])
def get_favorites(
    current_user: models.User = Depends(deps.get_current_user),
    db: Session = Depends(get_db)
):
    # Returns all favorited listings for the current user
    favorites = db.query(models.Favorite).filter(models.Favorite.user_id == current_user.id).all()
    return favorites

@router.post("/{product_id}")
def toggle_favorite(
    product_id: int,
    current_user: models.User = Depends(deps.get_current_user),
    db: Session = Depends(get_db)
):
    # Check if product exists
    product = db.query(models.Product).filter(models.Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product listing not found")

    # Check if already favorited
    fav = db.query(models.Favorite).filter(
        models.Favorite.user_id == current_user.id,
        models.Favorite.product_id == product_id
    ).first()

    if fav:
        # Unfavorite
        db.delete(fav)
        db.commit()
        return {"favorited": False, "message": "Removed from favorites"}
    else:
        # Favorite
        new_fav = models.Favorite(user_id=current_user.id, product_id=product_id)
        db.add(new_fav)
        db.commit()
        return {"favorited": True, "message": "Added to favorites"}
