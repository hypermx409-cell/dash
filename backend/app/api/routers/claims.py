"""Server claim workflow."""

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from sqlalchemy.orm import Session

from app.config import settings
from app.core.db import SessionLocal, get_db
from app.core.deps import get_current_user
from app.models import Claim, Plan, Server, User, ProvisioningJob
from app.schemas.plan import ClaimRequest, ClaimOut
from app.services.provisioning import provision_claim
import uuid

router = APIRouter()


def _max_servers(db: Session, user_id: str) -> int:
    # platform setting override optional
    return settings.MAX_SERVERS_PER_USER


@router.post("/claims", status_code=202)
async def create_claim(payload: ClaimRequest, bg: BackgroundTasks, current: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if not settings.CLAIMS_ENABLED:
        raise HTTPException(403, "Claims disabled")
    # maintenance module?
    plan = db.get(Plan, payload.plan_id)
    if not plan or not plan.is_active:
        raise HTTPException(404, "Plan not available")

    from app.models import PlatformSetting, ModuleSetting
    ms = db.query(ModuleSetting).filter(ModuleSetting.key == "maintenance").first()
    if ms and ms.enabled:
        # maintenance mode flag stored? check platform setting
        ps = db.query(PlatformSetting).filter(PlatformSetting.key == "maintenance_mode").first()
        if ps and ps.value == "true":
            raise HTTPException(503, "Maintenance mode")

    # idempotency
    if payload.idempotency_key:
        existing = db.query(Claim).filter(Claim.idempotency_key == payload.idempotency_key).first()
        if existing:
            return {"claim_id": existing.id, "status": existing.status}

    # server count check
    active_count = db.query(Server).filter(Server.user_id == current.id, Server.status != "deleted").count()
    if active_count >= _max_servers(db, current.id):
        raise HTTPException(400, "Maximum servers reached")

    # stock check + transaction-safe reservation
    if plan.available_stock is not None and plan.available_stock <= 0:
        raise HTTPException(400, "Plan out of stock")
    if plan.available_stock is not None:
        plan.available_stock -= 1

    claim = Claim(
        id=str(uuid.uuid4()),
        user_id=current.id,
        plan_id=plan.id,
        idempotency_key=payload.idempotency_key,
        status="pending",
    )
    db.add(claim)
    db.flush()
    server = Server(user_id=current.id, plan_id=plan.id, claim_id=claim.id, name=payload.server_name or f"{plan.name}-{claim.id[:6]}")
    db.add(server)
    db.flush()
    claim.server = server
    job = ProvisioningJob(claim_id=claim.id, server_id=server.id, status="queued")
    db.add(job)
    db.commit()
    db.refresh(claim)

    async def _bg(claim_id: str):
        s = SessionLocal()
        try:
            c = s.get(Claim, claim_id)
            j = s.query(ProvisioningJob).filter(ProvisioningJob.claim_id == claim_id).first()
            await provision_claim(s, c, j)
        finally:
            s.close()

    bg.add_task(_bg, claim.id)
    return {"claim_id": claim.id, "status": claim.status}


@router.get("/claims")
def list_claims(current: User = Depends(get_current_user), db: Session = Depends(get_db)):
    claims = db.query(Claim).filter(Claim.user_id == current.id).order_by(Claim.created_at.desc()).all()
    out = []
    for c in claims:
        out.append({
            "id": c.id,
            "plan_id": c.plan_id,
            "status": c.status,
            "error_message": c.error_message,
            "created_at": c.created_at,
            "plan_name": c.plan.name if c.plan else None,
            "server_id": c.server.id if c.server else None,
        })
    return out


@router.get("/claims/{claim_id}")
def get_claim(claim_id: str, current: User = Depends(get_current_user), db: Session = Depends(get_db)):
    c = db.get(Claim, claim_id)
    if not c or c.user_id != current.id:
        raise HTTPException(404, "Claim not found")
    return {
        "id": c.id,
        "plan_id": c.plan_id,
        "status": c.status,
        "error_message": c.error_message,
        "created_at": c.created_at,
        "server_id": c.server.id if c.server else None,
    }


@router.post("/claims/{claim_id}/retry")
async def retry_claim(claim_id: str, bg: BackgroundTasks, current: User = Depends(get_current_user), db: Session = Depends(get_db)):
    c = db.get(Claim, claim_id)
    if not c or c.user_id != current.id:
        raise HTTPException(404, "Claim not found")
    if c.status not in ("failed",):
        raise HTTPException(400, "Claim not retryable")
    job = db.query(ProvisioningJob).filter(ProvisioningJob.claim_id == claim_id).first()
    if not job:
        job = ProvisioningJob(claim_id=claim_id, server_id=c.server.id if c.server else None, status="queued")
        db.add(job)
        db.commit()
    job.status = "queued"
    c.status = "pending"
    c.error_message = None
    if c.server:
        c.server.status = "provisioning"
    db.commit()

    async def _bg(cid: str):
        s = SessionLocal()
        try:
            cc = s.get(Claim, cid)
            jj = s.query(ProvisioningJob).filter(ProvisioningJob.claim_id == cid).first()
            await provision_claim(s, cc, jj)
        finally:
            s.close()

    bg.add_task(_bg, claim_id)
    return {"claim_id": claim_id, "status": "pending"}
