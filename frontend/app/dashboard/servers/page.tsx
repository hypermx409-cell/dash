"use client";
import { useEffect, useState } from "react";
import { RequireAuth } from "@/components/layout/RequireAuth";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { api } from "@/lib/api";
import { useBranding } from "@/lib/theme";
import { Server, Cpu, HardDrive, MemoryStick, Activity, RefreshCw, Copy, CheckCircle2, ExternalLink, Trash2 } from "lucide-react";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import Link from "next/link";

export default function ServersPage() {
  const [servers, setServers] = useState<any[]>([]);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const [copied, setCopied] = useState<string | null>(null);
  const { branding } = useBranding();
  const panelUrl = branding?.panel_url || null;
  const [confirmServer, setConfirmServer] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = async () => setServers(await api("/servers"));
  useEffect(() => { load(); const t = setInterval(load, 15000); return () => clearInterval(t); }, []);

  const copy = (value: string, id: string) => {
    navigator.clipboard.writeText(value);
    setCopied(id);
    setTimeout(() => setCopied(null), 1500);
  };

  const handleDelete = (id: string) => setConfirmServer(id);
  async function confirmDelete() {
    if (!confirmServer) return;
    setDeleting(true);
    try { await api(`/servers/${confirmServer}`, { method: "DELETE" }); await load(); }
    catch (e: any) { alert(e.message); }
    finally { setDeleting(false); setConfirmServer(null); }
  }

  const filtered = servers.filter((s) => {
    if (status !== "all" && s.status !== status) return false;
    if (q && !`${s.name} ${s.plan_name}`.toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  });

  return (
    <RequireAuth><DashboardShell>
      <div className="space-y-8">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-3xl font-bold">My Servers</h1>
            <p className="text-sm text-[var(--muted)]">Manage and monitor your hosting instances.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <input className="input w-full sm:w-auto sm:min-w-[200px]" placeholder="Search servers…" value={q} onChange={e=>setQ(e.target.value)} />
            <select className="input w-full sm:w-auto" value={status} onChange={e=>setStatus(e.target.value)}>
              <option value="all">All statuses</option>
              <option value="active">Active</option>
              <option value="provisioning">Provisioning</option>
              <option value="suspended">Suspended</option>
              <option value="failed">Failed</option>
            </select>
            <Link href="/dashboard/claim"><Button><Server size={16} /> Claim server</Button></Link>
          </div>
        </div>

        {filtered.length === 0 && (
          <Card className="py-12 text-center">
            <Server size={36} className="mx-auto mb-3 text-[var(--muted)]" />
            <div className="text-lg font-semibold">No servers yet</div>
            <p className="mt-1 text-sm text-[var(--muted)]">Claim your first plan to get started.</p>
            <Link href="/dashboard/claim"><Button className="mt-5"><Server size={16} /> Claim a server</Button></Link>
          </Card>
        )}

        <div className="grid gap-5">
          {filtered.map((s) => {
            const ramPct = s.resources?.ram_mb ? 100 : 0;
            return (
              <Card key={s.id} className="relative overflow-hidden transition hover:border-[var(--accent)]/40">
                <div className="absolute inset-x-0 top-0 h-1" style={{ background: "linear-gradient(90deg, var(--accent), var(--accent-2))" }} />
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-lg font-semibold">{s.name}</h3>
                      <span className={`badge ${s.status === "active" ? "text-green-300" : s.status === "failed" ? "text-red-300" : "text-yellow-300"}`}>{s.status}</span>
                      {s.is_suspended && <span className="badge text-orange-300">suspended</span>}
                    </div>
                    <p className="mt-1 text-sm text-[var(--muted)]">{s.plan_name || "Custom plan"} · created {new Date(s.created_at).toLocaleDateString()}</p>

                    <div className="mt-4 grid gap-2 sm:grid-cols-3">
                      <div className="rounded-lg border border-[var(--border)] bg-white/5 p-3">
                        <div className="flex items-center gap-2 text-xs text-[var(--muted)]"><MemoryStick size={13} className="text-[var(--accent)]" /> RAM</div>
                        <div className="mt-1 font-semibold">{s.resources?.ram_mb ?? 0} MB</div>
                      </div>
                      <div className="rounded-lg border border-[var(--border)] bg-white/5 p-3">
                        <div className="flex items-center gap-2 text-xs text-[var(--muted)]"><Cpu size={13} className="text-[var(--accent)]" /> CPU</div>
                        <div className="mt-1 font-semibold">{s.resources?.cpu_percent ?? 0}%</div>
                      </div>
                      <div className="rounded-lg border border-[var(--border)] bg-white/5 p-3">
                        <div className="flex items-center gap-2 text-xs text-[var(--muted)]"><HardDrive size={13} className="text-[var(--accent)]" /> Disk</div>
                        <div className="mt-1 font-semibold">{s.resources?.disk_mb ?? 0} MB</div>
                      </div>
                    </div>
                  </div>

                  <div className="w-full space-y-2 lg:w-72">
                    <div className="rounded-xl border border-[var(--border)] bg-white/5 p-3">
                      <div className="mb-2 text-xs font-medium   text-[var(--muted)]">Connection</div>
                      {s.ptero_identifier ? (
                        <div className="flex items-center justify-between gap-2">
                          <div className="truncate font-mono text-xs">{s.ptero_identifier}</div>
                          <button className="text-[var(--accent)] hover:underline" onClick={() => copy(s.ptero_identifier, s.id)}>
                            {copied === s.id ? <CheckCircle2 size={14} /> : <Copy size={14} />}
                          </button>
                        </div>
                      ) : (
                        <div className="text-xs text-[var(--muted)]">Provisioning in progress…</div>
                      )}
                      {s.ptero_server_id && <div className="mt-1 text-xs text-[var(--muted)]">Server ID: {s.ptero_server_id}</div>}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Link href={`/dashboard/servers/${s.id}`} className="flex-1"><Button variant="ghost" className="w-full text-xs">Details</Button></Link>
                      {panelUrl && (
                        <a href={panelUrl} target="_blank" rel="noreferrer" className="flex-1">
                          <Button variant="ghost" className="w-full text-xs"><ExternalLink size={12} /> Panel</Button>
                        </a>
                      )}
                      <Button variant="ghost" className="flex-1 text-xs" onClick={() => handleDelete(s.id)}><Trash2 size={12} /> Delete</Button>
                      <Button variant="ghost" className="flex-1 text-xs" onClick={load}><Activity size={12} /> Refresh</Button>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </div>
      <ConfirmDialog open={!!confirmServer} title="Delete server" message="Delete this server from DASH0 and Pterodactyl?" confirmLabel="Delete" onConfirm={confirmDelete} onCancel={() => setConfirmServer(null)} loading={deleting} />
    </DashboardShell></RequireAuth>
  );
}
