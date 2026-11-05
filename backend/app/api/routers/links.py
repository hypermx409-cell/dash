"""Links-to-earn plugin endpoints."""

import datetime
import json

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from itsdangerous import URLSafeTimedSerializer

from app.config import settings
from app.core.db import get_db
from app.core.deps import get_current_user
from app.models import ModuleSetting, Transaction, Wallet, User

router = APIRouter()


def _module(db: Session, key: str):
    return db.query(ModuleSetting).filter(ModuleSetting.key == key).first()


def _cfg(db: Session, key: str) -> dict:
    m = _module(db, key)
    if not m or not m.config:
        return {}
    try:
        return json.loads(m.config)
    except Exception:
        return {}


def _ensure_wallet(db: Session, user_id: str) -> Wallet:
    w = db.query(Wallet).filter(Wallet.user_id == user_id).first()
    if not w:
        w = Wallet(user_id=user_id, balance=0)
        db.add(w)
        db.commit()
        db.refresh(w)
    return w


def _links_serializer() -> URLSafeTimedSerializer:
    return URLSafeTimedSerializer(settings.SECRET_KEY, salt="link-start")


@router.post("/start")
def start_link(payload: dict, current: User = Depends(get_current_user), db: Session = Depends(get_db)):
    m = _module(db, "links")
    if not m or not m.enabled:
        raise HTTPException(403, "Links module disabled")
    cfg = _cfg(db, "links")
    link_id = payload.get("link_id")
    links = cfg.get("links", [])
    link = next((l for l in links if l.get("id") == link_id), None)
    if not link:
        raise HTTPException(404, "Link not found")

    ref = f"link_reward:{current.id}:{link_id}"
    if db.query(Transaction).filter(Transaction.reference == ref).first():
        raise HTTPException(400, "Link already claimed")

    wait_seconds = int(cfg.get("wait_seconds", cfg.get("claim_wait_seconds", 15)))
    if wait_seconds < 5:
        wait_seconds = 5
    token = _links_serializer().dumps({"u": current.id, "l": link_id, "w": wait_seconds})
    return {"token": token, "wait_seconds": wait_seconds, "reward": int(link.get("reward", cfg.get("reward", 10)))}


@router.post("/complete")
def complete_link(payload: dict, current: User = Depends(get_current_user), db: Session = Depends(get_db)):
    token = payload.get("token")
    if not token:
        raise HTTPException(400, "Missing link token")
    try:
        data, signed_at = _links_serializer().loads(token, return_timestamp=True)
    except Exception:
        raise HTTPException(400, "Invalid or expired link token")

    if data.get("u") != current.id:
        raise HTTPException(403, "Token does not belong to this user")
    link_id = data.get("l")
    wait_seconds = int(data.get("w") or 15)
    now = datetime.datetime.now(datetime.timezone.utc)
    signed_time = signed_at if getattr(signed_at, "tzinfo", None) else signed_at.replace(tzinfo=datetime.timezone.utc)
    if (now - signed_time).total_seconds() < wait_seconds:
        raise HTTPException(425, f"Wait {wait_seconds}s before claiming")

    m = _module(db, "links")
    if not m or not m.enabled:
        raise HTTPException(403, "Links module disabled")
    cfg = _cfg(db, "links")
    links = cfg.get("links", [])
    link = next((l for l in links if l.get("id") == link_id), None)
    if not link:
        raise HTTPException(404, "Link not found")

    ref = f"link_reward:{current.id}:{link_id}"
    if db.query(Transaction).filter(Transaction.reference == ref).first():
        return {"credited": False, "already_claimed": True, "reward": 0, "balance": current.balance}

    reward = int(link.get("reward", cfg.get("reward", 10)))
    w = _ensure_wallet(db, current.id)
    w.balance += reward
    current.balance = w.balance
    db.add(Transaction(user_id=current.id, amount=reward, kind="reward", description=f"Link reward: {link.get('title', link_id)}", reference=ref))
    db.commit()
    return {"credited": True, "already_claimed": False, "reward": reward, "balance": w.balance}