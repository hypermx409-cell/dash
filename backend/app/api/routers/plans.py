"""Plan listing and admin management."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.core.deps import get_current_user, require_admin
from app.models import Plan
from app.schemas.plan import PlanCreate, PlanUpdate, PlanOut

router = APIRouter()


@router.get("/plans", response_model=list[PlanOut])
def list_plans(public_only: bool = True, db: Session = Depends(get_db), current=Depends(get_current_user)):
    q = db.query(Plan)
    if public_only:
        q = q.filter(Plan.is_active.is_(True), Plan.is_public.is_(True))
    return q.all()


@router.get("/plans/{plan_id}", response_model=PlanOut)
def get_plan(plan_id: str, db: Session = Depends(get_db), current=Depends(get_current_user)):
    p = db.get(Plan, plan_id)
    if not p:
        raise HTTPException(404, "Plan not found")
    return p


# Admin
@router.post("/admin/plans", response_model=PlanOut, status_code=201)
def create_plan(payload: PlanCreate, db: Session = Depends(get_db), admin=Depends(require_admin)):
    import uuid
    p = Plan(id=str(uuid.uuid4()), **payload.model_dump())
    db.add(p)
    db.commit()
    db.refresh(p)
    return p


@router.put("/admin/plans/{plan_id}", response_model=PlanOut)
def update_plan(plan_id: str, payload: PlanUpdate, db: Session = Depends(get_db), admin=Depends(require_admin)):
    p = db.get(Plan, plan_id)
    if not p:
        raise HTTPException(404, "Plan not found")
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(p, k, v)
    db.commit()
    db.refresh(p)
    return p


@router.delete("/admin/plans/{plan_id}")
def delete_plan(plan_id: str, db: Session = Depends(get_db), admin=Depends(require_admin)):
    p = db.get(Plan, plan_id)
    if not p:
        raise HTTPException(404, "Plan not found")
    db.delete(p)
    db.commit()
    return {"message": "deleted"}
