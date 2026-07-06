import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/session";
import { Briefcase, Clock, CheckCircle2, AlertCircle, Wallet, Bell, TrendingUp, Calendar } from "lucide-react";
import { fetchMyWorker, computeCompletion, type WorkerTask } from "@/lib/worker";

export const Route = createFileRoute("/_authenticated/worker/")({
  component: DashboardHome,
});

function StatCard({ icon: Icon, label, value, hint, tone = "brand" }: { icon: typeof Briefcase; label: string; value: string | number; hint?: string; tone?: string }) {
  const tones: Record<string, string> = {
    brand: "from-brand-violet/15 to-secondary/10 text-brand-violet",
    green: "from-emerald-500/15 to-emerald-500/5 text-emerald-600",
    amber: "from-amber-500/15 to-amber-500/5 text-amber-600",
    blue: "from-blue-500/15 to-blue-500/5 text-blue-600",
  };
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
      <div className="flex items-center justify-between">
        <div className={`grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br ${tones[tone]}`}><Icon className="h-5 w-5" /></div>
        {hint && <span className="text-[11px] text-muted-foreground">{hint}</span>}
      </div>
      <div className="mt-3 text-2xl font-bold text-foreground">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}

function DashboardHome() {
  const { user } = useSession();

  const { data: worker } = useQuery({
    queryKey: ["me-worker", user?.id],
    queryFn: () => fetchMyWorker(user!.id),
    enabled: !!user?.id,
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ["worker-tasks", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("worker_tasks" as never)
        .select("*").eq("worker_user_id" as never, user!.id as never)
        .order("event_date" as never, { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as WorkerTask[];
    },
    enabled: !!user?.id,
  });

  const today = new Date().toISOString().slice(0, 10);
  const todayJobs = tasks.filter((t) => t.event_date === today && !["completed", "cancelled", "rejected"].includes(t.status));
  const upcoming = tasks.filter((t) => t.event_date > today && !["completed", "cancelled", "rejected"].includes(t.status));
  const completed = tasks.filter((t) => t.status === "completed");
  const pending = tasks.filter((t) => t.status === "pending");
  const monthlyEarnings = completed
    .filter((t) => t.event_date.slice(0, 7) === today.slice(0, 7))
    .reduce((s, t) => s + (t.payment_amount ?? 0), 0);
  const todayEarnings = completed.filter((t) => t.event_date === today).reduce((s, t) => s + (t.payment_amount ?? 0), 0);

  const completion = computeCompletion(worker as never);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Welcome back, {worker?.full_name?.split(" ")[0] ?? "there"} 👋</h1>
        <p className="mt-1 text-sm text-muted-foreground">Here's what's happening with your work today.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={Calendar} label="Today's jobs" value={todayJobs.length} tone="brand" />
        <StatCard icon={TrendingUp} label="Upcoming" value={upcoming.length} tone="blue" />
        <StatCard icon={CheckCircle2} label="Completed" value={completed.length} tone="green" />
        <StatCard icon={AlertCircle} label="Pending action" value={pending.length} tone="amber" />
        <StatCard icon={Wallet} label="Today's earnings" value={`₹${todayEarnings.toLocaleString("en-IN")}`} tone="green" />
        <StatCard icon={Wallet} label="This month" value={`₹${monthlyEarnings.toLocaleString("en-IN")}`} tone="brand" />
        <StatCard icon={Briefcase} label="Profile" value={`${completion}%`} tone="blue" />
        <StatCard icon={Bell} label="Verification" value={worker?.verification_status ?? "—"} tone="amber" />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 rounded-2xl border border-border bg-card p-6 shadow-soft">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Today's assigned jobs</h2>
            <Link to="/worker/jobs" className="text-xs font-semibold text-brand-violet hover:underline">View all →</Link>
          </div>
          {todayJobs.length === 0 ? (
            <EmptyState icon={Briefcase} title="No jobs today" body="Enjoy your day. Upcoming assignments will show here." />
          ) : (
            <div className="space-y-3">
              {todayJobs.slice(0, 5).map((t) => <TaskRow key={t.id} t={t} />)}
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 shadow-soft">
          <h2 className="text-lg font-semibold mb-4">Profile health</h2>
          <div className="text-sm text-muted-foreground mb-3">Complete your profile to appear on the marketplace and receive more assignments.</div>
          <div className="h-2 rounded-full bg-border overflow-hidden">
            <div className="h-full bg-gradient-brand" style={{ width: `${completion}%` }} />
          </div>
          <div className="mt-2 text-xs text-muted-foreground">{completion}% complete</div>
          <Link to="/worker/profile" className="mt-4 inline-flex rounded-full btn-brand btn-brand-hover px-4 py-2 text-xs font-semibold text-white">
            {completion === 100 ? "Review profile" : "Continue profile"}
          </Link>
        </div>
      </div>
    </div>
  );
}

export function EmptyState({ icon: Icon, title, body }: { icon: typeof Briefcase; title: string; body: string }) {
  return (
    <div className="text-center py-10">
      <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-muted"><Icon className="h-5 w-5 text-muted-foreground" /></div>
      <div className="mt-3 text-sm font-semibold text-foreground">{title}</div>
      <div className="mt-1 text-xs text-muted-foreground">{body}</div>
    </div>
  );
}

function TaskRow({ t }: { t: WorkerTask }) {
  return (
    <Link to="/worker/jobs" className="block rounded-xl border border-border p-3 hover:bg-accent/50 transition-colors">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-sm font-semibold truncate">{t.task_name}</div>
          <div className="text-xs text-muted-foreground truncate">{t.event_name} · {t.venue ?? "TBD"}</div>
          <div className="mt-1 text-[11px] text-muted-foreground">{t.start_time ?? "—"} – {t.end_time ?? "—"}</div>
        </div>
        <span className="rounded-full bg-brand-violet/10 text-brand-violet px-2 py-0.5 text-[10px] font-semibold">{t.priority}</span>
      </div>
    </Link>
  );
}
