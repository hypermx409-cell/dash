"use client";
import { useEffect, useState } from "react";
import { RequireAuth } from "@/components/layout/RequireAuth";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { api } from "@/lib/api";
import { createPortal } from "react-dom";
import { Puzzle, Settings2, Save, X, Coins, Wallet, CreditCard, Share2, Gift, MessageCircle, Headphones, Megaphone, Bell, BarChart3, Wrench, Package, Link2, Timer, Plus, Trash2, RefreshCw } from "lucide-react";

const META: Record<string, { title: string; desc: string; icon: any }> = {
  coins: { title: "Coins System", desc: "Virtual currency used across rewards and payments.", icon: Coins },
  wallet: { title: "Wallet", desc: "User balances, transactions, and reward redemption.", icon: Wallet },
  payments: { title: "Payments", desc: "Payment verification and webhook processing.", icon: CreditCard },
  referrals: { title: "Referrals", desc: "Referral codes and reward attribution.", icon: Share2 },
  rewards: { title: "Rewards", desc: "Reward codes and claimable bonuses.", icon: Gift },
  discord: { title: "Discord Integration", desc: "Connected Discord accounts and bot features.", icon: MessageCircle },
  support: { title: "Support Tickets", desc: "Helpdesk tickets and admin replies.", icon: Headphones },
  announcements: { title: "Announcements", desc: "Platform-wide news and updates.", icon: Megaphone },
  notifications: { title: "Notifications", desc: "In-app notification delivery.", icon: Bell },
  analytics: { title: "Analytics", desc: "Growth and usage reporting.", icon: BarChart3 },
  maintenance: { title: "Maintenance Mode", desc: "Toggle platform maintenance state.", icon: Wrench },
  links: { title: "Links to Earn", desc: "Users complete links to earn configurable coin rewards.", icon: Link2 },
  afk: { title: "AFK Earnings", desc: "Users earn coins by staying active on the AFK page.", icon: Timer },
};

const CONFIG_HINTS: Record<string, string> = {
  links: "reward = 10",
  afk: "coins_per_interval = 5\ninterval_seconds = 60",
};

export default function AdminModulesPage() {
  const [mods, setMods] = useState<any[]>([]);
  const [configuring, setConfiguring] = useState<any>(null);
  const [configText, setConfigText] = useState("");
  const [configError, setConfigError] = useState("");
  const [msg, setMsg] = useState("");

  // Dedicated plugin config state
  const [linksCfg, setLinksCfg] = useState({ reward: 10, links: [] as any[] });
  const [afkCfg, setAfkCfg] = useState({ coins_per_interval: 5, interval_seconds: 60 });
  const load = async () => {
    const data = await api("/admin/modules");
    setMods(data);
    const links = data.find((m: any) => m.key === "links");
    const afk = data.find((m: any) => m.key === "afk");
    if (links?.config) {
      try {
        const c = JSON.parse(links.config);
        setLinksCfg({ reward: Number(c.reward || 10), links: Array.isArray(c.links) ? c.links : [] });
      } catch {}
    }
    if (afk?.config) {
      try {
        const c = JSON.parse(afk.config);
        setAfkCfg({
          coins_per_interval: Number(c.coins_per_interval || c.rate_per_minute || 5),
          interval_seconds: Number(c.interval_seconds || 60),
        });
      } catch {}
    }
  };
  useEffect(() => { load(); }, []);

  async function toggle(key: string, enabled: boolean) {
    await api(`/admin/modules/${key}`, { method: "PUT", body: JSON.stringify({ enabled }) });
    await load();
  }

  function openConfig(m: any) {
    setConfiguring(m);
    setConfigError("");
    if (!m.config) { setConfigText(""); return; }
    // show readable key=value lines
    try {
      const o = JSON.parse(m.config);
      if (o && typeof o === "object" && !Array.isArray(o)) {
        setConfigText(Object.entries(o).map(([k, v]) => Array.isArray(v) ? `${k} = ${v.join(", ")}` : `${k} = ${v}`).join("\n"));
        return;
      }
      setConfigText(String(m.config));
    } catch {
      setConfigText(String(m.config));
    }
  }

  async function saveConfig() {
    if (!configuring) return;
    setConfigError("");
    try {
      const lines = configText.split("\n").map((l) => l.trim()).filter(Boolean);
      const obj: Record<string, any> = {};
      let hasPairs = false;
      for (const line of lines) {
        const idx = line.indexOf("=");
        if (idx === -1) continue;
        const key = line.slice(0, idx).trim();
        let val: any = line.slice(idx + 1).trim();
        if (!key) continue;
        hasPairs = true;
        if (val === "true") val = true;
        else if (val === "false") val = false;
        else if (!isNaN(Number(val)) && val !== "") val = Number(val);
        else if (val.includes(",")) val = val.split(",").map((x: string) => x.trim()).filter(Boolean);
        obj[key] = val;
      }
      const payload = hasPairs ? obj : (configText.trim() || null);
      await api(`/admin/modules/${configuring.key}`, { method: "PUT", body: JSON.stringify({ config: payload }) });
      setMsg(`${configuring.key} configuration saved`);
      setConfiguring(null);
      await load();
    } catch (e: any) {
      setConfigError(e?.message || "Could not save");
    }
  }

  async function saveLinksConfig() {
        try {
      await api("/admin/modules/links", { method: "PUT", body: JSON.stringify({ enabled: mods.find(m => m.key === "links")?.enabled ?? true, config: JSON.stringify(linksCfg) }) });
      setMsg("Links configuration saved.");
      await load();
    } catch (e: any) { setMsg(e.message); }
  }
  async function saveAfkConfig() {
        try {
      await api("/admin/modules/afk", { method: "PUT", body: JSON.stringify({ enabled: mods.find(m => m.key === "afk")?.enabled ?? true, config: JSON.stringify(afkCfg) }) });
      setMsg("AFK configuration saved.");
      await load();
    } catch (e: any) { setMsg(e.message); }
  }
  function addLink() {
    setLinksCfg((c) => ({ ...c, links: [...c.links, { id: `link-${Date.now()}`, title: "New link", url: "https://example.com", reward: c.reward }] }));
  }
  function updateLink(idx: number, field: string, value: any) {
    setLinksCfg((c) => {
      const links = [...c.links];
      links[idx] = { ...links[idx], [field]: value };
      return { ...c, links };
    });
  }
  function removeLink(idx: number) {
    setLinksCfg((c) => ({ ...c, links: c.links.filter((_: any, i: number) => i !== idx) }));
  }

  const enabledCount = mods.filter((m) => m.enabled).length;

  return (
    <RequireAuth admin><DashboardShell admin>
      <div className="space-y-6">
        <div className="relative overflow-hidden rounded-2xl border border-[var(--border)] bg-[#10131a] p-7">
          <div className="relative flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-white/5 px-3 py-1 text-xs text-[var(--muted)]">
                <Puzzle size={12} className="text-[var(--accent)]" /> Feature control
              </div>
              <h1 className="text-3xl font-bold">Modules</h1>
              <p className="text-sm text-[var(--muted)]">Enable or disable platform features, and configure each plugin.</p>
            </div>
            <div className="flex gap-2">
              <span className="badge">{enabledCount} of {mods.length} enabled</span>
              <Button variant="ghost" onClick={load}><RefreshCw size={16} /> Reload</Button>
            </div>
          </div>
        </div>

        {msg && <div className="rounded-xl border border-[var(--border)] bg-white/5 p-3 text-sm">{msg}</div>}

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {mods.map((m) => {
            const meta = META[m.key] || { title: m.key, desc: "Module", icon: Package };
            return (
              <Card key={m.key} className={`relative overflow-hidden transition ${m.enabled ? "border-[var(--accent)]/30" : "opacity-75"}`}>
                <div className={`absolute inset-x-0 top-0 h-1 ${m.enabled ? "bg-[var(--accent)]" : "bg-white/10"}`} />
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-[6px] bg-white/5">
                      <meta.icon size={18} className="text-[var(--accent)]" />
                    </div>
                    <div>
                      <div className="font-semibold">{meta.title}</div>
                      <div className="text-xs text-[var(--muted)]">{m.key}</div>
                    </div>
                  </div>
                  <button onClick={() => toggle(m.key, !m.enabled)} className={`flex h-7 w-12 items-center rounded-full border border-[var(--border)] p-1 transition ${m.enabled ? "bg-[var(--accent)]" : "bg-white/10"}`}>
                    <span className={`h-5 w-5 rounded-full bg-white transition ${m.enabled ? "translate-x-5" : "translate-x-0"}`} />
                  </button>
                </div>
                <p className="mt-3 text-sm text-[var(--muted)]">{meta.desc}</p>
                {m.config && <div className="mt-2 rounded-lg border border-[var(--border)] bg-black/20 px-3 py-2 font-mono text-[11px] text-[var(--muted)] truncate">{m.config}</div>}
                <div className="mt-4 flex items-center justify-between">
                  <span className={`badge ${m.enabled ? "text-green-300" : "text-red-300"}`}>{m.enabled ? "Enabled" : "Disabled"}</span>
                  <button className="flex items-center gap-1 text-xs text-[var(--accent)] hover:underline" onClick={() => openConfig(m)}>
                    <Settings2 size={13} /> Configure
                  </button>
                </div>
              </Card>
            );
          })}
        </div>

        {configuring && typeof document !== "undefined" && createPortal(
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 p-4">
            <Card className="relative max-h-[85vh] w-full max-w-2xl overflow-y-auto">
              <div className="absolute inset-x-0 top-0 h-1" style={{ background: "linear-gradient(90deg, var(--accent), var(--accent-2))" }} />
              <div className="mb-3 flex items-center justify-between pt-2">
                <h2 className="text-lg font-semibold">Configure {configuring.key}</h2>
                <button onClick={() => setConfiguring(null)}><X size={18} /></button>
              </div>
              {configuring.key === "links" ? (
                <div className="space-y-4">
                  <div>
                    <label className="mb-1 block text-xs text-[var(--muted)]">Default reward (coins)</label>
                    <input className="input" type="number" value={linksCfg.reward} onChange={e=>setLinksCfg({...linksCfg, reward: Number(e.target.value)})} />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-medium">Links</div>
                    <Button variant="ghost" className="text-xs" onClick={addLink}><Plus size={13} /> Add link</Button>
                  </div>
                  {linksCfg.links.map((l, idx) => (
                    <div key={idx} className="rounded-xl border border-[var(--border)] bg-white/5 p-3 space-y-2">
                      <div className="grid gap-2 md:grid-cols-3">
                        <input className="input" placeholder="Title" value={l.title || ""} onChange={e=>updateLink(idx, "title", e.target.value)} />
                        <input className="input" placeholder="URL" value={l.url || ""} onChange={e=>updateLink(idx, "url", e.target.value)} />
                        <input className="input" type="number" placeholder="Reward" value={l.reward ?? linksCfg.reward} onChange={e=>updateLink(idx, "reward", Number(e.target.value))} />
                      </div>
                      <div className="flex justify-end">
                        <button className="text-red-400 text-xs hover:underline" onClick={() => removeLink(idx)}><Trash2 size={12} className="inline mr-1" />Remove</button>
                      </div>
                    </div>
                  ))}
                  {linksCfg.links.length === 0 && <div className="rounded-xl border border-dashed border-[var(--border)] bg-white/5 p-6 text-center text-xs text-[var(--muted)]">No links yet. Add one.</div>}
                </div>
              ) : configuring.key === "afk" ? (
                <div className="space-y-4">
                  <div>
                    <label className="mb-1 block text-xs text-[var(--muted)]">Coins per interval</label>
                    <input className="input" type="number" value={afkCfg.coins_per_interval} onChange={e=>setAfkCfg({...afkCfg, coins_per_interval: Number(e.target.value)})} />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-[var(--muted)]">Interval (seconds)</label>
                    <input className="input" type="number" value={afkCfg.interval_seconds} onChange={e=>setAfkCfg({...afkCfg, interval_seconds: Number(e.target.value)})} />
                  </div>
                  <div className="rounded-xl border border-[var(--border)] bg-white/5 p-3 text-xs text-[var(--muted)]">
                    Users earn <span className="font-medium text-[var(--text)]">{afkCfg.coins_per_interval} coins</span> every <span className="font-medium text-[var(--text)]">{afkCfg.interval_seconds} seconds</span> while active.
                  </div>
                </div>
              ) : (
                <>
                  <p className="mb-3 text-sm text-[var(--muted)]">Edit settings as simple lines: <span className="font-mono text-[var(--accent)]">key = value</span>.</p>
                  {CONFIG_HINTS[configuring.key] && (
                    <div className="mb-3 rounded-lg border border-[var(--border)] bg-white/5 p-2 text-xs text-[var(--muted)]">
                      <div className="font-medium text-[var(--text)]">Suggested keys for {configuring.key}:</div>
                      <pre className="mt-1 whitespace-pre-wrap font-mono">{CONFIG_HINTS[configuring.key]}</pre>
                    </div>
                  )}
                  <textarea
                    className="input h-44 font-mono text-xs leading-5 bg-black/30"
                    value={configText}
                    onChange={e=>setConfigText(e.target.value)}
                    placeholder={"max_items = 10\nnotify_admin = true\nallowed_roles = admin, moderator"}
                    spellCheck={false}
                  />
                  {configError && <div className="mt-2 text-sm text-red-400">{configError}</div>}
                </>
              )}
              <div className="mt-3 flex justify-end gap-2">
                <Button variant="ghost" onClick={() => setConfiguring(null)}>Cancel</Button>
                {configuring.key === "links" ? (
                  <Button onClick={async () => { await saveLinksConfig(); setConfiguring(null); }}><Save size={14} /> Save links config</Button>
                ) : configuring.key === "afk" ? (
                  <Button onClick={async () => { await saveAfkConfig(); setConfiguring(null); }}><Save size={14} /> Save AFK config</Button>
                ) : (
                  <Button onClick={saveConfig}><Save size={14} /> Save config</Button>
                )}
              </div>
            </Card>
          </div>,
          document.body
        )}
      </div>
    </DashboardShell></RequireAuth>
  );
}
