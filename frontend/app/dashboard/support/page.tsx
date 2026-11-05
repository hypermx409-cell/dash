"use client";
import { useEffect, useState } from "react";
import { RequireAuth } from "@/components/layout/RequireAuth";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { api } from "@/lib/api";
import { LifeBuoy, Plus, Send, MessageSquare, Clock, CheckCircle2, RefreshCw } from "lucide-react";

export default function SupportPage() {
  const [tickets, setTickets] = useState<any[]>([]);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [selected, setSelected] = useState<any>(null);
  const [reply, setReply] = useState("");
  const [msg, setMsg] = useState("");

  const load = async () => setTickets(await api("/tickets"));
  useEffect(() => { load(); }, []);

  async function create() {
    if (!subject.trim() || !body.trim()) { setMsg("Subject and message required"); return; }
    await api("/tickets", { method: "POST", body: JSON.stringify({ subject, body }) });
    setSubject(""); setBody("");
    setMsg("Ticket created");
    await load();
  }

  async function open(t: any) {
    const detail = await api(`/tickets/${t.id}`);
    setSelected(detail);
  }

  async function sendReply() {
    if (!selected || !reply.trim()) return;
    await api(`/tickets/${selected.id}/reply`, { method: "POST", body: JSON.stringify({ body: reply }) });
    setReply("");
    await open(selected);
  }

  return (
    <RequireAuth><DashboardShell>
      <div className="space-y-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-3xl font-bold">Support</h1>
            <p className="text-sm text-[var(--muted)]">Get help from the DASH0 team.</p>
          </div>
          <Button variant="ghost" onClick={load}><RefreshCw size={16} /> Reload</Button>
        </div>
        {msg && <div className="rounded-xl border border-[var(--border)] bg-white/5 p-3 text-sm">{msg}</div>}

        <div className="grid gap-6 xl:grid-cols-[420px_1fr]">
          <Card>
            <div className="mb-4 flex items-center gap-2">
              <Plus size={18} className="text-[var(--accent)]" />
              <h2 className="text-lg font-semibold">Create ticket</h2>
            </div>
            <div className="space-y-3">
              <input className="input" placeholder="Subject" value={subject} onChange={e=>setSubject(e.target.value)} />
              <textarea className="input" rows={5} placeholder="Describe your issue…" value={body} onChange={e=>setBody(e.target.value)} />
              <Button onClick={create} className="w-full"><LifeBuoy size={16} /> Submit ticket</Button>
            </div>
          </Card>

          <Card>
            <h2 className="mb-4 text-lg font-semibold">Your tickets</h2>
            <div className="space-y-3">
              {tickets.map((t) => (
                <button key={t.id} onClick={() => open(t)} className={`w-full rounded-xl border p-4 text-left transition ${selected?.id === t.id ? "border-[var(--accent)]/50 bg-[var(--accent)]/10" : "border-[var(--border)] bg-white/5 hover:border-[var(--accent)]/30"}`}>
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="font-medium">{t.subject}</div>
                      <div className="mt-1 text-xs text-[var(--muted)]">{t.status === "closed" ? "Closed" : "Active"} · {new Date(t.updated_at).toLocaleDateString()}</div>
                    </div>
                    <span className={`badge ${t.status === "closed" ? "text-green-300" : "text-blue-300"}`}>
                      {t.status === "closed" ? <CheckCircle2 size={12} className="mr-1" /> : <Clock size={12} className="mr-1" />}
                      {t.status}
                    </span>
                  </div>
                </button>
              ))}
              {tickets.length === 0 && <div className="py-8 text-center text-sm text-[var(--muted)]">No tickets yet.</div>}
            </div>
          </Card>
        </div>

        {selected && (
          <Card>
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">{selected.subject}</h2>
                <div className="text-xs text-[var(--muted)]">{selected.status}</div>
              </div>
              <span className={`badge ${selected.status === "closed" ? "text-green-300" : "text-blue-300"}`}>{selected.status}</span>
            </div>
            <div className="max-h-96 space-y-3 overflow-y-auto">
              {selected.messages.map((m: any) => (
                <div key={m.id} className={`rounded-xl border p-4 text-sm ${m.is_admin ? "border-[var(--accent)]/30 bg-[var(--accent)]/10" : "border-[var(--border)] bg-white/5"}`}>
                  <div className="mb-1 flex items-center gap-2 text-xs text-[var(--muted)]">
                    <MessageSquare size={12} /> {m.is_admin ? "Admin" : "You"} · {new Date(m.created_at).toLocaleString()}
                  </div>
                  <div>{m.body}</div>
                </div>
              ))}
            </div>
            {selected.status !== "closed" && (
              <div className="mt-4 flex gap-2">
                <input className="input" value={reply} onChange={e=>setReply(e.target.value)} placeholder="Type your reply…" onKeyDown={e=>e.key==="Enter" && sendReply()} />
                <Button onClick={sendReply}><Send size={14} /> Send</Button>
              </div>
            )}
          </Card>
        )}
      </div>
    </DashboardShell></RequireAuth>
  );
}
