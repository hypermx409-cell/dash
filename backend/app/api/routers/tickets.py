"""Support ticket routes."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.core.deps import get_current_user, require_admin
from app.models import SupportTicket, TicketMessage

router = APIRouter()


@router.get("/tickets")
def list_tickets(current=Depends(get_current_user), db: Session = Depends(get_db)):
    ts = db.query(SupportTicket).filter(SupportTicket.user_id == current.id).order_by(SupportTicket.created_at.desc()).all()
    return [{"id": t.id, "subject": t.subject, "status": t.status, "priority": t.priority, "updated_at": t.updated_at} for t in ts]


@router.post("/tickets", status_code=201)
def create_ticket(payload: dict, current=Depends(get_current_user), db: Session = Depends(get_db)):
    subject = payload.get("subject")
    body = payload.get("body")
    if not subject or not body:
        raise HTTPException(400, "Missing subject/body")
    t = SupportTicket(user_id=current.id, subject=subject)
    db.add(t)
    db.flush()
    db.add(TicketMessage(ticket_id=t.id, sender_id=current.id, is_admin=False, body=body))
    db.commit()
    db.refresh(t)
    return {"id": t.id, "subject": t.subject, "status": t.status}


@router.get("/tickets/{ticket_id}")
def get_ticket(ticket_id: str, current=Depends(get_current_user), db: Session = Depends(get_db)):
    t = db.get(SupportTicket, ticket_id)
    if not t or (t.user_id != current.id and (current.role.name if current.role else None) != "admin"):
        raise HTTPException(404, "Ticket not found")
    msgs = db.query(TicketMessage).filter(TicketMessage.ticket_id == ticket_id).order_by(TicketMessage.created_at).all()
    return {
        "id": t.id,
        "subject": t.subject,
        "status": t.status,
        "messages": [{"id": m.id, "body": m.body, "is_admin": m.is_admin, "sender_id": m.sender_id, "created_at": m.created_at} for m in msgs],
    }


@router.post("/tickets/{ticket_id}/reply")
def reply_ticket(ticket_id: str, payload: dict, current=Depends(get_current_user), db: Session = Depends(get_db)):
    t = db.get(SupportTicket, ticket_id)
    if not t or (t.user_id != current.id and (current.role.name if current.role else None) != "admin"):
        raise HTTPException(404, "Ticket not found")
    is_admin = (current.role.name if current.role else None) == "admin"
    body = payload.get("body")
    if not body:
        raise HTTPException(400, "Missing body")
    db.add(TicketMessage(ticket_id=ticket_id, sender_id=current.id, is_admin=is_admin, body=body))
    t.updated_at = t.updated_at
    db.commit()
    return {"message": "replied"}

# Admin ticket management
@router.get("/admin/tickets")
def admin_list_tickets(admin=Depends(require_admin), db: Session = Depends(get_db)):
    ts = db.query(SupportTicket).order_by(SupportTicket.created_at.desc()).all()
    return [{"id": t.id, "subject": t.subject, "status": t.status, "user_id": t.user_id, "updated_at": t.updated_at} for t in ts]


@router.put("/admin/tickets/{ticket_id}")
def admin_update_ticket(ticket_id: str, payload: dict, admin=Depends(require_admin), db: Session = Depends(get_db)):
    t = db.get(SupportTicket, ticket_id)
    if not t:
        raise HTTPException(404, "Ticket not found")
    if "status" in payload:
        t.status = payload["status"]
    db.commit()
    return {"message": "updated"}
