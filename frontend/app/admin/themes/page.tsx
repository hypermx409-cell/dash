"use client";
import { useEffect, useState } from "react";
import { RequireAuth } from "@/components/layout/RequireAuth";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { api } from "@/lib/api";
import { Palette, Sparkles, Wand2, Trash2, Check, Plus, RefreshCw, Save, ImageIcon } from "lucide-react";

export default function AdminThemesPage() {
  const [themes, setThemes] = useState<any[]>([]);
  const [current, setCurrent] = useState<string>("");
  const [form, setForm] = useState({ name: "My Theme", primary_color: "#e11d48", accent_color: "#ff3b6b", logo_url: "", favicon_url: "", background_image_url: "", background_blur: 0 });
  const [saveName, setSaveName] = useState("My Theme");
  const [msg, setMsg] = useState("");
  const [query, setQuery] = useState("");
  const [confirmTheme, setConfirmTheme] = useState<any>(null);
  const [deleting, setDeleting] = useState(false);

  const load = async () => {
    const t = await api("/admin/themes");
    setThemes(t);
    const b = await api("/branding");
    setCurrent(b.current_theme || "");
  };
  useEffect(() => { load(); }, []);

  async function apply(id: string) {
    await api(`/admin/themes/${id}/apply`, { method: "POST" });
    setMsg("Theme applied");
    await load();
  }
  async function createTheme() {
    await api("/admin/themes", { method: "POST", body: JSON.stringify(form) });
    setMsg("Theme created");
    setForm({ ...form, name: "My Theme" });
    await load();
  }
  async function saveCurrent() {
    await api("/admin/themes/from-current", { method: "POST", body: JSON.stringify({ name: saveName }) });
    setMsg("Current branding saved as theme");
    await load();
  }
  async function remove(id: string) {
    const t = themes.find((x) => x.id === id);
    setConfirmTheme(t || { id });
  }
  async function confirmRemove() {
    if (!confirmTheme) return;
    setDeleting(true);
    try { await api(`/admin/themes/${confirmTheme.id}`, { method: "DELETE" }); setMsg("Theme deleted"); await load(); }
    catch (e: any) { setMsg(e.message); }
    finally { setDeleting(false); setConfirmTheme(null); }
  }

  const premade = themes.filter(t => t.is_system);
  const custom = themes.filter(t => !t.is_system).filter(t => !query || t.name.toLowerCase().includes(query.toLowerCase()));

  const ThemeCard = ({ t, removable = false }: { t: any; removable?: boolean }) => (
    <Card className={`group relative overflow-hidden transition ${current === t.slug ? "ring-2 ring-[var(--accent)]" : ""}`}>
      <div className="relative mb-4 h-20 overflow-hidden rounded-xl" style={{ background: `linear-gradient(135deg, color-mix(in srgb, ${t.primary_color}, black 42%) 0%, ${t.primary_color} 55%, color-mix(in srgb, ${t.primary_color}, white 28%) 100%)` }}>
        <div className="absolute inset-0 opacity-30" style={{ background: "radial-gradient(circle at 30% 20%, white, transparent 60%)" }} />
        {current === t.slug && (
          <div className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-full bg-white/90 text-green-600">
            <Check size={16} />
          </div>
        )}
      </div>
      <div className="flex items-center justify-between">
        <div>
          <div className="font-semibold">{t.name}</div>
          <div className="text-xs text-[var(--muted)]">{t.primary_color} · {t.accent_color}</div>
        </div>
        {t.is_system && <span className="badge text-blue-300">preset</span>}
      </div>
      <div className="mt-4 flex gap-2">
        <Button className="flex-1 text-xs" variant={current === t.slug ? "primary" : "ghost"} onClick={() => apply(t.id)} disabled={current === t.slug}>
          {current === t.slug ? "Applied" : "Apply theme"}
        </Button>
        {removable && (
          <button className="rounded-lg border border-[var(--border)] p-2 text-red-400 hover:bg-red-500/10" onClick={() => remove(t.id)} title="Delete">
            <Trash2 size={14} />
          </button>
        )}
      </div>
    </Card>
  );

  return (
    <RequireAuth admin><DashboardShell admin>
      <div className="space-y-8">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-3xl font-bold">Themes</h1>
            <p className="text-sm text-[var(--muted)]">One-click presets and custom branding configurations.</p>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={load}><RefreshCw size={16} /> Reload</Button>
          </div>
        </div>

        {msg && <div className="rounded-xl border border-[var(--border)] bg-white/5 p-3 text-sm">{msg}</div>}

        {/* Current theme highlight */}
        <Card className="overflow-hidden">
          <div className="flex flex-col gap-4 md:flex-row md:items-center">
            <div className="h-16 w-full rounded-xl md:w-40" style={{ background: `linear-gradient(135deg, color-mix(in srgb, ${themes.find(t=>t.slug===current)?.primary_color || "#e11d48"}, black 42%) 0%, ${themes.find(t=>t.slug===current)?.primary_color || "#e11d48"} 55%, color-mix(in srgb, ${themes.find(t=>t.slug===current)?.primary_color || "#e11d48"}, white 28%) 100%)` }} />
            <div className="flex-1">
              <div className="text-xs   text-[var(--muted)]">Current theme</div>
              <div className="text-xl font-bold">{themes.find(t=>t.slug===current)?.name || "Custom"}</div>
              <div className="text-sm text-[var(--muted)]">{current || "custom"}</div>
            </div>
            <Button variant="ghost" onClick={() => document.getElementById("create")?.scrollIntoView({ behavior: "smooth" })}>
              <Wand2 size={16} /> Create from current
            </Button>
          </div>
        </Card>

        {/* Premade */}
        <div>
          <div className="mb-4 flex items-center gap-2">
            <Sparkles size={18} className="text-[var(--accent)]" />
            <h2 className="text-lg font-semibold">Premade themes</h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {premade.map((t) => <ThemeCard key={t.id} t={t} />)}
          </div>
        </div>

        {/* Create custom */}
        <div id="create">
        <Card>
          <div className="mb-4 flex items-center gap-2">
            <Wand2 size={18} className="text-[var(--accent)]" />
            <h2 className="text-lg font-semibold">Create custom theme</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs text-[var(--muted)]">Theme name</label>
              <input className="input" value={form.name} onChange={e=>setForm({...form, name: e.target.value})} placeholder="My Brand" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs text-[var(--muted)]">Primary color</label>
                <div className="flex gap-2">
                  <input className="input w-12 px-1" type="color" value={form.primary_color} onChange={e=>setForm({...form, primary_color: e.target.value})} />
                  <input className="input" value={form.primary_color} onChange={e=>setForm({...form, primary_color: e.target.value})} />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs text-[var(--muted)]">Accent color</label>
                <div className="flex gap-2">
                  <input className="input w-12 px-1" type="color" value={form.accent_color} onChange={e=>setForm({...form, accent_color: e.target.value})} />
                  <input className="input" value={form.accent_color} onChange={e=>setForm({...form, accent_color: e.target.value})} />
                </div>
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs text-[var(--muted)]">Logo URL</label>
              <div className="relative">
                <ImageIcon size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]" />
                <input className="input pl-9" value={form.logo_url} onChange={e=>setForm({...form, logo_url: e.target.value})} placeholder="https://…" />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs text-[var(--muted)]">Favicon URL</label>
              <div className="relative">
                <ImageIcon size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]" />
                <input className="input pl-9" value={form.favicon_url} onChange={e=>setForm({...form, favicon_url: e.target.value})} placeholder="https://…" />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs text-[var(--muted)]">Background image URL</label>
              <div className="relative">
                <ImageIcon size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]" />
                <input className="input pl-9" value={form.background_image_url || ""} onChange={e=>setForm({...form, background_image_url: e.target.value})} placeholder="https://…" />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs text-[var(--muted)]">Background blur (px)</label>
              <input className="input" type="number" value={form.background_blur || ""} onChange={e=>setForm({...form, background_blur: e.target.value===""?0:Number(e.target.value)})} placeholder="0" />
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            <Button onClick={createTheme}><Plus size={14} /> Create theme</Button>
          </div>
        </Card>
        </div>

        {/* Save current */}
        <Card>
          <div className="mb-3 flex items-center gap-2">
            <Palette size={18} className="text-[var(--accent)]" />
            <h2 className="text-lg font-semibold">Save current branding as theme</h2>
          </div>
          <div className="flex gap-2">
            <input className="input" value={saveName} onChange={e=>setSaveName(e.target.value)} placeholder="Theme name" />
            <Button onClick={saveCurrent}><Save size={14} /> Save</Button>
          </div>
        </Card>

        {/* Custom themes */}
        <div>
          <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-2">
              <Sparkles size={18} className="text-[var(--accent)]" />
              <h2 className="text-lg font-semibold">Your themes</h2>
            </div>
            <div className="relative">
              <ImageIcon className="hidden" />
              <input className="input w-full sm:min-w-[200px]" placeholder="Search themes…" value={query} onChange={e=>setQuery(e.target.value)} />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {custom.map((t) => <ThemeCard key={t.id} t={t} removable />)}
            {custom.length === 0 && (
              <Card className="col-span-full py-10 text-center">
                <Sparkles size={32} className="mx-auto mb-2 text-[var(--muted)]" />
                <div className="text-sm text-[var(--muted)]">No custom themes yet. Create one above or save current branding.</div>
              </Card>
            )}
          </div>
        </div>
      </div>
      <ConfirmDialog open={!!confirmTheme} title="Delete theme" message="Delete this custom theme?" confirmLabel="Delete" onConfirm={confirmRemove} onCancel={() => setConfirmTheme(null)} loading={deleting} />
    </DashboardShell></RequireAuth>
  );
}
