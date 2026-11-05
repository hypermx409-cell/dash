"use client";
import { useEffect, useState } from "react";
import { RequireAuth } from "@/components/layout/RequireAuth";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { api } from "@/lib/api";
import { Save, Plug, RefreshCw } from "lucide-react";

function Field({ label, value, onChange, type = "text", placeholder }: any) {
  return (
    <div>
      <label className="mb-1 block text-xs text-[var(--muted)]">{label}</label>
      <input className="input" type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} />
    </div>
  );
}

export default function AdminPteroPage() {
  const [form, setForm] = useState<any>({
    panel_url: "",
    api_key: "",
    default_node_id: "",
    default_location_id: "",
    default_egg_id: "",
    default_nest_id: "",
    default_allocation_id: "",
  });
  const [status, setStatus] = useState<any>(null);
  const [nodes, setNodes] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [nests, setNests] = useState<any[]>([]);
  const [selectedNest, setSelectedNest] = useState<number | null>(null);
  const [eggs, setEggs] = useState<any[]>([]);
  const [msg, setMsg] = useState("");

  const load = async () => {
    try {
      const s = await api("/admin/pterodactyl/settings");
      setStatus(s);
      setForm((f: any) => ({
        ...f,
        panel_url: s.panel_url || "",
        default_node_id: s.default_node_id ?? "",
        default_location_id: s.default_location_id ?? "",
        default_egg_id: s.default_egg_id ?? "",
        default_nest_id: s.default_nest_id ?? "",
        default_allocation_id: s.default_allocation_id ?? "",
      }));
    } catch (e: any) { setMsg(e.message); }
  };
  useEffect(() => { load(); }, []);

  async function save() {
    setMsg("");
    try {
      const payload: any = {
        panel_url: form.panel_url,
        api_key: form.api_key,
        default_node_id: form.default_node_id === "" ? "" : Number(form.default_node_id),
        default_location_id: form.default_location_id === "" ? "" : Number(form.default_location_id),
        default_egg_id: form.default_egg_id === "" ? "" : Number(form.default_egg_id),
        default_nest_id: form.default_nest_id === "" ? "" : Number(form.default_nest_id),
        default_allocation_id: form.default_allocation_id === "" ? "" : Number(form.default_allocation_id),
      };
      const r = await api("/admin/pterodactyl/settings", { method: "PUT", body: JSON.stringify(payload) });
      setMsg(`Saved. Configured: ${r.configured}`);
      setForm((f: any) => ({ ...f, api_key: "" }));
      await load();
      // refresh lists
      try { setNodes(await api("/admin/pterodactyl/nodes")); } catch {}
      try { setLocations(await api("/admin/pterodactyl/locations")); } catch {}
      try { setNests(await api("/admin/pterodactyl/nests")); } catch {}
    } catch (e: any) { setMsg(e.message); }
  }

  async function test() {
    try {
      const r = await api("/admin/pterodactyl/test", { method: "POST" });
      setStatus((s: any) => ({ ...s, connected: r.connected }));
      setMsg(r.connected ? "Connection successful" : "Connection failed");
    } catch (e: any) { setMsg(e.message); }
  }

  async function loadEggs(id: number) {
    setSelectedNest(id);
    try { setEggs(await api(`/admin/pterodactyl/nests/${id}/eggs`)); } catch (e: any) { setMsg(e.message); }
  }

  return (
    <RequireAuth admin><DashboardShell admin>
      <div className="space-y-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-3xl font-bold">Pterodactyl Settings</h1>
            <p className="text-sm text-[var(--muted)]">Connect your panel and defaults directly from the dashboard.</p>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={load}><RefreshCw size={16} /> Reload</Button>
            <Button onClick={save}><Save size={16} /> Save</Button>
          </div>
        </div>

        {msg && <div className="rounded-xl border border-[var(--border)] bg-white/5 p-3 text-sm">{msg}</div>}

        <Card>
          <div className="mb-3 flex items-center gap-2 text-sm">
            <Plug size={16} className="text-[var(--accent)]" />
            Status: <span className="font-medium">{status?.configured ? "Configured" : "Not configured"}</span>
            {status?.has_api_key && <span className="text-[var(--muted)]">(key …{status.api_key_last4})</span>}
            {status?.connected !== undefined && <span className="text-[var(--muted)]">· Connected: {String(status.connected)}</span>}
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="md:col-span-2">
              <Field label="Panel URL" value={form.panel_url} onChange={(v: string)=>setForm({...form, panel_url: v})} placeholder="https://panel.example.com" />
            </div>
            <div className="md:col-span-2">
              <Field label="Application API Key (leave blank to keep existing)" value={form.api_key} onChange={(v: string)=>setForm({...form, api_key: v})} type="password" placeholder="ptla_..." />
            </div>
            <Field label="Default node ID" value={form.default_node_id} onChange={(v: string)=>setForm({...form, default_node_id: v})} placeholder="1" />
            <Field label="Default location ID" value={form.default_location_id} onChange={(v: string)=>setForm({...form, default_location_id: v})} placeholder="1" />
            <Field label="Default nest ID" value={form.default_nest_id} onChange={(v: string)=>setForm({...form, default_nest_id: v})} placeholder="1" />
            <Field label="Default egg ID" value={form.default_egg_id} onChange={(v: string)=>setForm({...form, default_egg_id: v})} placeholder="1" />
            <Field label="Default allocation ID" value={form.default_allocation_id} onChange={(v: string)=>setForm({...form, default_allocation_id: v})} placeholder="1" />
          </div>
          <div className="mt-4 flex gap-2">
            <Button onClick={save}><Save size={16} /> Save settings</Button>
            <Button variant="ghost" onClick={test}><Plug size={16} /> Test connection</Button>
          </div>
        </Card>

        <Card>
          <div className="flex items-center gap-2">
            <Plug size={18} className="text-[var(--accent)]" />
            <div>
              <h2 className="font-semibold">Connection health</h2>
              <p className="text-xs text-[var(--muted)]">Save your credentials, then use Test connection to validate the panel. Node, egg, nest and allocation discovery now happens automatically during server provisioning using your defaults.</p>
            </div>
          </div>
          <div className="mt-4 rounded-xl border border-[var(--border)] bg-white/5 p-4 text-sm text-[var(--muted)]">
            <div>• Default node, egg, nest and allocation IDs guide automated provisioning.</div>
            <div className="mt-1">• Leave allocation ID blank to auto-select an available allocation on the node.</div>
            <div className="mt-1">• The API key is stored securely and never sent back to the browser in full.</div>
          </div>
        </Card>
      </div>
    </DashboardShell></RequireAuth>
  );
}
