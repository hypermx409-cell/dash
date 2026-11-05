"""User-facing module configuration endpoints."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.core.deps import get_current_user
from app.models import ModuleSetting

router = APIRouter()


@router.get("/{key}")
def get_module(key: str, current=Depends(get_current_user), db: Session = Depends(get_db)):
    m = db.query(ModuleSetting).filter(ModuleSetting.key == key).first()
    if not m:
        raise HTTPException(404, "Module not found")
    cfg = None
    if m.config:
        try:
            import json
            cfg = json.loads(m.config)
        except Exception:
            cfg = m.config
    return {"key": m.key, "enabled": m.enabled, "config": cfg}
