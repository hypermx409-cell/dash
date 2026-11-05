"use client";
import { useEffect, useState } from "react";
import { RequireAuth } from "@/components/layout/RequireAuth";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { api } from "@/lib/api";

export default function AdminServersPage() {
  const [servers, setServers] = useState<any[]>([]);
  const [confirmServer, setConfirmServer] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const load = async () => setServers(await api("/admin/servers"));
  useEffect(() => { load(); }, []);

  async function action(id: string, type: string) {
    if (type === "delete") { setConfirmServer(id); return; }
    try {
      if (type === "suspend") await api(`/admin/servers/${id}/suspend`, { method: "POST" });
      else if (type === "unsuspend") await api(`/admin/servers/${id}/unsuspend`, { method: "POST" });
      else if (type === "retry") await api(`/admin/servers/${id}/retry`, { method: "POST" });
      else if (type === "delete") await api(`/admin/servers/${id}`, { method: "DELETE" });
      await load();
    } catch (e: any) { alert(e.message); }
  }

  async function confirmDeleteServer() {
    if (!confirmServer) return;
    setDeleting(true);
    try { await api(`/admin/servers/${confirmServer}`, { method: "DELETE" }); await load(); }
    catch (e: any) { alert(e.message); }
    finally { setDeleting(false); setConfirmServer(null); }
  }

  return (
    <RequireAuth admin><DashboardShell admin>
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Server Management</h1>
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-[var(--muted)] text-xs ">
                <tr><th className="text-left py-2">Name</th><th>Owner</th><th>Status</th><th>PTero ID</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {servers.map((s) => (
                  <tr key={s.id} className="border-t border-[var(--border)]">
                    <td className="py-2">{s.name}</td>
                    <td>{s.owner}</td>
                    <td>{s.status}</td>
                    <td>{s.ptero_server_id ?? "-"}</td>
                    <td className="space-x-2 whitespace-nowrap">
                      {!s.is_suspended && <button className="text-yellow-400" onClick={()=>action(s.id,"suspend")}>Suspend</button>}
                      {s.is_suspended && <button className="text-green-400" onClick={()=>action(s.id,"unsuspend")}>Unsuspend</button>}
                      {s.status === "failed" || s.status === "provisioning" ? <button className="text-blue-400" onClick={()=>action(s.id,"retry")}>Retry</button> : null}
                      <button className="text-red-400" onClick={()=>action(s.id,"delete")}>Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
      <ConfirmDialog open={!!confirmServer} title="Delete server" message="Delete this server permanently?" confirmLabel="Delete" onConfirm={confirmDeleteServer} onCancel={() => setConfirmServer(null)} loading={deleting} />
    </DashboardShell></RequireAuth>
  );
}
