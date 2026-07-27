import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { UserPlus, X, ShieldCheck, Copy, Check, UserCheck, Clock } from "lucide-react";
import {
  fetchMyOrganization, fetchDepartments, fetchMembers, fetchRoles, inviteMember, removeMember,
  confirmMember, rejectPendingMember, type OrgMember,
} from "@/lib/organization";

export const Route = createFileRoute("/_authenticated/organization/members")({
  head: () => ({ meta: [{ title: "Team Members - EventOrbit AI" }, { name: "robots", content: "noindex" }] }),
  component: MembersPage,
});

const TABS = ["all", "pending_confirmation", "invited", "active"] as const;
const TAB_LABEL: Record<(typeof TABS)[number], string> = {
  all: "All",
  pending_confirmation: "Pending Confirmation",
  invited: "Invited",
  active: "Active",
};
const STATUS_BADGE: Record<string, string> = {
  invited: "bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300",
  pending_confirmation: "bg-orange-100 text-orange-800 dark:bg-orange-950/40 dark:text-orange-300",
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

  const [tab, setTab] = useState<(typeof TABS)[number]>("pending_confirmation");
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [roleId, setRoleId] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const hasRoles = (roles?.length ?? 0) > 0;
  const pendingCount = (members ?? []).filter((m) => m.status === "pending_confirmation").length;

  async function invalidateMembers() {
    if (org?.id) await qc.invalidateQueries({ queryKey: ["organization-members", org.id] });
  }

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!org?.id || !email.trim() || !roleId) return;
    setSaving(true);
    setError(null);
    try {
      await inviteMember(org.id, email.trim(), roleId, {
        fullName: fullName.trim() || undefined,
        departmentId: departmentId || null,
        orgName: org.name,
        roleName: (roles ?? []).find((r) => r.id === roleId)?.name,
      });
      setEmail(""); setFullName(""); setRoleId(""); setDepartmentId("");
      await invalidateMembers();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to invite member");
    } finally {
      setSaving(false);
    }
  }

  async function handleConfirm(id: string) {
    setBusyId(id);
    try {
      await confirmMember(id);
      await invalidateMembers();
    } finally {
      setBusyId(null);
    }
  }

  async function handleRejectPending(id: string) {
    if (!window.confirm("Reject this person? They won't get access.")) return;
    setBusyId(id);
    try {
      await rejectPendingMember(id);
      await invalidateMembers();
    } finally {
      setBusyId(null);
    }
  }

  async function handleRemove(id: string) {
    if (!window.confirm("Remove this team member?")) return;
    await removeMember(id);
    await invalidateMembers();
  }

  function copyInviteLink(member: OrgMember) {
    if (!member.invite_token) return;
    const link = `${window.location.origin}/join-organization/${member.invite_token}`;
    navigator.clipboard.writeText(link);
    setCopiedId(member.id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  function roleName(id: string | null) {
    return (roles ?? []).find((r) => r.id === id)?.name ?? "-";
  }

  const filteredMembers = (members ?? []).filter((m) => {
    if (m.status === "removed") return false;
    if (tab === "all") return true;
    return m.status === tab;
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl font-semibold">Team Members</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Invite people using the roles you've defined. No roles yet?{" "}
          <Link to="/organization/roles" className="font-semibold text-brand-violet hover:underline">Create one first</Link>.
        </p>
      </div>

      {pendingCount > 0 && (
        <div className="flex items-center gap-2 rounded-2xl bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-900 px-5 py-3 text-sm font-semibold text-orange-800 dark:text-orange-300">
          <Clock className="h-4 w-4" /> {pendingCount} {pendingCount === 1 ? "person has" : "people have"} joined and {pendingCount === 1 ? "is" : "are"} waiting for your confirmation.
        </div>
      )}

      <form onSubmit={handleInvite} className="rounded-2xl border border-border bg-card p-6 space-y-4">
        {!hasRoles ? (
          <p className="text-sm text-amber-600">
            You need at least one role before inviting members -{" "}
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
                  <option value="">Choose a role...</option>
                  {(roles ?? []).map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium">Department</label>
                <select value={departmentId} onChange={(e) => setDepartmentId(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm">
                  <option value="">- None -</option>
                  {(departments ?? []).map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>
            </div>
            {error && <p className="text-sm text-rose-600">{error}</p>}
            <button type="submit" disabled={saving || !org?.id}
              className="flex items-center gap-2 rounded-full bg-brand-violet px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-violet/90 disabled:opacity-50">
              <UserPlus className="h-4 w-4" /> {saving ? "Inviting..." : "Invite member"}
            </button>
          </>
        )}
      </form>

      <div className="flex flex-wrap gap-2 border-b border-border pb-3">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold uppercase tracking-wide transition ${
              tab === t ? "bg-foreground text-background" : "text-muted-foreground hover:bg-accent"
            }`}
          >
            {TAB_LABEL[t]}
            {t === "pending_confirmation" && pendingCount > 0 && (
              <span className="rounded-full bg-orange-500 px-1.5 text-[10px] font-bold text-white">{pendingCount}</span>
            )}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {isLoading && <p className="text-sm text-muted-foreground">Loading team...</p>}
        {!isLoading && filteredMembers.length === 0 && <p className="text-sm text-muted-foreground">Nothing here.</p>}
        {filteredMembers.map((m) => (
          <div key={m.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card p-5">
            <div>
              <div className="flex items-center gap-2">
                <p className="font-medium">{m.full_name || m.invited_email}</p>
                {m.is_admin_role && <ShieldCheck className="h-4 w-4 text-brand-violet" aria-label="Admin access" />}
              </div>
              <p className="text-sm text-muted-foreground">
                {roleName(m.role_id)} · {m.invited_email}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${STATUS_BADGE[m.status]}`}>{TAB_LABEL[m.status as keyof typeof TAB_LABEL] ?? m.status}</span>

              {m.status === "invited" && (
                <button onClick={() => copyInviteLink(m)} className="flex items-center gap-1.5 rounded-full border border-input px-3 py-1.5 text-xs font-semibold hover:bg-accent">
                  {copiedId === m.id ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                  {copiedId === m.id ? "Copied!" : "Copy invite link"}
                </button>
              )}

              {m.status === "pending_confirmation" && (
                <>
                  <button disabled={busyId === m.id} onClick={() => handleConfirm(m.id)}
                    className="flex items-center gap-1.5 rounded-full bg-emerald-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50">
                    <UserCheck className="h-3.5 w-3.5" /> Confirm
                  </button>
                  <button disabled={busyId === m.id} onClick={() => handleRejectPending(m.id)}
                    className="flex items-center gap-1.5 rounded-full bg-rose-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-rose-700 disabled:opacity-50">
                    <X className="h-3.5 w-3.5" /> Reject
                  </button>
                </>
              )}

              {m.status === "active" && (
                <button onClick={() => handleRemove(m.id)} className="rounded-lg p-2 text-muted-foreground hover:bg-rose-50 hover:text-rose-600" aria-label="Remove member">
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
