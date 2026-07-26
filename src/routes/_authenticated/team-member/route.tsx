import { createFileRoute, Outlet, Link, redirect } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { LogOut, ShieldCheck } from "lucide-react";
import { Logo } from "@/components/Logo";
import { supabase } from "@/integrations/supabase/client";
import { PERMISSIONS, type PermissionKey, type OrgRole } from "@/lib/organization";

// ============================================================
// FILE 1 of 2 — src/routes/_authenticated/team-member/route.tsx
// ============================================================
// This is a SEPARATE dashboard from /organization/* — that one is gated
// to the ORG OWNER (profiles.primary_role === "organization"). This one
// is for people who joined an org as a TEAM MEMBER via an invite link.
// The guard here checks "do you have at least one active org_members
// row", completely independent of primary_role, so it never collides
// with onboarding or the owner dashboard's own guard.

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

export const Route = createFileRoute("/_authenticated/team-member")({
  beforeLoad: async () => {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) throw redirect({ to: "/login" });
    // No primary_role check here on purpose — membership, not primary_role,
    // is what grants access to this dashboard.
  },
  component: TeamMemberShell,
});

function TeamMemberShell() {
  const { data: memberships, isLoading } = useQuery({
    queryKey: ["my-active-memberships"],
    queryFn: fetchMyActiveMemberships,
  });

  async function signOut() {
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  if (isLoading) {
    return <div className="grid min-h-dvh place-items-center bg-background text-sm text-muted-foreground">Loading…</div>;
  }

  if (!memberships || memberships.length === 0) {
    return (
      <div className="grid min-h-dvh place-items-center bg-muted/30 px-6">
        <div className="w-full max-w-md rounded-3xl border border-border bg-card p-8 text-center">
          <Link to="/" className="mx-auto mb-6 flex justify-center"><Logo className="h-8" /></Link>
          <h1 className="font-display text-xl font-semibold">No team membership found</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            You're not an active member of any organization yet. If you were just invited, use the invite link again.
          </p>
          <button onClick={signOut} className="mt-6 flex w-full items-center justify-center gap-2 rounded-full border border-input px-4 py-2.5 text-sm font-semibold hover:bg-accent">
            <LogOut className="h-4 w-4" /> Logout
          </button>
        </div>
      </div>
    );
  }

  // Most people will belong to exactly one org via invite; if more than
  // one, just show the first for now (a switcher is future polish).
  const membership = memberships[0];

  return (
    <div className="min-h-dvh bg-muted/30">
      <div className="border-b border-border bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4 md:px-8">
          <Link to="/"><Logo className="h-7" /></Link>
          <button onClick={signOut} className="flex items-center gap-2 rounded-full border border-input px-3.5 py-1.5 text-sm font-semibold hover:bg-accent">
            <LogOut className="h-4 w-4" /> Logout
          </button>
        </div>
      </div>
      <main className="mx-auto max-w-5xl px-4 py-8 md:px-8 md:py-10">
        <div className="mb-6 flex items-center gap-2 rounded-2xl bg-brand-violet/10 px-5 py-3 text-sm font-semibold text-brand-violet">
          <ShieldCheck className="h-4 w-4" />
          {membership.org_name} · {membership.role?.name ?? "Member"}
        </div>
        <Outlet context={{ membership }} />
      </main>
    </div>
  );
}
