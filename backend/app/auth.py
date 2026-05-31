"""
Authentication helpers.

Production: Google ID token → verified by google-auth library → JWT issued.
Dev fallback: X-Dev-Email header (only when DEV_AUTH_ENABLED=true in env).
"""
import os
import logging
from datetime import datetime, timedelta
from typing import Optional

from fastapi import Header, HTTPException, Depends
from jose import JWTError, jwt
from sqlalchemy.orm import Session

from .db import SessionLocal
from .models import User

logger = logging.getLogger(__name__)

JWT_SECRET = os.getenv("JWT_SECRET", "change-me-in-production")
JWT_ALGORITHM = "HS256"
JWT_EXPIRE_DAYS = int(os.getenv("JWT_EXPIRE_DAYS", "7"))
GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID", "")
DEV_AUTH_ENABLED = os.getenv("DEV_AUTH_ENABLED", "false").lower() == "true"


# ── DB dependency ──────────────────────────────────────────────────────────────

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# ── JWT helpers ────────────────────────────────────────────────────────────────

def create_access_token(user_id: int, email: str, is_admin: int) -> str:
    payload = {
        "sub": str(user_id),
        "email": email,
        "is_admin": is_admin,
        "exp": datetime.utcnow() + timedelta(days=JWT_EXPIRE_DAYS),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def _decode_token(token: str) -> dict:
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except JWTError as exc:
        raise HTTPException(status_code=401, detail=f"Invalid token: {exc}") from exc


# ── Google ID token verification ───────────────────────────────────────────────

def verify_google_token(id_token: str) -> dict:
    """Verify a Google ID token and return the claims dict."""
    if not GOOGLE_CLIENT_ID:
        raise HTTPException(status_code=500, detail="GOOGLE_CLIENT_ID not configured")
    try:
        from google.oauth2 import id_token as google_id_token
        from google.auth.transport import requests as google_requests
        claims = google_id_token.verify_oauth2_token(
            id_token, google_requests.Request(), GOOGLE_CLIENT_ID
        )
        return claims
    except Exception as exc:
        logger.warning("Google token verification failed: %s", exc)
        raise HTTPException(status_code=401, detail="Google token verification failed") from exc


def upsert_google_user(claims: dict, db: Session) -> User:
    """Create or update a user from Google claims."""
    google_id = claims.get("sub")
    email = claims.get("email", "")
    name = claims.get("name") or claims.get("given_name", "")
    avatar = claims.get("picture")

    user = db.query(User).filter(User.google_id == google_id).first()
    if not user:
        user = db.query(User).filter(User.email == email).first()

    if user:
        user.google_id = google_id
        user.display_name = user.display_name or name
        user.avatar_url = avatar or user.avatar_url
    else:
        user = User(
            email=email,
            display_name=name,
            google_id=google_id,
            avatar_url=avatar,
            is_admin=0,
        )
        db.add(user)
    db.commit()
    db.refresh(user)
    return user


# ── FastAPI dependency ─────────────────────────────────────────────────────────

def get_current_user(
    authorization: Optional[str] = Header(None),
    x_dev_email: Optional[str] = Header(None, alias="X-Dev-Email"),
    db: Session = Depends(get_db),
) -> User:
    """
    Resolve the authenticated user from a Bearer JWT.
    If DEV_AUTH_ENABLED, also accept X-Dev-Email header (no password).
    """
    if DEV_AUTH_ENABLED and x_dev_email:
        user = db.query(User).filter(User.email == x_dev_email).first()
        if not user:
            raise HTTPException(status_code=401, detail="Dev user not found; POST /auth/dev-login first")
        return user

    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Authorization header required")

    token = authorization.split(" ", 1)[1]
    payload = _decode_token(token)
    user_id = int(payload.get("sub", 0))
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user


def require_admin(current_user: User = Depends(get_current_user)) -> User:
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Admin privileges required")
    return current_user

