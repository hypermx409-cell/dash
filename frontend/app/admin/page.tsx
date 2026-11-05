"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { RequireAuth } from "@/components/layout/RequireAuth";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { api } from "@/lib/api";
import { Activity, Users, Server, Package, AlertTriangle, ShieldCheck, Coins, Sparkles, ArrowRight, Clock } from "lucide-react";

export default function AdminOverviewPage() {
  const [data, setData] = useState<any>(null);
  const load = async () => { try { setData(await api("/admin/overview")); } catch {} };
  useEffect(() => { load(); const t = setInterval(load, 10000); return () => clearInterval(t); }, []);

  const kpis = [
    { label: "Total users", value: data?.total_users ?? 0, hint: `${data?.active_users ?? 0} active`, icon: Users, color: "from-blue-500/20 to-transparent" },
    { label: "Total servers", value: data?.total_servers ?? 0, hint: `${data?.active_servers ?? 0} live`, icon: Server, color: "from-emerald-500/20 to-transparent" },
    { label: "Total claims", value: data?.total_claims ?? 0, hint: `${data?.pending_claims ?? 0} pending`, icon: Package, color: "from-violet-500/20 to-transparent" },
    { label: "Failed jobs", value: data?.failed_jobs ?? 0, hint: "needs attention", icon: AlertTriangle, color: "from-red-500/20 to-transparent" },
  ];

  return (
    <RequireAuth admin><DashboardShell admin>
      <div className="space-y-10">
        <div className="relative overflow-hidden rounded-3xl border border-[var(--border)] bg-[#10131a] p-8">
          <div className="relative flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-white/5 px-3 py-1 text-xs text-[var(--muted)]">
                <Sparkles size={12} className="text-[var(--accent)]" /> Control center
              </div>
              <h1 className="text-4xl font-bold tracking-tight">Admin Overview</h1>
              <p className="mt-2 max-w-xl text-sm text-[var(--muted)]">Real-time insight into users, servers, claims, and provisioning health.</p>
            </div>
            <div className="flex items-center gap-2">
              <Link href="/admin/users"><Button variant="ghost" className="min-w-[96px] justify-center">Users</Button></Link>
              <Link href="/admin/plans"><Button className="min-w-[96px] justify-center"><Package size={16} /> New plan</Button></Link>
            </div>
          </div>
        </div>

        {data?.maintenance_mode && (
          <div className="flex items-center gap-3 rounded-2xl border border-yellow-500/30 bg-yellow-500/10 p-4 text-sm text-yellow-100">
            <AlertTriangle size={18} /> Maintenance mode is enabled. Claims and registrations may be restricted.
          </div>
        )}

        <section>
          <div className="mb-4 flex items-center gap-2">
            <Coins size={16} className="text-[var(--accent)]" />
            <h2 className="text-lg font-semibold">Key metrics</h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {kpis.map((k) => (
              <Card key={k.label} className="relative overflow-hidden border-white/5 transition hover:border-[var(--accent)]/40">
                <div className={`absolute inset-0 bg-gradient-to-br ${k.color}`} />
                <div className="relative">
                  <div className="flex items-center justify-between">
                    <div className="text-xs   text-[var(--muted)]">{k.label}</div>
                    <k.icon size={18} className="text-[var(--accent)]" />
                  </div>
                  <div className="mt-3 text-4xl font-bold">{k.value}</div>
                  <div className="mt-1 text-xs text-[var(--muted)]">{k.hint}</div>
                </div>
              </Card>
            ))}
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-4">
          {[
            { label: "Active users", value: data?.active_users ?? 0, total: data?.total_users ?? 0 },
            { label: "Active servers", value: data?.active_servers ?? 0, total: data?.total_servers ?? 0 },
            { label: "Completed claims", value: data?.completed_claims ?? 0, total: data?.total_claims ?? 0 },
            { label: "Suspended", value: (data?.suspended_servers ?? 0) + (data?.failed_servers ?? 0), total: data?.total_servers ?? 0 },
          ].map((m) => {
            const pct = m.total > 0 ? Math.round((m.value / m.total) * 100) : 0;
            return (
              <Card key={m.label}>
                <div className="text-xs   text-[var(--muted)]">{m.label}</div>
                <div className="mt-2 text-2xl font-bold">{m.value}</div>
                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10">
                  <div className="h-full rounded-full bg-[var(--accent)] transition-colors" style={{ width: `${pct}%` }} />
                </div>
                <div className="mt-1 text-xs text-[var(--muted)]">{pct}% of total</div>
              </Card>
            );
          })}
        </section>

        <section>
          <div className="mb-4 flex items-center gap-2">
            <Activity size={16} className="text-[var(--accent)]" />
            <h2 className="text-lg font-semibold">Recent activity</h2>
          </div>
          <div className="grid gap-4 lg:grid-cols-3">
            <Card>
              <div className="mb-4 flex items-center justify-between">
                <div className="font-semibold">Users</div>
                <span className="badge">latest</span>
              </div>
              <div className="space-y-3">
                {(data?.recent_users || []).map((u: any) => (
                  <div key={u.id} className="flex items-center gap-3 border-b border-[var(--border)] pb-3 last:border-0 last:pb-0">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--accent)] text-xs font-bold">{(u.username || "?").charAt(0).toUpperCase()}</div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-medium">{u.username}</div>
                      <div className="truncate text-xs text-[var(--muted)]">{u.email}</div>
                    </div>
                    <span className="text-xs text-[var(--muted)]">{new Date(u.created_at).toLocaleDateString()}</span>
                  </div>
                ))}
                {!data?.recent_users?.length && <div className="py-6 text-center text-sm text-[var(--muted)]">No users yet.</div>}
              </div>
            </Card>

            <Card>
              <div className="mb-4 flex items-center justify-between">
                <div className="font-semibold">Servers</div>
                <span className="badge">latest</span>
              </div>
              <div className="space-y-3">
                {(data?.recent_servers || []).map((s: any) => (
                  <div key={s.id} className="flex items-center gap-3 border-b border-[var(--border)] pb-3 last:border-0 last:pb-0">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/5"><Server size={15} className="text-[var(--accent)]" /></div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-medium">{s.name}</div>
                      <div className="truncate text-xs text-[var(--muted)]">{s.owner || "unassigned"}</div>
                    </div>
                    <span className={`badge ${s.status === "active" ? "text-green-300" : s.status === "failed" ? "text-red-300" : "text-yellow-300"}`}>{s.status}</span>
                  </div>
                ))}
                {!data?.recent_servers?.length && <div className="py-6 text-center text-sm text-[var(--muted)]">No servers yet.</div>}
              </div>
            </Card>

            <Card>
              <div className="mb-4 flex items-center justify-between">
                <div className="font-semibold">Claims</div>
                <span className="badge">latest</span>
              </div>
              <div className="space-y-3">
                {(data?.recent_claims || []).map((c: any) => (
                  <div key={c.id} className="flex items-center gap-3 border-b border-[var(--border)] pb-3 last:border-0 last:pb-0">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/5"><Clock size={15} className="text-[var(--accent)]" /></div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-mono text-xs">{c.id.slice(0, 12)}</div>
                      <div className="text-xs text-[var(--muted)]">{new Date(c.created_at).toLocaleString()}</div>
                    </div>
                    <span className={`badge ${c.status === "completed" ? "text-green-300" : c.status === "failed" ? "text-red-300" : "text-blue-300"}`}>{c.status}</span>
                  </div>
                ))}
                {!data?.recent_claims?.length && <div className="py-6 text-center text-sm text-[var(--muted)]">No claims yet.</div>}
              </div>
            </Card>
          </div>
        </section>

        <section>
          <div className="mb-4 flex items-center gap-2">
            <ShieldCheck size={16} className="text-[var(--accent)]" />
            <h2 className="text-lg font-semibold">Quick actions</h2>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { href: "/admin/users", label: "Review users", hint: "Manage accounts", icon: Users },
              { href: "/admin/plans", label: "Configure plans", hint: "Pricing & resources", icon: Package },
              { href: "/admin/servers", label: "Provisioning", hint: "Server queue", icon: Server },
              { href: "/admin/tickets", label: "Support inbox", hint: "User requests", icon: Activity },
            ].map((a) => (
              <Link key={a.href} href={a.href} className="group card flex items-center gap-4 transition hover:border-[var(--accent)]/50 hover:bg-white/5">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--accent)]/10 transition group-hover:bg-[var(--accent)]/20">
                  <a.icon size={20} className="text-[var(--accent)]" />
                </div>
                <div className="flex-1">
                  <div className="font-semibold">{a.label}</div>
                  <div className="text-xs text-[var(--muted)]">{a.hint}</div>
                </div>
                <ArrowRight size={16} className="text-[var(--muted)] transition group-hover:translate-x-1 group-hover:text-[var(--text)]" />
              </Link>
            ))}
          </div>
        </section>
      </div>
    </DashboardShell></RequireAuth>
  );
}
