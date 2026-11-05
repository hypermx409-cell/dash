"use client";
import Link from "next/link";
import { Server, Shield, Zap } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { useBranding } from "@/lib/theme";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function Home() {
  const { user, loading } = useAuth();
  const { branding } = useBranding();
  const appName = branding?.app_name || "EUPHORIA PANEL";
  const [logoError, setLogoError] = useState(false);
  const [maintenance, setMaintenance] = useState(false);
  useEffect(() => { setLogoError(false); }, [branding?.logo_url]);
  useEffect(() => { api("/maintenance").then((r) => setMaintenance(!!r?.maintenance)).catch(() => {}); }, []);
  const router = useRouter();
  useEffect(() => {
    if (loading) return;
    if (maintenance && !(user && user.role === "admin")) { router.replace("/maintenance"); return; }
    if (user) router.replace(user.role === "admin" ? "/admin" : "/dashboard");
    else router.replace("/login");
  }, [user, loading, maintenance, router]);
  return (
    <div className="min-h-screen">
      <header className="flex items-center justify-between px-6 py-5 max-w-7xl mx-auto">
        <div className="flex items-center gap-2">
          {branding?.logo_url && branding.logo_url !== "None" && !logoError ? (
            <img src={branding.logo_url} alt={appName} className="h-9 w-9 rounded-xl object-contain" onError={() => setLogoError(true)} onLoad={() => setLogoError(false)} />
          ) : (
            <div className="h-9 w-9 rounded-xl bg-[var(--accent)] flex items-center justify-center font-bold">{appName.charAt(0).toUpperCase()}</div>
          )}
          <span className="font-bold ">{appName}</span>
        </div>
        <div className="flex gap-3">
          <Link href="/login" className="btn btn-ghost">Sign in</Link>
          <Link href="/register" className="btn btn-primary">Get started</Link>
        </div>
      </header>
      <section className="max-w-7xl mx-auto px-6 py-20 text-center">
        <h1 className="text-5xl md:text-6xl font-bold leading-tight">
          Premium hosting,<br />
          <span className="text-[var(--accent)]">claimed in seconds.</span>
        </h1>
        <p className="text-[var(--muted)] mt-6 max-w-2xl mx-auto text-lg">
          {appName} lets you claim server plans instantly with automated Pterodactyl provisioning, manage resources, track your wallet, and get support — all in one place.
        </p>
        <div className="flex gap-3 justify-center mt-8">
          <Link href="/register" className="btn btn-primary">Create account</Link>
          <Link href="/login" className="btn btn-ghost">Sign in</Link>
        </div>
        <div className="grid md:grid-cols-3 gap-4 mt-16">
          {[
            { icon: Zap, title: "Instant provisioning", desc: "Claims are provisioned automatically with your selected plan." },
            { icon: Server, title: "Full control", desc: "View status, resources and connection details." },
            { icon: Shield, title: "Secure by design", desc: "Server-side API keys, RBAC, and audit logging." },
          ].map((f, i) => (
            <div key={i} className="card p-6 text-left">
              <f.icon className="text-[var(--accent)] mb-3" />
              <div className="font-semibold">{f.title}</div>
              <div className="text-sm text-[var(--muted)] mt-1">{f.desc}</div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
