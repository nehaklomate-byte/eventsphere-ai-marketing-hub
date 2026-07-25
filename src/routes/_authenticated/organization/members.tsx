import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { UserPlus, X, ShieldCheck } from "lucide-react";
import { fetchMyOrganization, fetchDepartments, fetchMembers, inviteMember, removeMember } from "@/lib/organization";

export const Route = createFileRoute("/_authenticated/organization/members")({
  head: () => ({ meta: [{ title: "Team Members — EventOrbit AI" }, { name: "robots", content: "noindex" }] }),
  component: MembersPage,
});

const STATUS_BADGE: Record<string, string> = {
  invited: "bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300",
  active: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300",
  removed: "bg-zinc-200 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400",
};

function MembersPage() {
  const qc = useQueryClient();
  const { data: org } = useQuery({ queryKey: ["organization-mine"], queryFn: fetchMyOrganization });
  const { data: departments } = useQuery({
    queryKey: ["organization-departments", org?.id],
    queryFn: () => fetchDepartments(org!.id),
    enabled: !!org?.id,
  });
  const { data: members, isLoading } = useQuery({
    queryKey: ["organization-members", org?.id],
    queryFn: () => fetchMembers(org!.id),
    enabled: !!org?.id,
  });

  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [roleLabel, setRoleLabel] = useState("");
  const [isAdminRole, setIsAdminRole] = useState(false);
  const [departmentId, setDepartmentId] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!org?.id || !email.trim() || !roleLabel.trim()) return;
    setSaving(true);
    setError(null);
    try {
      await inviteMember(org.id, email.trim(), roleLabel.trim(), {
        fullName: fullName.trim() || undefined,
        isAdminRole,
        departmentId: departmentId || null,
      });
      setEmail(""); setFullName(""); setRoleLabel(""); setIsAdminRole(false); setDepartmentId("");
      await qc.invalidateQueries({ queryKey: ["organization-members", org.id] });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to invite member");
    } finally {
      setSaving(false);
    }
  }

  async function handleRemove(id: string) {
    if (!org?.id) return;
    if (!window.confirm("Remove this team member?")) return;
    await removeMember(id);
    await qc.invalidateQueries({ queryKey: ["organization-members", org.id] });
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl font-semibold">Team Members</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Invite anyone with any role you want — Event Lead, Judge, Technical Head, Volunteer — the role name is fully custom.
        </p>
        <p className="mt-1 text-xs text-amber-600">
          Note: this creates the invite record. Actually emailing them a signup link is a Phase 2 item (Supabase invite-by-email) — for now, share the platform signup link with them manually and they'll be linked once they register with this email.
        </p>
      </div>

      <form onSubmit={handleInvite} className="rounded-2xl border border-border bg-card p-6 space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="text-sm font-medium">Email *</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required
              placeholder="member@example.com" className="mt-1.5 w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm" />
          </div>
          <div>
            <label className="text-sm font-medium">Full name</label>
            <input value={fullName} onChange={(e) => setFullName(e.target.value)}
              placeholder="Optional" className="mt-1.5 w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm" />
          </div>
          <div>
            <label className="text-sm font-medium">Role *</label>
            <input value={roleLabel} onChange={(e) => setRoleLabel(e.target.value)} required
              placeholder="e.g. Event Lead, Judge, Technical Head" className="mt-1.5 w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm" />
          </div>
          <div>
            <label className="text-sm font-medium">Department</label>
            <select value={departmentId} onChange={(e) => setDepartmentId(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm">
              <option value="">— None —</option>
              {(departments ?? []).map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={isAdminRole} onChange={(e) => setIsAdminRole(e.target.checked)} className="h-4 w-4 rounded border-input" />
          Give this role full org-management access (can invite/remove members, manage departments and events)
        </label>
        {error && <p className="text-sm text-rose-600">{error}</p>}
        <button type="submit" disabled={saving || !org?.id}
          className="flex items-center gap-2 rounded-full bg-brand-violet px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-violet/90 disabled:opacity-50">
          <UserPlus className="h-4 w-4" /> {saving ? "Inviting…" : "Invite member"}
        </button>
      </form>

      <div className="space-y-3">
        {isLoading && <p className="text-sm text-muted-foreground">Loading team…</p>}
        {!isLoading && (members?.length ?? 0) === 0 && <p className="text-sm text-muted-foreground">No team members yet.</p>}
        {(members ?? []).filter((m) => m.status !== "removed").map((m) => (
          <div key={m.id} className="flex items-center justify-between rounded-2xl border border-border bg-card p-5">
            <div>
              <div className="flex items-center gap-2">
                <p className="font-medium">{m.full_name || m.invited_email}</p>
                {m.is_admin_role && <ShieldCheck className="h-4 w-4 text-brand-violet" aria-label="Admin access" />}
              </div>
              <p className="text-sm text-muted-foreground">{m.role_label} · {m.invited_email}</p>
            </div>
            <div className="flex items-center gap-3">
              <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${STATUS_BADGE[m.status]}`}>{m.status}</span>
              <button onClick={() => handleRemove(m.id)} className="rounded-lg p-2 text-muted-foreground hover:bg-rose-50 hover:text-rose-600" aria-label="Remove member">
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
