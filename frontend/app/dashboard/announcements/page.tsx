"use client";
import { useEffect, useState } from "react";
import { RequireAuth } from "@/components/layout/RequireAuth";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { Card } from "@/components/ui/Card";
import { api } from "@/lib/api";
import { Megaphone, RefreshCw, Bell } from "lucide-react";

export default function AnnouncementsPage() {
  const [items, setItems] = useState<any[]>([]);
  const load = async () => setItems(await api("/announcements"));
  useEffect(() => { load(); }, []);
  return (
    <RequireAuth><DashboardShell>
      <div className="space-y-8">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-3xl font-bold">Announcements</h1>
            <p className="text-sm text-[var(--muted)]">Latest platform news and updates.</p>
          </div>
          <button className="btn btn-ghost" onClick={load}><RefreshCw size={16} /> Reload</button>
        </div>
        <div className="grid gap-4">
          {items.map((a) => (
            <Card key={a.id} className="relative overflow-hidden transition hover:border-[var(--accent)]/40">
              <div className="absolute inset-x-0 top-0 h-1" style={{ background: "linear-gradient(90deg, var(--accent), var(--accent-2))" }} />
              <div className="mb-3 flex items-start gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--accent)]/10">
                  <Megaphone size={18} className="text-[var(--accent)]" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-semibold">{a.title}</div>
                  <div className="text-xs text-[var(--muted)]">{new Date(a.created_at).toLocaleString()}</div>
                </div>
                <span className="badge text-blue-300"><Bell size={12} className="mr-1" /> New</span>
              </div>
              <p className="text-sm text-[var(--muted)]">{a.body}</p>
            </Card>
          ))}
          {items.length === 0 && <Card className="py-12 text-center"><Megaphone size={32} className="mx-auto mb-3 text-[var(--muted)]" /><div className="text-sm text-[var(--muted)]">No announcements yet.</div></Card>}
        </div>
      </div>
    </DashboardShell></RequireAuth>
  );
}
