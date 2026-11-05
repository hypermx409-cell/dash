"""Pterodactyl Application API client (server-side only)."""

from typing import Any, Dict, Optional

import httpx

from app.config import settings


class PterodactylClient:
    def __init__(self, base_url: Optional[str] = None, api_key: Optional[str] = None):
        self.base_url = (base_url or settings.PTERO_PANEL_URL).rstrip("/")
        self.api_key = api_key or settings.PTERO_API_KEY

    def _headers(self) -> Dict[str, str]:
        return {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
            "Accept": "application/json",
        }

    def _url(self, path: str) -> str:
        return f"{self.base_url}/api/application{path}"

    def configured(self) -> bool:
        return bool(self.base_url and self.api_key)

    async def _request(self, method: str, path: str, **kwargs) -> httpx.Response:
        async with httpx.AsyncClient(timeout=30.0, verify=False) as client:
            return await client.request(method, self._url(path), headers=self._headers(), **kwargs)

    # Users
    async def find_user_by_email(self, email: str) -> Optional[Dict[str, Any]]:
        resp = await self._request("GET", f"/users?filter[email]={email}")
        resp.raise_for_status()
        data = resp.json().get("data", [])
        return data[0]["attributes"] if data else None

    async def create_user(self, email: str, username: str, password: Optional[str] = None) -> Dict[str, Any]:
        import secrets
        payload = {
            "email": email,
            "username": username,
            "first_name": username,
            "last_name": "DASH0",
            "language": "en",
            "password": password or secrets.token_urlsafe(16),
        }
        resp = await self._request("POST", "/users", json=payload)
        resp.raise_for_status()
        return resp.json()["attributes"]

    async def get_or_create_user(self, email: str, username: str, password: Optional[str] = None) -> Dict[str, Any]:
        existing = await self.find_user_by_email(email)
        if existing:
            uid = existing.get("id")
            if password and uid:
                try:
                    await self.update_user_password(int(uid), password)
                except Exception:
                    pass
            return existing
        return await self.create_user(email, username, password)

    async def get_user(self, user_id: int) -> Dict[str, Any]:
        resp = await self._request("GET", f"/users/{user_id}")
        resp.raise_for_status()
        return resp.json()["attributes"]

    async def update_user_password(self, user_id: int, password: str) -> Dict[str, Any]:
        payload = {"password": password}
        resp = await self._request("PATCH", f"/users/{user_id}", json=payload)
        if resp.status_code not in (200, 204):
            resp = await self._request("PUT", f"/users/{user_id}", json=payload)
        resp.raise_for_status()
        try:
            return resp.json().get("attributes", {}) if resp.text else {}
        except Exception:
            return {}

    # Servers
    async def create_server(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        resp = await self._request("POST", "/servers", json=payload)
        if not resp.is_success:
            raise RuntimeError(f"Pterodactyl create_server failed: {resp.status_code} {resp.text}")
        return resp.json()["attributes"]

    async def get_server(self, server_id: int) -> Dict[str, Any]:
        resp = await self._request("GET", f"/servers/{server_id}")
        resp.raise_for_status()
        return resp.json()["attributes"]

    async def suspend_server(self, server_id: int) -> None:
        resp = await self._request("POST", f"/servers/{server_id}/suspend")
        resp.raise_for_status()

    async def unsuspend_server(self, server_id: int) -> None:
        resp = await self._request("POST", f"/servers/{server_id}/unsuspend")
        resp.raise_for_status()

    async def delete_server(self, server_id: int) -> None:
        resp = await self._request("DELETE", f"/servers/{server_id}")
        resp.raise_for_status()

    # Nodes/locations/eggs (admin helpers)
    async def list_nodes(self):
        resp = await self._request("GET", "/nodes")
        resp.raise_for_status()
        return resp.json().get("data", [])

    async def list_locations(self):
        resp = await self._request("GET", "/locations")
        resp.raise_for_status()
        return resp.json().get("data", [])

    async def list_nests(self):
        resp = await self._request("GET", "/nests")
        resp.raise_for_status()
        return resp.json().get("data", [])

    async def list_eggs(self, nest_id: int):
        resp = await self._request("GET", f"/nests/{nest_id}/eggs")
        resp.raise_for_status()
        return resp.json().get("data", [])

    async def test_connection(self) -> bool:
        try:
            resp = await self._request("GET", "/users?per_page=1")
            return resp.status_code == 200
        except Exception:
            return False
