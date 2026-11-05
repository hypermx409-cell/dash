"use client";
import { useEffect, useState } from "react";
import { RequireAuth } from "@/components/layout/RequireAuth";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { api } from "@/lib/api";
import { Gift, Share2, Copy, Check, Sparkles, TrendingUp } from "lucide-react";

export default function RewardsPage() {
  const [rewards, setRewards] = useState<any[]>([]);
  const [ref, setRef] = useState<any>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    api("/rewards").then(setRewards).catch(()=>{});
    api("/referrals").then(setRef).catch(()=>{});
  }, []);

  const copy = () => {
    navigator.clipboard.writeText(ref?.code || "");
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <RequireAuth><DashboardShell>
      <div className="space-y-8">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-3xl font-bold">Rewards</h1>
            <p className="text-sm text-[var(--muted)]">Earn coins via referrals and reward codes.</p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Card className="relative overflow-hidden">
            <div className="absolute inset-x-0 top-0 h-1" style={{ background: "linear-gradient(90deg, var(--accent), var(--accent-2))" }} />
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--accent)]/10">
                <Share2 size={20} className="text-[var(--accent)]" />
              </div>
              <div>
                <div className="text-xs   text-[var(--muted)]">Your referral code</div>
                <div className="font-mono text-2xl font-bold ">{ref?.code || "—"}</div>
              </div>
            </div>
            <div className="mt-4 flex items-center gap-2">
              <Button variant="ghost" onClick={copy}>{copied ? <Check size={14} /> : <Copy size={14} />} {copied ? "Copied" : "Copy code"}</Button>
              <span className="text-xs text-[var(--muted)]">Referrals: {ref?.count ?? 0}</span>
            </div>
          </Card>

          <Card className="relative overflow-hidden">
            <div className="absolute inset-x-0 top-0 h-1" style={{ background: "linear-gradient(90deg, var(--accent), var(--accent-2))" }} />
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--accent)]/10">
                <TrendingUp size={20} className="text-[var(--accent)]" />
              </div>
              <div>
                <div className="text-xs   text-[var(--muted)]">Referral rewards</div>
                <div className="text-sm text-[var(--muted)]">Share your code and earn coins when friends join.</div>
              </div>
            </div>
          </Card>
        </div>

        <div>
          <div className="mb-4 flex items-center gap-2">
            <Sparkles size={18} className="text-[var(--accent)]" />
            <h2 className="text-lg font-semibold">Available rewards</h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {rewards.map((r) => (
              <Card key={r.id} className="relative overflow-hidden transition hover:border-[var(--accent)]/40">
                <div className="mb-2 flex items-center justify-between">
                  <div className="text-lg font-semibold">{r.title}</div>
                  <span className="badge text-[var(--accent)]"><Gift size={12} className="mr-1" /> {r.amount}</span>
                </div>
                <div className="text-xs text-[var(--muted)]">{r.code}</div>
                <div className="mt-3 text-sm text-[var(--muted)]">Claimed {r.claimed_count}{r.max_claims ? ` / ${r.max_claims}` : ""}</div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10">
                  <div className="h-full rounded-full" style={{ width: r.max_claims ? `${Math.min(100, (r.claimed_count / r.max_claims) * 100)}%` : "0%", background: "linear-gradient(90deg,var(--accent),var(--accent-2))" }} />
                </div>
              </Card>
            ))}
            {rewards.length === 0 && <Card className="col-span-full py-10 text-center text-sm text-[var(--muted)]">No rewards available.</Card>}
          </div>
        </div>
      </div>
    </DashboardShell></RequireAuth>
  );
}
