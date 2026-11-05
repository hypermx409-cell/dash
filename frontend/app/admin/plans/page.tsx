"use client";
import { useEffect, useState } from "react";
import { RequireAuth } from "@/components/layout/RequireAuth";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { api } from "@/lib/api";
import { Cpu, HardDrive, MemoryStick, Package, Plus, Search, Settings2, Trash2, ToggleLeft, ToggleRight, Coins, ArrowUpDown } from "lucide-react";

const empty = {
  name: "", slug: "", description: "", price_cents: 0, currency: "coins",
  ram_mb: 1024, cpu_percent: 100, disk_mb: 5120, swap_mb: 0,
  allocations: 1, servers_limit: 1, is_active: true, is_public: true,
  available_stock: null as number | null,
  egg_id: null as number | null, node_id: null as number | null, location_id: null as number | null,
};

function Resource({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-[var(--border)] bg-white/5 px-3 py-2 text-sm">
      <Icon size={15} className="text-[var(--accent)]" />
      <span className="text-[var(--muted)]">{label}</span>
      <span className="ml-auto font-medium">{value}</span>
    </div>
  );
}

export default function AdminPlansPage() {
  const [plans, setPlans] = useState<any[]>([]);
  const [form, setForm] = useState<any>(empty);
  const [editing, setEditing] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<"all" | "active" | "inactive" | "public">("all");
  const [sort, setSort] = useState<"name" | "ram" | "price">("name");
  const [msg, setMsg] = useState("");
  const [confirmItem, setConfirmItem] = useState<any>(null);
  const [deleting, setDeleting] = useState(false);

  const load = async () => setPlans(await api("/plans?public_only=false"));
  useEffect(() => { load(); }, []);

  async function save() {
    setMsg("");
    try {
      const payload = { ...form, currency: "coins" };
      if (editing) await api(`/admin/plans/${editing}`, { method: "PUT", body: JSON.stringify(payload) });
      else await api("/admin/plans", { method: "POST", body: JSON.stringify(payload) });
      setForm(empty); setEditing(null); await load();
      setMsg(editing ? "Plan updated" : "Plan created");
    } catch (e: any) { setMsg(e.message); }
  }

  async function del(id: string) {
    const p = plans.find((x) => x.id === id);
    setConfirmItem(p || { id });
  }
  async function confirmDelete() {
    if (!confirmItem) return;
    setDeleting(true);
    try { await api(`/admin/plans/${confirmItem.id}`, { method: "DELETE" }); setMsg("Plan deleted"); await load(); }
    catch (e: any) { setMsg(e.message); }
    finally { setDeleting(false); setConfirmItem(null); }
  }

  async function quick(id: string, field: string, value: any) {
    await api(`/admin/plans/${id}`, { method: "PUT", body: JSON.stringify({ [field]: value }) });
    await load();
  }

  const filtered = plans
    .filter((p) => {
      if (q && !`${p.name} ${p.slug}`.toLowerCase().includes(q.toLowerCase())) return false;
      if (filter === "active" && !p.is_active) return false;
      if (filter === "inactive" && p.is_active) return false;
      if (filter === "public" && !p.is_public) return false;
      return true;
    })
    .sort((a, b) => {
      if (sort === "name") return a.name.localeCompare(b.name);
      if (sort === "ram") return b.ram_mb - a.ram_mb;
      return b.price_cents - a.price_cents;
    });

  return (
    <RequireAuth admin><DashboardShell admin>
      <div className="space-y-8">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-3xl font-bold">Plan Management</h1>
            <p className="text-sm text-[var(--muted)]">Design pricing tiers and resource allocations.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <select className="input" value={filter} onChange={e=>setFilter(e.target.value as any)}>
              <option value="all">All plans</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="public">Public</option>
            </select>
            <button className="input flex items-center gap-2" onClick={()=>setSort(sort==="name"?"ram":sort==="ram"?"price":"name")}>
              <ArrowUpDown size={14} /> Sort: {sort}
            </button>
            <input className="input w-full sm:min-w-[180px]" placeholder="Search plans…" value={q} onChange={e=>setQ(e.target.value)} />
          </div>
        </div>

        {msg && <div className="rounded-xl border border-[var(--border)] bg-white/5 p-3 text-sm">{msg}</div>}

        <div className="grid gap-6 xl:grid-cols-[420px_1fr]">
          {/* Form */}
          <Card className="h-fit">
            <div className="mb-4 flex items-center gap-2">
              <Settings2 size={18} className="text-[var(--accent)]" />
              <h2 className="text-lg font-semibold">{editing ? "Edit plan" : "Create new plan"}</h2>
            </div>

            <div className="space-y-4">
              <div>
                <div className="mb-2 text-xs font-medium   text-[var(--muted)]">Identity</div>
                <div className="grid gap-3">
                  <input className="input" placeholder="Plan name" value={form.name} onChange={e=>setForm({...form, name: e.target.value})} />
                  <input className="input" placeholder="Slug (e.g. starter)" value={form.slug} onChange={e=>setForm({...form, slug: e.target.value})} />
                  <textarea className="input" rows={2} placeholder="Description" value={form.description} onChange={e=>setForm({...form, description: e.target.value})} />
                </div>
              </div>

              <div>
                <div className="mb-2 text-xs font-medium   text-[var(--muted)]">Pricing</div>
                <div className="grid grid-cols-1 gap-3">
                  <div className="relative">
                    <Coins size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]" />
                    <input className="input pl-8" type="number" placeholder="Price (coins)" value={form.price_cents} onChange={e=>setForm({...form, price_cents: Number(e.target.value)})} />
                  </div>
                  <div className="text-xs text-[var(--muted)]">Pricing is stored and displayed in coins only.</div>
                </div>
              </div>

              <div>
                <div className="mb-2 text-xs font-medium   text-[var(--muted)]">Resources</div>
                <div className="grid grid-cols-2 gap-3">
                  <input className="input" type="number" placeholder="RAM (MB)" value={form.ram_mb} onChange={e=>setForm({...form, ram_mb: Number(e.target.value)})} />
                  <input className="input" type="number" placeholder="CPU (%)" value={form.cpu_percent} onChange={e=>setForm({...form, cpu_percent: Number(e.target.value)})} />
                  <input className="input" type="number" placeholder="Disk (MB)" value={form.disk_mb} onChange={e=>setForm({...form, disk_mb: Number(e.target.value)})} />
                  <input className="input" type="number" placeholder="Swap (MB)" value={form.swap_mb} onChange={e=>setForm({...form, swap_mb: Number(e.target.value)})} />
                  <input className="input" type="number" placeholder="Allocations" value={form.allocations} onChange={e=>setForm({...form, allocations: Number(e.target.value)})} />
                  <input className="input" type="number" placeholder="Servers limit" value={form.servers_limit} onChange={e=>setForm({...form, servers_limit: Number(e.target.value)})} />
                </div>
              </div>

              <div>
                <div className="mb-2 text-xs font-medium   text-[var(--muted)]">Availability</div>
                <input className="input" type="number" placeholder="Stock (blank = unlimited)" value={form.available_stock ?? ""} onChange={e=>setForm({...form, available_stock: e.target.value===""?null:Number(e.target.value)})} />
                <div className="mt-3 flex flex-wrap gap-4 text-sm">
                  <label className="flex items-center gap-2"><input type="checkbox" checked={form.is_active} onChange={e=>setForm({...form, is_active: e.target.checked})} /> Active</label>
                  <label className="flex items-center gap-2"><input type="checkbox" checked={form.is_public} onChange={e=>setForm({...form, is_public: e.target.checked})} /> Public</label>
                </div>
              </div>

              <div>
                <div className="mb-2 text-xs font-medium   text-[var(--muted)]">Pterodactyl overrides (optional)</div>
                <div className="grid grid-cols-3 gap-3">
                  <input className="input" type="number" placeholder="Node ID" value={form.node_id ?? ""} onChange={e=>setForm({...form, node_id: e.target.value===""?null:Number(e.target.value)})} />
                  <input className="input" type="number" placeholder="Egg ID" value={form.egg_id ?? ""} onChange={e=>setForm({...form, egg_id: e.target.value===""?null:Number(e.target.value)})} />
                  <input className="input" type="number" placeholder="Location ID" value={form.location_id ?? ""} onChange={e=>setForm({...form, location_id: e.target.value===""?null:Number(e.target.value)})} />
                </div>
              </div>
            </div>

            <div className="mt-5 flex gap-2">
              <Button onClick={save} className="flex-1">{editing ? "Update plan" : "Create plan"}</Button>
              {editing && <Button variant="ghost" onClick={()=>{setEditing(null); setForm(empty);}}>Cancel</Button>}
            </div>
          </Card>

          {/* List */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="text-sm text-[var(--muted)]">{filtered.length} of {plans.length} plans</div>
            </div>
            <div className="grid gap-4">
              {filtered.map((p) => (
                <Card key={p.id} className="relative overflow-hidden">
                  <div className="absolute inset-x-0 top-0 h-1" style={{ background: "linear-gradient(90deg, var(--accent), var(--accent-2))" }} />
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-lg font-semibold">{p.name}</span>
                        <span className="text-xs text-[var(--muted)]">/{p.slug}</span>
                        <span className={`badge ${p.is_active ? "text-green-300" : "text-red-300"}`}>{p.is_active ? "active" : "inactive"}</span>
                        {p.is_public && <span className="badge text-blue-300">public</span>}
                        {p.available_stock !== null && <span className="badge">stock {p.available_stock}</span>}
                      </div>
                      <p className="mt-1 text-sm text-[var(--muted)]">{p.description || "No description"}</p>
                      <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                        <Resource icon={MemoryStick} label="RAM" value={`${p.ram_mb} MB`} />
                        <Resource icon={Cpu} label="CPU" value={`${p.cpu_percent}%`} />
                        <Resource icon={HardDrive} label="Disk" value={`${p.disk_mb} MB`} />
                        <Resource icon={Package} label="Swap" value={`${p.swap_mb} MB`} />
                        <Resource icon={Package} label="Allocations" value={`${p.allocations}`} />
                        <Resource icon={Coins} label="Price" value={`${p.price_cents} ${p.currency}`} />
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 lg:flex-col">
                      <button className="btn btn-ghost text-xs" onClick={()=>quick(p.id, "is_active", !p.is_active)}>
                        {p.is_active ? <ToggleRight size={14} /> : <ToggleLeft size={14} />} {p.is_active ? "Disable" : "Enable"}
                      </button>
                      <button className="btn btn-ghost text-xs" onClick={()=>quick(p.id, "is_public", !p.is_public)}>
                        {p.is_public ? "Make private" : "Make public"}
                      </button>
                      <Button variant="ghost" onClick={() => { setEditing(p.id); setForm({ ...p, available_stock: p.available_stock }); window.scrollTo({ top: 0, behavior: "smooth" }); }}>Edit</Button>
                      <button className="text-red-400 text-sm hover:underline" onClick={() => del(p.id)}><Trash2 size={14} className="inline mr-1" />Delete</button>
                    </div>
                  </div>
                </Card>
              ))}
              {filtered.length === 0 && (
                <Card className="py-10 text-center">
                  <Package size={32} className="mx-auto mb-2 text-[var(--muted)]" />
                  <div className="text-sm text-[var(--muted)]">No plans match the current filters.</div>
                  <Button className="mt-3" onClick={()=>{setForm(empty); setEditing(null);}}><Plus size={14} /> Create a plan</Button>
                </Card>
              )}
            </div>
          </div>
        </div>
      </div>
      <ConfirmDialog open={!!confirmItem} title="Delete plan" message="Delete this plan? Existing servers are not affected." confirmLabel="Delete" onConfirm={confirmDelete} onCancel={() => setConfirmItem(null)} loading={deleting} />
    </DashboardShell></RequireAuth>
  );
}
