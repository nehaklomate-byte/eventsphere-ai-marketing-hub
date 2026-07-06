import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/session";
import { Wallet, TrendingUp, Clock, CheckCircle2 } from "lucide-react";
import type { WorkerTask } from "@/lib/worker";

export const Route = createFileRoute("/_authenticated/worker/earnings")({
  component: EarningsPage,
});

function EarningsPage() {
  const { user } = useSession();
  const { data: tasks = [] } = useQuery({
    queryKey: ["worker-tasks", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("worker_tasks" as never)
        .select("*").eq("worker_user_id" as never, user!.id as never);
      if (error) throw error;
      return (data ?? []) as unknown as WorkerTask[];
    },
    enabled: !!user?.id,
  });

  const today = new Date().toISOString().slice(0, 10);
  const week = new Date(); week.setDate(week.getDate() - 7); const weekISO = week.toISOString().slice(0, 10);
  const month = today.slice(0, 7);

  const completed = tasks.filter((t) => t.status === "completed" && t.payment_amount != null);
  const pending = tasks.filter((t) => t.status !== "completed" && t.status !== "rejected" && t.status !== "cancelled" && t.payment_amount != null);

  const sum = (arr: WorkerTask[]) => arr.reduce((s, t) => s + Number(t.payment_amount ?? 0), 0);
  const todayEarn = sum(completed.filter((t) => t.event_date === today));
  const weekEarn = sum(completed.filter((t) => t.event_date >= weekISO));
  const monthEarn = sum(completed.filter((t) => t.event_date.slice(0, 7) === month));
  const pendingSum = sum(pending);
  const completedSum = sum(completed);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Earnings</h1>
        <p className="mt-1 text-sm text-muted-foreground">Track your income from completed jobs.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Stat icon={Clock} label="Today" value={todayEarn} tone="text-emerald-600" />
        <Stat icon={TrendingUp} label="This week" value={weekEarn} tone="text-blue-600" />
        <Stat icon={Wallet} label="This month" value={monthEarn} tone="text-brand-violet" />
        <Stat icon={CheckCircle2} label="All-time completed" value={completedSum} tone="text-emerald-600" />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <PaymentTable title="Pending payments" sum={pendingSum} rows={pending} tone="amber" />
        <PaymentTable title="Completed payments" sum={completedSum} rows={completed} tone="green" />
      </div>
    </div>
  );
}

function Stat({ icon: Icon, label, value, tone }: { icon: typeof Wallet; label: string; value: number; tone: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <Icon className={`h-5 w-5 ${tone}`} />
      <div className="mt-3 text-2xl font-bold">₹{value.toLocaleString("en-IN")}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}

function PaymentTable({ title, sum, rows, tone }: { title: string; sum: number; rows: WorkerTask[]; tone: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold">{title}</h2>
        <span className={`text-sm font-bold ${tone === "green" ? "text-emerald-600" : "text-amber-600"}`}>₹{sum.toLocaleString("en-IN")}</span>
      </div>
      {rows.length === 0 ? (
        <div className="text-xs text-muted-foreground py-6 text-center">No records</div>
      ) : (
        <div className="divide-y divide-border">
          {rows.slice(0, 10).map((t) => (
            <div key={t.id} className="flex items-center justify-between py-3">
              <div className="min-w-0">
                <div className="text-sm font-medium truncate">{t.task_name}</div>
                <div className="text-xs text-muted-foreground">{t.event_date}</div>
              </div>
              <div className="text-sm font-semibold">₹{Number(t.payment_amount ?? 0).toLocaleString("en-IN")}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
