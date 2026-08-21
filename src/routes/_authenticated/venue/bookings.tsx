import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { CalendarCheck, Check, X, Loader2, IndianRupee, Eye, Download, Ban, Users, HardHat, Store, Receipt } from "lucide-react";
import { fetchMyHalls, fetchHallBookings, updateBookingStatus, confirmBookingWithAdvance, setBookingFinalPrice, type HallBooking } from "@/lib/venue";
import { notifyUsers } from "@/lib/push";
import { downloadCsv } from "@/lib/admin";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/venue/bookings")({
  head: () => ({ meta: [{ title: "Bookings — EventOrbit Nova" }, { name: "robots", content: "noindex" }] }),
  component: BookingsPage,
});

const STATUS_STYLE: Record<HallBooking["status"], string> = {
  pending: "bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300",
  confirmed: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300",
  in_progress: "bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300",
  completed: "bg-zinc-800 text-white dark:bg-zinc-200 dark:text-zinc-900",
  cancelled: "bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300",
  reschedule_requested: "bg-orange-100 text-orange-800 dark:bg-orange-950/40 dark:text-orange-300",
};

function BookingsPage() {
  const qc = useQueryClient();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [detailsFor, setDetailsFor] = useState<HallBooking | null>(null);
  const [teamFor, setTeamFor] = useState<string | null>(null);
  const { data: halls } = useQuery({ queryKey: ["venue-halls"], queryFn: fetchMyHalls });
  const hallIds = (halls ?? []).map((h) => h.id);

  const { data: bookings, isLoading } = useQuery({
    queryKey: ["venue-bookings", hallIds],
    queryFn: () => fetchHallBookings(hallIds),
    enabled: hallIds.length > 0,
  });

  async function setStatus(id: string, status: HallBooking["status"]) {
    setBusyId(id);
    try {
      await updateBookingStatus(id, status);
      toast.success("Booking updated");
      qc.invalidateQueries({ queryKey: ["venue-bookings"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to update");
    } finally {
      setBusyId(null);
    }
  }

  // Confirming now also requires an advance amount in the same step —
  // a booking should never sit "confirmed" with nothing the customer
  // can actually pay (migration 20260819150000).
  async function confirmWithAdvance(b: HallBooking) {
    const input = window.prompt(`Advance amount to collect for "${b.target_name}" (₹)`, b.advance_amount ? String(b.advance_amount) : "");
    if (input === null) return;
    const amt = Number(input);
    if (!amt || amt <= 0) return toast.error("Enter a valid advance amount");
    setBusyId(b.id);
    try {
      await confirmBookingWithAdvance(b.id, amt);
      toast.success("Booking confirmed — customer can now pay the advance");
      qc.invalidateQueries({ queryKey: ["venue-bookings"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to confirm");
    } finally {
      setBusyId(null);
    }
  }

  // Sets (or updates) the whole final price once everything's agreed
  // with the customer — the remaining balance becomes payable the
  // moment this is saved.
  async function setFinalPrice(b: HallBooking) {
    const input = window.prompt(`Whole final price for "${b.target_name}" (₹) — the advance already paid will be subtracted for the customer automatically`, b.amount ? String(b.amount) : "");
    if (input === null) return;
    const amt = Number(input);
    if (!amt || amt <= 0) return toast.error("Enter a valid amount");
    if (amt < b.advance_paid_amount) return toast.error(`Final price can't be less than the ₹${b.advance_paid_amount.toLocaleString("en-IN")} advance already paid`);
    setBusyId(b.id);
    try {
      await setBookingFinalPrice(b.id, amt);
      // In-app notification is also written by the notify_final_price_set
      // DB trigger (migration 20260822090000) — this adds the actual OS
      // push on top, same pattern as the hire-request notifications.
      notifyUsers([b.user_id], "Your venue price is ready", `Final price for "${b.target_name}" is ₹${amt.toLocaleString("en-IN")} — pay the remaining balance to confirm.`, "/customer/bookings");
      toast.success("Final price set — customer can now pay the remaining balance");
      qc.invalidateQueries({ queryKey: ["venue-bookings"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setBusyId(null);
    }
  }

  function exportCsv() {
    if (!bookings || bookings.length === 0) return;
    const flat = bookings.map((b) => ({
      event_date: b.event_date, status: b.status, payment_status: b.payment_status, amount: b.amount,
      notes: b.notes, ...(b.details ?? {}),
    }));
    downloadCsv(`bookings-${new Date().toISOString().slice(0, 10)}.csv`, flat);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl md:text-3xl font-bold tracking-tight">
            <CalendarCheck className="h-7 w-7 text-brand-violet" /> Bookings
          </h1>
          <p className="mt-1 text-muted-foreground">Confirm, cancel, or track every booking made on your venue.</p>
        </div>
        <button
          onClick={exportCsv}
          disabled={!bookings || bookings.length === 0}
          className="flex items-center gap-1.5 rounded-full border border-input px-4 py-2 text-sm font-semibold hover:bg-accent disabled:opacity-40"
        >
          <Download className="h-4 w-4" /> Download CSV
        </button>
      </div>

      {isLoading ? (
        <div className="rounded-2xl border border-border bg-card p-10 text-center text-sm text-muted-foreground">
          <Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin" /> Loading…
        </div>
      ) : !bookings || bookings.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card/40 p-10 text-center text-sm text-muted-foreground">
          No bookings yet.
        </div>
      ) : (
        <div className="space-y-4">
          {bookings.map((b) => (
            <div key={b.id} className="rounded-2xl border border-border bg-card p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-display text-lg font-semibold">
                      {(b.details?.event_name as string) || (b.event_date ? new Date(b.event_date).toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" }) : "Date TBD")}
                    </h3>
                    <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${STATUS_STYLE[b.status]}`}>
                      {b.status.replace("_", " ")}
                    </span>
                  </div>
                  <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                    {b.event_date && <span>{new Date(b.event_date).toLocaleDateString()}</span>}
                    {!!b.details?.event_type && <span>{String(b.details.event_type)}</span>}
                    <span className="flex items-center gap-1"><IndianRupee className="h-3.5 w-3.5" /> {
                      b.payment_status === "paid" ? `${b.amount?.toLocaleString("en-IN")} paid in full` :
                      b.payment_status === "partial" ? (b.amount ? `${(b.amount - b.advance_paid_amount).toLocaleString("en-IN")} balance pending` : `${b.advance_paid_amount.toLocaleString("en-IN")} advance received — set final price`) :
                      b.advance_amount ? `${b.advance_amount.toLocaleString("en-IN")} advance requested` : "Price not set yet"
                    }</span>
                    <span className="capitalize">Payment: {b.payment_status}</span>
                  </div>
                  {b.notes && <p className="mt-2 text-sm text-foreground/80">{b.notes}</p>}
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setTeamFor(teamFor === b.id ? null : b.id)}
                    className="flex items-center gap-1.5 rounded-full border border-input px-3.5 py-2 text-xs font-semibold hover:bg-accent"
                  >
                    <Users className="h-3.5 w-3.5" /> {teamFor === b.id ? "Hide hired team" : "View hired team"}
                  </button>
                  <button
                    onClick={() => setDetailsFor(b)}
                    className="flex items-center gap-1.5 rounded-full border border-input px-3.5 py-2 text-xs font-semibold hover:bg-accent"
                  >
                    <Eye className="h-3.5 w-3.5" /> View full details
                  </button>
                  {b.payment_status === "paid" && (
                    <Link to="/receipt/$type/$id" params={{ type: "hall", id: b.id }} target="_blank"
                      className="flex items-center gap-1.5 rounded-full border border-input px-3.5 py-2 text-xs font-semibold hover:bg-accent"
                    >
                      <Receipt className="h-3.5 w-3.5" /> View receipt
                    </Link>
                  )}
                  {b.status === "pending" && (
                    <>
                      <button
                        disabled={busyId === b.id}
                        onClick={() => confirmWithAdvance(b)}
                        className="flex items-center gap-1.5 rounded-full bg-emerald-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                      >
                        {busyId === b.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />} Confirm & set advance
                      </button>
                      <button
                        disabled={busyId === b.id}
                        onClick={() => setStatus(b.id, "cancelled")}
                        className="flex items-center gap-1.5 rounded-full bg-rose-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-rose-700 disabled:opacity-50"
                      >
                        <X className="h-3.5 w-3.5" /> Decline
                      </button>
                    </>
                  )}
                  {b.status === "confirmed" && b.payment_status !== "paid" && (
                    <button
                      disabled={busyId === b.id}
                      onClick={() => setFinalPrice(b)}
                      className="flex items-center gap-1.5 rounded-full border border-brand-violet text-brand-violet px-3.5 py-2 text-xs font-semibold hover:bg-brand-violet/10 disabled:opacity-50"
                    >
                      <IndianRupee className="h-3.5 w-3.5" /> {b.amount ? "Update final price" : "Set final price"}
                    </button>
                  )}
                  {b.status === "confirmed" && (
                    <>
                      <button
                        disabled={busyId === b.id}
                        onClick={() => setStatus(b.id, "completed")}
                        className="flex items-center gap-1.5 rounded-full bg-zinc-800 px-3.5 py-2 text-xs font-semibold text-white hover:bg-zinc-900 disabled:opacity-50"
                      >
                        {busyId === b.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />} Mark completed
                      </button>
                      <button
                        disabled={busyId === b.id}
                        onClick={() => setStatus(b.id, "cancelled")}
                        className="flex items-center gap-1.5 rounded-full border border-rose-300 px-3.5 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 disabled:opacity-50"
                      >
                        <Ban className="h-3.5 w-3.5" /> Cancel booking
                      </button>
                    </>
                  )}
                </div>
              </div>
              {teamFor === b.id && <HiredTeamPanel bookingId={b.id} />}
            </div>
          ))}
        </div>
      )}

      {detailsFor && <BookingDetailsModal booking={detailsFor} onClose={() => setDetailsFor(null)} />}
    </div>
  );
}

function HiredTeamPanel({ bookingId }: { bookingId: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ["booking-hired-team", bookingId],
    queryFn: async () => {
      const [{ data: workers, error: wErr }, { data: vendors, error: vErr }] = await Promise.all([
        supabase.from("worker_tasks" as never).select("id,task_name,status,payment_status,worker:workers(full_name)")
          .eq("customer_booking_id" as never, bookingId as never),
        supabase.from("vendor_tasks" as never).select("id,task_name,status,payment_status,vendor:vendors(business_name)")
          .eq("customer_booking_id" as never, bookingId as never),
      ]);
      if (wErr) throw wErr;
      if (vErr) throw vErr;
      return {
        workers: (workers ?? []) as unknown as { id: string; task_name: string; status: string; payment_status: string; worker: { full_name: string } | null }[],
        vendors: (vendors ?? []) as unknown as { id: string; task_name: string; status: string; payment_status: string; vendor: { business_name: string } | null }[],
      };
    },
  });

  const statusTone: Record<string, string> = {
    pending: "bg-amber-500/15 text-amber-700", accepted: "bg-blue-500/15 text-blue-700",
    in_progress: "bg-blue-500/15 text-blue-700", completed: "bg-emerald-500/15 text-emerald-700",
    rejected: "bg-rose-500/15 text-rose-700", cancelled: "bg-rose-500/15 text-rose-700",
  };

  const nothing = !isLoading && (data?.workers.length ?? 0) === 0 && (data?.vendors.length ?? 0) === 0;

  return (
    <div className="mt-4 border-t border-border pt-4">
      {isLoading ? (
        <div className="text-xs text-muted-foreground">Loading hired team…</div>
      ) : nothing ? (
        <div className="text-xs text-muted-foreground">No worker or vendor has been hired for this event yet — use "Hire Workers" / "Hire Vendors" and pick this event.</div>
      ) : (
        <div className="space-y-2">
          {data!.workers.map((w) => (
            <div key={`w-${w.id}`} className="flex items-center justify-between gap-3 rounded-xl bg-muted/40 px-3 py-2 text-xs">
              <span className="flex items-center gap-2 font-medium"><HardHat className="h-3.5 w-3.5 text-muted-foreground" /> {w.worker?.full_name ?? "Worker"} — {w.task_name}</span>
              <span className="flex items-center gap-2">
                <span className={`rounded-full px-2 py-0.5 font-semibold capitalize ${statusTone[w.status] ?? "bg-muted"}`}>{w.status.replace("_", " ")}</span>
                {w.payment_status === "paid" && <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 font-semibold text-emerald-700">Paid</span>}
              </span>
            </div>
          ))}
          {data!.vendors.map((v) => (
            <div key={`v-${v.id}`} className="flex items-center justify-between gap-3 rounded-xl bg-muted/40 px-3 py-2 text-xs">
              <span className="flex items-center gap-2 font-medium"><Store className="h-3.5 w-3.5 text-muted-foreground" /> {v.vendor?.business_name ?? "Vendor"} — {v.task_name}</span>
              <span className="flex items-center gap-2">
                <span className={`rounded-full px-2 py-0.5 font-semibold capitalize ${statusTone[v.status] ?? "bg-muted"}`}>{v.status.replace("_", " ")}</span>
                {v.payment_status === "paid" && <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 font-semibold text-emerald-700">Paid</span>}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function BookingDetailsModal({ booking, onClose }: { booking: HallBooking; onClose: () => void }) {
  const requestedServices = (booking.details?.requested_services as { category: string; name: string }[] | undefined) ?? [];
  const rows: [string, unknown][] = [
    ["Event name", booking.details?.event_name],
    ["Organizer type", booking.details?.organizer_type],
    ["Event type", booking.details?.event_type],
    ["Contact person", booking.details?.contact_person],
    ["Contact phone", booking.details?.contact_phone],
    ["Contact email", booking.details?.contact_email],
    ["Event date", booking.event_date],
    ["Event end date", booking.details?.event_end_date ?? booking.event_end_date],
    ["Expected guests", booking.details?.guest_count],
    ["Amount", booking.amount],
    ["Payment status", booking.payment_status],
    [
      "In-house services requested",
      requestedServices.length > 0 ? requestedServices.map((s) => `${s.name} (${s.category})`).join(", ") : null,
    ],
    ["Special instructions", booking.notes],
    ["Status", booking.status],
  ];

  function printThis() {
    window.print();
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4 print:static print:bg-white" onClick={onClose}>
      <div
        className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-border bg-card p-6 print:max-h-none print:border-0 print:shadow-none"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between print:hidden">
          <h3 className="font-display text-lg font-semibold">Booking details</h3>
          <div className="flex items-center gap-2">
            <button onClick={printThis} className="flex items-center gap-1.5 rounded-full border border-input px-3 py-1.5 text-xs font-semibold hover:bg-accent">
              <Download className="h-3.5 w-3.5" /> Save / Print
            </button>
            <button onClick={onClose} className="rounded-full p-1.5 hover:bg-accent"><X className="h-4 w-4" /></button>
          </div>
        </div>
        <dl className="grid grid-cols-1 gap-y-3">
          {rows.map(([label, value]) => (
            <div key={label} className="border-b border-border/60 pb-2">
              <dt className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</dt>
              <dd className="mt-0.5 break-words text-sm text-foreground">
                {value === null || value === undefined || value === "" ? <span className="text-muted-foreground/60">— empty —</span> : String(value)}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
}
