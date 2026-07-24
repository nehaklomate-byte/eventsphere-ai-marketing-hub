import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ShieldCheck, Building2, Landmark, Briefcase, HardHat, ArrowUpRight, UserCheck } from "lucide-react";
import { fetchPendingCounts, fetchPendingAccountCount, ROLE_LABEL, type VerificationRole } from "@/lib/admin";

export const Route = createFileRoute("/_authenticated/admin/")({
  head: () => ({ meta: [{ title: "Admin Dashboard — EventOrbit AI" }, { name: "robots", content: "noindex" }] }),
  component: AdminDashboardHome,
});

const ROLE_ICON: Record<VerificationRole, typeof Building2> = {
  organization: Building2,
  venue: Landmark,
  vendor: Briefcase,
  worker: HardHat,
};

function AdminDashboardHome() {
  const { data: counts, isLoading } = useQuery({
    queryKey: ["admin-pending-counts"],
    queryFn: fetchPendingCounts,
    refetchInterval: 30_000,
  });
  const { data: pendingAccounts } = useQuery({
    queryKey: ["admin-pending-account-count"],
    queryFn: fetchPendingAccountCount,
    refetchInterval: 30_000,
  });

  const totalPending = counts ? Object.values(counts).reduce((a, b) => a + b, 0) : 0;

  return (
    <div className="space-y-8">
      <div className="rounded-3xl border border-border bg-gradient-to-br from-brand-violet/10 via-secondary/5 to-background p-8 md:p-10">
        <span className="inline-flex rounded-full bg-white/60 dark:bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-widest text-brand-violet">
          Admin console
        </span>
        <h1 className="mt-4 font-display text-3xl md:text-4xl font-semibold tracking-tight">Platform operations</h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          Verify new applications, monitor platform health, and keep every role's dashboard access under control.
        </p>
      </div>

      {!!pendingAccounts && pendingAccounts > 0 && (
        <Link
          to="/admin/accounts"
          className="flex items-center justify-between rounded-2xl border border-blue-300/60 bg-blue-50 dark:bg-blue-950/20 px-6 py-4 text-sm font-semibold text-blue-800 dark:text-blue-300 hover:border-blue-400 transition"
        >
          <span className="flex items-center gap-2">
            <UserCheck className="h-4 w-4" /> {pendingAccounts} new account{pendingAccounts === 1 ? "" : "s"} waiting for Step 1 approval
          </span>
          <ArrowUpRight className="h-4 w-4" />
        </Link>
      )}

      {totalPending > 0 && (
        <Link
          to="/admin/verification"
          className="flex items-center justify-between rounded-2xl border border-amber-300/60 bg-amber-50 dark:bg-amber-950/20 px-6 py-4 text-sm font-semibold text-amber-800 dark:text-amber-300 hover:border-amber-400 transition"
        >
          <span className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4" /> {totalPending} application{totalPending === 1 ? "" : "s"} waiting for verification
          </span>
          <ArrowUpRight className="h-4 w-4" />
        </Link>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {(Object.keys(ROLE_LABEL) as VerificationRole[]).map((role) => {
          const Icon = ROLE_ICON[role];
          const n = counts?.[role] ?? 0;
          return (
            <Link
              key={role}
              to="/admin/verification"
              search={{ role } as never}
              className="group rounded-2xl border border-border bg-card p-6 transition hover:border-brand-violet/40 hover:shadow-soft"
            >
              <div className="flex items-center justify-between">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-brand-violet/10 text-brand-violet">
                  <Icon className="h-5 w-5" />
                </div>
                {n > 0 && <span className="rounded-full bg-brand-violet px-2 py-0.5 text-[11px] font-semibold text-white">{n} pending</span>}
              </div>
              <h3 className="mt-4 font-display text-lg font-semibold">{ROLE_LABEL[role]}s</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {isLoading ? "Loading…" : n === 0 ? "All caught up — nothing pending." : `${n} application${n === 1 ? "" : "s"} awaiting review.`}
              </p>
            </Link>
          );
        })}
      </div>

      <div className="rounded-2xl border border-dashed border-border bg-card/40 p-6 text-sm text-muted-foreground">
        User management, organization/venue/vendor/worker detail views, broadcast notifications, reports and
        system health are the next modules planned for this console — verification comes first since every
        other role's dashboard depends on it being reliable.
      </div>
    </div>
  );
}
