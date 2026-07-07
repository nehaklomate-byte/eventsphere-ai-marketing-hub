import { createFileRoute } from "@tanstack/react-router";
import { DashboardShell, DashboardCard, ComingSoonNote } from "@/components/DashboardShell";

export const Route = createFileRoute("/_authenticated/customer")({
  head: () => ({ meta: [{ title: "My account — EventSphere AI" }, { name: "robots", content: "noindex" }] }),
  component: CustomerDashboard,
});

function CustomerDashboard() {
  return (
    <DashboardShell
      accent="Customer workspace"
      title="Plan your event, effortlessly"
      subtitle="Discover venues and vendors, manage your enquiries, and track your bookings — all in one place."
    >
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <DashboardCard title="Explore venues" desc="Find banquet halls, lawns and resorts that fit your event." to="/marketplace" cta="Browse marketplace" />
        <DashboardCard title="Explore vendors" desc="Decorators, caterers, photographers and more." to="/marketplace" />
        <DashboardCard title="My enquiries" desc="Track the venues and vendors you've reached out to." />
        <DashboardCard title="My bookings" desc="Upcoming and past events booked through EventSphere." />
        <DashboardCard title="Saved list" desc="Bookmark venues and vendors to compare later." />
        <DashboardCard title="Support" desc="We're here to help you plan a great event." to="/contact" />
      </div>
      <ComingSoonNote />
    </DashboardShell>
  );
}
