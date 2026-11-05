"""Discord OAuth linking and reward endpoints."""

import json

import httpx
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import RedirectResponse
from itsdangerous import BadSignature, SignatureExpired, URLSafeTimedSerializer
from sqlalchemy.orm import Session

from app.config import settings
from app.core.db import get_db
from app.core.deps import get_current_user
from app.models import ModuleSetting, PlatformSetting, Transaction, User, Wallet

router = APIRouter()


def _setting(db: Session, key: str, default: str = "") -> str:
    ps = db.query(PlatformSetting).filter(PlatformSetting.key == key).first()
    if ps and ps.value not in (None, ""):
        return ps.value
    return default


def _discord_cfg(db: Session) -> dict:
    return {
        "client_id": _setting(db, "discord_client_id", settings.DISCORD_CLIENT_ID),
        "client_secret": _setting(db, "discord_client_secret", settings.DISCORD_CLIENT_SECRET),
        "redirect_uri": _setting(db, "discord_redirect_uri", settings.DISCORD_REDIRECT_URI or f"{settings.FRONTEND_URL.rstrip('/')}/api/discord/callback"),
        "reward": int(_setting(db, "discord_reward_coins", str(settings.DISCORD_REWARD_COINS)) or settings.DISCORD_REWARD_COINS),
    }


def _module_enabled(db: Session, key: str) -> bool:
    m = db.query(ModuleSetting).filter(ModuleSetting.key == key).first()
    return bool(m and m.enabled)


def _serializer() -> URLSafeTimedSerializer:
    return URLSafeTimedSerializer(settings.SECRET_KEY, salt="discord-link")


@router.get("/config")
def discord_config(current=Depends(get_current_user), db: Session = Depends(get_db)):
    cfg = _discord_cfg(db)
    return {
        "configured": bool(cfg["client_id"] and cfg["client_secret"] and cfg["redirect_uri"]),
        "linked": bool(current.discord_id),
        "discord_id": current.discord_id,
        "reward": cfg["reward"],
        "module_enabled": _module_enabled(db, "discord"),
    }


@router.get("/authorize")
def discord_authorize(current=Depends(get_current_user), db: Session = Depends(get_db)):
    cfg = _discord_cfg(db)
    if not cfg["client_id"] or not cfg["client_secret"]:
        raise HTTPException(400, "Discord integration is not configured")
    if not _module_enabled(db, "discord"):
        raise HTTPException(403, "Discord module is disabled")
    state = _serializer().dumps(str(current.id))
    url = (
        "https://discord.com/api/oauth2/authorize"
        f"?client_id={cfg['client_id']}"
        "&response_type=code"
        "&scope=identify%20email"
        f"&redirect_uri={cfg['redirect_uri']}"
        f"&state={state}"
    )
    return {"url": url}


@router.get("/callback")
async def discord_callback(code: str, state: str, db: Session = Depends(get_db)):
    try:
        user_id = _serializer().loads(state, max_age=600)
    except (BadSignature, SignatureExpired):
        return RedirectResponse(url=f"{_discord_cfg(db).get('frontend', settings.FRONTEND_URL).rstrip('/')}/dashboard/profile?discord=invalid", status_code=302)
    user = db.get(User, user_id)
    if not user:
        return RedirectResponse(url=f"{settings.FRONTEND_URL.rstrip('/')}/dashboard/profile?discord=invalid", status_code=302)

    cfg = _discord_cfg(db)
    frontend_url = (settings.FRONTEND_URL or "http://localhost:3001").rstrip("/")
    # exchange code
    async with httpx.AsyncClient(timeout=20.0) as client:
        token_resp = await client.post(
            "https://discord.com/api/oauth2/token",
            data={
                "client_id": cfg["client_id"],
                "client_secret": cfg["client_secret"],
                "grant_type": "authorization_code",
                "code": code,
                "redirect_uri": cfg["redirect_uri"],
            },
            headers={"Content-Type": "application/x-www-form-urlencoded"},
        )
        if token_resp.status_code != 200:
            return RedirectResponse(url=f"{frontend_url}/dashboard/profile?discord=error", status_code=302)
        access_token = token_resp.json().get("access_token")
        user_resp = await client.get("https://discord.com/api/users/@me", headers={"Authorization": f"Bearer {access_token}"})
        if user_resp.status_code != 200:
            return RedirectResponse(url=f"{frontend_url}/dashboard/profile?discord=error", status_code=302)
        discord_user = user_resp.json()
        discord_id = str(discord_user.get("id"))

        if user.discord_id and user.discord_id != discord_id:
            return RedirectResponse(url=f"{frontend_url}/dashboard/profile?discord=mismatch", status_code=302)

        user.discord_id = discord_id
        db.commit()

        # one-time reward
        reward = int(cfg.get("reward", settings.DISCORD_REWARD_COINS))
        ref = f"discord_reward:{user.id}"
        if reward > 0 and not db.query(Transaction).filter(Transaction.reference == ref).first():
            w = db.query(Wallet).filter(Wallet.user_id == user.id).first()
            if not w:
                w = Wallet(user_id=user.id, balance=0)
                db.add(w)
                db.commit()
                db.refresh(w)
            w.balance += reward
            user.balance = w.balance
            db.add(Transaction(user_id=user.id, amount=reward, kind="reward", description="Discord verification reward", reference=ref))
            db.commit()

    return RedirectResponse(url=f"{frontend_url}/dashboard/profile?discord=success", status_code=302)