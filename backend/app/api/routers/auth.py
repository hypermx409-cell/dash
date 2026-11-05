"""Authentication routes."""

from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Response, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from app.config import settings
from app.core.db import get_db
from app.core.security import create_access_token, hash_password, verify_password
from app.core.deps import get_current_user
from app.models import User, Role
from app.schemas.auth import RegisterRequest, LoginRequest, TokenResponse, UserMe

router = APIRouter()


def _user_role_name(user: User) -> str | None:
    return user.role.name if user.role else None


@router.post("/register", response_model=UserMe, status_code=201)
async def register(payload: RegisterRequest, db: Session = Depends(get_db)):
    if not settings.REGISTRATION_ENABLED:
        raise HTTPException(403, "Registration disabled")
    if db.query(User).filter(User.email == payload.email).first():
        raise HTTPException(400, "Email already registered")
    if db.query(User).filter(User.username == payload.username).first():
        raise HTTPException(400, "Username already taken")
    from app.models import Wallet
    user_role = db.query(Role).filter(Role.name == "user").first()
    user = User(
        email=payload.email,
        username=payload.username,
        hashed_password=hash_password(payload.password),
        role_id=user_role.id if user_role else None,
    )
    db.add(user)
    db.flush()
    db.add(Wallet(user_id=user.id, balance=0))
    db.commit()
    db.refresh(user)
    # Sync Pterodactyl panel account with the same credentials
    try:
        from app.services.pterodactyl_account import sync_panel_account
        await sync_panel_account(payload.email, payload.username, payload.password)
    except Exception:
        pass
    return UserMe(
        id=user.id,
        email=user.email,
        username=user.username,
        role=_user_role_name(user),
        is_active=user.is_active,
        is_verified=user.is_verified,
        balance=user.balance,
    )


@router.post("/login")
async def login(payload: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email).first()
    if not user or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(401, "Invalid credentials")
    if not user.is_active:
        raise HTTPException(403, "Account suspended. Contact an admin.")
    # Sync Pterodactyl panel account with current credentials
    try:
        from app.services.pterodactyl_account import sync_panel_account
        await sync_panel_account(payload.email, user.username, payload.password)
    except Exception:
        pass
    token = create_access_token(user.id)
    return {"access_token": token, "token_type": "bearer"}


@router.post("/logout")
def logout(current=Depends(get_current_user)):
    return {"message": "logged out"}


@router.get("/me", response_model=UserMe)
def me(current: User = Depends(get_current_user)):
    return UserMe(
        id=current.id,
        email=current.email,
        username=current.username,
        role=_user_role_name(current),
        is_active=current.is_active,
        is_verified=current.is_verified,
        balance=current.balance,
        display_name=current.display_name,
        discord_id=current.discord_id,
    )
