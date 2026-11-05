"use client";
import { useEffect, useState } from "react";
import { RequireAuth } from "@/components/layout/RequireAuth";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { api } from "@/lib/api";
import { Package, Rocket, Server, Check, Loader2, History } from "lucide-react";

export default function ClaimPage() {
  const [plans, setPlans] = useState<any[]>([]);
  const [claims, setClaims] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);
  const [serverName, setServerName] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  const load = async () => {
    const [p, c] = await Promise.all([api("/plans"), api("/claims")]);
    setPlans(p); setClaims(c);
  };
  useEffect(() => { load(); const t = setInterval(async () => { const c = await api("/claims").catch(()=>null); if (c) setClaims(c); }, 3000); return () => clearInterval(t); }, []);

  async function claim() {
    if (!selected) return;
    setLoading(true); setMsg("");
    try {
      const res = await api("/claims", { method: "POST", body: JSON.stringify({ plan_id: selected.id, server_name: serverName || undefined }) });
      setMsg(`Claim submitted: ${res.claim_id.slice(0, 8)}`);
      await load();
    } catch (e: any) { setMsg(e.message); }
    finally { setLoading(false); }
  }

  return (
    <RequireAuth><DashboardShell>
      <div className="space-y-8">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-3xl font-bold">Claim Server</h1>
            <p className="text-sm text-[var(--muted)]">Choose a plan and get it provisioned instantly.</p>
          </div>
          <div className="rounded-full border border-[var(--border)] bg-white/5 px-4 py-2 text-xs text-[var(--muted)]">
            {plans.length} plans available
          </div>
        </div>
        {msg && <div className="rounded-xl border border-[var(--border)] bg-white/5 p-3 text-sm">{msg}</div>}

        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {plans.map((p) => (
            <Card key={p.id} className={`relative overflow-hidden transition ${selected?.id === p.id ? "ring-2 ring-[var(--accent)]" : "hover:border-[var(--accent)]/40"}`}>
              <div className="absolute inset-x-0 top-0 h-1" style={{ background: selected?.id === p.id ? "linear-gradient(90deg,var(--accent),var(--accent-2))" : "rgba(255,255,255,0.1)" }} />
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <div className="text-lg font-semibold">{p.name}</div>
                  <div className="text-xs text-[var(--muted)]">/{p.slug}</div>
                </div>
                {p.available_stock !== null && <span className="badge">stock {p.available_stock}</span>}
              </div>
              {p.description && <p className="mb-3 text-sm text-[var(--muted)]">{p.description}</p>}
              <div className="space-y-2">
                {[
                  ["RAM", `${p.ram_mb} MB`],
                  ["CPU", `${p.cpu_percent}%`],
                  ["Disk", `${p.disk_mb} MB`],
                  ["Swap", `${p.swap_mb} MB`],
                  ["Allocations", `${p.allocations}`],
                  ["Price", `${p.price_cents} ${p.currency}`],
                ].map(([k, v]) => (
                  <div key={k} className="flex items-center justify-between text-sm">
                    <span className="text-[var(--muted)]">{k}</span>
                    <span className="font-medium">{v}</span>
                  </div>
                ))}
              </div>
              <Button className="mt-4 w-full" variant={selected?.id === p.id ? "primary" : "ghost"} onClick={() => setSelected(p)} disabled={p.available_stock === 0}>
                {selected?.id === p.id ? <><Check size={14} /> Selected</> : "Select plan"}
              </Button>
            </Card>
          ))}
        </div>

        {plans.length === 0 && (
          <Card className="py-12 text-center">
            <Package size={32} className="mx-auto mb-3 text-[var(--muted)]" />
            <div className="text-lg font-semibold">No plans available</div>
            <p className="mt-1 text-sm text-[var(--muted)]">Ask an admin to publish hosting plans.</p>
          </Card>
        )}

        {selected && (
          <Card>
            <div className="mb-4 flex items-center gap-2">
              <Rocket size={18} className="text-[var(--accent)]" />
              <h2 className="text-lg font-semibold">Claim {selected.name}</h2>
            </div>
            <div className="grid gap-4 md:grid-cols-[1fr_auto]">
              <input className="input" placeholder="Server name (optional)" value={serverName} onChange={e=>setServerName(e.target.value)} />
              <Button onClick={claim} disabled={loading}>
                {loading ? <Loader2 size={16} className="animate-spin" /> : <Rocket size={16} />}
                {loading ? "Submitting…" : "Confirm claim"}
              </Button>
            </div>
          </Card>
        )}

        <Card>
          <div className="mb-4 flex items-center gap-2">
            <History size={18} className="text-[var(--accent)]" />
            <h2 className="text-lg font-semibold">Claim history</h2>
          </div>
          <div className="space-y-3">
            {claims.map((c) => (
              <div key={c.id} className="flex flex-col gap-2 rounded-xl border border-[var(--border)] bg-white/5 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <div className="font-medium">{c.plan_name || c.plan_id}</div>
                  <div className="text-xs text-[var(--muted)]">{c.id.slice(0, 8)} · {new Date(c.created_at).toLocaleString()}</div>
                </div>
                <span className={`badge ${c.status === "completed" ? "text-green-300" : c.status === "failed" ? "text-red-300" : c.status === "pending" ? "text-yellow-300" : "text-blue-300"}`}>{c.status}</span>
              </div>
            ))}
            {claims.length === 0 && <div className="py-6 text-center text-sm text-[var(--muted)]">No claims yet.</div>}
          </div>
        </Card>
      </div>
    </DashboardShell></RequireAuth>
  );
}
