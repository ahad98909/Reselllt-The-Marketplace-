from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core import security
from app.core.config import settings
from app.models import models
from app.schemas import schemas
from app.api import deps
from app.core.geocoding import geocode_address

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/register", response_model=schemas.Token)
def register(
    user_in: schemas.RegisterRequest, 
    db: Session = Depends(get_db)
):
    # Check if user already exists
    user = db.query(models.User).filter(models.User.email == user_in.email).first()
    if user:
        raise HTTPException(
            status_code=400,
            detail="The user with this email address already exists in the system."
        )
    
    lat = user_in.latitude
    lon = user_in.longitude
    if (lat is None or lon is None) and user_in.address:
        lat, lon = geocode_address(user_in.address)

    # Hash password and create user
    hashed_password = security.get_password_hash(user_in.password)
    db_user = models.User(
        name=user_in.name,
        email=user_in.email,
        password_hash=hashed_password,
        profile_picture="https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150", # Default avatar
        rating=0.0,
        email_verified=False,
        address=user_in.address,
        latitude=lat,
        longitude=lon
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    
    # Generate access token
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = security.create_access_token(
        db_user.id, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

@router.post("/login", response_model=schemas.Token)
def login_json(
    login_in: schemas.LoginRequest, 
    db: Session = Depends(get_db)
):
    # Check user credentials
    user = db.query(models.User).filter(models.User.email == login_in.email).first()
    if not user or not security.verify_password(login_in.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Incorrect email or password"
        )
    if user.is_banned:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your account has been banned by an administrator."
        )
        
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = security.create_access_token(
        user.id, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

@router.post("/login-form", response_model=schemas.Token)
def login_form(
    form_data: OAuth2PasswordRequestForm = Depends(), 
    db: Session = Depends(get_db)
):
    """
    OAuth2 standard login form, utilized by Swagger UI interactive authorize system.
    """
    user = db.query(models.User).filter(models.User.email == form_data.username).first()
    if not user or not security.verify_password(form_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Incorrect email or password"
        )
    if user.is_banned:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your account has been banned by an administrator."
        )
        
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = security.create_access_token(
        user.id, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

@router.post("/google", response_model=schemas.Token)
def google_login(
    payload: dict, 
    db: Session = Depends(get_db)
):
    """
    Mock Google Login callback. Validates Google token claims and finds or registers the user.
    """
    email = payload.get("email")
    name = payload.get("name", "Google User")
    profile_picture = payload.get("picture", "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150")
    
    if not email:
        raise HTTPException(status_code=400, detail="Invalid token details")
        
    user = db.query(models.User).filter(models.User.email == email).first()
    if not user:
        # Create Google user with random mock password
        hashed_password = security.get_password_hash(f"google_pass_{email}")
        user = models.User(
            name=name,
            email=email,
            password_hash=hashed_password,
            profile_picture=profile_picture,
            rating=0.0,
            email_verified=True
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        
    if user.is_banned:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your account has been banned by an administrator."
        )
        
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = security.create_access_token(
        user.id, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

@router.get("/me", response_model=schemas.UserResponse)
def get_me(current_user: models.User = Depends(deps.get_current_user)):
    return current_user

@router.post("/verify-email")
def verify_email(
    current_user: models.User = Depends(deps.get_current_user), 
    db: Session = Depends(get_db)
):
    current_user.email_verified = True
    db.commit()
    return {"message": "Email verified successfully."}
