import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Plus, Trash2, Building2 } from "lucide-react";
import { fetchMyOrganization, fetchDepartments, createDepartment, deleteDepartment } from "@/lib/organization";

export const Route = createFileRoute("/_authenticated/organization/departments")({
  head: () => ({ meta: [{ title: "Departments — EventOrbit Nova" }, { name: "robots", content: "noindex" }] }),
  component: DepartmentsPage,
});

function DepartmentsPage() {
  const qc = useQueryClient();
  const { data: org } = useQuery({ queryKey: ["organization-mine"], queryFn: fetchMyOrganization });
  const { data: departments, isLoading } = useQuery({
    queryKey: ["organization-departments", org?.id],
    queryFn: () => fetchDepartments(org!.id),
    enabled: !!org?.id,
  });

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!org?.id || !name.trim()) return;
    setSaving(true);
    setError(null);
    try {
      await createDepartment(org.id, name.trim(), description.trim() || undefined);
      setName("");
      setDescription("");
      await qc.invalidateQueries({ queryKey: ["organization-departments", org.id] });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create department");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!org?.id) return;
    if (!window.confirm("Remove this department? Members assigned to it will become unassigned.")) return;
    await deleteDepartment(id);
    await qc.invalidateQueries({ queryKey: ["organization-departments", org.id] });
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl font-semibold">Departments</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Create the groups your team is organized into — e.g. Technical, Cultural, Sponsorship, Hospitality. Fully custom, add as many as you need.
        </p>
      </div>

      <form onSubmit={handleCreate} className="rounded-2xl border border-border bg-card p-6 space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="text-sm font-medium">Department name *</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Technical Team"
              required
              className="mt-1.5 w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm"
            />
          </div>
          <div>
            <label className="text-sm font-medium">Description (optional)</label>
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What this department handles"
              className="mt-1.5 w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm"
            />
          </div>
        </div>
        {error && <p className="text-sm text-rose-600">{error}</p>}
        <button
          type="submit"
          disabled={saving || !org?.id}
          className="flex items-center gap-2 rounded-full bg-brand-violet px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-violet/90 disabled:opacity-50"
        >
          <Plus className="h-4 w-4" /> {saving ? "Adding…" : "Add department"}
        </button>
      </form>

      <div className="space-y-3">
        {isLoading && <p className="text-sm text-muted-foreground">Loading departments…</p>}
        {!isLoading && (departments?.length ?? 0) === 0 && (
          <p className="text-sm text-muted-foreground">No departments yet — add your first one above.</p>
        )}
        {(departments ?? []).map((d) => (
          <div key={d.id} className="flex items-center justify-between rounded-2xl border border-border bg-card p-5">
            <div className="flex items-center gap-3">
              <div className="grid h-9 w-9 place-items-center rounded-lg bg-brand-violet/10 text-brand-violet"><Building2 className="h-4 w-4" /></div>
              <div>
                <p className="font-medium">{d.name}</p>
                {d.description && <p className="text-sm text-muted-foreground">{d.description}</p>}
              </div>
            </div>
            <button onClick={() => handleDelete(d.id)} className="rounded-lg p-2 text-muted-foreground hover:bg-rose-50 hover:text-rose-600" aria-label="Delete department">
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
