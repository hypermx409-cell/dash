"""AFK earning plugin endpoints."""

import datetime
import json

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

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


@router.post("/ping")
def afk_ping(current: User = Depends(get_current_user), db: Session = Depends(get_db)):
    m = _module(db, "afk")
    if not m or not m.enabled:
        raise HTTPException(403, "AFK module disabled")
    cfg = _cfg(db, "afk")
    interval = int(cfg.get("interval_seconds", 120))
    reward = int(cfg.get("coins_per_interval", cfg.get("rate_per_minute", 1)))

    last = db.query(Transaction).filter(Transaction.user_id == current.id, Transaction.kind == "afk").order_by(Transaction.created_at.desc()).first()
    now = datetime.datetime.now(datetime.timezone.utc)
    if last is not None:
        last_time = last.created_at
        if last_time.tzinfo is None:
            last_time = last_time.replace(tzinfo=datetime.timezone.utc)
        elapsed = (now - last_time).total_seconds()
        if elapsed < interval:
            remaining = int(interval - elapsed)
            return {"credited": False, "reward": 0, "balance": current.balance, "retry_after": remaining}

    _ensure_wallet(db, current.id)
    w = db.query(Wallet).filter(Wallet.user_id == current.id).first()
    w.balance += reward
    current.balance = w.balance
    db.add(Transaction(user_id=current.id, amount=reward, kind="afk", description="AFK reward", reference=f"afk:{current.id}:{int(now.timestamp())}"))
    db.commit()
    return {"credited": True, "reward": reward, "balance": w.balance, "retry_after": interval}