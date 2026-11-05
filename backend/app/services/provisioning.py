"""Server provisioning orchestration with Pterodactyl."""

import logging
from typing import Any, Dict, Optional

from sqlalchemy.orm import Session

from app.config import settings
from app.integrations.pterodactyl import PterodactylClient
from app.models import Claim, Plan, Server, User, ProvisioningJob

logger = logging.getLogger(__name__)


def get_client() -> PterodactylClient:
    return PterodactylClient()


async def _fetch_egg_defaults(client: PterodactylClient, nest_id: Optional[int], egg_id: int):
    docker_image = None
    startup = None
    environment = {}
    paths = [f"/eggs/{egg_id}?include=variables"]
    if nest_id is not None:
        paths.append(f"/nests/{nest_id}/eggs/{egg_id}?include=variables")
    for path in paths:
        try:
            resp = await client._request("GET", path)
            if resp.status_code != 200:
                continue
            attrs = resp.json().get("attributes", {})
            docker_image = attrs.get("docker_image") or docker_image
            startup = attrs.get("startup") or startup
            rel = attrs.get("relationships", {})
            vars_ = (rel.get("variables", {}) if isinstance(rel, dict) else {}).get("data", []) if isinstance(rel, dict) else []
            for var in vars_ or []:
                v = var.get("attributes", {})
                key = v.get("env_variable")
                if key:
                    environment[key] = v.get("default_value", "")
            if docker_image or startup or environment:
                break
        except Exception as exc:  # pragma: no cover
            logger.warning("egg fetch failed: %s", exc)
    return docker_image, startup, environment


async def _resolve_allocation(client: PterodactylClient, node_id: Optional[int]) -> Optional[int]:
    if settings.PTERO_DEFAULT_ALLOCATION_ID is not None:
        return settings.PTERO_DEFAULT_ALLOCATION_ID
    if node_id is None:
        return None
    try:
        allocs = await client.list_allocations(node_id) if hasattr(client, "list_allocations") else None
    except Exception:
        allocs = None
    # fallback HTTP
    try:
        resp = await client._request("GET", f"/nodes/{node_id}/allocations")
        if resp.status_code == 200:
            for item in resp.json().get("data", []):
                a = item.get("attributes", {})
                if not a.get("assigned"):
                    return a.get("id")
    except Exception:
        pass
    return None


async def provision_claim(db: Session, claim: Claim, job: ProvisioningJob) -> None:
    """Provision a claim. Updates DB state and job status."""
    user: User = claim.user
    plan: Plan = claim.plan

    job.status = "running"
    job.attempts += 1
    db.commit()

    client = get_client()
    if not client.configured():
        # Allow mocked/dev: if not configured, mark succeeded with no ptero ids? 
        # For production we fail. But tests may configure env. We'll fail loudly.
        job.status = "failed"
        job.last_error = "Pterodactyl not configured"
        claim.status = "failed"
        claim.error_message = job.last_error
        if claim.server:
            claim.server.status = "failed"
        db.commit()
        return

    # get or create ptero user
    try:
        safe_username = (user.username or "user").lower().replace(" ", "")[:15] or "user"
        ptero_user = await client.get_or_create_user(user.email, safe_username)
        ptero_user_id = ptero_user.get("id")
    except Exception as exc:
        _fail(db, job, claim, f"user provisioning failed: {exc}")
        return

    server: Server = claim.server
    if server is None:
        server = Server(user_id=user.id, plan_id=plan.id, claim_id=claim.id, name=f"{plan.name}-{claim.id[:8]}")
        db.add(server)
        db.flush()
        claim.server = server
        job.server_id = server.id

    node_id = plan.node_id if plan.node_id is not None else settings.PTERO_DEFAULT_NODE_ID
    egg_id = plan.egg_id if plan.egg_id is not None else settings.PTERO_DEFAULT_EGG_ID
    nest_id = settings.PTERO_DEFAULT_NEST_ID

    if egg_id is None or node_id is None:
        _fail(db, job, claim, "Missing Pterodactyl node/egg configuration")
        return

    allocation_id = await _resolve_allocation(client, node_id)
    docker_image, startup, environment = await _fetch_egg_defaults(client, nest_id, egg_id)

    # idempotency: if already has ptero_server_id, skip creation
    if server.ptero_server_id:
        _succeed(db, job, claim, server, ptero_user_id)
        return

    payload: Dict[str, Any] = {
        "name": server.name,
        "user": ptero_user_id,
        "egg": egg_id,
        "docker_image": docker_image or "ghcr.io/pterodactyl/yolks:nodejs_18",
        "startup": startup or "npm start",
        "environment": environment or {},
        "limits": {
            "memory": plan.ram_mb,
            "swap": plan.swap_mb,
            "disk": plan.disk_mb,
            "io": 500,
            "cpu": plan.cpu_percent,
        },
        "feature_limits": {
            "databases": 0,
            "allocations": plan.allocations,
            "backups": 0,
        },
    }
    if allocation_id is not None:
        payload["allocation"] = {"default": allocation_id}

    try:
        ptero_server = await client.create_server(payload)
        server.ptero_server_id = ptero_server.get("id")
        server.ptero_identifier = ptero_server.get("identifier")
        server.ptero_user_id = ptero_user_id
        _succeed(db, job, claim, server, ptero_user_id)
    except Exception as exc:
        _fail(db, job, claim, f"server provisioning failed: {exc}")


def _succeed(db: Session, job: ProvisioningJob, claim: Claim, server: Server, ptero_user_id: int) -> None:
    server.ptero_user_id = ptero_user_id
    server.status = "active"
    claim.status = "completed"
    claim.error_message = None
    job.status = "succeeded"
    job.completed_at = _now()
    # stock already reserved at claim creation; do not decrement again
    db.commit()


def _fail(db: Session, job: ProvisioningJob, claim: Claim, error: str) -> None:
    job.status = "failed"
    job.last_error = error
    claim.status = "failed"
    claim.error_message = error
    if claim.server is not None:
        claim.server.status = "failed"
    # release reserved plan stock on failure (if unlimited not tracked)
    try:
        if claim.plan is not None and claim.plan.available_stock is not None:
            claim.plan.available_stock += 1
    except Exception:
        pass
    db.commit()


def _now():
    import datetime
    return datetime.datetime.now(datetime.timezone.utc)


# (no alias needed)
