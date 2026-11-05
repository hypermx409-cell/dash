"""Public branding endpoint."""

import os
from fastapi import APIRouter, Depends, Response
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.models import PlatformSetting
from app.config import settings

router = APIRouter()


@router.get("/maintenance")
def maintenance_status(db: Session = Depends(get_db)):
    active = False
    ps = db.query(PlatformSetting).filter(PlatformSetting.key == "maintenance_mode").first()
    if ps and ps.value is not None:
        active = str(ps.value).strip().lower() == "true"
    else:
        active = bool(settings.MAINTENANCE_MODE)
    msg = "The platform is currently under maintenance. Please check back soon." if active else ""
    return {"maintenance": active, "message": msg}


@router.get("/branding")
def public_branding(db: Session = Depends(get_db)):
    keys = ["app_name", "primary_color", "accent_color", "logo_url", "favicon_url", "current_theme", "background_image_url", "background_blur"]
    out = {"app_name": "DASH0", "primary_color": "#e11d48", "accent_color": "#ff3b6b", "logo_url": None, "favicon_url": None, "current_theme": "red", "background_image_url": None, "background_blur": "0", "panel_url": None}
    bad = {"", "None", "null", "undefined"}
    def _val(key: str):
        ps = db.query(PlatformSetting).filter(PlatformSetting.key == key).first()
        return ps.value if (ps and ps.value not in bad) else None
    for k in keys:
        ps = db.query(PlatformSetting).filter(PlatformSetting.key == k).first()
        if ps and ps.value not in bad:
            out[k] = ps.value
    if not out.get("favicon_url"):
        out["favicon_url"] = out.get("logo_url")
    if not out.get("background_image_url"):
        out["background_image_url"] = None
    # Expose panel URL (non-secret) for "Open panel" shortcuts.
    panel = None
    try:
        panel = _val("ptero_panel_url")
    except Exception:
        panel = None
    if not panel:
        panel = getattr(settings, "PTERO_PANEL_URL", None)
    if panel in (None, "", "None", "null"):
        panel = None
    out["panel_url"] = panel
    return out


@router.get("/branding/favicon")
def branding_favicon(db: Session = Depends(get_db)):
    bad = {"", "None", "null", "undefined"}
    def _val(key: str) -> str | None:
        ps = db.query(PlatformSetting).filter(PlatformSetting.key == key).first()
        if ps and ps.value not in bad:
            return ps.value
        return None
    url = _val("favicon_url") or _val("logo_url")
    if not url:
        # fall back to bundled favicon
        return Response(status_code=302, headers={"Location": "/favicon.ico", "Cache-Control": "no-store"})
    return Response(status_code=302, headers={"Location": url, "Cache-Control": "no-store"})
