"use client";
import { useEffect, useState } from "react";
import { RequireAuth } from "@/components/layout/RequireAuth";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { api } from "@/lib/api";
import { Users, Shield, Server, FileText, Search, Wallet, Eye, X, UserPlus, Lock, Trash2 } from "lucide-react";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

export default function AdminUsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [q, setQ] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [selected, setSelected] = useState<any>(null);
  const [detail, setDetail] = useState<any>(null);
  const [balanceEdit, setBalanceEdit] = useState<string>("");
  const [grantAmount, setGrantAmount] = useState<string>("");
  const [grantReason, setGrantReason] = useState("Admin coin grant");
  const [granting, setGranting] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [changingPw, setChangingPw] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [msg, setMsg] = useState("");
  const [creating, setCreating] = useState(false);
  const [newUser, setNewUser] = useState({ username: "", email: "", password: "", role: "user", balance: 0, is_active: true });

  const load = async () => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (roleFilter) params.set("role", roleFilter);
    if (statusFilter) params.set("status", statusFilter);
    const u = await api(`/admin/users${params.toString() ? `?${params}` : ""}`);
    setUsers(u);
  };
  useEffect(() => { load(); }, [roleFilter, statusFilter]);

  async function openDetail(u: any) {
    setSelected(u);
    setDetail(null);
    const d = await api(`/admin/users/${u.id}`);
    setDetail(d);
    setBalanceEdit(String(d.balance ?? 0));
  }

  async function toggle(u: any, active: boolean) {
    await api(`/admin/users/${u.id}`, { method: "PUT", body: JSON.stringify({ is_active: active }) });
    await load();
    if (selected?.id === u.id) await openDetail(u);
  }

  async function changeRole(u: any, role: string) {
    await api(`/admin/users/${u.id}`, { method: "PUT", body: JSON.stringify({ role }) });
    await load();
    if (selected?.id === u.id) await openDetail(u);
  }

  async function saveBalance() {
    if (!selected) return;
    const val = parseInt(balanceEdit);
    if (isNaN(val)) { setMsg("Invalid balance"); return; }
    await api(`/admin/users/${selected.id}`, { method: "PUT", body: JSON.stringify({ balance: val }) });
    setMsg("Balance updated");
    await load();
    await openDetail(selected);
  }

  async function grantCoins() {
    if (!selected) return;
    const val = parseInt(grantAmount);
    if (isNaN(val) || val === 0) { setMsg("Enter a nonzero amount"); return; }
    setGranting(true);
    try {
      const r = await api(`/admin/users/${selected.id}/give-coins`, { method: "POST", body: JSON.stringify({ amount: val, reason: grantReason }) });
      setMsg(`Granted ${r.amount} coins. New balance: ${r.balance}`);
      setGrantAmount("");
      await load();
      await openDetail(selected);
    } catch (e: any) { setMsg(e.message); }
    finally { setGranting(false); }
  }

  async function changeUserPassword() {
    if (!selected || newPassword.length < 8) { setMsg("Password must be at least 8 characters"); return; }
    setChangingPw(true);
    try {
      await api(`/admin/users/${selected.id}/change-password`, { method: "POST", body: JSON.stringify({ new_password: newPassword }) });
      setNewPassword("");
      setMsg("Password changed");
    } catch (e: any) { setMsg(e.message); }
    finally { setChangingPw(false); }
  }

  async function confirmDeleteUser() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api(`/admin/users/${deleteTarget}`, { method: "DELETE" });
      setMsg("User deleted");
      setDeleteTarget(null);
      setSelected(null);
      await load();
    } catch (e: any) { setMsg(e.message); }
    finally { setDeleting(false); }
  }

  async function createUser() {
    setMsg("");
    try {
      await api("/admin/users", { method: "POST", body: JSON.stringify(newUser) });
      setMsg("User created");
      setCreating(false);
      setNewUser({ username: "", email: "", password: "", role: "user", balance: 0, is_active: true });
      await load();
    } catch (e: any) { setMsg(e.message); }
  }

  return (
    <RequireAuth admin><DashboardShell admin>
      <div className="space-y-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-3xl font-bold">User Management</h1>
            <p className="text-sm text-[var(--muted)]">Search, filter, and manage user accounts.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <input className="input w-full sm:min-w-[180px]" placeholder="Search email / username" value={q} onChange={e=>setQ(e.target.value)} onKeyDown={e=>e.key==="Enter"&&load()} />
            <select className="input" value={roleFilter} onChange={e=>setRoleFilter(e.target.value)}>
              <option value="">All roles</option>
              <option value="user">User</option>
              <option value="admin">Admin</option>
            </select>
            <select className="input" value={statusFilter} onChange={e=>setStatusFilter(e.target.value)}>
              <option value="">All status</option>
              <option value="active">Active</option>
              <option value="inactive">Suspended</option>
            </select>
            <Button onClick={load}><Search size={16} /> Search</Button>
            <Button onClick={() => setCreating(true)}><UserPlus size={16} /> Create user</Button>
          </div>
        </div>

        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs  text-[var(--muted)]">
                <tr><th className="py-2 text-left">User</th><th>Email</th><th>Role</th><th>Status</th><th>Balance</th><th>Servers</th><th>Claims</th><th>Joined</th><th className="text-right">Actions</th></tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-t border-[var(--border)] hover:bg-white/5">
                    <td className="py-2">
                      <div className="font-medium">{u.username}</div>
                      <div className="text-xs text-[var(--muted)]">{u.id.slice(0, 8)}</div>
                    </td>
                    <td className="text-xs">{u.email}</td>
                    <td>
                      <select className="input py-1 text-xs" value={u.role || "user"} onChange={e=>changeRole(u, e.target.value)}>
                        <option value="user">user</option>
                        <option value="admin">admin</option>
                      </select>
                    </td>
                    <td>
                      <span className={`badge ${u.is_active ? "text-green-300" : "text-red-300"}`}>
                        {u.is_active ? "active" : "suspended"}
                      </span>
                    </td>
                    <td>{u.balance}</td>
                    <td>{u.server_count}</td>
                    <td>{u.claim_count}</td>
                    <td className="text-xs text-[var(--muted)]">{new Date(u.created_at).toLocaleDateString()}</td>
                    <td className="space-x-2 text-right whitespace-nowrap">
                      <button className="text-[var(--accent)]" onClick={()=>openDetail(u)} title="View details"><Eye size={15} /></button>
                      {u.is_active
                        ? <button className="text-yellow-400" onClick={()=>toggle(u,false)}>Suspend</button>
                        : <button className="text-green-400" onClick={()=>toggle(u,true)}>Activate</button>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {users.length === 0 && <div className="py-6 text-center text-sm text-[var(--muted)]">No users found.</div>}
          </div>
        </Card>

        {selected && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
            <Card className="w-full max-w-2xl">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-xl font-bold">{selected.username}</h2>
                <button onClick={()=>setSelected(null)}><X size={18} /></button>
              </div>
              {!detail ? <div className="text-[var(--muted)]">Loading...</div> : (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>Email: {detail.email}</div>
                    <div>Role: {detail.role}</div>
                    <div>Status: {detail.is_active ? "active" : "suspended"}</div>
                    <div>Verified: {String(detail.is_verified)}</div>
                    <div>Balance: {detail.balance}</div>
                    <div>Servers: {detail.servers?.length ?? 0}</div>
                  </div>
                  <div className="flex gap-2">
                    <input className="input" type="number" value={balanceEdit} onChange={e=>setBalanceEdit(e.target.value)} placeholder="New balance" />
                    <Button onClick={saveBalance}><Wallet size={16} /> Save balance</Button>
                  </div>
                  <div className="grid gap-2 md:grid-cols-3">
                    <input className="input" type="number" value={grantAmount} onChange={e=>setGrantAmount(e.target.value)} placeholder="Grant coins (+/-)" />
                    <input className="input" value={grantReason} onChange={e=>setGrantReason(e.target.value)} placeholder="Reason" />
                    <Button className="w-full" onClick={grantCoins} disabled={granting}>{granting ? "…" : "Grant"}</Button>
                  </div>
                  {msg && <div className="text-sm text-[var(--muted)]">{msg}</div>}
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <div className="mb-2 flex items-center gap-2 font-semibold"><Server size={15} /> Servers</div>
                      {(detail.servers || []).map((s: any) => (
                        <div key={s.id} className="border-b border-[var(--border)] py-2 text-xs">
                          {s.name} <span className="text-[var(--muted)]">({s.status})</span>
                        </div>
                      ))}
                      {!detail.servers?.length && <div className="text-xs text-[var(--muted)]">No servers.</div>}
                    </div>
                    <div>
                      <div className="mb-2 flex items-center gap-2 font-semibold"><FileText size={15} /> Claims</div>
                      {(detail.claims || []).map((c: any) => (
                        <div key={c.id} className="border-b border-[var(--border)] py-2 text-xs">
                          {c.status} <span className="text-[var(--muted)]">{new Date(c.created_at).toLocaleDateString()}</span>
                        </div>
                      ))}
                      {!detail.claims?.length && <div className="text-xs text-[var(--muted)]">No claims.</div>}
                    </div>
                  </div>
                  <div className="space-y-3 rounded-xl border border-[var(--border)] bg-white/5 p-4">
                    <div className="flex items-center gap-2 text-sm font-semibold"><Lock size={14} className="text-[var(--accent)]" /> Change user password</div>
                    <div className="flex gap-2">
                      <input className="input" type="password" placeholder="New password (8+ chars)" value={newPassword} onChange={e=>setNewPassword(e.target.value)} />
                      <Button onClick={changeUserPassword} disabled={changingPw}>{changingPw ? "…" : "Update"}</Button>
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    {detail.is_active
                      ? <Button variant="danger" onClick={()=>toggle(selected,false)}>Suspend account</Button>
                      : <Button onClick={()=>toggle(selected,true)}>Activate account</Button>}
                    <Button variant="danger" onClick={() => setDeleteTarget(selected.id)}><Trash2 size={14} /> Delete account</Button>
                    <Button variant="ghost" onClick={()=>setSelected(null)}>Close</Button>
                  </div>
                </div>
              )}
            </Card>
          </div>
        )}
      </div>

      {creating && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 p-4">
          <Card className="w-full max-w-lg">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Create user</h2>
              <button onClick={() => setCreating(false)}><X size={18} /></button>
            </div>
            <div className="space-y-3">
              <input className="input" placeholder="Username" value={newUser.username} onChange={e=>setNewUser({...newUser, username: e.target.value})} />
              <input className="input" type="email" placeholder="Email" value={newUser.email} onChange={e=>setNewUser({...newUser, email: e.target.value})} />
              <input className="input" type="password" placeholder="Password (8+ chars)" value={newUser.password} onChange={e=>setNewUser({...newUser, password: e.target.value})} />
              <select className="input" value={newUser.role} onChange={e=>setNewUser({...newUser, role: e.target.value})}>
                <option value="user">user</option>
                <option value="admin">admin</option>
              </select>
              <input className="input" type="number" placeholder="Balance" value={newUser.balance} onChange={e=>setNewUser({...newUser, balance: Number(e.target.value)})} />
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={newUser.is_active} onChange={e=>setNewUser({...newUser, is_active: e.target.checked})} /> Active
              </label>
            </div>
            {msg && <div className="mt-3 text-sm text-[var(--muted)]">{msg}</div>}
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setCreating(false)}>Cancel</Button>
              <Button onClick={createUser}>Create account</Button>
            </div>
          </Card>
        </div>
      )}
      <ConfirmDialog open={!!deleteTarget} title="Delete user" message="Delete this user account permanently?" confirmLabel="Delete" onConfirm={confirmDeleteUser} onCancel={() => setDeleteTarget(null)} loading={deleting} />
    </DashboardShell></RequireAuth>
  );
}
