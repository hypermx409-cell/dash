"use client";
import { useEffect, useState } from "react";
import { RequireAuth } from "@/components/layout/RequireAuth";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { api } from "@/lib/api";
import { use } from "react";
import Link from "next/link";
import { Server, Cpu, HardDrive, MemoryStick, RefreshCw, ArrowLeft } from "lucide-react";

export default function ServerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [server, setServer] = useState<any>(null);
  const [msg, setMsg] = useState("");

  const load = async () => {
    try { setServer(await api(`/servers/${id}`)); } catch (e: any) { setMsg(e.message); }
  };
  useEffect(() => { load(); }, [id]);

  if (!server && !msg) return <RequireAuth><DashboardShell><div className="text-[var(--muted)]">Loading...</div></DashboardShell></RequireAuth>;

  return (
    <RequireAuth><DashboardShell>
      <div className="space-y-6">
        <Link href="/dashboard/servers" className="inline-flex items-center gap-2 text-sm text-[var(--muted)] hover:text-[var(--text)]">
          <ArrowLeft size={14} /> Back to servers
        </Link>
        {msg && <div className="rounded-xl border border-[var(--border)] bg-white/5 p-3 text-sm">{msg}</div>}
        {server && (
          <>
            <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div>
                <h1 className="text-3xl font-bold">{server.name}</h1>
                <p className="text-sm text-[var(--muted)]">{server.status} · created {new Date(server.created_at).toLocaleString()}</p>
              </div>
              <Button variant="ghost" onClick={load}><RefreshCw size={16} /> Refresh</Button>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <Card className="text-center">
                <MemoryStick size={18} className="mx-auto mb-2 text-[var(--accent)]" />
                <div className="text-2xl font-bold">{server.plan?.ram_mb ?? "—"}</div>
                <div className="text-xs text-[var(--muted)]">RAM MB</div>
              </Card>
              <Card className="text-center">
                <Cpu size={18} className="mx-auto mb-2 text-[var(--accent)]" />
                <div className="text-2xl font-bold">{server.plan?.cpu_percent ?? "—"}</div>
                <div className="text-xs text-[var(--muted)]">CPU %</div>
              </Card>
              <Card className="text-center">
                <HardDrive size={18} className="mx-auto mb-2 text-[var(--accent)]" />
                <div className="text-2xl font-bold">{server.plan?.disk_mb ?? "—"}</div>
                <div className="text-xs text-[var(--muted)]">Disk MB</div>
              </Card>
            </div>
            <Card>
              <h2 className="mb-3 text-lg font-semibold">Connection</h2>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between border-b border-[var(--border)] pb-2"><span className="text-[var(--muted)]">Identifier</span><span className="font-mono">{server.ptero_identifier || "—"}</span></div>
                <div className="flex justify-between border-b border-[var(--border)] pb-2"><span className="text-[var(--muted)]">Server ID</span><span>{server.ptero_server_id || "—"}</span></div>
                <div className="flex justify-between"><span className="text-[var(--muted)]">Plan</span><span>{server.plan?.name || "—"}</span></div>
              </div>
            </Card>
          </>
        )}
      </div>
    </DashboardShell></RequireAuth>
  );
}
