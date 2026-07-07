import { createFileRoute } from "@tanstack/react-router";
import { DashboardShell, DashboardCard, ComingSoonNote } from "@/components/DashboardShell";

export const Route = createFileRoute("/_authenticated/hall")({
  head: () => ({ meta: [{ title: "Hall owner workspace — EventSphere AI" }, { name: "robots", content: "noindex" }] }),
  component: HallDashboard,
});

function HallDashboard() {
  return (
    <DashboardShell
      accent="Hall owner workspace"
      title="Grow your venue with verified enquiries"
      subtitle="Publish your listing, manage the booking calendar and respond to enquiries in one place."
    >
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <DashboardCard title="My venues" desc="Complete and publish your venue profile to appear in search." to="/marketplace" cta="View marketplace" />
        <DashboardCard title="Enquiries inbox" desc="Verified enquiries from planners and customers land here." />
        <DashboardCard title="Booking calendar" desc="Availability, holds and confirmed bookings across dates." />
        <DashboardCard title="Pricing & packages" desc="Manage per-day / per-hour rates, advance and cancellation terms." />
        <DashboardCard title="Media gallery" desc="Upload photos and videos to strengthen your listing." />
        <DashboardCard title="Reviews" desc="See feedback from planners and customers." />
      </div>
      <ComingSoonNote />
    </DashboardShell>
  );
}
