"""Auth endpoints: Google OAuth login, dev login, /me."""
import os
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from ..auth import (
    create_access_token, get_db, get_current_user,
    upsert_google_user, verify_google_token,
    DEV_AUTH_ENABLED,
)
from ..models import User

router = APIRouter(prefix="/auth", tags=["auth"])


class GoogleLoginRequest(BaseModel):
    id_token: str


class DevLoginRequest(BaseModel):
    email: str
    display_name: str = ""


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_id: int
    email: str
    display_name: str | None
    avatar_url: str | None
    is_admin: int


def _token_response(user: User) -> TokenResponse:
    return TokenResponse(
        access_token=create_access_token(user.id, user.email, user.is_admin),
        user_id=user.id,
        email=user.email,
        display_name=user.display_name,
        avatar_url=user.avatar_url,
        is_admin=user.is_admin,
    )


@router.post("/google", response_model=TokenResponse)
def google_login(body: GoogleLoginRequest, db: Session = Depends(get_db)):
    claims = verify_google_token(body.id_token)
    user = upsert_google_user(claims, db)
    return _token_response(user)


@router.post("/dev-login", response_model=TokenResponse)
def dev_login(body: DevLoginRequest, db: Session = Depends(get_db)):
    if not DEV_AUTH_ENABLED:
        raise HTTPException(status_code=403, detail="Dev auth is disabled")
    user = db.query(User).filter(User.email == body.email).first()
    if not user:
        user = User(email=body.email, display_name=body.display_name or body.email, is_admin=0)
        db.add(user)
        db.commit()
        db.refresh(user)
    return _token_response(user)


@router.get("/me")
def me(current_user: User = Depends(get_current_user)):
    return {
        "id": current_user.id,
        "email": current_user.email,
        "display_name": current_user.display_name,
        "avatar_url": current_user.avatar_url,
        "is_admin": current_user.is_admin,
    }
