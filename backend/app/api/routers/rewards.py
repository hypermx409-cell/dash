"""Rewards and referrals routes."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.core.deps import get_current_user
from app.models import Referral, Reward

router = APIRouter()


@router.get("/rewards")
def list_rewards(current=Depends(get_current_user), db: Session = Depends(get_db)):
    rewards = db.query(Reward).filter(Reward.is_active.is_(True)).all()
    return [{"id": r.id, "code": r.code, "title": r.title, "amount": r.amount, "claimed_count": r.claimed_count, "max_claims": r.max_claims} for r in rewards]


@router.get("/referrals")
def get_referrals(current=Depends(get_current_user), db: Session = Depends(get_db)):
    refs = db.query(Referral).filter(Referral.referrer_id == current.id).all()
    code = f"REF-{current.id[:8].upper()}"
    return {"code": code, "count": len(refs), "referrals": [{"id": r.id, "referred_id": r.referred_id, "rewarded": r.rewarded, "created_at": r.created_at} for r in refs]}
