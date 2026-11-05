export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("dash0_token");
}

export function setToken(t: string | null) {
  if (typeof window === "undefined") return;
  if (t) localStorage.setItem("dash0_token", t);
  else localStorage.removeItem("dash0_token");
}

function toApiPath(path: string) {
  return path.startsWith("/api") ? path : `/api${path}`;
}

export async function api(path: string, options: RequestInit = {}) {
  const url = toApiPath(path);
  const token = getToken();
  const headers = new Headers(options.headers || {});
  if (!headers.has("Content-Type") && options.body) headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);
  const res = await fetch(url, { ...options, headers });
  if (!res.ok) {
    let msg = res.statusText;
    try {
      const j = await res.json();
      msg = j.detail || j.message || msg;
    } catch {}
    throw new Error(msg);
  }
  if (res.status === 204) return null;
  const ct = res.headers.get("content-type") || "";
  if (ct.includes("application/json")) return res.json();
  return res.text();
}
