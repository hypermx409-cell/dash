"""Hosting plan model."""

import datetime
import uuid

from sqlalchemy import Boolean, DateTime, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.core.db import Base


def _uuid() -> str:
    return str(uuid.uuid4())


class Plan(Base):
    __tablename__ = "plans"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    name: Mapped[str] = mapped_column(String(128), nullable=False)
    slug: Mapped[str] = mapped_column(String(128), unique=True, index=True, nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    price_cents: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    currency: Mapped[str] = mapped_column(String(8), default="coins", nullable=False)

    # Resources
    ram_mb: Mapped[int] = mapped_column(Integer, nullable=False)
    cpu_percent: Mapped[int] = mapped_column(Integer, nullable=False)  # 100 = 1 core
    disk_mb: Mapped[int] = mapped_column(Integer, nullable=False)
    swap_mb: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    allocations: Mapped[int] = mapped_column(Integer, default=1, nullable=False)

    # Limits
    servers_limit: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    is_public: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    available_stock: Mapped[int | None] = mapped_column(Integer, nullable=True)  # None = unlimited

    # Pterodactyl egg/node overrides optional
    egg_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    node_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    location_id: Mapped[int | None] = mapped_column(Integer, nullable=True)

    created_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.datetime.now(datetime.timezone.utc)
    )
    updated_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.datetime.now(datetime.timezone.utc),
        onupdate=lambda: datetime.datetime.now(datetime.timezone.utc),
    )
