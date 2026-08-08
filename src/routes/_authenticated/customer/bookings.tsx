import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ReceiptText, Store, IndianRupee, Loader2, CheckCircle2, CalendarClock, X, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/session";
import { payForWorkerTask } from "@/lib/razorpay";
import { PageShell, EmptyState, LoadingRows } from "./-ui";

export const Route = createFileRoute("/_authenticated/customer/bookings")({
  head: () => ({ meta: [{ title: "Bookings — EventOrbit Nova" }, { name: "robots", content: "noindex" }] }),
  component: BookingsPage,
});

type Source = "booking" | "worker_task" | "vendor_task";

type Row = {
  id: string;
  source: Source;
  kind: "hall" | "vendor" | "worker";
  name: string;
  event_date: string | null;
  requested_event_date: string | null;
  amount: number;
  status: string;
  payment_status: string;
};

/** Everything the customer booked — venue bookings AND the vendors/workers
 *  they hired directly (those live in vendor_tasks / worker_tasks). */
async function fetchAllBookings(userId: string): Promise<Row[]> {
  const [bookings, workerTasks, vendorTasks] = await Promise.all([
    supabase.from("customer_bookings").select("*").eq("user_id", userId).order("created_at", { ascending: false }),
    supabase.from("worker_tasks").select("*").eq("assigned_by", userId).order("created_at", { ascending: false }),
    supabase.from("vendor_tasks").select("*").eq("assigned_by", userId).order("created_at", { ascending: false }),
  ]);

  const rows: Row[] = [];
  for (const b of bookings.data ?? []) {
    rows.push({
      id: b.id, source: "booking", kind: b.kind as Row["kind"], name: b.target_name,
      event_date: b.event_date, requested_event_date: (b as { requested_event_date?: string | null }).requested_event_date ?? null,
      amount: Number(b.amount ?? 0), status: b.status, payment_status: b.payment_status,
    });
  }
  for (const t of workerTasks.data ?? []) {
    rows.push({
      id: t.id, source: "worker_task", kind: "worker", name: `${t.task_name} — ${t.event_name}`,
      event_date: t.event_date, requested_event_date: null,
      amount: Number(t.payment_amount ?? 0), status: t.status, payment_status: t.payment_status ?? "pending",
    });
  }
  for (const t of vendorTasks.data ?? []) {
    rows.push({
      id: t.id, source: "vendor_task", kind: "vendor", name: `${t.task_name} — ${t.event_name}`,
      event_date: t.event_date, requested_event_date: null,
      amount: Number(t.payment_amount ?? 0), status: t.status, payment_status: t.payment_status ?? "pending",
    });
  }
  return rows.sort((a, b) => (b.event_date ?? "").localeCompare(a.event_date ?? ""));
}

const TABLE: Record<Source, "customer_bookings" | "worker_tasks" | "vendor_tasks"> = {
  booking: "customer_bookings", worker_task: "worker_tasks", vendor_task: "vendor_tasks",
};

function BookingsPage() {
  const { user } = useSession();
  const qc = useQueryClient();
  const [payingId, setPayingId] = useState<string | null>(null);
  const [rescheduling, setRescheduling] = useState<Row | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["c-bookings", user?.id],
    enabled: !!user?.id,
    queryFn: () => fetchAllBookings(user!.id),
  });

  function refresh() { qc.invalidateQueries({ queryKey: ["c-bookings"] }); }

  async function cancel(row: Row) {
    if (!confirm("Cancel this booking? This cannot be undone.")) return;
    const { error } = await supabase.from(TABLE[row.source] as "customer_bookings").update({ status: "cancelled" }).eq("id", row.id);
    if (error) return toast.error(error.message);
    toast.success("Booking cancelled"); refresh();
  }

  async function handlePay(row: Row) {
    setPayingId(row.id);
    try {
      const entityType = row.kind === "hall" ? "hall" : row.kind;
      await payForWorkerTask({ workerTaskId: row.id, entityType });
      toast.success("Payment successful!");
      refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Payment failed");
    } finally { setPayingId(null); }
  }

  const canPay = (r: Row) =>
    r.payment_status !== "paid" && r.amount > 0 &&
    (r.source === "booking"
      ? r.kind === "hall" && ["confirmed", "in_progress", "completed"].includes(r.status)
      : ["accepted", "in_progress", "completed"].includes(r.status));

  return (
    <PageShell title="Bookings" subtitle="Every venue booking and every vendor or worker you hired — in one place.">
      {isLoading ? <LoadingRows /> : (data?.length ?? 0) === 0 ? (
        <EmptyState
          title="No bookings yet" description="Explore the marketplace to book verified venues, vendors and workers."
          icon={ReceiptText} action={<Link to="/marketplace" className="inline-flex items-center gap-1.5 rounded-full btn-brand btn-brand-hover px-4 py-2 text-sm font-semibold text-white"><Store className="h-4 w-4" /> Browse marketplace</Link>}
        />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border bg-card">
          <table className="w-full min-w-[820px] text-sm">
            <thead className="bg-muted/50 text-xs uppercase tracking-widest text-muted-foreground">
              <tr>
                <th className="px-4 py-3 text-left">Booking</th>
                <th className="px-4 py-3 text-left">Type</th>
                <th className="px-4 py-3 text-left">Date</th>
                <th className="px-4 py-3 text-right">Amount</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Payment</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {data!.map((b) => (
                <tr key={`${b.source}-${b.id}`} className="border-t border-border">
                  <td className="px-4 py-3 font-semibold">{b.name}</td>
                  <td className="px-4 py-3 capitalize">{b.kind}</td>
                  <td className="px-4 py-3">
                    {b.event_date ?? "—"}
                    {b.requested_event_date && (
                      <div className="text-[11px] text-amber-600">New date requested: {b.requested_event_date}</div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">{b.amount > 0 ? `₹${b.amount.toLocaleString("en-IN")}` : "—"}</td>
                  <td className="px-4 py-3 capitalize">{b.status.replace(/_/g, " ")}</td>
                  <td className="px-4 py-3 capitalize">{b.payment_status}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      {b.payment_status === "paid" ? (
                        <span className="flex items-center gap-1.5">
                          <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-500/15 px-2.5 py-1 text-xs font-semibold text-emerald-700"><CheckCircle2 className="h-3.5 w-3.5" /> Paid</span>
                          <Link to="/receipt/$type/$id" params={{ type: b.kind, id: b.id }} target="_blank"
                            className="rounded-lg border border-input px-2 py-1 text-xs font-semibold hover:bg-accent">Receipt</Link>
                        </span>
                      ) : canPay(b) ? (
                        <button onClick={() => handlePay(b)} disabled={payingId === b.id}
                          className="inline-flex items-center gap-1.5 rounded-lg btn-brand btn-brand-hover px-2.5 py-1 text-xs font-semibold text-white disabled:opacity-70">
                          {payingId === b.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <IndianRupee className="h-3.5 w-3.5" />} Pay
                        </button>
                      ) : null}
                      <Link to="/customer/messages" className="inline-flex items-center gap-1 rounded-lg border border-input px-2.5 py-1 text-xs hover:bg-accent">
                        <MessageCircle className="h-3.5 w-3.5" /> Chat
                      </Link>
                      {b.status !== "cancelled" && b.status !== "completed" && (
                        <>
                          <button onClick={() => setRescheduling(b)} className="inline-flex items-center gap-1 rounded-lg border border-input px-2.5 py-1 text-xs hover:bg-accent">
                            <CalendarClock className="h-3.5 w-3.5" /> Reschedule
                          </button>
                          <button onClick={() => cancel(b)} className="rounded-lg border border-rose-500/50 px-2.5 py-1 text-xs text-rose-600 hover:bg-rose-500/10">Cancel</button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {rescheduling && (
        <RescheduleDialog row={rescheduling} onClose={() => setRescheduling(null)} onDone={() => { setRescheduling(null); refresh(); }} />
      )}
    </PageShell>
  );
}

function RescheduleDialog({ row, onClose, onDone }: { row: Row; onClose: () => void; onDone: () => void }) {
  const [date, setDate] = useState(row.event_date ?? "");
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!date) return toast.error("Pick the new date you'd like");
    setBusy(true);
    try {
      if (row.source === "booking") {
        const { error } = await supabase.from("customer_bookings")
          .update({ status: "reschedule_requested", requested_event_date: date })
          .eq("id", row.id);
        if (error) throw error;
      } else {
        // Tasks the vendor/worker hasn't accepted yet can simply move date;
        // once accepted, the change is sent as a message-worthy status change.
        const table = row.source === "worker_task" ? "worker_tasks" : "vendor_tasks";
        const { error } = await supabase.from(table as "worker_tasks").update({ event_date: date }).eq("id", row.id);
        if (error) throw error;
      }
      toast.success("Reschedule request sent");
      onDone();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not request a reschedule");
    } finally { setBusy(false); }
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-elegant" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-lg font-semibold"><CalendarClock className="h-5 w-5 text-brand-violet" /> Request a new date</h3>
          <button onClick={onClose} aria-label="Close" className="rounded-lg p-1.5 hover:bg-accent"><X className="h-4 w-4" /></button>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">{row.name}</p>
        <label className="mt-4 block text-xs font-semibold text-muted-foreground">New event date
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
            className="mt-1 w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm outline-none focus:border-brand-violet" />
        </label>
        <button onClick={submit} disabled={busy}
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-full btn-brand btn-brand-hover px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-70">
          {busy && <Loader2 className="h-4 w-4 animate-spin" />} Send request
        </button>
      </div>
    </div>
  );
}
