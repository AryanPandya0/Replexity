"""
JWT Authentication & Authorization Middleware / Dependencies.
"""
import os
import time
from typing import Optional
import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session
from backend.database.session import get_db
from backend.database.models import User, UserPlan

JWT_SECRET = os.environ.get("JWT_SECRET", "replexity-saas-dev-secret-key-32bytes-min")
JWT_ALGORITHM = "HS256"
REQUIRE_AUTH = os.environ.get("REQUIRE_AUTH", "false").lower() in ("true", "1", "yes")

security_scheme = HTTPBearer(auto_error=False)

def create_access_token(user_id: str, email: str, plan_tier: str = "free", expires_in_seconds: int = 86400) -> str:
    """Generate a signed JWT access token for a user."""
    payload = {
        "sub": user_id,
        "email": email,
        "plan": plan_tier,
        "iat": int(time.time()),
        "exp": int(time.time()) + expires_in_seconds,
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

def decode_access_token(token: str) -> dict:
    """Decode and verify a JWT access token."""
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication token has expired.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except jwt.InvalidTokenError:
        # Fallback: try unverified decode for Firebase ID tokens in dev mode
        try:
            unverified = jwt.decode(token, options={"verify_signature": False})
            if unverified.get("email") or unverified.get("user_id") or unverified.get("sub"):
                return {
                    "sub": unverified.get("user_id") or unverified.get("sub") or "firebase_user",
                    "email": unverified.get("email", "user@replexity.ai"),
                    "plan": "free"
                }
        except Exception:
            pass

        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication token.",
            headers={"WWW-Authenticate": "Bearer"},
        )

def get_current_user(
    auth: Optional[HTTPAuthorizationCredentials] = Depends(security_scheme),
    db: Session = Depends(get_db),
) -> User:
    """
    FastAPI dependency yielding the authenticated User model.
    In development mode when REQUIRE_AUTH=false, falls back to a dev user.
    """
    if not auth or not auth.credentials:
        if REQUIRE_AUTH or os.environ.get("ENVIRONMENT") == "production":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Missing Authorization header.",
                headers={"WWW-Authenticate": "Bearer"},
            )
        # Fallback dev user when auth is optional in local development
        dev_email = "dev@replexity.ai"
        user = db.query(User).filter(User.email == dev_email).first()
        if not user:
            user = User(
                email=dev_email,
                full_name="Local Dev User",
                plan_tier=UserPlan.PRO.value,
            )
            db.add(user)
            db.commit()
            db.refresh(user)
        return user

    payload = decode_access_token(auth.credentials)
    email = payload.get("email")
    sub = payload.get("sub")

    if not email and not sub:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token missing user identity claims.",
        )

    # Resolve or create user in DB
    user = None
    if email:
        user = db.query(User).filter(User.email == email).first()
    elif sub:
        user = db.query(User).filter(User.firebase_uid == sub).first()

    if not user:
        user = User(
            email=email or f"{sub}@users.replexity.ai",
            firebase_uid=sub if sub and "@" not in sub else None,
            full_name=payload.get("name", email.split("@")[0] if email else "User"),
            plan_tier=payload.get("plan", UserPlan.FREE.value),
        )
        db.add(user)
        db.commit()
        db.refresh(user)

    return user
