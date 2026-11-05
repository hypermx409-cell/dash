"use client";
import { useEffect, useState } from "react";
import { RequireAuth } from "@/components/layout/RequireAuth";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { Card, StatCard } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { api } from "@/lib/api";
import { Users, Server, Activity, Coins, BarChart3, TrendingUp, Gauge, RefreshCw } from "lucide-react";

function Bar({ label, value, total, color }: { label: string; value: number; total: number; color: string }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span>{label}</span>
        <span className="text-[var(--muted)]">{value} <span className="text-xs">({pct}%)</span></span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-white/10">
        <div className="h-full rounded-full transition-colors" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
}

export default function AdminAnalyticsPage() {
  const [data, setData] = useState<any>(null);
  const load = async () => { try { setData(await api("/admin/analytics")); } catch {} };
  useEffect(() => { load(); const t = setInterval(load, 15000); return () => clearInterval(t); }, []);

  const totalServers = data?.servers || 0;
  const totalClaims = data?.claims || 0;
  const totalUsers = data?.users || 0;

  return (
    <RequireAuth admin><DashboardShell admin>
      <div className="space-y-8">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-3xl font-bold">Analytics</h1>
            <p className="text-sm text-[var(--muted)]">Platform growth, usage and resource allocation.</p>
          </div>
          <Button variant="ghost" onClick={load}><RefreshCw size={16} /> Refresh</Button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Total users" value={totalUsers} hint={`${data?.active_users ?? 0} active`} />
          <StatCard label="Total servers" value={totalServers} hint={`${data?.active_servers ?? 0} active`} />
          <StatCard label="Total claims" value={totalClaims} hint={`${data?.completed_claims ?? 0} completed`} />
          <StatCard label="Revenue" value={data?.revenue_cents ?? 0} hint="coins recorded" />
        </div>

        <div className="grid gap-6 xl:grid-cols-2">
          <Card>
            <div className="mb-4 flex items-center gap-2 font-semibold"><Server size={16} className="text-[var(--accent)]" /> Server status distribution</div>
            <div className="space-y-3">
              <Bar label="Active" value={data?.active_servers ?? 0} total={totalServers} color="linear-gradient(90deg,#22c55e,#4ade80)" />
              <Bar label="Suspended" value={data?.suspended_servers ?? 0} total={totalServers} color="linear-gradient(90deg,#f59e0b,#fbbf24)" />
              <Bar label="Failed" value={data?.failed_servers ?? 0} total={totalServers} color="linear-gradient(90deg,#ef4444,#f87171)" />
            </div>
            {totalServers === 0 && <div className="mt-3 text-sm text-[var(--muted)]">No servers yet.</div>}
          </Card>

          <Card>
            <div className="mb-4 flex items-center gap-2 font-semibold"><Activity size={16} className="text-[var(--accent)]" /> Claim status distribution</div>
            <div className="space-y-3">
              <Bar label="Completed" value={data?.completed_claims ?? 0} total={totalClaims} color="linear-gradient(90deg,#22c55e,#4ade80)" />
              <Bar label="Pending / provisioning" value={data?.pending_claims ?? 0} total={totalClaims} color="linear-gradient(90deg,#3b82f6,#60a5fa)" />
              <Bar label="Failed" value={data?.failed_claims ?? 0} total={totalClaims} color="linear-gradient(90deg,#ef4444,#f87171)" />
            </div>
            {totalClaims === 0 && <div className="mt-3 text-sm text-[var(--muted)]">No claims yet.</div>}
          </Card>
        </div>

        <div className="grid gap-6 xl:grid-cols-2">
          <Card>
            <div className="mb-4 flex items-center gap-2 font-semibold"><Gauge size={16} className="text-[var(--accent)]" /> Resource allocation (active servers)</div>
            <div className="space-y-4">
              <Bar label="Allocated RAM" value={data?.allocated_ram_mb ?? 0} total={Math.max(data?.allocated_ram_mb ?? 0, 1)} color="linear-gradient(90deg,var(--accent),var(--accent-2))" />
              <Bar label="Allocated disk" value={data?.allocated_disk_mb ?? 0} total={Math.max(data?.allocated_disk_mb ?? 0, 1)} color="linear-gradient(90deg,var(--accent),var(--accent-2))" />
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-xl border border-[var(--border)] bg-white/5 p-3">
                <div className="text-xs text-[var(--muted)]">Total RAM</div>
                <div className="text-lg font-semibold">{data?.allocated_ram_mb ?? 0} MB</div>
              </div>
              <div className="rounded-xl border border-[var(--border)] bg-white/5 p-3">
                <div className="text-xs text-[var(--muted)]">Total Disk</div>
                <div className="text-lg font-semibold">{data?.allocated_disk_mb ?? 0} MB</div>
              </div>
            </div>
          </Card>

          <Card>
            <div className="mb-4 flex items-center gap-2 font-semibold"><TrendingUp size={16} className="text-[var(--accent)]" /> User growth snapshot</div>
            <div className="space-y-3">
              <Bar label="Active users" value={data?.active_users ?? 0} total={totalUsers} color="linear-gradient(90deg,#22c55e,#4ade80)" />
              <Bar label="Suspended users" value={Math.max(0, totalUsers - (data?.active_users ?? 0))} total={totalUsers} color="linear-gradient(90deg,#ef4444,#f87171)" />
            </div>
            <div className="mt-4 flex items-center gap-2 text-sm text-[var(--muted)]">
              <BarChart3 size={14} /> Data refreshes every 15 seconds.
            </div>
          </Card>
        </div>
      </div>
    </DashboardShell></RequireAuth>
  );
}
