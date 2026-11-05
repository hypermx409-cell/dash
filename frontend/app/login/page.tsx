"use client";
import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { useBranding } from "@/lib/theme";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Mail, Lock, Eye, EyeOff, ArrowRight, ShieldCheck } from "lucide-react";

export default function LoginPage() {
  const { login } = useAuth();
  const { branding } = useBranding();
  const router = useRouter();
  const appName = branding?.app_name || "EUPHORIA PANEL";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(""); setLoading(true);
    try { await login(email, password); router.push("/dashboard"); }
    catch (e: any) { setErr(e.message); }
    finally { setLoading(false); }
  }

  return (
    <div className="min-h-screen">
      <div className="grid min-h-screen lg:grid-cols-2">
        {/* Brand panel */}
        <div className="relative hidden overflow-hidden lg:flex lg:flex-col lg:justify-between lg:p-12">
          <div className="absolute inset-0 bg-[#090a0c]" />
          <div className="relative flex items-center gap-3">
            {branding?.logo_url && branding.logo_url !== "None" ? (
              <img src={branding.logo_url} alt={appName} className="h-12 w-12 rounded-2xl object-contain" onError={(e)=>{(e.target as HTMLImageElement).style.display='none';}} />
            ) : (
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--accent)] text-xl font-bold">{appName.charAt(0).toUpperCase()}</div>
            )}
            <div>
              <div className="text-xl font-bold ">{appName}</div>
              <div className="text-xs text-[var(--muted)]">Premium hosting dashboard</div>
            </div>
          </div>
          <div className="relative max-w-md">
            <h2 className="text-4xl font-bold leading-tight">Claim and manage servers with confidence.</h2>
            <p className="mt-4 text-sm text-[var(--muted)]">
              Instant provisioning, wallet rewards, secure role-based access, and a clean control panel built for speed.
            </p>
            <div className="mt-8 flex items-center gap-3 text-sm text-[var(--muted)]">
              <ShieldCheck size={16} className="text-[var(--accent)]" /> Secure · Role-based · Audited
            </div>
          </div>
          <div className="relative text-xs text-[var(--muted)]">© {appName}</div>
        </div>

        {/* Form panel */}
        <div className="flex items-center justify-center p-6 sm:p-10">
          <div className="w-full max-w-md">
            <div className="mb-6 lg:hidden">
              <div className="flex items-center gap-3">
                {branding?.logo_url && branding.logo_url !== "None" ? (
                  <img src={branding.logo_url} alt={appName} className="h-10 w-10 rounded-xl object-contain" onError={(e)=>{(e.target as HTMLImageElement).style.display='none';}} />
                ) : (
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--accent)] font-bold">{appName.charAt(0).toUpperCase()}</div>
                )}
                <div className="text-xl font-bold ">{appName}</div>
              </div>
            </div>
            <Card className="relative overflow-hidden border-white/10 p-7 shadow-2xl shadow-black/40">
              <h1 className="text-2xl font-bold">Welcome back</h1>
              <p className="mt-1 text-sm text-[var(--muted)]">Sign in to continue.</p>
              <form onSubmit={submit} className="mt-6 space-y-4">
                <div>
                  <label className="mb-1 block text-xs text-[var(--muted)]">Email</label>
                  <div className="relative">
                    <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]" />
                    <input className="input pl-9" type="email" placeholder="you@example.com" value={email} onChange={e=>setEmail(e.target.value)} required />
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-xs text-[var(--muted)]">Password</label>
                  <div className="relative">
                    <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]" />
                    <input className="input pl-9 pr-10" type={show ? "text" : "password"} placeholder="••••••••" value={password} onChange={e=>setPassword(e.target.value)} required />
                    <button type="button" onClick={()=>setShow(!show)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted)] hover:text-[var(--text)]">
                      {show ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>
                {err && <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">{err}</div>}
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Signing in…" : <>Sign in <ArrowRight size={16} /></>}
                </Button>
              </form>
              <div className="mt-6 text-center text-sm text-[var(--muted)]">
                No account? <a href="/register" className="font-medium text-[var(--accent)] hover:underline">Create one</a>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}