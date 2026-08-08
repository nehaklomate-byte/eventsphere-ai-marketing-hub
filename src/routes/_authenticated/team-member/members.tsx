import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { UserPlus, Lock } from "lucide-react";
import { fetchMyMemberships, fetchRoles, inviteMember, memberHasPermission } from "@/lib/organization";

export const Route = createFileRoute("/_authenticated/team-member/members")({
  head: () => ({ meta: [{ title: "Invite Members - EventOrbit Nova" }, { name: "robots", content: "noindex" }] }),
  component: TeamMemberInvitePage,
});

function TeamMemberInvitePage() {
  const qc = useQueryClient();
  const { data: memberships } = useQuery({ queryKey: ["my-memberships"], queryFn: fetchMyMemberships });
  const membership = memberships?.[0];
  const orgId = membership?.org_id;
  const canInvite = memberHasPermission(membership?.role ?? null, "invite_members");

  const { data: roles } = useQuery({
    queryKey: ["organization-roles", orgId],
    queryFn: () => fetchRoles(orgId!),
    enabled: !!orgId && canInvite,
  });

  const [email, setEmail] = useState("");
  const [roleId, setRoleId] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  if (!canInvite) {
    return (
      <div className="flex items-center gap-3 rounded-2xl border border-border bg-card p-8 text-sm text-muted-foreground">
        <Lock className="h-5 w-5" /> You don't have permission to invite members.
      </div>
    );
  }

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!orgId || !email.trim() || !roleId) return;
    setSaving(true);
    setMessage(null);
    try {
      await inviteMember(orgId, email.trim(), roleId, {
        orgName: membership?.org_name,
        roleName: (roles ?? []).find((r) => r.id === roleId)?.name,
      });
      setMessage({ type: "success", text: `Invited ${email}.` });
      setEmail(""); setRoleId("");
    } catch (err) {
      setMessage({ type: "error", text: err instanceof Error ? err.message : "Failed to invite" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl font-semibold">Invite Members</h1>
        <p className="mt-1 text-sm text-muted-foreground">Invite new team members using the roles the organization has set up.</p>
      </div>

      <form onSubmit={handleInvite} className="rounded-2xl border border-border bg-card p-6 space-y-4 max-w-lg">
        <div>
          <label className="text-sm font-medium">Email *</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required
            className="mt-1.5 w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm" />
        </div>
        <div>
          <label className="text-sm font-medium">Role *</label>
          <select value={roleId} onChange={(e) => setRoleId(e.target.value)} required
            className="mt-1.5 w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm">
            <option value="">Choose a role...</option>
            {(roles ?? []).map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
        </div>
        {message && <p className={`text-sm ${message.type === "success" ? "text-emerald-600" : "text-rose-600"}`}>{message.text}</p>}
        <button type="submit" disabled={saving}
          className="flex items-center gap-2 rounded-full bg-brand-violet px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-violet/90 disabled:opacity-50">
          <UserPlus className="h-4 w-4" /> {saving ? "Inviting..." : "Invite"}
        </button>
      </form>
    </div>
  );
}
