"use client";
import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { api, setToken, getToken } from "./api";

type User = { id: string; email: string; username: string; role: string | null; balance: number; is_active: boolean };

const Ctx = createContext<{
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, username: string, password: string) => Promise<void>;
  logout: () => void;
  refresh: () => Promise<void>;
} | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  async function refresh() {
    const token = getToken();
    if (!token) { setUser(null); setLoading(false); return; }
    try {
      const me = await api("/auth/me");
      setUser(me);
    } catch (e) {
      if (e instanceof Error && /Maintenance/i.test(e.message)) {
        // keep the session alive during maintenance
      } else {
        setToken(null);
        setUser(null);
      }
    } finally { setLoading(false); }
  }

  useEffect(() => { refresh(); }, []);

  async function login(email: string, password: string) {
    const res: any = await api("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) });
    setToken(res.access_token);
    await refresh();
  }

  async function register(email: string, username: string, password: string) {
    await api("/auth/register", { method: "POST", body: JSON.stringify({ email, username, password }) });
    await login(email, password);
  }

  function logout() {
    setToken(null);
    setUser(null);
  }

  return <Ctx.Provider value={{ user, loading, login, register, logout, refresh }}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAuth outside provider");
  return ctx;
}
