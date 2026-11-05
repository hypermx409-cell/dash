"""Provisioned server model."""

import datetime
import uuid

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.db import Base


def _uuid() -> str:
    return str(uuid.uuid4())


class Server(Base):
    __tablename__ = "servers"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    plan_id: Mapped[str | None] = mapped_column(ForeignKey("plans.id"), nullable=True)
    claim_id: Mapped[str | None] = mapped_column(ForeignKey("claims.id"), nullable=True, unique=True)
    name: Mapped[str] = mapped_column(String(128), nullable=False)

    # Pterodactyl linkage
    ptero_server_id: Mapped[int | None] = mapped_column(Integer, nullable=True, index=True)
    ptero_user_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    ptero_identifier: Mapped[str | None] = mapped_column(String(64), nullable=True)

    status: Mapped[str] = mapped_column(String(32), default="provisioning", index=True)  # provisioning/active/suspended/deleted/failed
    resource_override: Mapped[str | None] = mapped_column(Text, nullable=True)

    is_suspended: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    created_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.datetime.now(datetime.timezone.utc)
    )
    updated_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.datetime.now(datetime.timezone.utc),
        onupdate=lambda: datetime.datetime.now(datetime.timezone.utc),
    )

    owner = relationship("User", back_populates="servers")
    plan = relationship("Plan")
    claim = relationship("Claim", back_populates="server")
