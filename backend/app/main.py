"""FastAPI application entrypoint."""

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from app.core.security import decode_access_token

from app.config import settings
from app.core.db import Base, engine
from app.models import *  # noqa: F401,F403

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("dash0")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Ensure tables exist (useful for dev); migrations are preferred for prod.
    Base.metadata.create_all(bind=engine)
    # Seed roles
    try:
        from sqlalchemy.orm import Session
        from app.core.db import SessionLocal
        from app.models import Role, User
        from app.core.security import hash_password
        db = SessionLocal()
        try:
            for name, desc in [("user", "Standard user"), ("admin", "Administrator")]:
                if not db.query(Role).filter(Role.name == name).first():
                    db.add(Role(name=name, description=desc))
            db.commit()
            # Seed default module settings
            from app.models import ModuleSetting
            from app.services.module_defaults import DEFAULT_MODULE_KEYS, DEFAULT_MODULE_CONFIGS
            defaults = DEFAULT_MODULE_KEYS
            for k in defaults:
                if not db.query(ModuleSetting).filter(ModuleSetting.key == k).first():
                    db.add(ModuleSetting(key=k, enabled=True, config=DEFAULT_MODULE_CONFIGS.get(k)))
            db.commit()
            # Seed admin user from env if provided
            import os
            admin_email = settings.ADMIN_EMAIL or os.getenv("ADMIN_EMAIL")
            admin_password = settings.ADMIN_PASSWORD or os.getenv("ADMIN_PASSWORD")
            if admin_email and admin_password:
                existing = db.query(User).filter(User.email == admin_email).first()
                if not existing:
                    role = db.query(Role).filter(Role.name == "admin").first()
                    u = User(email=admin_email, username="admin", hashed_password=hash_password(admin_password), is_active=True, is_verified=True, role_id=role.id if role else None)
                    db.add(u)
                    db.commit()
                    logger.info("Seeded admin user %s", admin_email)
            try:
                from app.services.config_sync import sync_ptero_settings
                sync_ptero_settings(db)
            except Exception as exc:
                logger.warning("ptero settings sync failed: %s", exc)

            # Sync app name from persisted settings
            try:
                from app.models import PlatformSetting
                ps = db.query(PlatformSetting).filter(PlatformSetting.key == "app_name").first()
                if ps and ps.value:
                    from app.config import settings as _s
                    _s.APP_NAME = ps.value
            except Exception as exc:
                logger.warning("app name sync failed: %s", exc)

            # Seed premade themes
            try:
                from app.models import Theme
                if db.query(Theme).count() == 0:
                    presets = [
                        ("Red", "red", "#e11d48", "#ff3b6b"),
                        ("Orange", "orange", "#f97316", "#fb923c"),
                        ("Blue", "blue", "#2563eb", "#60a5fa"),
                        ("Teal", "teal", "#14b8a6", "#34d399"),
                        ("Amber", "amber", "#f59e0b", "#fbbf24"),
                        ("Pink", "pink", "#ec4899", "#f472b6"),
                        ("Purple", "purple", "#7c3aed", "#a78bfa"),
                        ("Green", "green", "#16a34a", "#4ade80"),
                        ("Cyan", "cyan", "#06b6d4", "#67e8f9"),
                        ("Slate", "slate", "#64748b", "#94a3b8"),
                    ]
                    for name, slug, primary, accent in presets:
                        db.add(Theme(name=name, slug=slug, primary_color=primary, accent_color=accent, is_system=True))
                    db.commit()
            except Exception as exc:
                logger.warning("theme seed failed: %s", exc)
        finally:
            db.close()
    except Exception as exc:
        logger.warning("Seeding failed: %s", exc)
    yield


app = FastAPI(title=settings.APP_NAME, version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
def health():
    return {"status": "ok", "app": settings.APP_NAME}


# Routers
from app.api.routers import auth, plans, claims, servers, wallet, rewards, tickets, announcements, admin, profile, branding, user_modules, links, afk, discord  # noqa: E402

async def _maintenance_active() -> bool:
    try:
        from app.core.db import SessionLocal
        from app.models import PlatformSetting
        db = SessionLocal()
        ps = db.query(PlatformSetting).filter(PlatformSetting.key == "maintenance_mode").first()
        db.close()
        if ps and ps.value is not None:
            return str(ps.value).strip().lower() == "true"
    except Exception:
        pass
    return settings.MAINTENANCE_MODE

@app.middleware("http")
async def maintenance_middleware(request, call_next):
    path = request.url.path
    allowed = {"/api/health", "/api/maintenance", "/api/branding", "/api/auth/login", "/api/auth/register", "/api/auth/me", "/api/auth/logout"}
    if path.startswith("/api/admin") or path in allowed or not path.startswith("/api"):
        return await call_next(request)
    if await _maintenance_active():
        token = request.headers.get("authorization", "").replace("Bearer ", "").strip()
        if not token:
            token = request.cookies.get(settings.COOKIE_NAME)
        if token:
            subject = decode_access_token(token)
            if subject:
                from app.core.db import SessionLocal
                from app.models import User
                db = SessionLocal()
                from sqlalchemy.orm import joinedload
                user = db.query(User).options(joinedload(User.role)).filter(User.id == subject).first()
                db.close()
                if user and user.is_active and (user.role.name if user.role else None) == "admin":
                    return await call_next(request)
        return JSONResponse(status_code=503, content={"detail": "Maintenance mode is active. The platform is temporarily unavailable."})
    return await call_next(request)

app.include_router(auth.router, prefix="/api/auth", tags=["auth"])

app.include_router(profile.router, prefix="/api", tags=["profile"])
app.include_router(plans.router, prefix="/api", tags=["plans"])
app.include_router(claims.router, prefix="/api", tags=["claims"])
app.include_router(servers.router, prefix="/api", tags=["servers"])
app.include_router(wallet.router, prefix="/api", tags=["wallet"])
app.include_router(rewards.router, prefix="/api", tags=["rewards"])
app.include_router(tickets.router, prefix="/api", tags=["tickets"])
app.include_router(announcements.router, prefix="/api", tags=["announcements"])
app.include_router(admin.router, prefix="/api/admin", tags=["admin"])
app.include_router(branding.router, prefix="/api", tags=["branding"])
app.include_router(user_modules.router, prefix="/api/modules", tags=["modules"])
app.include_router(links.router, prefix="/api/links", tags=["links"])
app.include_router(afk.router, prefix="/api/afk", tags=["afk"])
app.include_router(discord.router, prefix="/api/discord", tags=["discord"])
