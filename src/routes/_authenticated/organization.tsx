import { createFileRoute } from "@tanstack/react-router";
import { DashboardShell, DashboardCard, ComingSoonNote } from "@/components/DashboardShell";

export const Route = createFileRoute("/_authenticated/organization")({
  head: () => ({ meta: [{ title: "Organization workspace — EventSphere AI" }, { name: "robots", content: "noindex" }] }),
  component: OrganizationDashboard,
});

function OrganizationDashboard() {
  return (
    <DashboardShell
      accent="Organization workspace"
      title="Plan and run events with your team"
      subtitle="Manage events, bookings, vendors, budgets and team members from a single command center."
    >
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <DashboardCard title="Events" desc="Create and track weddings, corporate meets, festivals and more." cta="Create event" />
        <DashboardCard title="Vendor network" desc="Discover and hire decorators, caterers, DJs and other vendors." to="/marketplace" cta="Open marketplace" />
        <DashboardCard title="Venue bookings" desc="Enquire and lock in halls that fit your capacity and budget." to="/marketplace" />
        <DashboardCard title="Team members" desc="Invite planners and assign roles across your organization." />
        <DashboardCard title="Budgets" desc="Track estimates, payments and reconciliations per event." />
        <DashboardCard title="Reports" desc="Post-event analytics, ROI and attendee insights." />
      </div>
      <ComingSoonNote />
    </DashboardShell>
  );
}
