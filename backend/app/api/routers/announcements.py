"""Announcements and notifications."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.core.deps import get_current_user, require_admin
from app.models import Announcement, Notification

router = APIRouter()


@router.get("/announcements")
def list_announcements(current=Depends(get_current_user), db: Session = Depends(get_db)):
    items = db.query(Announcement).filter(Announcement.is_published.is_(True)).order_by(Announcement.created_at.desc()).all()
    return [{"id": a.id, "title": a.title, "body": a.body, "created_at": a.created_at} for a in items]


@router.get("/notifications")
def list_notifications(current=Depends(get_current_user), db: Session = Depends(get_db)):
    ns = db.query(Notification).filter(Notification.user_id == current.id).order_by(Notification.created_at.desc()).limit(50).all()
    return [{"id": n.id, "title": n.title, "body": n.body, "is_read": n.is_read, "created_at": n.created_at} for n in ns]


@router.post("/notifications/{nid}/read")
def mark_read(nid: str, current=Depends(get_current_user), db: Session = Depends(get_db)):
    n = db.get(Notification, nid)
    if not n or n.user_id != current.id:
        raise HTTPException(404, "Not found")
    n.is_read = True
    db.commit()
    return {"message": "ok"}


@router.post("/notifications/read-all")
def mark_all_read(current=Depends(get_current_user), db: Session = Depends(get_db)):
    db.query(Notification).filter(Notification.user_id == current.id, Notification.is_read.is_(False)).update({"is_read": True})
    db.commit()
    return {"message": "ok"}


@router.delete("/notifications/{nid}")
def delete_notification(nid: str, current=Depends(get_current_user), db: Session = Depends(get_db)):
    n = db.get(Notification, nid)
    if not n or n.user_id != current.id:
        raise HTTPException(404, "Not found")
    db.delete(n)
    db.commit()
    return {"message": "deleted"}


# Admin
@router.post("/admin/announcements", status_code=201)
def create_announcement(payload: dict, admin=Depends(require_admin), db: Session = Depends(get_db)):
    a = Announcement(title=payload.get("title", "Announcement"), body=payload.get("body", ""), is_published=payload.get("is_published", True))
    db.add(a)
    db.commit()
    db.refresh(a)
    return {"id": a.id}


@router.get("/admin/announcements")
def admin_list_announcements(admin=Depends(require_admin), db: Session = Depends(get_db)):
    items = db.query(Announcement).order_by(Announcement.created_at.desc()).all()
    return [{"id": a.id, "title": a.title, "body": a.body, "is_published": a.is_published, "created_at": a.created_at} for a in items]

@router.put("/admin/announcements/{aid}")
def update_announcement(aid: str, payload: dict, admin=Depends(require_admin), db: Session = Depends(get_db)):
    a = db.get(Announcement, aid)
    if not a:
        raise HTTPException(404, "Not found")
    for k in ("title", "body", "is_published"):
        if k in payload:
            setattr(a, k, payload[k])
    db.commit()
    return {"message": "updated"}


@router.delete("/admin/announcements/{aid}")
def delete_announcement(aid: str, admin=Depends(require_admin), db: Session = Depends(get_db)):
    a = db.get(Announcement, aid)
    if not a:
        raise HTTPException(404, "Not found")
    db.delete(a)
    db.commit()
    return {"message": "deleted"}
