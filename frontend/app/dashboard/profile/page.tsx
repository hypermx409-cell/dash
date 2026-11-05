"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { RequireAuth } from "@/components/layout/RequireAuth";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { User, Shield, Lock, Save, Eye, EyeOff, MessageCircle, Link as LinkIcon } from "lucide-react";

export default function ProfilePage() {
  const { user, refresh } = useAuth();
  const router = useRouter();
  const [form, setForm] = useState({ display_name: "", username: "" });
  const [pw, setPw] = useState({ old_password: "", new_password: "", show: false });
  const [msg, setMsg] = useState("");
  const [discordCfg, setDiscordCfg] = useState<any>(null);
  const [discordLoading, setDiscordLoading] = useState(false);

  useEffect(() => {
    if (user) setForm({ display_name: (user as any).display_name || "", username: user.username });
    loadDiscord();
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const d = params.get("discord");
      if (d === "success") { setMsg("Discord linked successfully. Reward credited if eligible."); refresh(); }
      else if (d === "invalid" || d === "error" || d === "mismatch") { setMsg("Discord linking failed or account mismatch."); }
      if (d) {
        params.delete("discord");
        router.replace(window.location.pathname + (params.toString() ? "?" + params.toString() : ""));
      }
    }
  }, [user, router]);

  async function loadDiscord() {
    try { setDiscordCfg(await api("/discord/config")); } catch {}
  }
  async function connectDiscord() {
    setDiscordLoading(true);
    try {
      const res = await api("/discord/authorize");
      if (res.url) window.location.href = res.url;
    } catch (e: any) { setMsg(e.message); }
    finally { setDiscordLoading(false); }
  }

  async function save() {
    await api("/me/profile", { method: "PUT", body: JSON.stringify(form) });
    await refresh();
    setMsg("Profile updated");
  }
  async function changePw() {
    await api("/me/change-password", { method: "POST", body: JSON.stringify({ old_password: pw.old_password, new_password: pw.new_password }) });
    setPw({ old_password: "", new_password: "", show: false });
    setMsg("Password changed");
  }

  return (
    <RequireAuth><DashboardShell>
      <div className="space-y-8">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-3xl font-bold">Profile</h1>
            <p className="text-sm text-[var(--muted)]">Manage your personal information and security.</p>
          </div>
        </div>
        {msg && <div className="rounded-xl border border-[var(--border)] bg-white/5 p-3 text-sm">{msg}</div>}

        <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
          <Card>
            <div className="mb-4 flex items-center gap-2">
              <User size={18} className="text-[var(--accent)]" />
              <h2 className="text-lg font-semibold">Personal information</h2>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs text-[var(--muted)]">Display name</label>
                <input className="input" value={form.display_name} onChange={e=>setForm({...form, display_name: e.target.value})} />
              </div>
              <div>
                <label className="mb-1 block text-xs text-[var(--muted)]">Username</label>
                <input className="input" value={form.username} onChange={e=>setForm({...form, username: e.target.value})} />
              </div>
            </div>
            <Button className="mt-4" onClick={save}><Save size={14} /> Save changes</Button>
          </Card>

          <Card>
            <div className="mb-4 flex items-center gap-2">
              <Shield size={18} className="text-[var(--accent)]" />
              <h2 className="text-lg font-semibold">Account</h2>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between border-b border-[var(--border)] pb-2"><span className="text-[var(--muted)]">Email</span><span>{user?.email}</span></div>
              <div className="flex justify-between border-b border-[var(--border)] pb-2"><span className="text-[var(--muted)]">Role</span><span>{user?.role}</span></div>
              <div className="flex justify-between"><span className="text-[var(--muted)]">Balance</span><span>{user?.balance}</span></div>
            </div>
          </Card>

          <Card className="md:col-span-2">
            <div className="mb-4 flex items-center gap-2">
              <Lock size={18} className="text-[var(--accent)]" />
              <h2 className="text-lg font-semibold">Security</h2>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <input className="input" type={pw.show ? "text" : "password"} placeholder="Old password" value={pw.old_password} onChange={e=>setPw({...pw, old_password: e.target.value})} />
              <input className="input" type={pw.show ? "text" : "password"} placeholder="New password" value={pw.new_password} onChange={e=>setPw({...pw, new_password: e.target.value})} />
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <Button onClick={changePw}><Lock size={14} /> Update password</Button>
              <button className="text-sm text-[var(--muted)] hover:text-[var(--text)]" onClick={()=>setPw({...pw, show: !pw.show})}>
                {pw.show ? <EyeOff size={14} className="inline mr-1" /> : <Eye size={14} className="inline mr-1" />}
                {pw.show ? "Hide" : "Show"}
              </button>
            </div>
          </Card>

          <Card className="md:col-span-2">
            <div className="mb-4 flex items-center gap-2">
              <MessageCircle size={18} className="text-[var(--accent)]" />
              <h2 className="text-lg font-semibold">Discord verification</h2>
            </div>
            {discordCfg?.linked ? (
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-sm">
                  <div className="font-medium">Linked Discord ID</div>
                  <div className="text-[var(--muted)]">{discordCfg.discord_id}</div>
                </div>
                <span className="badge text-green-300">Verified</span>
              </div>
            ) : (
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-sm text-[var(--muted)]">
                  {discordCfg?.configured ? "Link your Discord to earn a one-time reward." : "Discord integration is not configured by admin yet."}
                </div>
                <Button onClick={connectDiscord} disabled={!discordCfg?.configured || discordLoading}>
                  <LinkIcon size={14} /> {discordLoading ? "Redirecting…" : "Connect Discord"}
                </Button>
              </div>
            )}
            {discordCfg && <div className="mt-3 text-xs text-[var(--muted)]">Reward if eligible: {discordCfg.reward} coins.</div>}
          </Card>
        </div>
      </div>
    </DashboardShell></RequireAuth>
  );
}
