import { createFileRoute } from "@tanstack/react-router";
import { DashboardShell, DashboardCard, ComingSoonNote } from "@/components/DashboardShell";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({ meta: [{ title: "Admin console — EventSphere AI" }, { name: "robots", content: "noindex" }] }),
  component: AdminDashboard,
});

function AdminDashboard() {
  return (
    <DashboardShell
      accent="Admin console"
      title="Platform operations"
      subtitle="Review verifications, moderate listings and monitor platform health."
    >
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <DashboardCard title="Verifications" desc="Approve or reject KYC for organizations, halls, vendors and workers." />
        <DashboardCard title="Listings moderation" desc="Review published venues and vendor profiles." />
        <DashboardCard title="Users" desc="Search accounts and manage roles." />
        <DashboardCard title="Enquiries" desc="Monitor cross-role enquiry volume and response SLAs." />
        <DashboardCard title="Reports" desc="Growth, revenue and cohort analytics." />
        <DashboardCard title="System health" desc="Uptime, error rates and background jobs." />
      </div>
      <ComingSoonNote />
    </DashboardShell>
  );
}
