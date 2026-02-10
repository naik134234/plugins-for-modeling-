from datetime import timedelta
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from config import settings
from src.api.schemas.request_schemas import Token, UserCreate
from src.api.schemas.response_schemas import UserResponse
from src.core import security
from src.api.dependencies import get_db
from src.services.user_service import authenticate_user, create_user, get_user_by_email

router = APIRouter()

@router.post("/login/access-token", response_model=Token)
def login_access_token(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db)
) -> Any:
    """
    OAuth2 compatible token login, get an access token for future requests.
    """
    user = authenticate_user(db, email=form_data.username, password=form_data.password)
    
    # Auto-create admin user if it's the first login attempt with these credentials (DEMO ONLY)
    if not user and form_data.username == "admin@example.com" and form_data.password == "admin123":
         user = create_user(db, UserCreate(
             email="admin@example.com", 
             password="admin123", 
             full_name="Admin User"
         ))

    if not user:
        raise HTTPException(status_code=400, detail="Incorrect email or password")
    elif not user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
    
    access_token_expires = timedelta(minutes=settings.security.access_token_expire_minutes)
    return {
        "access_token": security.create_access_token(
            user.email, expires_delta=access_token_expires
        ),
        "token_type": "bearer",
    }


@router.post("/register", response_model=UserResponse)
def register_user(
    user_in: UserCreate,
    db: Session = Depends(get_db)
) -> Any:
    """
    Register a new user.
    """
    user = get_user_by_email(db, email=user_in.email)
    if user:
        raise HTTPException(
            status_code=400,
            detail="The user with this email already exists in the system",
        )
    user = create_user(db, user_in=user_in)
    return user
