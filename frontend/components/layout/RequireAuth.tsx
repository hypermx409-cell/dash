"use client";
import { useAuth } from "@/lib/auth";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";

export function RequireAuth({ children, admin = false }: { children: React.ReactNode; admin?: boolean }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [maintenance, setMaintenance] = useState(false);
  useEffect(() => { api("/maintenance").then((r) => setMaintenance(!!r?.maintenance)).catch(() => {}); }, []);
  useEffect(() => {
    if (loading) return;
    if (!user) { router.push("/login"); return; }
    if (admin && user.role !== "admin") { router.push("/dashboard"); return; }
    if (!admin && maintenance && user.role !== "admin") { router.push("/maintenance"); return; }
  }, [user, loading, admin, maintenance, router]);
  if (loading) return <div className="p-8 text-[var(--muted)]">Loading...</div>;
  if (!user) return null;
  if (admin && user.role !== "admin") return null;
  if (!admin && maintenance && user.role !== "admin") return null;
  return <>{children}</>;
}
