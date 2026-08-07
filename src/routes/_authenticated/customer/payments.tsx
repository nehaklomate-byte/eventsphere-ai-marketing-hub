import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Wallet, Download } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/session";
import { PageShell, EmptyState, LoadingRows } from "./-ui";

export const Route = createFileRoute("/_authenticated/customer/payments")({ component: PaymentsPage });

type Kind = "hall" | "vendor" | "worker";

type PaymentRow = {
  id: string;
  kind: Kind;
  description: string;
  amount: number;
  status: string; // paid | unpaid/pending | refunded
  method: string | null;
  paidAt: string | null;
};

// The old customer_payments table is never written to anywhere in the app —
// real payment records live on customer_bookings (venue) and vendor_tasks /
// worker_tasks (direct hires), the same tables the Bookings page and the
// receipt pages already read from. Pulling from there instead of the empty
// table is what makes "Download" actually produce a receipt.
async function fetchPayments(userId: string): Promise<PaymentRow[]> {
  const [bookings, workerTasks, vendorTasks] = await Promise.all([
    supabase.from("customer_bookings").select("*").eq("user_id", userId),
    supabase.from("worker_tasks").select("*").eq("assigned_by", userId),
    supabase.from("vendor_tasks").select("*").eq("assigned_by", userId),
  ]);

  const rows: PaymentRow[] = [];
  for (const b of bookings.data ?? []) {
    if (!b.amount) continue;
    rows.push({
      id: b.id, kind: "hall", description: `Venue booking — ${b.target_name}`,
      amount: Number(b.amount ?? 0), status: b.payment_status, method: "Razorpay",
      paidAt: (b as { paid_at?: string | null }).paid_at ?? null,
    });
  }
  for (const t of workerTasks.data ?? []) {
    if (!t.payment_amount) continue;
    rows.push({
      id: t.id, kind: "worker", description: `${t.task_name} — ${t.event_name}`,
      amount: Number(t.payment_amount ?? 0), status: t.payment_status ?? "pending", method: "Razorpay",
      paidAt: (t as { paid_at?: string | null }).paid_at ?? null,
    });
  }
  for (const t of vendorTasks.data ?? []) {
    if (!t.payment_amount) continue;
    rows.push({
      id: t.id, kind: "vendor", description: `${t.task_name} — ${t.event_name}`,
      amount: Number(t.payment_amount ?? 0), status: t.payment_status ?? "pending", method: "Razorpay",
      paidAt: (t as { paid_at?: string | null }).paid_at ?? null,
    });
  }
  return rows.sort((a, b) => (b.paidAt ?? "").localeCompare(a.paidAt ?? ""));
}

function PaymentsPage() {
  const { user } = useSession();
  const { data, isLoading } = useQuery({
    queryKey: ["c-payments", user?.id],
    enabled: !!user?.id,
    queryFn: () => fetchPayments(user!.id),
  });

  const rows = data ?? [];
  const paid = rows.filter((p) => p.status === "paid").reduce((s, p) => s + p.amount, 0);
  const pending = rows.filter((p) => p.status === "pending" || p.status === "unpaid").reduce((s, p) => s + p.amount, 0);
  const refunded = rows.filter((p) => p.status === "refunded").reduce((s, p) => s + p.amount, 0);

  return (
    <PageShell title="Payments" subtitle="Every transaction across venues, vendors and workers — with downloadable receipts.">
      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Total paid" value={paid} tone="text-emerald-600" />
        <Stat label="Pending" value={pending} tone="text-amber-600" />
        <Stat label="Refunded" value={refunded} tone="text-brand-violet" />
      </div>

      {isLoading ? <LoadingRows /> : rows.length === 0 ? (
        <EmptyState title="No payments yet" description="Once you make a booking, your invoices and receipts will appear here." icon={Wallet} />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border bg-card">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="bg-muted/50 text-xs uppercase tracking-widest text-muted-foreground">
              <tr>
                <th className="px-4 py-3 text-left">Description</th>
                <th className="px-4 py-3 text-left">Type</th>
                <th className="px-4 py-3 text-right">Amount</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Method</th>
                <th className="px-4 py-3 text-right">Receipt</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((p) => (
                <tr key={`${p.kind}-${p.id}`} className="border-t border-border">
                  <td className="px-4 py-3">{p.description}</td>
                  <td className="px-4 py-3 capitalize">{p.kind}</td>
                  <td className="px-4 py-3 text-right font-semibold">₹{p.amount.toLocaleString("en-IN")}</td>
                  <td className="px-4 py-3 capitalize">{p.status}</td>
                  <td className="px-4 py-3">{p.method ?? "—"}</td>
                  <td className="px-4 py-3 text-right">
                    {p.status === "paid" ? (
                      <Link to="/receipt/$type/$id" params={{ type: p.kind, id: p.id }} target="_blank"
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
    </PageShell>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className={`mt-1 text-2xl font-bold ${tone}`}>₹{value.toLocaleString("en-IN")}</div>
    </div>
  );
}
