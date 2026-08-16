import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/session";
import { Wallet, TrendingUp, Clock, CheckCircle2, Download, Info } from "lucide-react";

export const Route = createFileRoute("/_authenticated/worker/earnings")({
  head: () => ({ meta: [{ title: "Earnings — EventOrbit Nova" }, { name: "robots", content: "noindex" }] }),
  component: EarningsPage,
});

type PayoutRow = {
  id: string;
  worker_task_id: string;
  amount: number; // net — what you actually get, commission already deducted
  status: "pending" | "paid";
  payout_reference: string | null;
  paid_at: string | null;
  created_at: string;
  task_name: string;
  event_date: string;
};

// The customer's payment clearing to the platform (task.payment_status =
// 'paid') is NOT the same event as the platform actually sending you
// that money. This page used to show task.payment_amount (the gross,
// pre-commission figure) under "Total received" the moment a customer
// paid — which overstated your earnings and, worse, called it
// "received" before the platform had actually paid you anything. It
// now reads from worker_payouts — the platform's own record of what
// it owes you (net, after commission) and whether it's actually been
// sent — which is the only accurate source for "have I been paid".
async function fetchMyPayouts(): Promise<PayoutRow[]> {
  const { data: payouts, error } = await supabase
    .from("worker_payouts" as never)
    .select("id,worker_task_id,amount,status,payout_reference,paid_at,created_at")
    .order("created_at" as never, { ascending: false });
  if (error) throw error;
  const rows = (payouts as unknown as Omit<PayoutRow, "task_name" | "event_date">[]) ?? [];
  if (rows.length === 0) return [];
  const taskIds = rows.map((r) => r.worker_task_id);
  const { data: tasks } = await supabase.from("worker_tasks").select("id,task_name,event_date").in("id", taskIds);
  const taskMap = new Map((tasks ?? []).map((t: { id: string; task_name: string; event_date: string }) => [t.id, t]));
  return rows.map((r) => ({ ...r, task_name: taskMap.get(r.worker_task_id)?.task_name ?? "Task", event_date: taskMap.get(r.worker_task_id)?.event_date ?? "" }));
}

function EarningsPage() {
  const { user } = useSession();
  const { data: payouts = [], isLoading } = useQuery({
    queryKey: ["worker-payouts", user?.id],
    queryFn: fetchMyPayouts,
    enabled: !!user?.id,
  });

  const paid = payouts.filter((p) => p.status === "paid");
  const pending = payouts.filter((p) => p.status === "pending");
  const sum = (arr: PayoutRow[]) => arr.reduce((s, p) => s + Number(p.amount || 0), 0);
  const paidSum = sum(paid);
  const pendingSum = sum(pending);
  const month = new Date().toISOString().slice(0, 7);
  const monthSum = sum(paid.filter((p) => (p.paid_at ?? "").slice(0, 7) === month));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Earnings</h1>
        <p className="mt-1 text-sm text-muted-foreground">What the platform has actually paid out to you — and what's still owed — after its commission.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <Stat icon={CheckCircle2} label="Total received" value={paidSum} tone="text-emerald-600" />
        <Stat icon={Clock} label="Awaiting payout" value={pendingSum} tone="text-amber-600" />
        <Stat icon={TrendingUp} label="Received this month" value={monthSum} tone="text-brand-violet" />
      </div>

      <div className="flex items-start gap-2 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-xs text-amber-800 dark:text-amber-300">
        <Info className="h-4 w-4 shrink-0 mt-0.5" />
        <span>"Awaiting payout" means a customer already paid for the job — the platform is holding your share and will transfer it to your registered UPI/bank. It moves to "Received" once that transfer actually happens, with a reference number below.</span>
      </div>

      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <div className="border-b border-border px-5 py-4 text-sm font-semibold">Payout history</div>
        {isLoading ? (
          <div className="p-8 text-center text-sm text-muted-foreground">Loading…</div>
        ) : payouts.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">No payouts yet. This fills in once a customer pays for a job you've done.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-5 py-3 text-left font-semibold">Job</th>
                  <th className="px-5 py-3 text-left font-semibold">Date</th>
                  <th className="px-5 py-3 text-left font-semibold">Status</th>
                  <th className="px-5 py-3 text-left font-semibold">Reference</th>
                  <th className="px-5 py-3 text-right font-semibold">Amount (net)</th>
                  <th className="px-5 py-3 text-right font-semibold">Receipt</th>
                </tr>
              </thead>
              <tbody>
                {payouts.map((p) => (
                  <tr key={p.id} className="border-t border-border">
                    <td className="px-5 py-3 font-medium">{p.task_name}</td>
                    <td className="px-5 py-3 text-muted-foreground">{p.event_date ? new Date(`${p.event_date}T00:00:00`).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—"}</td>
                    <td className="px-5 py-3">
                      <span className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${p.status === "paid" ? "bg-emerald-500/10 text-emerald-700 border-emerald-500/20" : "bg-amber-500/10 text-amber-700 border-amber-500/20"}`}>
                        {p.status === "paid" ? "Received" : "Awaiting payout"}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-muted-foreground font-mono text-xs">{p.payout_reference ?? "—"}</td>
                    <td className="px-5 py-3 text-right font-semibold">₹{Number(p.amount || 0).toLocaleString("en-IN")}</td>
                    <td className="px-5 py-3 text-right">
                      {p.status === "paid" ? (
                        <Link to="/receipt/$type/$id" params={{ type: "worker", id: p.worker_task_id }} target="_blank"
                          className="inline-flex items-center gap-1 text-xs font-semibold text-brand-violet hover:underline">
                          <Download className="h-3.5 w-3.5" /> Download
                        </Link>
                      ) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
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
