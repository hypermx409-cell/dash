"use client";
import { useEffect, useState } from "react";
import { RequireAuth } from "@/components/layout/RequireAuth";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { api } from "@/lib/api";
import { Megaphone, Plus, Trash2, RefreshCw, Eye, EyeOff, Search, Pin } from "lucide-react";

export default function AdminAnnouncementsPage() {
  const [items, setItems] = useState<any[]>([]);
  const [form, setForm] = useState({ title: "", body: "", is_published: true });
  const [q, setQ] = useState("");
  const [msg, setMsg] = useState("");
  const [confirmItem, setConfirmItem] = useState<any>(null);
  const [deleting, setDeleting] = useState(false);

  const load = async () => setItems(await api("/admin/announcements"));
  useEffect(() => { load(); }, []);

  async function create() {
    if (!form.title.trim() || !form.body.trim()) { setMsg("Title and body required"); return; }
    await api("/admin/announcements", { method: "POST", body: JSON.stringify(form) });
    setForm({ title: "", body: "", is_published: true });
    setMsg("Announcement created");
    await load();
  }

  async function togglePublish(a: any) {
    await api(`/admin/announcements/${a.id}`, { method: "PUT", body: JSON.stringify({ is_published: !a.is_published }) });
    await load();
  }

  async function remove(id: string) {
    const a = items.find((x) => x.id === id);
    setConfirmItem(a || { id });
  }
  async function confirmDelete() {
    if (!confirmItem) return;
    setDeleting(true);
    try { await api(`/admin/announcements/${confirmItem.id}`, { method: "DELETE" }); setMsg("Announcement deleted"); await load(); }
    catch (e: any) { setMsg(e.message); }
    finally { setDeleting(false); setConfirmItem(null); }
  }

  const filtered = items.filter((a) => !q || `${a.title} ${a.body}`.toLowerCase().includes(q.toLowerCase()));
  const publishedCount = items.filter((a) => a.is_published).length;

  return (
    <RequireAuth admin><DashboardShell admin>
      <div className="space-y-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-3xl font-bold">Announcements</h1>
            <p className="text-sm text-[var(--muted)]">Publish platform updates and targeted notices.</p>
          </div>
          <div className="flex gap-2">
            <span className="badge">{publishedCount} published</span>
            <span className="badge">{items.length - publishedCount} drafts</span>
            <Button variant="ghost" onClick={load}><RefreshCw size={16} /> Reload</Button>
          </div>
        </div>
        {msg && <div className="rounded-xl border border-[var(--border)] bg-white/5 p-3 text-sm">{msg}</div>}

        <div className="grid gap-6 xl:grid-cols-[420px_1fr]">
          <Card>
            <div className="mb-4 flex items-center gap-2">
              <Plus size={18} className="text-[var(--accent)]" />
              <h2 className="text-lg font-semibold">Create announcement</h2>
            </div>
            <div className="space-y-3">
              <input className="input" placeholder="Title" value={form.title} onChange={e=>setForm({...form, title: e.target.value})} />
              <textarea className="input" rows={5} placeholder="Body" value={form.body} onChange={e=>setForm({...form, body: e.target.value})} />
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={form.is_published} onChange={e=>setForm({...form, is_published: e.target.checked})} />
                Publish immediately
              </label>
              <Button onClick={create} className="w-full"><Megaphone size={16} /> Publish announcement</Button>
            </div>
          </Card>

          <Card>
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="text-lg font-semibold">All announcements</h2>
              <div className="relative w-full sm:w-auto">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]" />
                <input className="input w-full pl-9 sm:min-w-[200px]" placeholder="Search…" value={q} onChange={e=>setQ(e.target.value)} />
              </div>
            </div>
            <div className="space-y-3">
              {filtered.map((a) => (
                <div key={a.id} className="rounded-xl border border-[var(--border)] bg-white/5 p-4 transition hover:border-[var(--accent)]/40">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Megaphone size={15} className="text-[var(--accent)]" />
                        <span className="font-semibold">{a.title}</span>
                        <span className={`badge ${a.is_published ? "text-green-300" : "text-yellow-300"}`}>{a.is_published ? "published" : "draft"}</span>
                      </div>
                      <p className="mt-2 text-sm text-[var(--muted)]">{a.body}</p>
                      <div className="mt-2 text-xs text-[var(--muted)]">{new Date(a.created_at).toLocaleString()}</div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button className="btn btn-ghost text-xs" onClick={() => togglePublish(a)}>
                        {a.is_published ? <EyeOff size={14} /> : <Eye size={14} />}
                        {a.is_published ? "Unpublish" : "Publish"}
                      </button>
                      <button className="text-red-400 hover:underline" onClick={() => remove(a.id)}><Trash2 size={14} /></button>
                    </div>
                  </div>
                </div>
              ))}
              {filtered.length === 0 && <div className="py-8 text-center text-sm text-[var(--muted)]">No announcements found.</div>}
            </div>
          </Card>
        </div>
      </div>
      <ConfirmDialog open={!!confirmItem} title="Delete announcement" message="Delete this announcement?" confirmLabel="Delete" onConfirm={confirmDelete} onCancel={() => setConfirmItem(null)} loading={deleting} />
    </DashboardShell></RequireAuth>
  );
}
