"""Sync Pterodactyl panel accounts with dashboard credentials."""

from app.config import settings
from app.integrations.pterodactyl import PterodactylClient


async def sync_panel_account(email: str, username: str, password: str) -> None:
    client = PterodactylClient()
    if not client.configured():
        return
    safe_username = (username or "user").lower().replace(" ", "")[:15] or "user"
    try:
        await client.get_or_create_user(email, safe_username, password)
    except Exception:
        pass
