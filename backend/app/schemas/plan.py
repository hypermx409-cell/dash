import datetime
from pydantic import BaseModel, Field
from typing import Optional


class PlanCreate(BaseModel):
    name: str
    slug: str
    description: Optional[str] = None
    price_cents: int = 0
    currency: str = "USD"
    ram_mb: int
    cpu_percent: int
    disk_mb: int
    swap_mb: int = 0
    allocations: int = 1
    servers_limit: int = 1
    is_active: bool = True
    is_public: bool = True
    available_stock: Optional[int] = None
    egg_id: Optional[int] = None
    node_id: Optional[int] = None
    location_id: Optional[int] = None


class PlanUpdate(PlanCreate):
    name: Optional[str] = None
    slug: Optional[str] = None
    ram_mb: Optional[int] = None
    cpu_percent: Optional[int] = None
    disk_mb: Optional[int] = None


class PlanOut(BaseModel):
    id: str
    name: str
    slug: str
    description: Optional[str]
    price_cents: int
    currency: str
    ram_mb: int
    cpu_percent: int
    disk_mb: int
    swap_mb: int
    allocations: int
    servers_limit: int
    is_active: bool
    is_public: bool
    available_stock: Optional[int]

    model_config = {"from_attributes": True}


class ClaimRequest(BaseModel):
    plan_id: str
    idempotency_key: Optional[str] = None
    server_name: Optional[str] = None


class ClaimOut(BaseModel):
    id: str
    plan_id: str
    status: str
    error_message: Optional[str]
    created_at: datetime.datetime

    model_config = {"from_attributes": True}


class ServerOut(BaseModel):
    id: str
    name: str
    plan_id: Optional[str]
    status: str
    ptero_server_id: Optional[int]
    ptero_identifier: Optional[str]
    is_suspended: bool
    created_at: datetime.datetime

    model_config = {"from_attributes": True}
