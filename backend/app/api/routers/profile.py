"""User profile routes."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.core.deps import get_current_user
from app.core.security import hash_password, verify_password
from app.models import User
from app.schemas.auth import ProfileUpdate

router = APIRouter()


@router.get("/me/profile")
def get_profile(current: User = Depends(get_current_user)):
    return {
        "id": current.id,
        "email": current.email,
        "username": current.username,
        "display_name": current.display_name,
        "discord_id": current.discord_id,
        "balance": current.balance,
    }


@router.put("/me/profile")
def update_profile(payload: ProfileUpdate, current: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if payload.display_name is not None:
        current.display_name = payload.display_name
    if payload.username is not None:
        if db.query(User).filter(User.username == payload.username, User.id != current.id).first():
            raise HTTPException(400, "Username taken")
        current.username = payload.username
    db.commit()
    db.refresh(current)
    return {"message": "updated"}


@router.post("/me/change-password")
async def change_password(payload: dict, current: User = Depends(get_current_user), db: Session = Depends(get_db)):
    old = payload.get("old_password")
    new = payload.get("new_password")
    if not old or not new or len(new) < 8:
        raise HTTPException(400, "Invalid password")
    if not verify_password(old, current.hashed_password):
        raise HTTPException(400, "Old password incorrect")
    current.hashed_password = hash_password(new)
    try:
        from app.services.pterodactyl_account import sync_panel_account
        await sync_panel_account(current.email, current.username, new)
    except Exception:
        pass
    db.commit()
    return {"message": "changed"}
