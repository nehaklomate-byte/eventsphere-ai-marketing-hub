import { createFileRoute, Outlet, Link, useRouterState, redirect } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { LogOut, ShieldCheck, Clock, LayoutDashboard, CalendarDays, Building2, Users } from "lucide-react";
import { Logo } from "@/components/Logo";
import { supabase } from "@/integrations/supabase/client";
import { fetchMyMemberships, memberHasPermission } from "@/lib/organization";

export const Route = createFileRoute("/_authenticated/team-member")({
  beforeLoad: async () => {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) throw redirect({ to: "/login" });
  },
  component: TeamMemberShell,
});

function TeamMemberShell() {
  const { data: memberships, isLoading } = useQuery({
    queryKey: ["my-memberships"],
    queryFn: fetchMyMemberships,
  });
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  async function signOut() {
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  if (isLoading) {
    return <div className="grid min-h-dvh place-items-center bg-background text-sm text-muted-foreground">Loading...</div>;
  }

  const membership = memberships?.[0];

  if (!membership) {
    return (
      <div className="grid min-h-dvh place-items-center bg-muted/30 px-6">
        <div className="w-full max-w-md rounded-3xl border border-border bg-card p-8 text-center">
          <Link to="/" className="mx-auto mb-6 flex justify-center"><Logo className="h-8" /></Link>
          <h1 className="font-display text-xl font-semibold">No team membership found</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            You're not a member of any organization yet. If you were just invited, use the invite link again.
          </p>
          <button onClick={signOut} className="mt-6 flex w-full items-center justify-center gap-2 rounded-full border border-input px-4 py-2.5 text-sm font-semibold hover:bg-accent">
            <LogOut className="h-4 w-4" /> Logout
          </button>
        </div>
      </div>
    );
  }

  if (membership.status === "pending_confirmation") {
    return (
      <div className="grid min-h-dvh place-items-center bg-muted/30 px-6">
        <div className="w-full max-w-md rounded-3xl border border-border bg-card p-8 text-center">
          <Link to="/" className="mx-auto mb-6 flex justify-center"><Logo className="h-8" /></Link>
          <Clock className="mx-auto mb-3 h-9 w-9 text-amber-500" />
          <h1 className="font-display text-xl font-semibold">Waiting for confirmation</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            You've joined <span className="font-medium text-foreground">{membership.org_name}</span> as{" "}
            <span className="font-medium text-foreground">{membership.role?.name ?? "a team member"}</span>.
            The organization's admin needs to confirm you before your dashboard unlocks — this is usually quick.
          </p>
          <button onClick={signOut} className="mt-6 flex w-full items-center justify-center gap-2 rounded-full border border-input px-4 py-2.5 text-sm font-semibold hover:bg-accent">
            <LogOut className="h-4 w-4" /> Logout
          </button>
        </div>
      </div>
    );
  }

  const role = membership.role;
  const canEvents = memberHasPermission(role, "create_event") || memberHasPermission(role, "edit_event") || memberHasPermission(role, "publish_event");
  const canDepartments = memberHasPermission(role, "manage_departments");
  const canInvite = memberHasPermission(role, "invite_members");

  const NAV = [
    { to: "/team-member", label: "Dashboard", icon: LayoutDashboard, exact: true, show: true },
    { to: "/team-member/events", label: "Events", icon: CalendarDays, show: canEvents },
    { to: "/team-member/departments", label: "Departments", icon: Building2, show: canDepartments },
    { to: "/team-member/members", label: "Invite Members", icon: Users, show: canInvite },
  ].filter((i) => i.show);

  const isActive = (to: string, exact?: boolean) => (exact ? pathname === to : pathname === to || pathname.startsWith(to + "/"));

  return (
    <div className="min-h-dvh bg-muted/30">
      <div className="mx-auto flex max-w-6xl">
        <aside className="hidden md:block sticky top-0 h-dvh w-64 shrink-0 border-r border-border bg-background/95 p-3">
          <div className="flex h-16 items-center px-2"><Link to="/"><Logo className="h-7" /></Link></div>
          <nav className="flex flex-col gap-0.5">
            {NAV.map((it) => {
              const Icon = it.icon;
              return (
                <Link key={it.label} to={it.to as never} className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium ${isActive(it.to, it.exact) ? "bg-brand-violet/10 text-brand-violet" : "text-muted-foreground hover:bg-accent"}`}>
                  <Icon className="h-4 w-4" /> {it.label}
                </Link>
              );
            })}
            <button onClick={signOut} className="mt-2 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-accent">
              <LogOut className="h-4 w-4" /> Logout
            </button>
          </nav>
        </aside>
        <main className="min-h-dvh flex-1 px-4 py-6 md:px-8 md:py-10">
          <div className="mb-6 flex items-center justify-between gap-2 rounded-2xl bg-brand-violet/10 px-5 py-3 text-sm font-semibold text-brand-violet">
            <span className="flex items-center gap-2"><ShieldCheck className="h-4 w-4" /> {membership.org_name} - {role?.name ?? "Member"}</span>
            <button onClick={signOut} className="md:hidden"><LogOut className="h-4 w-4" /></button>
          </div>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
