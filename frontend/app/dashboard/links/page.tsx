"use client";
import { useEffect, useRef, useState } from "react";
import { RequireAuth } from "@/components/layout/RequireAuth";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Link2, ExternalLink, Check, RefreshCw, Clock } from "lucide-react";

type LinkToken = { token: string; wait: number; expiresAt: number };

export default function LinksPage() {
  const { refresh } = useAuth();
  const [mod, setMod] = useState<any>(null);
  const [links, setLinks] = useState<any[]>([]);
  const [reward, setReward] = useState<number>(10);
  const [msg, setMsg] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [tokens, setTokens] = useState<Record<string, LinkToken>>({});
  const [now, setNow] = useState(Date.now());
  const [claimed, setClaimed] = useState<Record<string, boolean>>({});

  const load = async () => {
    const m = await api("/modules/links");
    setMod(m);
    if (m?.config) {
      setLinks(Array.isArray(m.config.links) ? m.config.links : []);
      setReward(Number(m.config.reward || 10));
    } else {
      setLinks([]); setReward(10);
    }
  };
  useEffect(() => { load(); const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);

  function remainingFor(id: string): number {
    const t = tokens[id];
    if (!t) return 0;
    return Math.max(0, Math.ceil((t.expiresAt - now) / 1000));
  }

  async function start(link: any) {
    setBusyId(link.id);
    setMsg("");
    try {
      const res = await api("/links/start", { method: "POST", body: JSON.stringify({ link_id: link.id }) });
      if (link.url) window.open(link.url, "_blank", "noopener,noreferrer");
      setTokens((prev) => ({ ...prev, [link.id]: { token: res.token, wait: res.wait_seconds, expiresAt: Date.now() + res.wait_seconds * 1000 } }));
      setMsg(`Opened. Wait ${res.wait_seconds}s before claiming.`);
    } catch (e: any) { setMsg(e.message); }
    finally { setBusyId(null); }
  }

  async function claim(link: any) {
    const t = tokens[link.id];
    if (!t) return;
    setBusyId(link.id);
    setMsg("");
    try {
      const res = await api("/links/complete", { method: "POST", body: JSON.stringify({ token: t.token }) });
      if (res.already_claimed) setMsg(`${link.title || link.id}: already claimed.`);
      else { setMsg(`Earned ${res.reward} coins. Balance: ${res.balance}`); setClaimed((c) => ({ ...c, [link.id]: true })); }
      await refresh();
    } catch (e: any) { setMsg(e.message); }
    finally { setBusyId(null); }
  }

  const waitSeconds = Number(mod?.config?.wait_seconds || 15);

  return (
    <RequireAuth><DashboardShell>
      <div className="space-y-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-3xl font-bold">Links to Earn</h1>
            <p className="text-sm text-[var(--muted)]">Open a link, wait {waitSeconds}s, then claim your reward.</p>
          </div>
          <Button variant="ghost" onClick={load}><RefreshCw size={16} /> Reload</Button>
        </div>
        {msg && <div className="rounded-xl border border-[var(--border)] bg-white/5 p-3 text-sm">{msg}</div>}
        {!mod?.enabled && <div className="rounded-xl border border-yellow-500/30 bg-yellow-500/10 p-3 text-sm text-yellow-200">Links module is disabled.</div>}

        <div className="grid gap-4 md:grid-cols-2">
          {links.map((l) => {
            const t = tokens[l.id];
            const remaining = remainingFor(l.id);
            const isClaimed = claimed[l.id] || false;
            const linkReward = Number(l.reward ?? reward);
            return (
              <Card key={l.id} className="transition hover:border-[var(--accent)]/40">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-semibold">{l.title || l.id}</div>
                  </div>
                  <span className="badge text-[var(--accent)]">+{linkReward}</span>
                </div>
                <div className="mt-4 flex flex-col gap-2">
                  {!t && !isClaimed && (
                    <Button className="w-full" onClick={() => start(l)} disabled={busyId === l.id || !mod?.enabled}>
                      {busyId === l.id ? "Starting…" : <><ExternalLink size={14} className="mr-1" /> Start link</>}
                    </Button>
                  )}
                  {t && !isClaimed && (
                    <>
                      <div className="rounded-lg border border-[var(--border)] bg-white/5 p-2 text-center text-xs text-[var(--muted)]">
                        {remaining > 0 ? <span><Clock size={12} className="inline mr-1" /> Wait {remaining}s before claiming</span> : <span className="text-green-300">Ready to claim</span>}
                      </div>
                      <Button className="w-full" onClick={() => claim(l)} disabled={busyId === l.id || remaining > 0}>
                        {busyId === l.id ? "Claiming…" : <><Check size={14} className="mr-1" /> Claim reward</>}
                      </Button>
                    </>
                  )}
                  {isClaimed && (
                    <div className="rounded-lg border border-green-500/30 bg-green-500/10 p-2 text-center text-xs text-green-300">Reward claimed</div>
                  )}
                </div>
              </Card>
            );
          })}
          {links.length === 0 && <Card className="py-10 text-center text-sm text-[var(--muted)]">No links configured. Admin must add links in Modules.</Card>}
        </div>
      </div>
    </DashboardShell></RequireAuth>
  );
}
