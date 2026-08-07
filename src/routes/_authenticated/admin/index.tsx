import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  ShieldCheck, Building2, Landmark, Briefcase, HardHat, ArrowUpRight, UserCheck,
  Users, CalendarDays, IndianRupee, ClipboardList, Bell, Settings2, Wallet,
} from "lucide-react";
import { fetchPendingCounts, fetchPendingAccountCount, fetchPlatformAnalytics, ROLE_LABEL, type VerificationRole } from "@/lib/admin";

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

function money(n: number) { return `₹${Number(n || 0).toLocaleString("en-IN")}`; }

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
  const { data: analytics, isLoading: analyticsLoading } = useQuery({
    queryKey: ["admin-platform-analytics"],
    queryFn: fetchPlatformAnalytics,
    refetchInterval: 60_000,
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
          Everything happening on EventOrbit — every role, every booking, every rupee — in one place.
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

      {/* Platform-wide analytics — real numbers pulled live across every role's tables. */}
      <div>
        <h2 className="mb-3 font-display text-lg font-semibold">Platform analytics</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Stat icon={Users} label="Total users" value={analyticsLoading ? "…" : String(analytics?.totalUsers ?? 0)} tone="text-brand-violet" />
          <Stat icon={CalendarDays} label="Customer events" value={analyticsLoading ? "…" : String(analytics?.totalEvents ?? 0)} tone="text-blue-600" />
          <Stat icon={ClipboardList} label="Total bookings/hires" value={analyticsLoading ? "…" : String(analytics?.totalBookings ?? 0)} tone="text-emerald-600" />
          <Stat icon={Briefcase} label="Open job postings" value={analyticsLoading ? "…" : String(analytics?.activeJobPostings ?? 0)} tone="text-amber-600" />
          <Stat icon={IndianRupee} label="Total revenue collected" value={analyticsLoading ? "…" : money(analytics?.totalRevenue ?? 0)} tone="text-emerald-600" />
          <Stat icon={Wallet} label="Platform commission" value={analyticsLoading ? "…" : money(analytics?.totalCommission ?? 0)} tone="text-brand-violet" />
          {(["organization", "hall_owner", "vendor", "worker"] as const).map((r) => (
            <Stat key={r}
              icon={r === "organization" ? Building2 : r === "hall_owner" ? Landmark : r === "vendor" ? Briefcase : HardHat}
              label={`${r === "hall_owner" ? "Venue owners" : r.charAt(0).toUpperCase() + r.slice(1) + "s"}`}
              value={analyticsLoading ? "…" : String(analytics?.usersByRole[r] ?? 0)}
              tone="text-muted-foreground"
            />
          ))}
        </div>
      </div>

      {/* Verification queue by role — unchanged, still opens Verification Center pre-filtered. */}
      <div>
        <h2 className="mb-3 font-display text-lg font-semibold">Verification queue</h2>
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
      </div>

      {/* Quick access to every necessary system activity — nothing here is
          hidden behind a "coming soon" placeholder anymore. */}
      <div>
        <h2 className="mb-3 font-display text-lg font-semibold">System access</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <QuickLink to="/admin/accounts" icon={UserCheck} title="Account approvals" desc="Step 1 sign-up approvals for every role." />
          <QuickLink to="/admin/verification" icon={ShieldCheck} title="Verification Center" desc="Approve, reject, suspend or blacklist any profile." />
          <QuickLink to="/admin/jobs" icon={Briefcase} title="Job Board" desc="Every job posting from every organization, venue and vendor." />
          <QuickLink to="/admin/earnings" icon={IndianRupee} title="Earnings" desc="Every cleared payment and every payout still owed." />
          <QuickLink to="/admin/users" icon={Users} title="Users" desc="Every registered account on the platform." />
          <QuickLink to="/admin/notifications" icon={Bell} title="Broadcast Center" desc="Send a platform-wide or role-targeted announcement." />
          <QuickLink to="/admin/settings" icon={Settings2} title="Settings" desc="Platform-level configuration." />
        </div>
      </div>
    </div>
  );
}

function Stat({ icon: Icon, label, value, tone }: { icon: React.ElementType; label: string; value: string; tone: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground"><Icon className={`h-4 w-4 ${tone}`} /> {label}</div>
      <div className="mt-1.5 text-2xl font-bold">{value}</div>
    </div>
  );
}

function QuickLink({ to, icon: Icon, title, desc }: { to: string; icon: React.ElementType; title: string; desc: string }) {
  return (
    <Link to={to as never} className="group flex items-start gap-3 rounded-2xl border border-border bg-card p-5 transition hover:border-brand-violet/40 hover:shadow-soft">
      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-violet/10 text-brand-violet">
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <h3 className="font-semibold">{title}</h3>
        <p className="mt-0.5 text-xs text-muted-foreground">{desc}</p>
      </div>
      <ArrowUpRight className="ml-auto h-4 w-4 shrink-0 text-muted-foreground opacity-0 transition group-hover:opacity-100" />
    </Link>
  );
}
