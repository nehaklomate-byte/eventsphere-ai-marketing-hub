import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useSession } from "@/lib/session";
import { Wallet, TrendingUp, Clock } from "lucide-react";
import { fetchMyVendorTasks, vendorStatusTone } from "@/lib/vendor";

export const Route = createFileRoute("/_authenticated/vendor/earnings")({
  head: () => ({ meta: [{ title: "Earnings — EventOrbit AI" }, { name: "robots", content: "noindex" }] }),
  component: EarningsPage,
});

function EarningsPage() {
  const { user } = useSession();
  const { data: tasks = [], isLoading } = useQuery({ queryKey: ["vendor-tasks", user?.id], queryFn: () => fetchMyVendorTasks(user!.id), enabled: !!user?.id });

  const completed = tasks.filter((t) => t.status === "completed");
  const paid = completed.filter((t) => t.payment_status === "paid");
  const unpaid = completed.filter((t) => t.payment_status !== "paid");
  const total = (list: typeof tasks) => list.reduce((s, t) => s + Number(t.payment_amount ?? 0), 0);
  const month = new Date().toISOString().slice(0, 7);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Earnings</h1>
        <p className="mt-1 text-sm text-muted-foreground">Payments for completed bookings, settled to your registered payout account.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card icon={Wallet} label="Total received" value={total(paid)} tone="text-emerald-600" />
        <Card icon={Clock} label="Awaiting payment" value={total(unpaid)} tone="text-amber-600" />
        <Card icon={TrendingUp} label="This month" value={total(completed.filter((t) => t.event_date.slice(0, 7) === month))} tone="text-brand-violet" />
      </div>

      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <div className="border-b border-border px-5 py-4 text-sm font-semibold">Payment history</div>
        {isLoading ? (
          <div className="p-8 text-center text-sm text-muted-foreground">Loading…</div>
        ) : completed.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">No completed bookings yet. Earnings appear here once you finish a job.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-5 py-3 text-left font-semibold">Booking</th>
                  <th className="px-5 py-3 text-left font-semibold">Client</th>
                  <th className="px-5 py-3 text-left font-semibold">Date</th>
                  <th className="px-5 py-3 text-left font-semibold">Status</th>
                  <th className="px-5 py-3 text-right font-semibold">Amount</th>
                </tr>
              </thead>
              <tbody>
                {completed.map((t) => (
                  <tr key={t.id} className="border-t border-border">
                    <td className="px-5 py-3 font-medium">{t.task_name}</td>
                    <td className="px-5 py-3 text-muted-foreground">{t.organization_name ?? "—"}</td>
                    <td className="px-5 py-3 text-muted-foreground">{new Date(`${t.event_date}T00:00:00`).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</td>
                    <td className="px-5 py-3">
                      <span className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${t.payment_status === "paid" ? "bg-emerald-500/10 text-emerald-700 border-emerald-500/20" : "bg-amber-500/10 text-amber-700 border-amber-500/20"}`}>
                        {t.payment_status === "paid" ? "Paid" : "Pending"}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right font-semibold">₹{Number(t.payment_amount ?? 0).toLocaleString("en-IN")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <div className="border-b border-border px-5 py-4 text-sm font-semibold">Upcoming payouts</div>
        {tasks.filter((t) => ["accepted", "in_progress", "paused"].includes(t.status)).length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">Nothing scheduled right now.</div>
        ) : (
          <ul className="divide-y divide-border">
            {tasks.filter((t) => ["accepted", "in_progress", "paused"].includes(t.status)).map((t) => (
              <li key={t.id} className="flex items-center justify-between px-5 py-3">
                <div>
                  <div className="text-sm font-medium">{t.task_name}</div>
                  <div className="text-xs text-muted-foreground">{new Date(`${t.event_date}T00:00:00`).toLocaleDateString("en-IN", { day: "numeric", month: "short" })} · {t.organization_name ?? "Client"}</div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${vendorStatusTone(t.status)}`}>{t.status.replace("_", " ")}</span>
                  <span className="text-sm font-semibold">₹{Number(t.payment_amount ?? 0).toLocaleString("en-IN")}</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function Card({ icon: Icon, label, value, tone }: { icon: typeof Wallet; label: string; value: number; tone: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <Icon className={`h-5 w-5 ${tone}`} />
      <div className="mt-3 text-2xl font-bold">₹{value.toLocaleString("en-IN")}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}
