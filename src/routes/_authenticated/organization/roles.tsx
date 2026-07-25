import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Plus, Trash2, ShieldCheck, Shield } from "lucide-react";
import { fetchMyOrganization, fetchRoles, createRole, updateRole, deleteRole, PERMISSIONS, type PermissionKey } from "@/lib/organization";

export const Route = createFileRoute("/_authenticated/organization/roles")({
  head: () => ({ meta: [{ title: "Roles & Permissions — EventOrbit AI" }, { name: "robots", content: "noindex" }] }),
  component: RolesPage,
});

function RolesPage() {
  const qc = useQueryClient();
  const { data: org } = useQuery({ queryKey: ["organization-mine"], queryFn: fetchMyOrganization });
  const { data: roles, isLoading } = useQuery({
    queryKey: ["organization-roles", org?.id],
    queryFn: () => fetchRoles(org!.id),
    enabled: !!org?.id,
  });

  const [name, setName] = useState("");
  const [selected, setSelected] = useState<Set<PermissionKey>>(new Set());
  const [isAdminRole, setIsAdminRole] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function togglePermission(key: PermissionKey) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!org?.id || !name.trim()) return;
    setSaving(true);
    setError(null);
    try {
      await createRole(org.id, name.trim(), Array.from(selected), { isAdminRole });
      setName(""); setSelected(new Set()); setIsAdminRole(false);
      await qc.invalidateQueries({ queryKey: ["organization-roles", org.id] });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create role");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!org?.id) return;
    if (!window.confirm("Delete this role? Members using it will lose their permissions until reassigned.")) return;
    await deleteRole(id);
    await qc.invalidateQueries({ queryKey: ["organization-roles", org.id] });
  }

  async function togglePermissionOnExisting(roleId: string, current: PermissionKey[], key: PermissionKey) {
    if (!org?.id) return;
    const next = current.includes(key) ? current.filter((k) => k !== key) : [...current, key];
    await updateRole(roleId, { permissions: next });
    await qc.invalidateQueries({ queryKey: ["organization-roles", org.id] });
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl font-semibold">Roles &amp; Permissions</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Build any role you need — Technical Head, Judge, Sponsorship Lead, anything — and pick exactly what each one can do.
          Roles with "Full org-management access" bypass individual permission checks entirely.
        </p>
      </div>

      <form onSubmit={handleCreate} className="rounded-2xl border border-border bg-card p-6 space-y-4">
        <div>
          <label className="text-sm font-medium">Role name *</label>
          <input value={name} onChange={(e) => setName(e.target.value)} required
            placeholder="e.g. Technical Head, Judge, Sponsorship Lead"
            className="mt-1.5 w-full max-w-md rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm" />
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={isAdminRole} onChange={(e) => setIsAdminRole(e.target.checked)} className="h-4 w-4 rounded border-input" />
          Full org-management access (can manage departments, roles, members and events — bypasses the checklist below)
        </label>

        {!isAdminRole && (
          <div>
            <p className="text-sm font-medium mb-2">Permissions</p>
            <div className="grid gap-2 sm:grid-cols-2">
              {PERMISSIONS.map((p) => (
                <label key={p.key} className="flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-sm hover:bg-accent cursor-pointer">
                  <input type="checkbox" checked={selected.has(p.key)} onChange={() => togglePermission(p.key)} className="h-4 w-4 rounded border-input" />
                  {p.label}
                </label>
              ))}
            </div>
          </div>
        )}

        {error && <p className="text-sm text-rose-600">{error}</p>}
        <button type="submit" disabled={saving || !org?.id}
          className="flex items-center gap-2 rounded-full bg-brand-violet px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-violet/90 disabled:opacity-50">
          <Plus className="h-4 w-4" /> {saving ? "Creating…" : "Create role"}
        </button>
      </form>

      <div className="space-y-4">
        {isLoading && <p className="text-sm text-muted-foreground">Loading roles…</p>}
        {!isLoading && (roles?.length ?? 0) === 0 && <p className="text-sm text-muted-foreground">No roles yet — create your first one above.</p>}
        {(roles ?? []).map((r) => (
          <div key={r.id} className="rounded-2xl border border-border bg-card p-6">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                {r.is_admin_role ? <ShieldCheck className="h-5 w-5 text-brand-violet" /> : <Shield className="h-5 w-5 text-muted-foreground" />}
                <div>
                  <p className="font-semibold">{r.name}</p>
                  {r.is_default && <span className="text-[11px] text-muted-foreground">Default role</span>}
                </div>
              </div>
              {!r.is_default && (
                <button onClick={() => handleDelete(r.id)} className="rounded-lg p-2 text-muted-foreground hover:bg-rose-50 hover:text-rose-600" aria-label="Delete role">
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>

            {r.is_admin_role ? (
              <p className="mt-3 text-sm text-muted-foreground">Has full org-management access — all permissions implicitly included.</p>
            ) : (
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {PERMISSIONS.map((p) => (
                  <label key={p.key} className="flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-sm hover:bg-accent cursor-pointer">
                    <input
                      type="checkbox"
                      checked={r.permissions.includes(p.key)}
                      onChange={() => togglePermissionOnExisting(r.id, r.permissions, p.key)}
                      className="h-4 w-4 rounded border-input"
                    />
                    {p.label}
                  </label>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
