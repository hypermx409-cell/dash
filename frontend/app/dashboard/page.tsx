"use client";
import { useEffect, useState } from "react";
import { RequireAuth } from "@/components/layout/RequireAuth";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { Card, StatCard } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import Link from "next/link";
import { Server, Rocket, Wallet, Activity, Bell, Cpu, HardDrive, MemoryStick, Plus, ArrowRight } from "lucide-react";

export default function DashboardPage() {
  const { user } = useAuth();
  const [servers, setServers] = useState<any[]>([]);
  const [claims, setClaims] = useState<any[]>([]);
  const [ann, setAnn] = useState<any[]>([]);
  const [wallet, setWallet] = useState<any>(null);

  const load = async () => {
    const [s, c, a, w] = await Promise.allSettled([
      api("/servers"), api("/claims"), api("/announcements"), api("/wallet"),
    ]);
    if (s.status === "fulfilled") setServers(s.value);
    if (c.status === "fulfilled") setClaims(c.value);
    if (a.status === "fulfilled") setAnn(a.value);
    if (w.status === "fulfilled") setWallet(w.value);
  };
  useEffect(() => { load(); const t = setInterval(load, 15000); return () => clearInterval(t); }, []);

  const active = servers.filter((s) => s.status === "active").length;
  const totalRam = servers.reduce((n, s) => n + (s.resources?.ram_mb || 0), 0);

  return (
    <RequireAuth><DashboardShell>
      <div className="space-y-8">
        {/* Hero */}
        <div className="relative overflow-hidden rounded-3xl border border-[var(--border)] bg-[#10131a] p-8">

          <div className="relative flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-4xl font-bold tracking-tight">Dashboard</h1>
              <p className="mt-2 max-w-xl text-sm text-[var(--muted)]">
                Track your servers, claim new plans, manage your wallet, and stay updated.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link href="/dashboard/claim"><Button><Rocket size={16} /> Claim server</Button></Link>
              <Link href="/dashboard/wallet"><Button variant="ghost"><Wallet size={16} /> Wallet</Button></Link>
            </div>
          </div>
        </div>

        {/* KPIs */}
        <section>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Total servers" value={servers.length} hint={`${active} active`} />
            <StatCard label="Total claims" value={claims.length} hint="all time" />
            <StatCard label="Coin balance" value={wallet?.balance ?? 0} hint="available" />
            <StatCard label="Allocated RAM" value={`${totalRam} MB`} hint="across servers" />
          </div>
        </section>

        <div className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
          {/* Servers */}
          <Card className="relative overflow-hidden">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Server size={18} className="text-[var(--accent)]" />
                <h2 className="text-lg font-semibold">My servers</h2>
              </div>
              <Link href="/dashboard/servers" className="text-xs text-[var(--accent)] hover:underline">View all</Link>
            </div>
            <div className="space-y-3">
              {servers.slice(0, 4).map((s) => (
                <div key={s.id} className="flex flex-col gap-3 rounded-xl border border-[var(--border)] bg-white/5 p-4 transition hover:border-[var(--accent)]/40 sm:flex-row sm:items-center">
                  <div className="flex-1">
                    <div className="font-medium">{s.name}</div>
                    <div className="mt-1 text-xs text-[var(--muted)]">{s.plan_name || "Plan"} · {s.resources?.cpu_percent ?? 0}% CPU</div>
                    <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
                      <div className="flex items-center gap-1 text-[var(--muted)]"><MemoryStick size={12} /> {s.resources?.ram_mb ?? 0} MB</div>
                      <div className="flex items-center gap-1 text-[var(--muted)]"><Cpu size={12} /> {s.resources?.cpu_percent ?? 0}%</div>
                      <div className="flex items-center gap-1 text-[var(--muted)]"><HardDrive size={12} /> {s.resources?.disk_mb ?? 0} MB</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`badge ${s.status === "active" ? "text-green-300" : s.status === "failed" ? "text-red-300" : "text-yellow-300"}`}>{s.status}</span>
                  </div>
                </div>
              ))}
              {servers.length === 0 && (
                <div className="rounded-xl border border-dashed border-[var(--border)] bg-white/5 p-8 text-center">
                  <Server size={30} className="mx-auto mb-2 text-[var(--muted)]" />
                  <div className="text-sm text-[var(--muted)]">You haven't claimed any servers yet.</div>
                  <Link href="/dashboard/claim"><Button className="mt-4"><Plus size={14} /> Claim your first server</Button></Link>
                </div>
              )}
            </div>
          </Card>

          {/* Side panel */}
          <div className="space-y-4">
            <Card>
              <div className="mb-3 flex items-center gap-2">
                <Activity size={18} className="text-[var(--accent)]" />
                <h2 className="text-lg font-semibold">Recent claims</h2>
              </div>
              <div className="space-y-3">
                {claims.slice(0, 5).map((c) => (
                  <div key={c.id} className="flex items-center justify-between border-b border-[var(--border)] pb-3 last:border-0 last:pb-0">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium">{c.plan_name || c.plan_id}</div>
                      <div className="text-xs text-[var(--muted)]">{new Date(c.created_at).toLocaleDateString()}</div>
                    </div>
                    <span className={`badge ${c.status === "completed" ? "text-green-300" : c.status === "failed" ? "text-red-300" : "text-blue-300"}`}>{c.status}</span>
                  </div>
                ))}
                {claims.length === 0 && <div className="py-6 text-center text-sm text-[var(--muted)]">No claims yet.</div>}
              </div>
              <Link href="/dashboard/claim" className="mt-4 inline-flex items-center gap-1 text-sm text-[var(--accent)] hover:underline">
                Claim more <ArrowRight size={14} />
              </Link>
            </Card>

            {ann.length > 0 && (
              <Card>
                <div className="mb-3 flex items-center gap-2">
                  <Bell size={18} className="text-[var(--accent)]" />
                  <h2 className="text-lg font-semibold">Announcements</h2>
                </div>
                <div className="space-y-3">
                  {ann.slice(0, 3).map((a) => (
                    <div key={a.id} className="rounded-xl border border-[var(--border)] bg-white/5 p-3">
                      <div className="font-medium text-sm">{a.title}</div>
                      <div className="mt-1 text-xs text-[var(--muted)] line-clamp-2">{a.body}</div>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </div>
        </div>

        {/* Quick links */}
        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { href: "/dashboard/servers", icon: Server, label: "My servers" },
            { href: "/dashboard/claim", icon: Rocket, label: "Claim server" },
            { href: "/dashboard/wallet", icon: Wallet, label: "Wallet" },
            { href: "/dashboard/support", icon: Activity, label: "Support" },
          ].map((a) => (
            <Link key={a.href} href={a.href} className="card flex items-center gap-3 p-4 transition hover:border-[var(--accent)]/40 hover:bg-white/5">
              <a.icon size={18} className="text-[var(--accent)]" />
              <div className="font-medium">{a.label}</div>
              <ArrowRight size={14} className="ml-auto text-[var(--muted)]" />
            </Link>
          ))}
        </section>
      </div>
    </DashboardShell></RequireAuth>
  );
}
