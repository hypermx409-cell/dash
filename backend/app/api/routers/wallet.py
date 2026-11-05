"""Wallet and transaction routes."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.core.deps import get_current_user
from app.models import Transaction, Wallet

router = APIRouter()


def _ensure_wallet(db: Session, user_id: str) -> Wallet:
    w = db.query(Wallet).filter(Wallet.user_id == user_id).first()
    if not w:
        w = Wallet(user_id=user_id, balance=0)
        db.add(w)
        db.commit()
        db.refresh(w)
    return w


@router.get("/wallet")
def get_wallet(current=Depends(get_current_user), db: Session = Depends(get_db)):
    w = _ensure_wallet(db, current.id)
    current.balance = w.balance
    txs = db.query(Transaction).filter(Transaction.user_id == current.id).order_by(Transaction.created_at.desc()).limit(50).all()
    return {
        "balance": w.balance,
        "transactions": [
            {"id": t.id, "amount": t.amount, "kind": t.kind, "description": t.description, "created_at": t.created_at}
            for t in txs
        ],
    }


@router.post("/wallet/claim-reward")
def claim_reward(payload: dict, current=Depends(get_current_user), db: Session = Depends(get_db)):
    code = payload.get("code")
    if not code:
        raise HTTPException(400, "Missing code")
    from app.models import Reward
    r = db.query(Reward).filter(Reward.code == code, Reward.is_active.is_(True)).first()
    if not r:
        raise HTTPException(404, "Reward not found")
    if r.max_claims is not None and r.claimed_count >= r.max_claims:
        raise HTTPException(400, "Reward exhausted")
    w = _ensure_wallet(db, current.id)
    w.balance += r.amount
    current.balance = w.balance
    db.add(Transaction(user_id=current.id, amount=r.amount, kind="reward", description=f"Reward {code}", reference=r.id))
    r.claimed_count += 1
    db.commit()
    return {"balance": w.balance}
