import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/session";
import { Wallet, TrendingUp, Clock, CheckCircle2, Download, Info } from "lucide-react";

export const Route = createFileRoute("/_authenticated/venue/earnings")({
  head: () => ({ meta: [{ title: "Earnings — EventOrbit Nova" }, { name: "robots", content: "noindex" }] }),
  component: EarningsPage,
});

type PayoutRow = {
  id: string;
  booking_id: string;
  amount: number; // net — after platform commission
  status: "pending" | "paid";
  payout_reference: string | null;
  paid_at: string | null;
  created_at: string;
  target_name: string;
  event_date: string | null;
};

// Same pattern as worker/vendor earnings: a customer paying for a
// booking (customer_bookings.payment_status = 'paid') only means the
// platform got paid. This reads venue_payouts — the platform's own
// record of what it owes the venue owner (net, post-commission) and
// whether that transfer has actually happened — the only accurate
// source for "have I actually received this money".
async function fetchMyPayouts(userId: string): Promise<PayoutRow[]> {
  const { data: payouts, error } = await supabase
    .from("venue_payouts" as never)
    .select("id,booking_id,amount,status,payout_reference,paid_at,created_at")
    .eq("hall_owner_id" as never, userId as never)
    .order("created_at" as never, { ascending: false });
  if (error) throw error;
  const rows = (payouts as unknown as Omit<PayoutRow, "target_name" | "event_date">[]) ?? [];
  if (rows.length === 0) return [];
  const bookingIds = rows.map((r) => r.booking_id);
  const { data: bookings } = await supabase.from("customer_bookings").select("id,target_name,event_date").in("id", bookingIds);
  const bookingMap = new Map((bookings ?? []).map((b: { id: string; target_name: string; event_date: string | null }) => [b.id, b]));
  return rows.map((r) => ({ ...r, target_name: bookingMap.get(r.booking_id)?.target_name ?? "Booking", event_date: bookingMap.get(r.booking_id)?.event_date ?? null }));
}

function EarningsPage() {
  const { user } = useSession();
  const { data: payouts = [], isLoading } = useQuery({
    queryKey: ["venue-payouts", user?.id],
    queryFn: () => fetchMyPayouts(user!.id),
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

      <div className="grid gap-4 sm:grid-cols-3">
        <Card icon={CheckCircle2} label="Total received" value={paidSum} tone="text-emerald-600" />
        <Card icon={Clock} label="Awaiting payout" value={pendingSum} tone="text-amber-600" />
        <Card icon={TrendingUp} label="Received this month" value={monthSum} tone="text-brand-violet" />
      </div>

      <div className="flex items-start gap-2 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-xs text-amber-800 dark:text-amber-300">
        <Info className="h-4 w-4 shrink-0 mt-0.5" />
        <span>"Awaiting payout" means a customer already paid for the booking — the platform is holding your share and will transfer it to your registered UPI/bank (set this under Venue Profile → Payout details). It moves to "Received" once that transfer actually happens, with a reference number below.</span>
      </div>

      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <div className="border-b border-border px-5 py-4 text-sm font-semibold">Payout history</div>
        {isLoading ? (
          <div className="p-8 text-center text-sm text-muted-foreground">Loading…</div>
        ) : payouts.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">No payouts yet. This fills in once a customer pays for a booking.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-5 py-3 text-left font-semibold">Booking</th>
                  <th className="px-5 py-3 text-left font-semibold">Event date</th>
                  <th className="px-5 py-3 text-left font-semibold">Status</th>
                  <th className="px-5 py-3 text-left font-semibold">Reference</th>
                  <th className="px-5 py-3 text-right font-semibold">Amount (net)</th>
                  <th className="px-5 py-3 text-right font-semibold">Receipt</th>
                </tr>
              </thead>
              <tbody>
                {payouts.map((p) => (
                  <tr key={p.id} className="border-t border-border">
                    <td className="px-5 py-3 font-medium">{p.target_name}</td>
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
                        <Link to="/receipt/$type/$id" params={{ type: "hall", id: p.booking_id }} target="_blank"
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

function Card({ icon: Icon, label, value, tone }: { icon: typeof Wallet; label: string; value: number; tone: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <Icon className={`h-5 w-5 ${tone}`} />
      <div className="mt-3 text-2xl font-bold">₹{value.toLocaleString("en-IN")}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}
