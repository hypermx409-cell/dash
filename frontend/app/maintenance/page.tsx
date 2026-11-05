"use client";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { api } from "@/lib/api";
import { Wrench } from "lucide-react";
import Link from "next/link";

export default function MaintenancePage() {
  const { user } = useAuth();
  const [msg, setMsg] = useState("The platform is currently under maintenance. Please check back soon.");

  useEffect(() => {
    api("/maintenance").then((r) => { if (r?.message) setMsg(r.message); }).catch(() => {});
  }, []);

  return (
    <div className="min-h-screen bg-[#07080a] text-[var(--text)]">
      <div className="flex min-h-screen items-center justify-center p-6">
        <Card className="max-w-xl text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--accent)]/15 text-[var(--accent)]">
            <Wrench size={26} />
          </div>
          <h1 className="text-3xl font-bold">Maintenance mode</h1>
          <p className="mt-3 text-sm text-[var(--muted)]">{msg}</p>
          {user && (
            <div className="mt-4 rounded-2xl border border-[var(--accent)]/30 bg-[var(--accent)]/10 p-3 text-sm">
              You are still signed in as <span className="font-medium text-[var(--accent)]">{user.username}</span>. Your session stays active and access will return automatically when maintenance ends.
            </div>
          )}
          <div className="mt-6 flex justify-center gap-2">
            <Button variant="ghost" onClick={() => window.location.reload()}>Refresh</Button>
            {!user && <Link href="/login"><Button variant="ghost">Login</Button></Link>}
          </div>
        </Card>
      </div>
    </div>
  );
}
