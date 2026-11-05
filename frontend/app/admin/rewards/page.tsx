"use client";
import { useEffect, useState } from "react";
import { RequireAuth } from "@/components/layout/RequireAuth";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { api } from "@/lib/api";
import { Coins, Gift, Plus, Trash2, RefreshCw, Check } from "lucide-react";

export default function AdminRewardsPage() {
  const [items, setItems] = useState<any[]>([]);
  const [form, setForm] = useState({ code: "", title: "", amount: 10, is_active: true, max_claims: "" as any });
  const [msg, setMsg] = useState("");

  const load = async () => setItems(await api("/admin/rewards"));
  useEffect(() => { load(); }, []);

  async function create() {
    if (!form.title.trim() && !form.code.trim()) { setMsg("Title or code required"); return; }
    const payload: any = {
      title: form.title || form.code || "Reward",
      amount: Number(form.amount),
      is_active: form.is_active,
      max_claims: form.max_claims === "" ? null : Number(form.max_claims),
    };
    if (form.code.trim()) payload.code = form.code.trim();
    await api("/admin/rewards", { method: "POST", body: JSON.stringify(payload) });
    setForm({ code: "", title: "", amount: 10, is_active: true, max_claims: "" });
    setMsg("Reward code created");
    await load();
  }

  async function toggle(id: string, value: boolean) {
    await api(`/admin/rewards/${id}`, { method: "PUT", body: JSON.stringify({ is_active: value }) });
    await load();
  }

  async function remove(id: string) {
    if (!confirm("Delete reward code?")) return;
    await api(`/admin/rewards/${id}`, { method: "DELETE" });
    await load();
  }

  return (
    <RequireAuth admin><DashboardShell admin>
      <div className="space-y-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-3xl font-bold">Rewards & Redeem Codes</h1>
            <p className="text-sm text-[var(--muted)]">Create reward codes and manage coin grants.</p>
          </div>
          <Button variant="ghost" onClick={load}><RefreshCw size={16} /> Reload</Button>
        </div>
        {msg && <div className="rounded-xl border border-[var(--border)] bg-white/5 p-3 text-sm">{msg}</div>}

        <div className="grid items-start gap-6 xl:grid-cols-[420px_1fr]">
          <Card>
            <div className="mb-4 flex items-center gap-2">
              <Plus size={18} className="text-[var(--accent)]" />
              <h2 className="text-lg font-semibold">Create redeem code</h2>
            </div>
            <div className="space-y-3">
              <input className="input" placeholder="Code (optional auto-generate)" value={form.code} onChange={e=>setForm({...form, code: e.target.value})} />
              <input className="input" placeholder="Title" value={form.title} onChange={e=>setForm({...form, title: e.target.value})} />
              <input className="input" type="number" placeholder="Coins amount" value={form.amount} onChange={e=>setForm({...form, amount: Number(e.target.value)})} />
              <input className="input" type="number" placeholder="Max claims (blank = unlimited)" value={form.max_claims} onChange={e=>setForm({...form, max_claims: e.target.value})} />
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={form.is_active} onChange={e=>setForm({...form, is_active: e.target.checked})} /> Active
              </label>
              <Button onClick={create} className="w-full"><Gift size={16} /> Create code</Button>
            </div>
          </Card>

          <Card>
            <h2 className="mb-4 text-lg font-semibold">Redeem codes</h2>
            <div className="space-y-3">
              {items.map((r) => (
                <div key={r.id} className="rounded-xl border border-[var(--border)] bg-white/5 p-4 transition hover:border-[var(--accent)]/40">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="font-semibold">{r.title}</div>
                      <div className="text-xs text-[var(--muted)]">{r.code}</div>
                    </div>
                    <span className="badge text-[var(--accent)]"><Coins size={12} className="mr-1" /> {r.amount}</span>
                  </div>
                  <div className="mt-2 flex items-center justify-between text-xs text-[var(--muted)]">
                    <span>Claimed {r.claimed_count}{r.max_claims ? ` / ${r.max_claims}` : ""}</span>
                    <div className="flex gap-2">
                      <button className="text-[var(--accent)]" onClick={() => toggle(r.id, !r.is_active)}>{r.is_active ? "Disable" : "Enable"}</button>
                      <button className="text-red-400" onClick={() => remove(r.id)}><Trash2 size={13} /></button>
                    </div>
                  </div>
                  {r.is_active && <div className="mt-1 badge text-green-300"><Check size={11} className="mr-1" /> active</div>}
                </div>
              ))}
              {items.length === 0 && <div className="py-8 text-center text-sm text-[var(--muted)]">No reward codes yet.</div>}
            </div>
          </Card>
        </div>
      </div>
    </DashboardShell></RequireAuth>
  );
}
