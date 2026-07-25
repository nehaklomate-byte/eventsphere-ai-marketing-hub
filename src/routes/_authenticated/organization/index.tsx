import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Building2, Users, CalendarDays, ShieldCheck, ShieldAlert, Clock, Plus } from "lucide-react";
import { fetchMyOrganization, fetchDepartments, fetchMembers, fetchOrgEvents } from "@/lib/organization";

export const Route = createFileRoute("/_authenticated/organization/")({
  head: () => ({ meta: [{ title: "Organization Dashboard — EventOrbit AI" }, { name: "robots", content: "noindex" }] }),
  component: OrganizationDashboardHome,
});

const VERIFICATION_BADGE: Record<string, { label: string; className: string; icon: typeof ShieldCheck }> = {
  pending: { label: "Verification pending", className: "bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300", icon: Clock },
  approved: { label: "Verified", className: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300", icon: ShieldCheck },
  rejected: { label: "Verification rejected", className: "bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300", icon: ShieldAlert },
};

function OrganizationDashboardHome() {
  const { data: org, isLoading: orgLoading } = useQuery({ queryKey: ["organization-mine"], queryFn: fetchMyOrganization });

  const { data: departments } = useQuery({
    queryKey: ["organization-departments", org?.id],
    queryFn: () => fetchDepartments(org!.id),
    enabled: !!org?.id,
  });
  const { data: members } = useQuery({
    queryKey: ["organization-members", org?.id],
    queryFn: () => fetchMembers(org!.id),
    enabled: !!org?.id,
  });
  const { data: events } = useQuery({
    queryKey: ["organization-events", org?.id],
    queryFn: () => fetchOrgEvents(org!.id),
    enabled: !!org?.id,
  });

  const activeMembers = (members ?? []).filter((m) => m.status === "active").length;
  const pendingInvites = (members ?? []).filter((m) => m.status === "invited").length;
  const upcomingEvents = (events ?? []).filter((e) => e.status === "published" || e.status === "ongoing").length;

  return (
    <div className="space-y-8">
      <div className="rounded-3xl border border-border bg-gradient-to-br from-brand-violet/10 via-secondary/5 to-background p-8 md:p-10">
        <span className="inline-flex rounded-full bg-white/60 dark:bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-widest text-brand-violet">
          Organization
        </span>
        <h1 className="mt-4 font-display text-3xl md:text-4xl font-semibold tracking-tight">
          {orgLoading ? "Loading…" : org ? org.name : "Your organization"}
        </h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          Set up departments, invite your team, and run events — all from one place.
        </p>
      </div>

      {org && (
        <div className={`flex items-center gap-2 rounded-2xl px-5 py-3 text-sm font-semibold ${VERIFICATION_BADGE[org.verification_status]?.className}`}>
          {(() => { const Icon = VERIFICATION_BADGE[org.verification_status]?.icon ?? Clock; return <Icon className="h-4 w-4" />; })()}
          {VERIFICATION_BADGE[org.verification_status]?.label}
          {org.verification_status === "rejected" && org.rejection_reason && (
            <span className="font-normal">— {org.rejection_reason}</span>
          )}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        <Link to="/organization/departments" className="group rounded-2xl border border-border bg-card p-6 transition hover:border-brand-violet/40 hover:shadow-soft">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-brand-violet/10 text-brand-violet"><Building2 className="h-5 w-5" /></div>
          <h3 className="mt-4 font-display text-lg font-semibold">Departments</h3>
          <p className="mt-1 text-sm text-muted-foreground">{departments?.length ?? 0} departments set up.</p>
        </Link>

        <Link to="/organization/members" className="group rounded-2xl border border-border bg-card p-6 transition hover:border-brand-violet/40 hover:shadow-soft">
          <div className="flex items-center justify-between">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-brand-violet/10 text-brand-violet"><Users className="h-5 w-5" /></div>
            {pendingInvites > 0 && <span className="rounded-full bg-amber-500 px-2 py-0.5 text-[11px] font-semibold text-white">{pendingInvites} pending</span>}
          </div>
          <h3 className="mt-4 font-display text-lg font-semibold">Team Members</h3>
          <p className="mt-1 text-sm text-muted-foreground">{activeMembers} active members.</p>
        </Link>

        <Link to="/organization/events" className="group rounded-2xl border border-border bg-card p-6 transition hover:border-brand-violet/40 hover:shadow-soft">
          <div className="flex items-center justify-between">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-brand-violet/10 text-brand-violet"><CalendarDays className="h-5 w-5" /></div>
            {upcomingEvents > 0 && <span className="rounded-full bg-brand-violet px-2 py-0.5 text-[11px] font-semibold text-white">{upcomingEvents} live</span>}
          </div>
          <h3 className="mt-4 font-display text-lg font-semibold">Events</h3>
          <p className="mt-1 text-sm text-muted-foreground">{events?.length ?? 0} total events created.</p>
        </Link>
      </div>

      {!orgLoading && (departments?.length ?? 0) === 0 && (
        <Link
          to="/organization/departments"
          className="flex items-center justify-between rounded-2xl border border-dashed border-brand-violet/40 bg-brand-violet/5 px-6 py-5 text-sm font-semibold text-brand-violet hover:border-brand-violet transition"
        >
          <span className="flex items-center gap-2"><Plus className="h-4 w-4" /> Set up your first department to start structuring your team</span>
        </Link>
      )}
    </div>
  );
}
