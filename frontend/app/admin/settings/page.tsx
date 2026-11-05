"use client";
import { useEffect, useState } from "react";
import { RequireAuth } from "@/components/layout/RequireAuth";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { api } from "@/lib/api";
import { Settings as SettingsIcon, Palette, Image as ImageIcon, Globe, Shield, Eye, Save, RefreshCw } from "lucide-react";

const LABELS: Record<string, { label: string; desc: string }> = {
  max_servers_per_user: { label: "Max servers per user", desc: "How many servers a single account may own." },
  registration_enabled: { label: "Registration enabled", desc: "Allow new users to sign up." },
  claims_enabled: { label: "Claims enabled", desc: "Allow users to claim server plans." },
  maintenance_mode: { label: "Maintenance mode", desc: "Restrict user actions while maintenance is active." },
  default_currency: { label: "Default currency", desc: "Display currency for plans and wallet." },
  app_name: { label: "App name", desc: "Brand name shown across the dashboard." },
  primary_color: { label: "Primary color", desc: "Main accent color used throughout the UI." },
};

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<any[]>([]);
  const [branding, setBranding] = useState<any>({});
  const [msg, setMsg] = useState("");
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const s = await api("/admin/settings");
    setSettings(s);
    const b = await api("/admin/branding");
    setBranding(b || {});
  };
  useEffect(() => { load(); }, []);

  async function updateSetting(key: string, value: string) {
    await api(`/admin/settings/${key}`, { method: "PUT", body: JSON.stringify({ value }) });
    await load();
  }

  async function saveBranding() {
    setSaving(true); setMsg("");
    try {
      await api("/admin/branding", { method: "PUT", body: JSON.stringify(branding) });
      setMsg("Branding saved");
      await load();
    } catch (e: any) { setMsg(e.message); }
    finally { setSaving(false); }
  }

  const bind = (k: string) => ({
    value: branding[k] ?? "",
    onChange: (e: any) => setBranding((b: any) => ({ ...b, [k]: e.target.value })),
  });

  const primary = branding.primary_color || "#e11d48";
  const accent = branding.accent_color || "#ff3b6b";
  const appName = branding.app_name || "EUPHORIA PANEL";

  return (
    <RequireAuth admin><DashboardShell admin>
      <div className="space-y-8">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-3xl font-bold">Settings & Branding</h1>
            <p className="text-sm text-[var(--muted)]">Control platform behaviour and visual identity.</p>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={load}><RefreshCw size={16} /> Reload</Button>
            <Button onClick={saveBranding} disabled={saving}><Save size={16} /> {saving ? "Saving…" : "Save branding"}</Button>
          </div>
        </div>

        {msg && <div className="rounded-xl border border-[var(--border)] bg-white/5 p-3 text-sm">{msg}</div>}

        {/* Live preview */}
        <Card className="overflow-hidden">
          <div className="mb-4 flex items-center gap-2">
            <Eye size={18} className="text-[var(--accent)]" />
            <h2 className="text-lg font-semibold">Live preview</h2>
          </div>
          <div className="rounded-2xl border border-[var(--border)] bg-gradient-to-br from-black/60 to-black/20 p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl font-bold text-white" style={{ background: `linear-gradient(135deg, ${primary}, ${accent})` }}>
                {(appName || "D").charAt(0)}
              </div>
              <div>
                <div className="font-bold ">{appName}</div>
                <div className="text-xs text-[var(--muted)]">Hosting Dashboard</div>
              </div>
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              <button className="btn btn-primary" style={{ background: `linear-gradient(135deg, ${primary}, ${accent})` }}>Primary action</button>
              <button className="btn btn-ghost">Secondary</button>
            </div>
            <div className="mt-5 h-2 rounded-full" style={{ background: `linear-gradient(90deg, ${primary}, ${accent})` }} />
          </div>
        </Card>

        <div className="grid gap-6 xl:grid-cols-[1fr_420px]">
          {/* Platform settings */}
          <Card>
            <div className="mb-4 flex items-center gap-2">
              <Shield size={18} className="text-[var(--accent)]" />
              <h2 className="text-lg font-semibold">Platform settings</h2>
            </div>
            <div className="divide-y divide-[var(--border)]">
              {settings.map((s) => {
                const meta = LABELS[s.key];
                const boolVal = s.value === "true" || s.value === "false";
                return (
                  <div key={s.key} className="flex flex-col gap-3 py-4 md:flex-row md:items-center md:justify-between">
                    <div className="max-w-lg">
                      <div className="font-medium">{meta?.label || s.key}</div>
                      <div className="text-xs text-[var(--muted)]">{meta?.desc || "Platform configuration value."}</div>
                      <div className="mt-1 font-mono text-[10px] text-[var(--muted)]">{s.key}</div>
                    </div>
                    {boolVal ? (
                      <button
                        onClick={() => updateSetting(s.key, s.value === "true" ? "false" : "true")}
                        className={`flex h-8 w-14 items-center rounded-full border border-[var(--border)] p-1 transition ${s.value === "true" ? "bg-[var(--accent)]" : "bg-white/10"}`}
                      >
                        <span className={`h-6 w-6 rounded-full bg-white transition ${s.value === "true" ? "translate-x-6" : "translate-x-0"}`} />
                      </button>
                    ) : (
                      <input
                        className="input md:w-64"
                        defaultValue={s.value ?? ""}
                        onBlur={e => {
                          if (e.target.value !== (s.value ?? "")) updateSetting(s.key, e.target.value);
                        }}
                      />
                    )}
                  </div>
                );
              })}
              {settings.length === 0 && <div className="py-6 text-center text-sm text-[var(--muted)]">No settings available.</div>}
            </div>
          </Card>

          {/* Branding */}
          <Card>
            <div className="mb-4 flex items-center gap-2">
              <Palette size={18} className="text-[var(--accent)]" />
              <h2 className="text-lg font-semibold">Branding</h2>
            </div>
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-xs text-[var(--muted)]">Application name</label>
                <input className="input" {...bind("app_name")} placeholder="DASH0" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs text-[var(--muted)]">Primary color</label>
                  <div className="flex gap-2">
                    <input className="input w-14 px-1" type="color" {...bind("primary_color")} />
                    <input className="input" {...bind("primary_color")} placeholder="#e11d48" />
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-xs text-[var(--muted)]">Accent color</label>
                  <div className="flex gap-2">
                    <input className="input w-14 px-1" type="color" {...bind("accent_color")} />
                    <input className="input" {...bind("accent_color")} placeholder="#ff3b6b" />
                  </div>
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs text-[var(--muted)]">Logo URL</label>
                <div className="relative">
                  <ImageIcon size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]" />
                  <input className="input pl-9" {...bind("logo_url")} placeholder="https://…/logo.png" />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs text-[var(--muted)]">Favicon URL</label>
                <div className="relative">
                  <Globe size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]" />
                  <input className="input pl-9" {...bind("favicon_url")} placeholder="https://…/favicon.ico" />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs text-[var(--muted)]">Background image URL</label>
                <div className="relative">
                  <ImageIcon size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]" />
                  <input className="input pl-9" {...bind("background_image_url")} placeholder="https://…/background.jpg" />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs text-[var(--muted)]">Background blur (px)</label>
                <input className="input" type="number" {...bind("background_blur")} placeholder="0" />
              </div>

              {branding.logo_url && branding.logo_url !== "None" && (
                <div className="rounded-xl border border-[var(--border)] bg-white/5 p-3">
                  <div className="mb-2 text-xs text-[var(--muted)]">Logo preview</div>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={branding.logo_url} alt="logo" className="max-h-12" onError={(e)=>{(e.target as HTMLImageElement).style.display='none';}} />
                </div>
              )}

              <div className="rounded-xl border border-[var(--border)] bg-white/5 p-3 text-xs text-[var(--muted)]">
                Changes here update the persisted branding. The frontend loads branding on load and polls for updates. Use <span className="font-medium">Themes</span> for one-click presets.
              </div>
            </div>
          </Card>
        </div>
      </div>
    </DashboardShell></RequireAuth>
  );
}
