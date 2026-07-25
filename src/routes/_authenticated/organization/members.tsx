import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { UserPlus, X, ShieldCheck, Copy, Check } from "lucide-react";
import { fetchMyOrganization, fetchDepartments, fetchMembers, fetchRoles, inviteMember, removeMember, type OrgMember } from "@/lib/organization";

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
  const { data: roles } = useQuery({
    queryKey: ["organization-roles", org?.id],
    queryFn: () => fetchRoles(org!.id),
    enabled: !!org?.id,
  });
  const { data: members, isLoading } = useQuery({
    queryKey: ["organization-members", org?.id],
    queryFn: () => fetchMembers(org!.id),
    enabled: !!org?.id,
  });

  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [roleId, setRoleId] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const hasRoles = (roles?.length ?? 0) > 0;

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!org?.id || !email.trim() || !roleId) return;
    setSaving(true);
    setError(null);
    try {
      await inviteMember(org.id, email.trim(), roleId, {
        fullName: fullName.trim() || undefined,
        departmentId: departmentId || null,
      });
      setEmail(""); setFullName(""); setRoleId(""); setDepartmentId("");
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

  function copyInviteLink(member: OrgMember & { invite_token?: string }) {
    if (!member.invite_token) return;
    const link = `${window.location.origin}/join-organization/${member.invite_token}`;
    navigator.clipboard.writeText(link);
    setCopiedId(member.id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  function roleName(id: string | null) {
    return (roles ?? []).find((r) => r.id === id)?.name ?? "—";
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl font-semibold">Team Members</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Invite people using the roles you've defined. No roles yet?{" "}
          <Link to="/organization/roles" className="font-semibold text-brand-violet hover:underline">Create one first</Link>.
        </p>
      </div>

      <form onSubmit={handleInvite} className="rounded-2xl border border-border bg-card p-6 space-y-4">
        {!hasRoles ? (
          <p className="text-sm text-amber-600">
            You need at least one role before inviting members —{" "}
            <Link to="/organization/roles" className="font-semibold underline">create a role first</Link>.
          </p>
        ) : (
          <>
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
                <select value={roleId} onChange={(e) => setRoleId(e.target.value)} required
                  className="mt-1.5 w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm">
                  <option value="">Choose a role…</option>
                  {(roles ?? []).map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                </select>
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
            {error && <p className="text-sm text-rose-600">{error}</p>}
            <button type="submit" disabled={saving || !org?.id}
              className="flex items-center gap-2 rounded-full bg-brand-violet px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-violet/90 disabled:opacity-50">
              <UserPlus className="h-4 w-4" /> {saving ? "Inviting…" : "Invite member"}
            </button>
          </>
        )}
      </form>

      <div className="space-y-3">
        {isLoading && <p className="text-sm text-muted-foreground">Loading team…</p>}
        {!isLoading && (members?.length ?? 0) === 0 && <p className="text-sm text-muted-foreground">No team members yet.</p>}
        {(members ?? []).filter((m) => m.status !== "removed").map((m) => (
          <div key={m.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card p-5">
            <div>
              <div className="flex items-center gap-2">
                <p className="font-medium">{m.full_name || m.invited_email}</p>
                {m.is_admin_role && <ShieldCheck className="h-4 w-4 text-brand-violet" aria-label="Admin access" />}
              </div>
              <p className="text-sm text-muted-foreground">
                {roleName((m as OrgMember & { role_id?: string }).role_id ?? null)} · {m.invited_email}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${STATUS_BADGE[m.status]}`}>{m.status}</span>
              {m.status === "invited" && (
                <button
                  onClick={() => copyInviteLink(m as OrgMember & { invite_token?: string })}
                  className="flex items-center gap-1.5 rounded-full border border-input px-3 py-1.5 text-xs font-semibold hover:bg-accent"
                >
                  {copiedId === m.id ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                  {copiedId === m.id ? "Copied!" : "Copy invite link"}
                </button>
              )}
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
