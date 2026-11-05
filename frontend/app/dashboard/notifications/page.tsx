"use client";
import { useEffect, useState } from "react";
import { RequireAuth } from "@/components/layout/RequireAuth";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { api } from "@/lib/api";
import { Bell, RefreshCw, Trash2, CheckCheck } from "lucide-react";

export default function NotificationsPage() {
  const [items, setItems] = useState<any[]>([]);
  const load = async () => setItems(await api("/notifications"));
  useEffect(() => { load(); }, []);
  const unread = items.filter((n) => !n.is_read).length;

  async function markRead(id: string) {
    await api(`/notifications/${id}/read`, { method: "POST" });
    await load();
  }
  async function markAll() {
    await api("/notifications/read-all", { method: "POST" });
    await load();
  }
  async function remove(id: string) {
    await api(`/notifications/${id}`, { method: "DELETE" });
    await load();
  }

  return (
    <RequireAuth><DashboardShell>
      <div className="space-y-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-3xl font-bold">Notifications</h1>
            <p className="text-sm text-[var(--muted)]">{unread} unread</p>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={markAll}><CheckCheck size={16} /> Mark all read</Button>
            <Button variant="ghost" onClick={load}><RefreshCw size={16} /> Reload</Button>
          </div>
        </div>
        <div className="space-y-3">
          {items.map((n) => (
            <Card key={n.id} className={`transition ${n.is_read ? "opacity-70" : "border-[var(--accent)]/30"}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className={`mt-0.5 flex h-9 w-9 items-center justify-center rounded-full ${n.is_read ? "bg-white/5 text-[var(--muted)]" : "bg-[var(--accent)]/15 text-[var(--accent)]"}`}>
                    <Bell size={16} />
                  </div>
                  <div>
                    <div className="font-semibold">{n.title}</div>
                    {n.body && <div className="mt-1 text-sm text-[var(--muted)]">{n.body}</div>}
                    <div className="mt-1 text-xs text-[var(--muted)]">{new Date(n.created_at).toLocaleString()}</div>
                  </div>
                </div>
                <div className="flex gap-2">
                  {!n.is_read && <button className="text-[var(--accent)] hover:underline text-xs" onClick={() => markRead(n.id)}>Mark read</button>}
                  <button className="text-red-400 hover:underline" onClick={() => remove(n.id)}><Trash2 size={14} /></button>
                </div>
              </div>
            </Card>
          ))}
          {items.length === 0 && <Card className="py-10 text-center text-sm text-[var(--muted)]">No notifications yet.</Card>}
        </div>
      </div>
    </DashboardShell></RequireAuth>
  );
}
