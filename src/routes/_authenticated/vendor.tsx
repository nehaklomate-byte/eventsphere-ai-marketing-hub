import { createFileRoute } from "@tanstack/react-router";
import { DashboardShell, DashboardCard, ComingSoonNote } from "@/components/DashboardShell";

export const Route = createFileRoute("/_authenticated/vendor")({
  head: () => ({ meta: [{ title: "Vendor workspace — EventSphere AI" }, { name: "robots", content: "noindex" }] }),
  component: VendorDashboard,
});

function VendorDashboard() {
  return (
    <DashboardShell
      accent="Vendor workspace"
      title="Get discovered by planners across India"
      subtitle="Showcase your services, manage enquiries and grow your event business with EventSphere."
    >
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <DashboardCard title="Business profile" desc="Complete your profile to be visible in the marketplace." to="/marketplace" cta="Open marketplace" />
        <DashboardCard title="Enquiries" desc="Respond to service requests from organizations and customers." />
        <DashboardCard title="Portfolio" desc="Upload photos, videos and past work to build trust." />
        <DashboardCard title="Availability" desc="Manage available dates and blocked slots." />
        <DashboardCard title="Quotes & invoices" desc="Send quotes and track payments per booking." />
        <DashboardCard title="Reviews" desc="See client feedback and improve your rating." />
      </div>
      <ComingSoonNote />
    </DashboardShell>
  );
}
