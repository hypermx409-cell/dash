"""Administrative routes."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.core.db import get_db
from app.core.deps import get_current_user, require_admin
from app.config import settings
from app.integrations.pterodactyl import PterodactylClient
from app.models import (
    User, Role, Plan, Server, Claim, ProvisioningJob, ModuleSetting,
    PlatformSetting, AuditLog, Transaction, Wallet, Announcement, Theme, Notification, Reward,
)
import uuid

router = APIRouter()


def _audit(db: Session, actor_id: str | None, action: str, target_type: str | None = None, target_id: str | None = None, detail: str | None = None):
    db.add(AuditLog(actor_id=actor_id, action=action, target_type=target_type, target_id=target_id, detail=detail))


# Overview
@router.get("/overview")
def admin_overview(admin=Depends(require_admin), db: Session = Depends(get_db)):
    recent_users = db.query(User).order_by(User.created_at.desc()).limit(5).all()
    recent_claims = db.query(Claim).order_by(Claim.created_at.desc()).limit(5).all()
    recent_servers = db.query(Server).order_by(Server.created_at.desc()).limit(5).all()
    maintenance = db.query(ModuleSetting).filter(ModuleSetting.key == "maintenance").first()
    ps = db.query(PlatformSetting).filter(PlatformSetting.key == "maintenance_mode").first()
    maintenance_enabled = (ps.value == "true") if ps else settings.MAINTENANCE_MODE
    return {
        "total_users": db.query(User).count(),
        "active_users": db.query(User).filter(User.is_active.is_(True)).count(),
        "total_servers": db.query(Server).count(),
        "active_servers": db.query(Server).filter(Server.status == "active").count(),
        "suspended_servers": db.query(Server).filter(Server.status == "suspended").count(),
        "failed_servers": db.query(Server).filter(Server.status == "failed").count(),
        "pending_claims": db.query(Claim).filter(Claim.status.in_(["pending", "provisioning"])).count(),
        "completed_claims": db.query(Claim).filter(Claim.status == "completed").count(),
        "failed_claims": db.query(Claim).filter(Claim.status == "failed").count(),
        "total_claims": db.query(Claim).count(),
        "failed_jobs": db.query(ProvisioningJob).filter(ProvisioningJob.status == "failed").count(),
        "maintenance_mode": bool(maintenance_enabled),
        "recent_users": [{"id": u.id, "username": u.username, "email": u.email, "created_at": u.created_at} for u in recent_users],
        "recent_claims": [{"id": c.id, "status": c.status, "plan_id": c.plan_id, "created_at": c.created_at} for c in recent_claims],
        "recent_servers": [{"id": s.id, "name": s.name, "status": s.status, "owner": s.owner.username if s.owner else None, "created_at": s.created_at} for s in recent_servers],
    }


# Users
@router.post("/users", status_code=201)
def admin_create_user(payload: dict, admin=Depends(require_admin), db: Session = Depends(get_db)):
    from app.core.security import hash_password
    email = (payload.get("email") or "").strip().lower()
    username = (payload.get("username") or "").strip()
    password = payload.get("password") or ""
    if not email or not username or len(password) < 8:
        raise HTTPException(400, "email, username and password (8+ chars) are required")
    if db.query(User).filter((User.email == email) | (User.username == username)).first():
        raise HTTPException(400, "Email or username already exists")
    role_name = payload.get("role", "user")
    role = db.query(Role).filter(Role.name == role_name).first()
    if not role and role_name == "admin":
        role = db.query(Role).filter(Role.name == "admin").first()
    if not role:
        role = db.query(Role).filter(Role.name == "user").first()
    user = User(
        email=email,
        username=username,
        hashed_password=hash_password(password),
        is_active=bool(payload.get("is_active", True)),
        is_verified=bool(payload.get("is_verified", False)),
        role_id=role.id if role else None,
        balance=int(payload.get("balance") or 0),
        display_name=payload.get("display_name"),
    )
    db.add(user)
    db.flush()
    db.add(Wallet(user_id=user.id, balance=user.balance))
    db.commit()
    db.refresh(user)
    _audit(db, admin.id, "create_user", "user", user.id, username)
    db.commit()
    return {"id": user.id, "email": user.email, "username": user.username, "role": role_name if role else None, "is_active": user.is_active, "balance": user.balance}


@router.get("/users")
def admin_users(
    q: str | None = None,
    role: str | None = None,
    status: str | None = None,
    limit: int = 200,
    admin=Depends(require_admin),
    db: Session = Depends(get_db),
):
    query = db.query(User)
    if q:
        query = query.filter((User.email.ilike(f"%{q}%")) | (User.username.ilike(f"%{q}%")))
    if role:
        r = db.query(Role).filter(Role.name == role).first()
        if r:
            query = query.filter(User.role_id == r.id)
    if status == "active":
        query = query.filter(User.is_active.is_(True))
    elif status == "inactive":
        query = query.filter(User.is_active.is_(False))
    users = query.order_by(User.created_at.desc()).limit(limit).all()
    return [
        {
            "id": u.id,
            "email": u.email,
            "username": u.username,
            "role": u.role.name if u.role else None,
            "is_active": u.is_active,
            "is_verified": u.is_verified,
            "balance": u.balance,
            "created_at": u.created_at,
            "updated_at": u.updated_at,
            "server_count": db.query(Server).filter(Server.user_id == u.id).count(),
            "claim_count": db.query(Claim).filter(Claim.user_id == u.id).count(),
        }
        for u in users
    ]


@router.get("/users/{user_id}")
def admin_user_detail(user_id: str, admin=Depends(require_admin), db: Session = Depends(get_db)):
    u = db.get(User, user_id)
    if not u:
        raise HTTPException(404, "User not found")
    servers = db.query(Server).filter(Server.user_id == user_id).all()
    claims = db.query(Claim).filter(Claim.user_id == user_id).all()
    return {
        "id": u.id,
        "email": u.email,
        "username": u.username,
        "role": u.role.name if u.role else None,
        "is_active": u.is_active,
        "balance": u.balance,
        "servers": [{"id": s.id, "name": s.name, "status": s.status, "ptero_server_id": s.ptero_server_id} for s in servers],
        "claims": [{"id": c.id, "status": c.status, "plan_id": c.plan_id, "created_at": c.created_at} for c in claims],
    }


@router.put("/users/{user_id}")
def admin_update_user(user_id: str, payload: dict, admin=Depends(require_admin), db: Session = Depends(get_db)):
    u = db.get(User, user_id)
    if not u:
        raise HTTPException(404, "User not found")
    if "is_active" in payload:
        u.is_active = bool(payload["is_active"])
    if "role" in payload:
        role = db.query(Role).filter(Role.name == payload["role"]).first()
        if role:
            u.role_id = role.id
    if "balance" in payload:
        u.balance = int(payload["balance"])
        w = db.query(Wallet).filter(Wallet.user_id == user_id).first()
        if w:
            w.balance = u.balance
    db.commit()
    _audit(db, admin.id, "update_user", "user", user_id, str(payload))
    db.commit()
    return {"message": "updated"}


@router.post("/users/{user_id}/suspend")
def admin_suspend_user(user_id: str, admin=Depends(require_admin), db: Session = Depends(get_db)):
    u = db.get(User, user_id)
    if not u:
        raise HTTPException(404, "User not found")
    u.is_active = False
    db.commit()
    _audit(db, admin.id, "suspend_user", "user", user_id)
    db.commit()
    return {"message": "suspended"}


@router.post("/users/{user_id}/activate")
def admin_activate_user(user_id: str, admin=Depends(require_admin), db: Session = Depends(get_db)):
    u = db.get(User, user_id)
    if not u:
        raise HTTPException(404, "User not found")
    u.is_active = True
    db.commit()
    _audit(db, admin.id, "activate_user", "user", user_id)
    db.commit()
    return {"message": "activated"}


# Servers (admin)
@router.get("/servers")
def admin_servers(status: str | None = None, admin=Depends(require_admin), db: Session = Depends(get_db)):
    q = db.query(Server)
    if status:
        q = q.filter(Server.status == status)
    ss = q.order_by(Server.created_at.desc()).limit(500).all()
    return [
        {
            "id": s.id,
            "name": s.name,
            "user_id": s.user_id,
            "owner": s.owner.username if s.owner else None,
            "plan_id": s.plan_id,
            "status": s.status,
            "ptero_server_id": s.ptero_server_id,
            "ptero_identifier": s.ptero_identifier,
            "is_suspended": s.is_suspended,
            "created_at": s.created_at,
        }
        for s in ss
    ]


@router.post("/servers/{server_id}/retry")
async def admin_retry_server(server_id: str, admin=Depends(require_admin), db: Session = Depends(get_db)):
    s = db.get(Server, server_id)
    if not s:
        raise HTTPException(404, "Server not found")
    claim = s.claim
    if not claim:
        raise HTTPException(400, "No claim linked")
    job = db.query(ProvisioningJob).filter(ProvisioningJob.claim_id == claim.id).first()
    if not job:
        job = ProvisioningJob(claim_id=claim.id, server_id=s.id, status="queued")
        db.add(job)
        db.commit()
    job.status = "queued"
    claim.status = "pending"
    claim.error_message = None
    s.status = "provisioning"
    db.commit()
    from app.core.db import SessionLocal
    from app.services.provisioning import provision_claim
    async def _bg(cid: str):
        ssess = SessionLocal()
        try:
            cc = ssess.get(Claim, cid)
            jj = ssess.query(ProvisioningJob).filter(ProvisioningJob.claim_id == cid).first()
            await provision_claim(ssess, cc, jj)
        finally:
            ssess.close()
    # run inline to return result? Use background not possible here easily; run directly await
    c2 = db.get(Claim, claim.id)
    j2 = job
    await provision_claim(db, c2, j2)
    db.refresh(s)
    return {"status": s.status, "ptero_server_id": s.ptero_server_id}


@router.post("/servers/{server_id}/suspend")
async def admin_suspend_server(server_id: str, admin=Depends(require_admin), db: Session = Depends(get_db)):
    s = db.get(Server, server_id)
    if not s or not s.ptero_server_id:
        raise HTTPException(404, "Server not found")
    client = PterodactylClient()
    try:
        await client.suspend_server(s.ptero_server_id)
    except Exception as exc:
        raise HTTPException(502, str(exc))
    s.is_suspended = True
    s.status = "suspended"
    db.commit()
    _audit(db, admin.id, "suspend_server", "server", server_id)
    db.commit()
    return {"message": "suspended"}


@router.post("/servers/{server_id}/unsuspend")
async def admin_unsuspend_server(server_id: str, admin=Depends(require_admin), db: Session = Depends(get_db)):
    s = db.get(Server, server_id)
    if not s or not s.ptero_server_id:
        raise HTTPException(404, "Server not found")
    client = PterodactylClient()
    try:
        await client.unsuspend_server(s.ptero_server_id)
    except Exception as exc:
        raise HTTPException(502, str(exc))
    s.is_suspended = False
    s.status = "active"
    db.commit()
    _audit(db, admin.id, "unsuspend_server", "server", server_id)
    db.commit()
    return {"message": "unsuspended"}


@router.delete("/servers/{server_id}")
async def admin_delete_server(server_id: str, admin=Depends(require_admin), db: Session = Depends(get_db)):
    s = db.get(Server, server_id)
    if not s:
        raise HTTPException(404, "Server not found")
    if s.ptero_server_id:
        client = PterodactylClient()
        try:
            await client.delete_server(s.ptero_server_id)
        except Exception as exc:
            # log but continue
            pass
    db.delete(s)
    db.commit()
    _audit(db, admin.id, "delete_server", "server", server_id)
    db.commit()
    return {"message": "deleted"}


# Pterodactyl settings & test
@router.get("/pterodactyl/settings")
def admin_ptero_settings(admin=Depends(require_admin), db: Session = Depends(get_db)):
    from app.models import PlatformSetting
    ps_key = db.query(PlatformSetting).filter(PlatformSetting.key == "ptero_api_key").first()
    key_val = ps_key.value if ps_key else ""
    return {
        "panel_url": settings.PTERO_PANEL_URL,
        "configured": bool(settings.PTERO_PANEL_URL and settings.PTERO_API_KEY),
        "has_api_key": bool(key_val),
        "api_key_last4": key_val[-4:] if key_val else None,
        "default_node_id": settings.PTERO_DEFAULT_NODE_ID,
        "default_location_id": settings.PTERO_DEFAULT_LOCATION_ID,
        "default_egg_id": settings.PTERO_DEFAULT_EGG_ID,
        "default_nest_id": settings.PTERO_DEFAULT_NEST_ID,
        "default_allocation_id": settings.PTERO_DEFAULT_ALLOCATION_ID,
    }


@router.put("/pterodactyl/settings")
def admin_ptero_settings_save(payload: dict, admin=Depends(require_admin), db: Session = Depends(get_db)):
    from app.services.config_sync import upsert_setting, sync_ptero_settings
    mapping = {
        "panel_url": "ptero_panel_url",
        "api_key": "ptero_api_key",
        "default_node_id": "ptero_default_node_id",
        "default_location_id": "ptero_default_location_id",
        "default_egg_id": "ptero_default_egg_id",
        "default_nest_id": "ptero_default_nest_id",
        "default_allocation_id": "ptero_default_allocation_id",
    }
    for payload_key, setting_key in mapping.items():
        if payload_key in payload and payload[payload_key] is not None:
            value = payload[payload_key]
            if payload_key == "api_key":
                value = str(value).strip()
                if value == "":
                    continue
            elif isinstance(value, bool):
                value = str(value).lower()
            else:
                value = str(value).strip() if value != "" else ""
                if value == "":
                    continue
            upsert_setting(db, setting_key, value)
    sync_ptero_settings(db)
    _audit(db, admin.id, "update_pterodactyl_settings", "settings", "pterodactyl", "updated pterodactyl configuration")
    db.commit()
    return {"message": "saved", "configured": bool(settings.PTERO_PANEL_URL and settings.PTERO_API_KEY)}



@router.post("/pterodactyl/test")
async def admin_ptero_test(admin=Depends(require_admin)):
    client = PterodactylClient()
    ok = await client.test_connection()
    return {"connected": ok}


@router.get("/pterodactyl/nodes")
async def admin_ptero_nodes(admin=Depends(require_admin)):
    client = PterodactylClient()
    try:
        data = await client.list_nodes()
    except Exception as exc:
        raise HTTPException(502, str(exc))
    return data


@router.get("/pterodactyl/locations")
async def admin_ptero_locations(admin=Depends(require_admin)):
    client = PterodactylClient()
    try:
        data = await client.list_locations()
    except Exception as exc:
        raise HTTPException(502, str(exc))
    return data


@router.get("/pterodactyl/nests")
async def admin_ptero_nests(admin=Depends(require_admin)):
    client = PterodactylClient()
    try:
        data = await client.list_nests()
    except Exception as exc:
        raise HTTPException(502, str(exc))
    return data


@router.get("/pterodactyl/nests/{nest_id}/eggs")
async def admin_ptero_eggs(nest_id: int, admin=Depends(require_admin)):
    client = PterodactylClient()
    try:
        data = await client.list_eggs(nest_id)
    except Exception as exc:
        raise HTTPException(502, str(exc))
    return data


@router.get("/pterodactyl/nodes/{node_id}/allocations")
async def admin_ptero_allocations(node_id: int, admin=Depends(require_admin)):
    client = PterodactylClient()
    try:
        resp = await client._request("GET", f"/nodes/{node_id}/allocations")
        resp.raise_for_status()
        return resp.json().get("data", [])
    except Exception as exc:
        raise HTTPException(502, str(exc))


# Modules
@router.get("/modules")
def admin_modules(admin=Depends(require_admin), db: Session = Depends(get_db)):
    from app.services.module_defaults import DEFAULT_MODULE_KEYS, DEFAULT_MODULE_CONFIGS
    for k in DEFAULT_MODULE_KEYS:
        if not db.query(ModuleSetting).filter(ModuleSetting.key == k).first():
            db.add(ModuleSetting(key=k, enabled=True, config=DEFAULT_MODULE_CONFIGS.get(k)))
    db.commit()
    mods = db.query(ModuleSetting).all()
    return [{"key": m.key, "enabled": m.enabled, "config": m.config} for m in mods]


@router.put("/modules/{key}")
def admin_toggle_module(key: str, payload: dict, admin=Depends(require_admin), db: Session = Depends(get_db)):
    m = db.query(ModuleSetting).filter(ModuleSetting.key == key).first()
    if not m:
        m = ModuleSetting(key=key, enabled=True)
        db.add(m)
    if "enabled" in payload:
        m.enabled = bool(payload["enabled"])
    if "config" in payload:
        cfg = payload["config"]
        if cfg is None:
            m.config = None
        elif isinstance(cfg, str):
            m.config = cfg
        else:
            import json as _json
            m.config = _json.dumps(cfg)
    db.commit()
    _audit(db, admin.id, "update_module", "module", key, str(payload))
    db.commit()
    return {"message": "updated"}


# Platform settings
@router.get("/settings")
def admin_settings_list(admin=Depends(require_admin), db: Session = Depends(get_db)):
    items = db.query(PlatformSetting).all()
    # ensure defaults
    d = [
        ("max_servers_per_user", str(settings.MAX_SERVERS_PER_USER)),
        ("registration_enabled", str(settings.REGISTRATION_ENABLED).lower()),
        ("claims_enabled", str(settings.CLAIMS_ENABLED).lower()),
        ("maintenance_mode", str(settings.MAINTENANCE_MODE).lower()),
        ("default_currency", "USD"),
        ("app_name", settings.APP_NAME),
        ("primary_color", "#e11d48"),
    ]
    existing = {i.key: i for i in items}
    for k, v in d:
        if k not in existing:
            ps = PlatformSetting(key=k, value=v)
            db.add(ps)
            existing[k] = ps
    db.commit()
    items = db.query(PlatformSetting).all()
    return [{"key": i.key, "value": i.value} for i in items]


@router.put("/settings/{key}")
def admin_setting_update(key: str, payload: dict, admin=Depends(require_admin), db: Session = Depends(get_db)):
    ps = db.query(PlatformSetting).filter(PlatformSetting.key == key).first()
    if not ps:
        ps = PlatformSetting(key=key, value=payload.get("value"))
        db.add(ps)
    else:
        ps.value = payload.get("value", ps.value)
    db.commit()
    # sync a few platform toggles to runtime settings
    try:
        val = ps.value
        if key == "registration_enabled":
            settings.REGISTRATION_ENABLED = str(val).lower() == "true"
        elif key == "claims_enabled":
            settings.CLAIMS_ENABLED = str(val).lower() == "true"
        elif key == "maintenance_mode":
            settings.MAINTENANCE_MODE = str(val).lower() == "true"
        elif key == "max_servers_per_user":
            settings.MAX_SERVERS_PER_USER = int(val)
    except Exception:
        pass
    _audit(db, admin.id, "update_setting", "setting", key, str(payload))
    db.commit()
    return {"message": "updated"}


# Branding (subset of settings)
@router.get("/branding")
def admin_branding(admin=Depends(require_admin), db: Session = Depends(get_db)):
    keys = ["app_name", "primary_color", "logo_url", "favicon_url", "announcement_banner"]
    out = {}
    for k in keys:
        ps = db.query(PlatformSetting).filter(PlatformSetting.key == k).first()
        out[k] = ps.value if ps else None
    return out


@router.put("/branding")
def admin_branding_update(payload: dict, admin=Depends(require_admin), db: Session = Depends(get_db)):
    for k, v in payload.items():
        ps = db.query(PlatformSetting).filter(PlatformSetting.key == k).first()
        value = None if v is None else str(v).strip()
        if value in ("", "None", "null"):
            value = None
        if not ps:
            ps = PlatformSetting(key=k, value=value)
            db.add(ps)
        else:
            ps.value = value
    if "app_name" in payload and payload["app_name"]:
        settings.APP_NAME = str(payload["app_name"])
    db.commit()
    return {"message": "updated"}

# Analytics
@router.get("/analytics")
def admin_analytics(admin=Depends(require_admin), db: Session = Depends(get_db)):
    from sqlalchemy import func as sqlfunc
    users = db.query(sqlfunc.count(User.id)).scalar() or 0
    active_users = db.query(sqlfunc.count(User.id)).filter(User.is_active.is_(True)).scalar() or 0
    servers = db.query(sqlfunc.count(Server.id)).scalar() or 0
    active_servers = db.query(sqlfunc.count(Server.id)).filter(Server.status == "active").scalar() or 0
    suspended_servers = db.query(sqlfunc.count(Server.id)).filter(Server.status == "suspended").scalar() or 0
    failed_servers = db.query(sqlfunc.count(Server.id)).filter(Server.status == "failed").scalar() or 0
    claims = db.query(sqlfunc.count(Claim.id)).scalar() or 0
    completed_claims = db.query(sqlfunc.count(Claim.id)).filter(Claim.status == "completed").scalar() or 0
    failed_claims = db.query(sqlfunc.count(Claim.id)).filter(Claim.status == "failed").scalar() or 0
    pending_claims = db.query(sqlfunc.count(Claim.id)).filter(Claim.status.in_(["pending", "provisioning"])).scalar() or 0
    revenue = db.query(sqlfunc.coalesce(sqlfunc.sum(Transaction.amount), 0)).filter(Transaction.kind == "payment").scalar() or 0
    # allocated resources from active servers
    allocated_ram = 0
    allocated_disk = 0
    for s in db.query(Server).filter(Server.status == "active").all():
        if s.plan:
            allocated_ram += s.plan.ram_mb or 0
            allocated_disk += s.plan.disk_mb or 0
    return {
        "users": users,
        "active_users": active_users,
        "servers": servers,
        "active_servers": active_servers,
        "suspended_servers": suspended_servers,
        "failed_servers": failed_servers,
        "claims": claims,
        "completed_claims": completed_claims,
        "failed_claims": failed_claims,
        "pending_claims": pending_claims,
        "revenue_cents": revenue,
        "allocated_ram_mb": allocated_ram,
        "allocated_disk_mb": allocated_disk,
    }


# Reward codes
@router.get("/rewards")
def admin_rewards(admin=Depends(require_admin), db: Session = Depends(get_db)):
    rs = db.query(Reward).order_by(Reward.created_at.desc()).all()
    return [{"id": r.id, "code": r.code, "title": r.title, "amount": r.amount, "is_active": r.is_active, "max_claims": r.max_claims, "claimed_count": r.claimed_count, "expires_at": r.expires_at} for r in rs]


@router.post("/rewards", status_code=201)
def admin_create_reward(payload: dict, admin=Depends(require_admin), db: Session = Depends(get_db)):
    import secrets
    code = (payload.get("code") or "").strip().upper() or f"REWARD-{secrets.token_hex(4).upper()}"
    if db.query(Reward).filter(Reward.code == code).first():
        raise HTTPException(400, "Code already exists")
    title = (payload.get("title") or code).strip()
    r = Reward(code=code, title=title, amount=int(payload.get("amount") or 0), is_active=bool(payload.get("is_active", True)), max_claims=payload.get("max_claims"))
    db.add(r)
    db.commit()
    db.refresh(r)
    _audit(db, admin.id, "create_reward_code", "reward", r.id, code)
    db.commit()
    return {"id": r.id, "code": r.code, "title": r.title, "amount": r.amount}


@router.put("/rewards/{reward_id}")
def admin_update_reward(reward_id: str, payload: dict, admin=Depends(require_admin), db: Session = Depends(get_db)):
    r = db.get(Reward, reward_id)
    if not r:
        raise HTTPException(404, "Reward not found")
    for k in ("title", "amount", "is_active", "max_claims"):
        if k in payload:
            setattr(r, k, payload[k])
    db.commit()
    return {"message": "updated"}


@router.delete("/rewards/{reward_id}")
def admin_delete_reward(reward_id: str, admin=Depends(require_admin), db: Session = Depends(get_db)):
    r = db.get(Reward, reward_id)
    if not r:
        raise HTTPException(404, "Reward not found")
    db.delete(r)
    db.commit()
    _audit(db, admin.id, "delete_reward_code", "reward", reward_id, r.code)
    db.commit()
    return {"message": "deleted"}


# Direct coin give
@router.post("/users/{user_id}/change-password")
def admin_change_password(user_id: str, payload: dict, admin=Depends(require_admin), db: Session = Depends(get_db)):
    from app.core.security import hash_password
    u = db.get(User, user_id)
    if not u:
        raise HTTPException(404, "User not found")
    new_password = payload.get("new_password") or ""
    if len(new_password) < 8:
        raise HTTPException(400, "Password must be at least 8 characters")
    u.hashed_password = hash_password(new_password)
    db.commit()
    _audit(db, admin.id, "change_user_password", "user", user_id, "password updated")
    db.commit()
    return {"message": "password changed"}


@router.delete("/users/{user_id}")
def admin_delete_user(user_id: str, admin=Depends(require_admin), db: Session = Depends(get_db)):
    if user_id == admin.id:
        raise HTTPException(400, "Cannot delete your own admin account")
    u = db.get(User, user_id)
    if not u:
        raise HTTPException(404, "User not found")
    username = u.username
    db.delete(u)
    db.commit()
    _audit(db, admin.id, "delete_user", "user", user_id, username)
    db.commit()
    return {"message": "deleted"}


@router.post("/users/{user_id}/give-coins")
def admin_give_coins(user_id: str, payload: dict, admin=Depends(require_admin), db: Session = Depends(get_db)):
    u = db.get(User, user_id)
    if not u:
        raise HTTPException(404, "User not found")
    amount = int(payload.get("amount") or 0)
    reason = (payload.get("reason") or "Admin coin grant").strip()
    if amount == 0:
        raise HTTPException(400, "Amount cannot be zero")
    w = db.query(Wallet).filter(Wallet.user_id == user_id).first()
    if not w:
        w = Wallet(user_id=user_id, balance=0)
        db.add(w)
        db.commit()
        db.refresh(w)
    w.balance += amount
    u.balance = w.balance
    db.add(Transaction(user_id=user_id, amount=amount, kind="admin_grant", description=reason, reference=f"admin_grant:{admin.id}:{user_id}"))
    db.commit()
    _audit(db, admin.id, "give_coins", "user", user_id, f"{amount} ({reason})")
    db.commit()
    return {"balance": w.balance, "amount": amount}


# Audit logs
@router.get("/audit-logs")
def admin_audit_logs(admin=Depends(require_admin), db: Session = Depends(get_db)):
    logs = db.query(AuditLog).order_by(AuditLog.created_at.desc()).limit(100).all()
    return [{"id": l.id, "actor_id": l.actor_id, "action": l.action, "target_type": l.target_type, "target_id": l.target_id, "detail": l.detail, "created_at": l.created_at} for l in logs]


# Server management - claims list
@router.get("/claims")
def admin_claims(admin=Depends(require_admin), db: Session = Depends(get_db)):
    cs = db.query(Claim).order_by(Claim.created_at.desc()).limit(200).all()
    return [{"id": c.id, "user_id": c.user_id, "plan_id": c.plan_id, "status": c.status, "created_at": c.created_at, "error_message": c.error_message} for c in cs]


# Notifications (admin)
@router.post("/notifications", status_code=201)
def admin_send_notification(payload: dict, admin=Depends(require_admin), db: Session = Depends(get_db)):
    title = (payload.get("title") or "").strip()
    body = (payload.get("body") or "").strip()
    if not title:
        raise HTTPException(400, "Missing title")
    target = payload.get("target", "all")
    if target == "all":
        users = db.query(User).filter(User.is_active.is_(True)).all()
    else:
        user = db.get(User, target)
        users = [user] if user else []
    for u in users:
        db.add(Notification(user_id=u.id, title=title, body=body or None))
    db.commit()
    _audit(db, admin.id, "send_notification", "notification", None, f"to {target} ({len(users)} users)")
    db.commit()
    return {"message": "sent", "count": len(users)}

@router.get("/notifications")
def admin_list_notifications(admin=Depends(require_admin), db: Session = Depends(get_db)):
    ns = db.query(Notification).order_by(Notification.created_at.desc()).limit(100).all()
    return [{"id": n.id, "user_id": n.user_id, "title": n.title, "body": n.body, "is_read": n.is_read, "created_at": n.created_at} for n in ns]


# Themes
def _theme_out(t: Theme):
    return {
        "id": t.id,
        "name": t.name,
        "slug": t.slug,
        "primary_color": t.primary_color,
        "accent_color": t.accent_color,
        "logo_url": t.logo_url,
        "favicon_url": t.favicon_url,
        "background_image_url": t.background_image_url,
        "background_blur": t.background_blur,
        "is_system": t.is_system,
        "created_at": t.created_at,
    }


@router.get("/themes")
def admin_themes(admin=Depends(require_admin), db: Session = Depends(get_db)):
    themes = db.query(Theme).order_by(Theme.is_system.desc(), Theme.name).all()
    return [_theme_out(t) for t in themes]


@router.post("/themes", status_code=201)
def admin_create_theme(payload: dict, admin=Depends(require_admin), db: Session = Depends(get_db)):
    import re
    name = payload.get("name", "Custom Theme").strip()
    slug = payload.get("slug") or re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")
    # ensure unique slug
    base = slug
    i = 1
    while db.query(Theme).filter(Theme.slug == slug).first():
        slug = f"{base}-{i}"
        i += 1
    t = Theme(
        name=name,
        slug=slug,
        primary_color=payload.get("primary_color", "#e11d48"),
        accent_color=payload.get("accent_color"),
        logo_url=payload.get("logo_url"),
        favicon_url=payload.get("favicon_url"),
        background_image_url=payload.get("background_image_url"),
        background_blur=int(payload.get("background_blur") or 0),
        is_system=False,
    )
    db.add(t)
    db.commit()
    db.refresh(t)
    _audit(db, admin.id, "create_theme", "theme", t.id, name)
    db.commit()
    return _theme_out(t)


@router.put("/themes/{theme_id}")
def admin_update_theme(theme_id: str, payload: dict, admin=Depends(require_admin), db: Session = Depends(get_db)):
    t = db.get(Theme, theme_id)
    if not t:
        raise HTTPException(404, "Theme not found")
    for k in ("name", "primary_color", "accent_color", "logo_url", "favicon_url", "background_image_url"):
        if k in payload:
            setattr(t, k, payload[k])
    if "background_blur" in payload:
        try:
            t.background_blur = int(payload["background_blur"])
        except (TypeError, ValueError):
            pass
    db.commit()
    _audit(db, admin.id, "update_theme", "theme", theme_id, str(payload))
    db.commit()
    return _theme_out(t)


@router.delete("/themes/{theme_id}")
def admin_delete_theme(theme_id: str, admin=Depends(require_admin), db: Session = Depends(get_db)):
    t = db.get(Theme, theme_id)
    if not t:
        raise HTTPException(404, "Theme not found")
    if t.is_system:
        raise HTTPException(400, "System themes cannot be deleted")
    db.delete(t)
    db.commit()
    _audit(db, admin.id, "delete_theme", "theme", theme_id, t.name)
    db.commit()
    return {"message": "deleted"}


@router.post("/themes/{theme_id}/apply")
def admin_apply_theme(theme_id: str, admin=Depends(require_admin), db: Session = Depends(get_db)):
    t = db.get(Theme, theme_id)
    if not t:
        raise HTTPException(404, "Theme not found")
    def _set(key, value):
        if value is None:
            return
        ps = db.query(PlatformSetting).filter(PlatformSetting.key == key).first()
        if ps is None:
            db.add(PlatformSetting(key=key, value=value))
        else:
            ps.value = value
    _set("primary_color", t.primary_color)
    if t.accent_color:
        _set("accent_color", t.accent_color)
    if t.logo_url:
        _set("logo_url", t.logo_url)
    if t.favicon_url:
        _set("favicon_url", t.favicon_url)
    if t.background_image_url:
        _set("background_image_url", t.background_image_url)
    _set("background_blur", str(t.background_blur or 0))
    _set("current_theme", t.slug)
    db.commit()
    _audit(db, admin.id, "apply_theme", "theme", theme_id, t.name)
    db.commit()
    return {"message": "applied", "theme": t.slug}


@router.post("/themes/from-current")
def admin_theme_from_current(payload: dict, admin=Depends(require_admin), db: Session = Depends(get_db)):
    from app.config import settings as _s
    ps = {p.key: p.value for p in db.query(PlatformSetting).all()}
    name = payload.get("name", "Custom Theme")
    t = Theme(
        name=name,
        slug=(payload.get("slug") or name.lower().replace(" ", "-")),
        primary_color=ps.get("primary_color", "#e11d48"),
        accent_color=ps.get("accent_color", "#ff3b6b"),
        logo_url=ps.get("logo_url"),
        favicon_url=ps.get("favicon_url"),
        background_image_url=ps.get("background_image_url"),
        background_blur=int(ps.get("background_blur", "0") or 0),
        is_system=False,
    )
    db.add(t)
    db.commit()
    db.refresh(t)
    _audit(db, admin.id, "save_theme_from_current", "theme", t.id, name)
    db.commit()
    return _theme_out(t)
