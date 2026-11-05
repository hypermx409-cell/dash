"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { useBranding } from "@/lib/theme";
import { useEffect, useState } from "react";
import { Server, Package, Wallet, Gift, LifeBuoy, User as UserIcon, LayoutDashboard, Shield, LogOut, ChevronRight, Menu, Palette, Megaphone, Link2, Timer, ChevronsLeft, ChevronsRight, Bell } from "lucide-react";

const userGroups = [
  { title: "Workspace", links: [
    { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
    { href: "/dashboard/servers", label: "My Servers", icon: Server },
    { href: "/dashboard/claim", label: "Claim Server", icon: Package },
  ]},
  { title: "Finance", links: [
    { href: "/dashboard/wallet", label: "Wallet", icon: Wallet },
    { href: "/dashboard/rewards", label: "Rewards", icon: Gift },
    { href: "/dashboard/links", label: "Links", icon: Link2 },
    { href: "/dashboard/afk", label: "AFK", icon: Timer },
  ]},
  { title: "Account", links: [
    { href: "/dashboard/announcements", label: "Announcements", icon: Megaphone },
    { href: "/dashboard/notifications", label: "Notifications", icon: Bell },
    { href: "/dashboard/support", label: "Support", icon: LifeBuoy },
    { href: "/dashboard/profile", label: "Profile", icon: UserIcon },
  ]},
];
const adminGroups = [
  { title: "Core", links: [
    { href: "/admin", label: "Overview", icon: Shield },
    { href: "/admin/users", label: "Users", icon: UserIcon },
    { href: "/admin/plans", label: "Plans", icon: Package },
  { href: "/admin/rewards", label: "Rewards", icon: Gift },
    { href: "/admin/servers", label: "Servers", icon: Server },
  ]},
  { title: "Platform", links: [
    { href: "/admin/pterodactyl", label: "Pterodactyl", icon: Shield },
    { href: "/admin/modules", label: "Modules", icon: LayoutDashboard },
    { href: "/admin/themes", label: "Themes", icon: Palette },
    { href: "/admin/settings", label: "Settings", icon: Shield },
  ]},
  { title: "Insights", links: [
    { href: "/admin/analytics", label: "Analytics", icon: Wallet },
    { href: "/admin/announcements", label: "Announcements", icon: Megaphone },
    { href: "/admin/tickets", label: "Tickets", icon: LifeBuoy },
  ]},
];

function isActive(pathname: string, href: string) {
  if (href === "/dashboard" || href === "/admin") return pathname === href;
  return pathname === href || pathname.startsWith(href + "/");
}

export function DashboardShell({ children, admin = false }: { children: React.ReactNode; admin?: boolean }) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const { branding } = useBranding();
  const appName = branding?.app_name || "EUPHORIA PANEL";
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const isAdminUser =
    user?.role === "admin" ||
    user?.role === "owner" ||
    user?.username === "owner" ||
    user?.username === "admin";
  const userViewGroups = isAdminUser
    ? [...userGroups, { title: "Administration", links: [{ href: "/admin", label: "Admin area", icon: Shield }] }]
    : userGroups;
  const groups = admin ? adminGroups : userViewGroups;
  const [logoError, setLogoError] = useState(false);
  useEffect(() => { setLogoError(false); }, [branding?.logo_url]);

  const sidebar = (
    <div className="flex h-full flex-col">
      <div className="mb-6 flex items-center gap-2">
        {branding?.logo_url && !logoError ? (
          <img src={branding.logo_url} alt={appName} className="h-9 w-9 rounded-xl object-contain" onError={() => setLogoError(true)} />
        ) : (
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--accent)] font-bold">
            {appName.charAt(0).toUpperCase()}
          </div>
        )}
        {!collapsed && (
          <div>
            <div className="font-bold ">{appName}</div>
            <div className="text-[10px] text-[var(--muted)]">{admin ? "Admin Panel" : "Hosting Dashboard"}</div>
          </div>
        )}
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto pr-1">
        {groups.map((g) => (
          <div key={g.title}>
            {!collapsed && <div className="mb-2 px-2 text-[10px] font-semibold   text-[var(--muted)]">{g.title}</div>}
            <nav className="space-y-1">
              {g.links.map((l) => {
                const Icon = l.icon;
                const active = isActive(pathname ?? "", l.href);
                return (
                  <Link key={l.href} href={l.href} onClick={() => setOpen(false)} title={collapsed ? l.label : undefined} className={`sidebar-link ${active ? "active" : ""} ${collapsed ? "justify-center" : ""}`}>
                    <Icon size={17} />
                    {!collapsed && <span>{l.label}</span>}
                    {!collapsed && active && <ChevronRight size={14} className="ml-auto" />}
                  </Link>
                );
              })}
            </nav>
          </div>
        ))}
      </div>

      {isAdminUser && !admin && (
        <div className="mt-4 border-t border-[var(--border)] pt-4">
          {!collapsed && <div className="mb-2 px-2 text-[10px] font-semibold text-[var(--muted)]">Administration</div>}
          <Link
            href="/admin"
            onClick={() => setOpen(false)}
            title={collapsed ? "Admin area" : undefined}
            className={`sidebar-link ${collapsed ? "justify-center" : ""}`}
          >
            <Shield size={17} />
            {!collapsed && <span>Admin area</span>}
          </Link>
        </div>
      )}

      <div className="mt-4 border-t border-[var(--border)] pt-4">
        {!collapsed && <div className="mb-2 text-xs text-[var(--muted)]">{user?.username}</div>}
        {admin && (
          <Link href="/dashboard" title={collapsed ? "User dashboard" : undefined} className={`sidebar-link w-full ${collapsed ? "justify-center" : ""}`}>
            <LayoutDashboard size={17} /> {!collapsed && "User dashboard"}
          </Link>
        )}
        <button onClick={logout} title={collapsed ? "Sign out" : undefined} className={`sidebar-link w-full ${collapsed ? "justify-center" : ""}`}>
          <LogOut size={17} /> {!collapsed && "Sign out"}
        </button>
        <button onClick={() => setCollapsed(!collapsed)} title={collapsed ? "Expand sidebar" : "Collapse sidebar"} className={`sidebar-link w-full ${collapsed ? "justify-center" : ""}`}>
          {collapsed ? <ChevronsRight size={17} /> : <ChevronsLeft size={17} />} {!collapsed && "Collapse"}
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen">
      <aside className={`hidden shrink-0 border-r border-[var(--border)] bg-[#0b0d10] p-4 transition-colors duration-200 md:flex md:flex-col ${collapsed ? "w-20" : "w-64"}`}>
        {sidebar}
      </aside>
      {open && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div className="w-72 border-r border-[var(--border)] bg-[#0b0d10] p-5">{sidebar}</div>
          <button className="flex-1 bg-black/60" onClick={() => setOpen(false)} aria-label="Close menu" />
        </div>
      )}
      <main className="flex-1 min-w-0">
        <header className="flex items-center justify-between border-b border-[var(--border)] p-4 md:hidden">
          <button onClick={() => setOpen(true)} className="sidebar-link" aria-label="Open menu"><Menu size={18} /></button>
          <div className="flex items-center gap-2 font-bold">
            {branding?.logo_url && !logoError ? (
              <img src={branding.logo_url} alt={appName} className="h-6 w-6 rounded object-contain" onError={() => setLogoError(true)} />
            ) : (
              <div className="flex h-6 w-6 items-center justify-center rounded bg-[var(--accent)] text-xs font-bold">{appName.charAt(0).toUpperCase()}</div>
            )}
            <span>{appName}</span>
          </div>
          <div className="w-9" />
        </header>
        <div className="mx-auto w-full max-w-7xl p-4 sm:p-6 md:p-8 fade-in">{children}</div>
      </main>
    </div>
  );
}
