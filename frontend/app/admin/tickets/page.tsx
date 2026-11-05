"use client";
import { useEffect, useState } from "react";
import { RequireAuth } from "@/components/layout/RequireAuth";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { api } from "@/lib/api";
import { LifeBuoy, Search, Check, Clock, X, Eye, MessageSquare, RefreshCw } from "lucide-react";

const STATUS_COLORS: Record<string, string> = {
  open: "text-blue-300",
  pending: "text-yellow-300",
  closed: "text-green-300",
};

export default function AdminTicketsPage() {
  const [tickets, setTickets] = useState<any[]>([]);
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [selected, setSelected] = useState<any>(null);
  const [msg, setMsg] = useState("");

  const load = async () => setTickets(await api("/admin/tickets"));
  useEffect(() => { load(); }, []);

  async function open(t: any) {
    const detail = await api(`/tickets/${t.id}`);
    setSelected(detail);
  }

  async function close(id: string) {
    await api(`/admin/tickets/${id}`, { method: "PUT", body: JSON.stringify({ status: "closed" }) });
    setMsg("Ticket closed");
    await load();
    if (selected?.id === id) setSelected((s: any) => s && { ...s, status: "closed" });
  }

  async function reopen(id: string) {
    await api(`/admin/tickets/${id}`, { method: "PUT", body: JSON.stringify({ status: "open" }) });
    setMsg("Ticket reopened");
    await load();
    if (selected?.id === id) setSelected((s: any) => s && { ...s, status: "open" });
  }

  const filtered = tickets.filter((t) => {
    if (statusFilter && t.status !== statusFilter) return false;
    if (q && !`${t.subject} ${t.user_id}`.toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  });

  const counts = {
    open: tickets.filter((t) => t.status === "open").length,
    pending: tickets.filter((t) => t.status === "pending").length,
    closed: tickets.filter((t) => t.status === "closed").length,
  };

  return (
    <RequireAuth admin><DashboardShell admin>
      <div className="space-y-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-3xl font-bold">Support Tickets</h1>
            <p className="text-sm text-[var(--muted)]">Manage user support conversations.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="badge text-blue-300">{counts.open} open</span>
            <span className="badge text-yellow-300">{counts.pending} pending</span>
            <span className="badge text-green-300">{counts.closed} closed</span>
            <Button variant="ghost" onClick={load}><RefreshCw size={16} /> Reload</Button>
          </div>
        </div>
        {msg && <div className="rounded-xl border border-[var(--border)] bg-white/5 p-3 text-sm">{msg}</div>}

        <div className="grid gap-6 xl:grid-cols-[1fr_420px]">
          <Card>
            <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <h2 className="text-lg font-semibold">All tickets</h2>
              <div className="flex flex-wrap gap-2">
                <select className="input" value={statusFilter} onChange={e=>setStatusFilter(e.target.value)}>
                  <option value="">All statuses</option>
                  <option value="open">Open</option>
                  <option value="pending">Pending</option>
                  <option value="closed">Closed</option>
                </select>
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]" />
                  <input className="input pl-9 w-full sm:min-w-[180px]" placeholder="Search…" value={q} onChange={e=>setQ(e.target.value)} />
                </div>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-xs  text-[var(--muted)]">
                  <tr><th className="py-2 text-left">Subject</th><th>User</th><th>Status</th><th>Updated</th><th className="text-right">Actions</th></tr>
                </thead>
                <tbody>
                  {filtered.map((t) => (
                    <tr key={t.id} className="border-t border-[var(--border)] hover:bg-white/5">
                      <td className="py-2 font-medium">{t.subject}</td>
                      <td className="text-xs text-[var(--muted)]">{t.user_id?.slice(0, 8)}</td>
                      <td><span className={`badge ${STATUS_COLORS[t.status] || ""}`}>{t.status}</span></td>
                      <td className="text-xs text-[var(--muted)]">{new Date(t.updated_at).toLocaleString()}</td>
                      <td className="space-x-2 text-right">
                        <button className="text-[var(--accent)]" onClick={()=>open(t)} title="View"><Eye size={14} /></button>
                        {t.status !== "closed" && <button className="text-green-400" onClick={()=>close(t.id)} title="Close"><Check size={14} /></button>}
                        {t.status === "closed" && <button className="text-yellow-400" onClick={()=>reopen(t.id)} title="Reopen"><Clock size={14} /></button>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filtered.length === 0 && <div className="py-6 text-center text-sm text-[var(--muted)]">No tickets found.</div>}
            </div>
          </Card>

          <Card>
            <h2 className="mb-3 text-lg font-semibold">Conversation</h2>
            {!selected ? (
              <div className="flex h-40 items-center justify-center text-sm text-[var(--muted)]">Select a ticket to view messages.</div>
            ) : (
              <div className="space-y-4">
                <div className="rounded-xl border border-[var(--border)] bg-white/5 p-3">
                  <div className="font-medium">{selected.subject}</div>
                  <div className="text-xs text-[var(--muted)]">{selected.status}</div>
                </div>
                <div className="max-h-80 space-y-3 overflow-y-auto">
                  {selected.messages?.map((m: any) => (
                    <div key={m.id} className={`rounded-xl border p-3 text-sm ${m.is_admin ? "border-[var(--accent)]/30 bg-[var(--accent)]/10" : "border-[var(--border)] bg-white/5"}`}>
                      <div className="mb-1 flex items-center gap-2 text-xs text-[var(--muted)]">
                        <MessageSquare size={12} /> {m.is_admin ? "Admin" : "User"} · {new Date(m.created_at).toLocaleString()}
                      </div>
                      <div>{m.body}</div>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input className="input" placeholder="Reply as admin…" onKeyDown={async (e) => {
                    if (e.key === "Enter" && (e.currentTarget as HTMLInputElement).value.trim()) {
                      const val = (e.currentTarget as HTMLInputElement).value;
                      (e.currentTarget as HTMLInputElement).value = "";
                      await api(`/tickets/${selected.id}/reply`, { method: "POST", body: JSON.stringify({ body: val }) });
                      const d = await api(`/tickets/${selected.id}`);
                      setSelected(d);
                    }
                  }} />
                </div>
                <div className="flex justify-end gap-2">
                  {selected.status !== "closed" && <Button variant="ghost" onClick={() => close(selected.id)}><Check size={14} /> Close</Button>}
                  <Button variant="ghost" onClick={() => setSelected(null)}><X size={14} /> Close panel</Button>
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>
    </DashboardShell></RequireAuth>
  );
}
