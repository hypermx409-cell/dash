"""Sync persisted platform settings into in-memory app settings."""

from sqlalchemy.orm import Session

from app.config import settings
from app.models import PlatformSetting

_KEY_MAP = {
    "ptero_panel_url": "PTERO_PANEL_URL",
    "ptero_api_key": "PTERO_API_KEY",
    "ptero_default_node_id": "PTERO_DEFAULT_NODE_ID",
    "ptero_default_location_id": "PTERO_DEFAULT_LOCATION_ID",
    "ptero_default_egg_id": "PTERO_DEFAULT_EGG_ID",
    "ptero_default_nest_id": "PTERO_DEFAULT_NEST_ID",
    "ptero_default_allocation_id": "PTERO_DEFAULT_ALLOCATION_ID",
}


def sync_ptero_settings(db: Session) -> None:
    for ps_key, attr in _KEY_MAP.items():
        ps = db.query(PlatformSetting).filter(PlatformSetting.key == ps_key).first()
        if ps is None or ps.value in (None, ""):
            continue
        value = ps.value
        if attr.endswith("_ID"):
            try:
                value = int(value)
            except (TypeError, ValueError):
                value = None
        if value is None and attr.endswith("_ID"):
            continue
        setattr(settings, attr, value)


def upsert_setting(db: Session, key: str, value: str | None) -> None:
    if value is None:
        return
    ps = db.query(PlatformSetting).filter(PlatformSetting.key == key).first()
    if ps is None:
        ps = PlatformSetting(key=key, value=value)
        db.add(ps)
    else:
        ps.value = value
    db.commit()
