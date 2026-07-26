import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, Circle, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PERMISSIONS, type PermissionKey, type OrgRole } from "@/lib/organization";

// ============================================================
// FILE 2 of 2 — src/routes/_authenticated/team-member/index.tsx
// ============================================================

type MyMembership = {
  id: string;
  org_id: string;
  org_name: string;
  role: OrgRole | null;
};

async function fetchMyActiveMemberships(): Promise<MyMembership[]> {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return [];
  const { data, error } = await supabase
    .from("org_members")
    .select("id, org_id, org:organizations(name), role:org_roles(*)")
    .eq("user_id", userData.user.id)
    .eq("status", "active");
  if (error) throw error;
  return ((data ?? []) as unknown as Array<{ id: string; org_id: string; org: { name: string } | null; role: OrgRole | null }>).map((r) => ({
    id: r.id,
    org_id: r.org_id,
    org_name: r.org?.name ?? "Organization",
    role: r.role,
  }));
}

export const Route = createFileRoute("/_authenticated/team-member/")({
  head: () => ({ meta: [{ title: "My Dashboard — EventOrbit AI" }, { name: "robots", content: "noindex" }] }),
  component: TeamMemberHome,
});

function TeamMemberHome() {
  const { data: memberships } = useQuery({
    queryKey: ["my-active-memberships"],
    queryFn: fetchMyActiveMemberships,
  });
  const membership = memberships?.[0];
  const role = membership?.role ?? null;
  const isAdmin = role?.is_admin_role ?? false;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl font-semibold">Welcome</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          You're part of <span className="font-medium text-foreground">{membership?.org_name}</span> as{" "}
          <span className="font-medium text-foreground">{role?.name ?? "a team member"}</span>.
        </p>
      </div>

      <div className="rounded-2xl border border-border bg-card p-6">
        <div className="flex items-center gap-2 mb-4">
          <ShieldCheck className="h-5 w-5 text-brand-violet" />
          <p className="font-semibold">What you can do</p>
        </div>

        {isAdmin ? (
          <p className="text-sm text-muted-foreground">
            Your role has full org-management access. (Team members with this level of access can currently manage
            things from the organization owner's dashboard if given a login there — a dedicated management view
            for admin-role members is on the roadmap.)
          </p>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2">
            {PERMISSIONS.map((p) => {
              const has = role?.permissions.includes(p.key as PermissionKey) ?? false;
              return (
                <div key={p.key} className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-sm ${has ? "border-emerald-200 bg-emerald-50 dark:bg-emerald-950/20 dark:border-emerald-900" : "border-border text-muted-foreground"}`}>
                  {has ? <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" /> : <Circle className="h-4 w-4 shrink-0" />}
                  {p.label}
                </div>
              );
            })}
          </div>
        )}

        <p className="mt-4 text-xs text-muted-foreground">
          The actual screens for each permission (e.g. a dedicated "Scan QR" tool, a "Manage Certificates" page) are
          being built next — this view confirms exactly what you're authorized for in the meantime.
        </p>
      </div>
    </div>
  );
}
