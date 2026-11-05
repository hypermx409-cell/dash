"use client";
import { useEffect, useState } from "react";
import { RequireAuth } from "@/components/layout/RequireAuth";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { Card, StatCard } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { api } from "@/lib/api";
import { Wallet as WalletIcon, Gift, History, Send, ArrowDownLeft, ArrowUpRight, Coins, RefreshCw } from "lucide-react";

export default function WalletPage() {
  const [wallet, setWallet] = useState<any>(null);
  const [code, setCode] = useState("");
  const [msg, setMsg] = useState("");

  const load = async () => setWallet(await api("/wallet"));
  useEffect(() => { load(); }, []);

  async function claim() {
    if (!code.trim()) { setMsg("Enter a reward code"); return; }
    try { const r = await api("/wallet/claim-reward", { method: "POST", body: JSON.stringify({ code }) }); setMsg(`Reward claimed. New balance: ${r.balance}`); await load(); }
    catch (e: any) { setMsg(e.message); }
  }

  return (
    <RequireAuth><DashboardShell>
      <div className="space-y-8">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-3xl font-bold">Wallet</h1>
            <p className="text-sm text-[var(--muted)]">Track coins and redeem rewards.</p>
          </div>
          <Button variant="ghost" onClick={load}><RefreshCw size={16} /> Reload</Button>
        </div>
        {msg && <div className="rounded-xl border border-[var(--border)] bg-white/5 p-3 text-sm">{msg}</div>}

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="relative overflow-hidden rounded-2xl border border-[var(--border)] bg-gradient-to-br from-[var(--accent)]/20 to-transparent p-6">
            <div className="text-xs   text-[var(--muted)]">Current balance</div>
            <div className="mt-2 text-4xl font-bold">{wallet?.balance ?? 0}</div>
            <div className="mt-1 text-sm text-[var(--muted)]">coins available</div>
            <Coins size={40} className="absolute bottom-4 right-4 text-[var(--accent)]/30" />
          </div>
          <StatCard label="Transactions" value={wallet?.transactions?.length ?? 0} hint="recent" />
          <StatCard label="Last activity" value={wallet?.transactions?.[0]?.amount ?? 0} hint="most recent delta" />
        </div>

        <Card>
          <div className="mb-4 flex items-center gap-2">
            <Gift size={18} className="text-[var(--accent)]" />
            <h2 className="text-lg font-semibold">Redeem reward code</h2>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <input className="input flex-1" placeholder="Enter code" value={code} onChange={e=>setCode(e.target.value)} />
            <Button onClick={claim}><Send size={14} /> Redeem</Button>
          </div>
        </Card>

        <Card>
          <div className="mb-4 flex items-center gap-2">
            <History size={18} className="text-[var(--accent)]" />
            <h2 className="text-lg font-semibold">Transaction history</h2>
          </div>
          <div className="space-y-2">
            {(wallet?.transactions || []).map((t: any) => (
              <div key={t.id} className="flex items-center justify-between rounded-xl border border-[var(--border)] bg-white/5 p-3 transition hover:border-[var(--accent)]/30">
                <div className="flex items-center gap-3">
                  <div className={`flex h-9 w-9 items-center justify-center rounded-full ${t.amount >= 0 ? "bg-green-500/15 text-green-300" : "bg-red-500/15 text-red-300"}`}>
                    {t.amount >= 0 ? <ArrowDownLeft size={16} /> : <ArrowUpRight size={16} />}
                  </div>
                  <div>
                    <div className="font-medium">{t.description || t.kind}</div>
                    <div className="text-xs text-[var(--muted)]">{new Date(t.created_at).toLocaleString()}</div>
                  </div>
                </div>
                <div className={`text-lg font-semibold ${t.amount >= 0 ? "text-green-300" : "text-red-300"}`}>
                  {t.amount > 0 ? "+" : ""}{t.amount}
                </div>
              </div>
            ))}
            {!wallet?.transactions?.length && <div className="py-8 text-center text-sm text-[var(--muted)]">No transactions yet.</div>}
          </div>
        </Card>
      </div>
    </DashboardShell></RequireAuth>
  );
}
