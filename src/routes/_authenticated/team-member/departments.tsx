import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Plus, Trash2, Building2, Lock } from "lucide-react";
import { fetchMyMemberships, fetchDepartments, createDepartment, deleteDepartment, memberHasPermission } from "@/lib/organization";

export const Route = createFileRoute("/_authenticated/team-member/departments")({
  head: () => ({ meta: [{ title: "Departments - EventOrbit AI" }, { name: "robots", content: "noindex" }] }),
  component: TeamMemberDepartmentsPage,
});

function TeamMemberDepartmentsPage() {
  const qc = useQueryClient();
  const { data: memberships } = useQuery({ queryKey: ["my-memberships"], queryFn: fetchMyMemberships });
  const membership = memberships?.[0];
  const orgId = membership?.org_id;
  const canManage = memberHasPermission(membership?.role ?? null, "manage_departments");

  const { data: departments, isLoading } = useQuery({
    queryKey: ["organization-departments", orgId],
    queryFn: () => fetchDepartments(orgId!),
    enabled: !!orgId && canManage,
  });

  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);

  if (!canManage) {
    return (
      <div className="flex items-center gap-3 rounded-2xl border border-border bg-card p-8 text-sm text-muted-foreground">
        <Lock className="h-5 w-5" /> You don't have permission to manage Departments.
      </div>
    );
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!orgId || !name.trim()) return;
    setSaving(true);
    try {
      await createDepartment(orgId, name.trim());
      setName("");
      await qc.invalidateQueries({ queryKey: ["organization-departments", orgId] });
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!orgId || !window.confirm("Remove this department?")) return;
    await deleteDepartment(id);
    await qc.invalidateQueries({ queryKey: ["organization-departments", orgId] });
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl font-semibold">Departments</h1>
        <p className="mt-1 text-sm text-muted-foreground">Create and manage departments for your organization.</p>
      </div>

      <form onSubmit={handleCreate} className="rounded-2xl border border-border bg-card p-6 space-y-4">
        <div>
          <label className="text-sm font-medium">Department name *</label>
          <input value={name} onChange={(e) => setName(e.target.value)} required
            placeholder="e.g. Technical Team" className="mt-1.5 w-full max-w-md rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm" />
        </div>
        <button type="submit" disabled={saving}
          className="flex items-center gap-2 rounded-full bg-brand-violet px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-violet/90 disabled:opacity-50">
          <Plus className="h-4 w-4" /> {saving ? "Adding..." : "Add department"}
        </button>
      </form>

      <div className="space-y-3">
        {isLoading && <p className="text-sm text-muted-foreground">Loading...</p>}
        {(departments ?? []).map((d) => (
          <div key={d.id} className="flex items-center justify-between rounded-2xl border border-border bg-card p-5">
            <div className="flex items-center gap-3">
              <div className="grid h-9 w-9 place-items-center rounded-lg bg-brand-violet/10 text-brand-violet"><Building2 className="h-4 w-4" /></div>
              <p className="font-medium">{d.name}</p>
            </div>
            <button onClick={() => handleDelete(d.id)} className="rounded-lg p-2 text-muted-foreground hover:bg-rose-50 hover:text-rose-600"><Trash2 className="h-4 w-4" /></button>
          </div>
        ))}
      </div>
    </div>
  );
}
