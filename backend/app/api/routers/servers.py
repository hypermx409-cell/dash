"""User server management."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.core.deps import get_current_user, require_admin
from app.models import Server, User
from app.schemas.plan import ServerOut
from app.integrations.pterodactyl import PterodactylClient

router = APIRouter()


@router.get("/servers")
def list_servers(current: User = Depends(get_current_user), db: Session = Depends(get_db)):
    servers = db.query(Server).filter(Server.user_id == current.id).order_by(Server.created_at.desc()).all()
    out = []
    for s in servers:
        out.append({
            "id": s.id,
            "name": s.name,
            "plan_id": s.plan_id,
            "plan_name": s.plan.name if s.plan else None,
            "status": s.status,
            "ptero_server_id": s.ptero_server_id,
            "ptero_identifier": s.ptero_identifier,
            "is_suspended": s.is_suspended,
            "resources": {
                "ram_mb": s.plan.ram_mb if s.plan else None,
                "cpu_percent": s.plan.cpu_percent if s.plan else None,
                "disk_mb": s.plan.disk_mb if s.plan else None,
            },
            "created_at": s.created_at,
        })
    return out


@router.get("/servers/{server_id}")
def get_server(server_id: str, current: User = Depends(get_current_user), db: Session = Depends(get_db)):
    s = db.get(Server, server_id)
    if not s or s.user_id != current.id:
        raise HTTPException(404, "Server not found")
    return {
        "id": s.id,
        "name": s.name,
        "status": s.status,
        "ptero_server_id": s.ptero_server_id,
        "ptero_identifier": s.ptero_identifier,
        "plan": {
            "name": s.plan.name,
            "ram_mb": s.plan.ram_mb,
            "cpu_percent": s.plan.cpu_percent,
            "disk_mb": s.plan.disk_mb,
        } if s.plan else None,
        "created_at": s.created_at,
    }


@router.post("/servers/{server_id}/suspend")
def suspend_server(server_id: str, current: User = Depends(get_current_user), db: Session = Depends(get_db)):
    s = db.get(Server, server_id)
    if not s or s.user_id != current.id:
        raise HTTPException(404, "Server not found")
    # users cannot suspend via ptero? allow marking? We'll not call ptero for user; admin only.
    raise HTTPException(403, "Not permitted")


@router.delete("/servers/{server_id}")
async def delete_server_user(server_id: str, current: User = Depends(get_current_user), db: Session = Depends(get_db)):
    s = db.get(Server, server_id)
    if not s or (s.user_id != current.id and (current.role.name if current.role else None) != "admin"):
        raise HTTPException(404, "Server not found")
    # delete from Pterodactyl first
    if s.ptero_server_id:
        try:
            client = PterodactylClient()
            if client.configured():
                await client.delete_server(s.ptero_server_id)
        except Exception:
            # keep going to allow DB cleanup; the panel can be reconciled later
            pass
    db.delete(s)
    db.commit()
    return {"message": "deleted"}
