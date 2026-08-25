import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { CalendarCheck, Check, X, Loader2, IndianRupee, Eye, Download, Ban, Users, HardHat, Store, Receipt, MessageSquareWarning } from "lucide-react";
import { fetchMyHalls, fetchHallBookings, updateBookingStatus, declineHallBooking, confirmBookingWithPricing, resolveHallBasePrice, resolveRescheduleRequest, type HallBooking, type PriceLine, type Hall } from "@/lib/venue";
import { notifyUsers } from "@/lib/push";
import { downloadCsv } from "@/lib/admin";
import { supabase } from "@/integrations/supabase/client";
import { acceptWorkerCounter, rejectWorkerCounter } from "@/lib/worker";
import { acceptVendorCounter, rejectVendorCounter } from "@/lib/vendor";

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
  const [pricingFor, setPricingFor] = useState<HallBooking | null>(null);
  const [pricingError, setPricingError] = useState<string | null>(null);
  const [declineFor, setDeclineFor] = useState<HallBooking | null>(null);
  const [declineReason, setDeclineReason] = useState("");
  const [declineError, setDeclineError] = useState<string | null>(null);
  const { data: halls } = useQuery({ queryKey: ["venue-halls"], queryFn: fetchMyHalls });
  const hallIds = (halls ?? []).map((h) => h.id);
  const hallById = new Map((halls ?? []).map((h) => [h.id, h]));

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

  async function respondToReschedule(booking: HallBooking, accept: boolean) {
    setBusyId(booking.id);
    try {
      await resolveRescheduleRequest(booking, accept);
      if (accept) {
        notifyUsers([booking.user_id], "Reschedule approved", `"${booking.target_name}" is now confirmed for ${booking.requested_event_date}.`, "/customer/bookings");
        toast.success(`Moved to ${booking.requested_event_date}.`);
      } else {
        notifyUsers([booking.user_id], "Reschedule declined", `The venue couldn't move "${booking.target_name}" — it stays on ${booking.event_date}.`, "/customer/bookings");
        toast.success("Kept the original date — the customer's been notified.");
      }
      qc.invalidateQueries({ queryKey: ["venue-bookings"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not update the date");
    } finally {
      setBusyId(null);
    }
  }

  // Owner prices the venue's base rate + every service the customer
  // selected, and sets the advance — all in one step. The itemised
  // total becomes the booking's final amount immediately, so the
  // customer sees exactly what each thing costs as soon as this is
  // saved (see confirmBookingWithPricing in src/lib/venue.ts).
  async function savePricing(booking: HallBooking, lines: PriceLine[], advanceAmount: number) {
    setBusyId(booking.id);
    setPricingError(null);
    try {
      await confirmBookingWithPricing(booking, lines, advanceAmount);
      const total = lines.reduce((s, l) => s + (Number(l.amount) || 0), 0);
      notifyUsers([booking.user_id], "Your venue price is ready", `Total for "${booking.target_name}" is ₹${total.toLocaleString("en-IN")} — pay the advance to confirm.`, "/customer/bookings");
      toast.success("Pricing saved — customer can now see the breakdown and pay");
      qc.invalidateQueries({ queryKey: ["venue-bookings"] });
      setPricingFor(null);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to save pricing";
      toast.error(msg);
      setPricingError(msg); // shown inline in the modal too — a toast alone is
      // easy to miss (auto-dismisses, and can render off-screen on some
      // mobile browsers), which is what made this look like "the button
      // does nothing" when it was actually failing with a real reason.
    } finally {
      setBusyId(null);
    }
  }

  // Let the customer know exactly why their request was declined or
  // their booking cancelled, instead of just seeing "cancelled" with
  // no explanation (see declineHallBooking in src/lib/venue.ts and
  // the notify_hall_booking_declined trigger).
  async function decline(booking: HallBooking, reason: string) {
    setDeclineError(null);
    if (!reason.trim()) { setDeclineError("Please add a reason so the customer understands"); return; }
    setBusyId(booking.id);
    try {
      await declineHallBooking(booking.id, reason.trim());
      toast.success(booking.status === "pending" ? "Request declined" : "Booking cancelled");
      qc.invalidateQueries({ queryKey: ["venue-bookings"] });
      setDeclineFor(null);
      setDeclineReason("");
    } catch (e) {
      setDeclineError(e instanceof Error ? e.message : "Failed to update");
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
                  {b.status === "cancelled" && b.decline_reason && (
                    <p className="mt-2 text-sm text-rose-600">Reason given: {b.decline_reason}</p>
                  )}
                  {b.status === "reschedule_requested" && b.requested_event_date && (
                    <div className="mt-3 flex flex-wrap items-center gap-3 rounded-xl border border-orange-200 dark:border-orange-900 bg-orange-50 dark:bg-orange-950/20 px-4 py-3">
                      <p className="text-sm">
                        Customer wants to move this from <span className="font-semibold">{b.event_date}</span> to{" "}
                        <span className="font-semibold">{b.requested_event_date}</span>.
                      </p>
                      <div className="flex gap-2">
                        <button disabled={busyId === b.id} onClick={() => respondToReschedule(b, true)}
                          className="flex items-center gap-1.5 rounded-full bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50">
                          {busyId === b.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />} Accept new date
                        </button>
                        <button disabled={busyId === b.id} onClick={() => respondToReschedule(b, false)}
                          className="flex items-center gap-1.5 rounded-full border border-input px-3 py-1.5 text-xs font-semibold hover:bg-accent disabled:opacity-50">
                          <X className="h-3.5 w-3.5" /> Keep original date
                        </button>
                      </div>
                    </div>
                  )}
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
                        onClick={() => setPricingFor(b)}
                        className="flex items-center gap-1.5 rounded-full bg-emerald-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                      >
                        {busyId === b.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />} Price & confirm
                      </button>
                      <button
                        disabled={busyId === b.id}
                        onClick={() => { setDeclineFor(b); setDeclineReason(""); setDeclineError(null); }}
                        className="flex items-center gap-1.5 rounded-full bg-rose-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-rose-700 disabled:opacity-50"
                      >
                        <X className="h-3.5 w-3.5" /> Decline
                      </button>
                    </>
                  )}
                  {b.status === "confirmed" && b.payment_status !== "paid" && (
                    <button
                      disabled={busyId === b.id}
                      onClick={() => setPricingFor(b)}
                      className="flex items-center gap-1.5 rounded-full border border-brand-violet text-brand-violet px-3.5 py-2 text-xs font-semibold hover:bg-brand-violet/10 disabled:opacity-50"
                    >
                      <IndianRupee className="h-3.5 w-3.5" /> Edit pricing
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
                        onClick={() => { setDeclineFor(b); setDeclineReason(""); setDeclineError(null); }}
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
      {declineFor && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4" onClick={() => setDeclineFor(null)}>
          <div className="w-full max-w-md rounded-2xl bg-card p-6 shadow-elegant" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold">{declineFor.status === "pending" ? "Decline this request" : "Cancel this booking"}</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              This is shared with the customer so they understand why — please give a real reason.
            </p>
            <textarea
              value={declineReason}
              onChange={(e) => setDeclineReason(e.target.value)}
              rows={4}
              className="mt-3 w-full rounded-xl border border-input bg-background p-3 text-sm"
              placeholder="e.g. Dates already booked for another event"
            />
            {declineError && (
              <div role="alert" className="mt-2 flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
                {declineError}
              </div>
            )}
            <div className="mt-4 flex justify-end gap-2">
              <button onClick={() => setDeclineFor(null)} className="rounded-full border border-border px-4 py-2 text-sm font-medium">Never mind</button>
              <button
                disabled={busyId === declineFor.id}
                onClick={() => decline(declineFor, declineReason)}
                className="inline-flex items-center gap-2 rounded-full bg-rose-600 text-white px-4 py-2 text-sm font-semibold hover:bg-rose-700 disabled:opacity-50"
              >
                {busyId === declineFor.id && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                {declineFor.status === "pending" ? "Decline request" : "Cancel booking"}
              </button>
            </div>
          </div>
        </div>
      )}
      {pricingFor && (
        <PricingModal
          booking={pricingFor}
          hall={hallById.get(pricingFor.target_id)}
          busy={busyId === pricingFor.id}
          error={pricingError}
          onClose={() => { setPricingFor(null); setPricingError(null); }}
          onSave={(lines, advance) => savePricing(pricingFor, lines, advance)}
        />
      )}
    </div>
  );
}

/** Owner's "price this booking" screen — the venue's own base rate
 * (from guest-count tiers) plus one editable price per service the
 * customer selected, each shown next to the requirement note the
 * customer left for it. Saving computes the total and sets the
 * advance in one step (see confirmBookingWithPricing). */
function PricingModal({
  booking, hall, busy, error, onClose, onSave,
}: { booking: HallBooking; hall: Hall | undefined; busy: boolean; error: string | null; onClose: () => void; onSave: (lines: PriceLine[], advanceAmount: number) => void }) {
  const requested = (booking.details?.requested_services as { category: string; name: string; requirement_note?: string | null }[] | undefined) ?? [];
  const guestCount = Number(booking.details?.guest_count ?? 0);
  const suggestedBase = hall ? resolveHallBasePrice(hall.price_per_day, hall.guest_pricing_tiers, guestCount) : 0;

  // Pre-fill from an existing price_breakdown when editing an already-
  // confirmed booking, so the owner isn't retyping everything.
  const existing = (booking.details?.price_breakdown as PriceLine[] | undefined) ?? [];
  const existingByLabel = new Map(existing.map((l) => [l.label, l.amount]));

  const [basePrice, setBasePrice] = useState<string>(String(existingByLabel.get("Venue (base price)") ?? suggestedBase ?? ""));
  const [servicePrices, setServicePrices] = useState<Record<number, string>>(() => {
    const init: Record<number, string> = {};
    requested.forEach((s, i) => {
      const found = existing.find((l) => l.label === `${s.name} (${s.category})`);
      init[i] = found ? String(found.amount) : "";
    });
    return init;
  });
  const [advance, setAdvance] = useState<string>(String(booking.advance_amount ?? hall?.advance_amount ?? ""));
  const [localError, setLocalError] = useState<string | null>(null);

  const base = Number(basePrice) || 0;
  const serviceTotal = requested.reduce((sum, _s, i) => sum + (Number(servicePrices[i]) || 0), 0);
  const total = base + serviceTotal;
  const advanceNum = Number(advance) || 0;
  const belowAlreadyPaid = booking.advance_paid_amount > 0 && total < booking.advance_paid_amount;
  const shownError = localError || error;

  function save() {
    setLocalError(null);
    if (base <= 0) { const m = "Enter the venue's base price"; setLocalError(m); toast.error(m); return; }
    if (advanceNum <= 0) { const m = "Enter a valid advance amount"; setLocalError(m); toast.error(m); return; }
    if (advanceNum > total) { const m = "Advance can't be more than the total"; setLocalError(m); toast.error(m); return; }
    if (belowAlreadyPaid) { const m = `Total can't be less than the ₹${booking.advance_paid_amount.toLocaleString("en-IN")} already paid`; setLocalError(m); toast.error(m); return; }
    const lines: PriceLine[] = [{ label: "Venue (base price)", amount: base }];
    requested.forEach((s, i) => {
      const amt = Number(servicePrices[i]) || 0;
      if (amt > 0) lines.push({ label: `${s.name} (${s.category})`, amount: amt, requirement_note: s.requirement_note ?? null });
    });
    onSave(lines, advanceNum);
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4" onClick={onClose}>
      <div className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-border bg-card p-6" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-display text-lg font-semibold">Price this booking</h3>
          <button onClick={onClose} aria-label="Close" className="rounded-lg p-1.5 hover:bg-accent"><X className="h-4 w-4" /></button>
        </div>

        <label className="block">
          <span className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
            Venue base price {guestCount > 0 && `(for ${guestCount} guests)`}
          </span>
          <input type="number" className="pmodal-input mt-1" value={basePrice} onChange={(e) => setBasePrice(e.target.value)} placeholder="₹" />
        </label>

        {requested.length > 0 && (
          <div className="mt-4 space-y-3">
            <div className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Services the customer selected</div>
            {requested.map((s, i) => (
              <div key={`${s.category}-${s.name}-${i}`} className="rounded-xl border border-border bg-muted/20 p-3">
                <div className="text-sm font-semibold">{s.name} <span className="font-normal text-muted-foreground">({s.category})</span></div>
                {s.requirement_note && <p className="mt-0.5 text-xs text-muted-foreground">"{s.requirement_note}"</p>}
                <input type="number" className="pmodal-input mt-2" placeholder="Price for this (₹)"
                  value={servicePrices[i] ?? ""} onChange={(e) => setServicePrices((p) => ({ ...p, [i]: e.target.value }))} />
              </div>
            ))}
          </div>
        )}

        <div className="mt-4 flex items-center justify-between rounded-xl bg-accent/40 px-3.5 py-2.5 text-sm font-semibold">
          <span>Total</span>
          <span>₹{total.toLocaleString("en-IN")}</span>
        </div>

        <label className="mt-4 block">
          <span className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Advance to collect now</span>
          <input type="number" className="pmodal-input mt-1" value={advance} onChange={(e) => setAdvance(e.target.value)} placeholder="₹" />
        </label>
        {advanceNum > 0 && total > 0 && (
          <p className="mt-1 text-[11px] text-muted-foreground">Balance after advance: ₹{Math.max(total - advanceNum, 0).toLocaleString("en-IN")}</p>
        )}

        {shownError && (
          <div role="alert" className="mt-3 flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
            <span className="font-semibold">Could not save:</span> {shownError}
          </div>
        )}

        <button onClick={save} disabled={busy} className="mt-5 flex w-full items-center justify-center gap-2 rounded-full btn-brand btn-brand-hover px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-70">
          {busy && <Loader2 className="h-4 w-4 animate-spin" />} Save & {booking.status === "pending" ? "confirm booking" : "update"}
        </button>
        <style>{`
          .pmodal-input { width: 100%; border-radius: 10px; border: 1px solid var(--border); background: var(--background); padding: 8px 12px; font-size: 13px; outline: none; }
          .pmodal-input:focus { border-color: var(--brand-violet); box-shadow: 0 0 0 3px color-mix(in oklab, var(--brand-violet) 22%, transparent); }
        `}</style>
      </div>
    </div>
  );
}

type HiredWorkerRow = {
  id: string; task_name: string; status: string; payment_status: string; service_category: string | null;
  proposed_fee: number | null; final_fee: number | null; counter_offer_amount: number | null; counter_offer_note: string | null;
  worker: { full_name: string } | null;
};
type HiredVendorRow = {
  id: string; task_name: string; status: string; payment_status: string; service_category: string | null;
  proposed_fee: number | null; final_fee: number | null; counter_offer_amount: number | null; counter_offer_note: string | null;
  vendor: { business_name: string } | null;
};

// Per-event operational view for the venue owner (spec Part 32): who's
// hired for which service, their status, and — new — the fee each side
// is at (proposed vs agreed), plus accept/decline actions when a
// vendor/worker has sent a counter-offer back.
function HiredTeamPanel({ bookingId }: { bookingId: string }) {
  const qc = useQueryClient();
  const [busyId, setBusyId] = useState<string | null>(null);
  const { data, isLoading } = useQuery({
    queryKey: ["booking-hired-team", bookingId],
    queryFn: async () => {
      const [{ data: workers, error: wErr }, { data: vendors, error: vErr }] = await Promise.all([
        supabase.from("worker_tasks" as never)
          .select("id,task_name,status,payment_status,service_category,proposed_fee,final_fee,counter_offer_amount,counter_offer_note,worker:workers(full_name)")
          .eq("customer_booking_id" as never, bookingId as never),
        supabase.from("vendor_tasks" as never)
          .select("id,task_name,status,payment_status,service_category,proposed_fee,final_fee,counter_offer_amount,counter_offer_note,vendor:vendors(business_name)")
          .eq("customer_booking_id" as never, bookingId as never),
      ]);
      if (wErr) throw wErr;
      if (vErr) throw vErr;
      return {
        workers: (workers ?? []) as unknown as HiredWorkerRow[],
        vendors: (vendors ?? []) as unknown as HiredVendorRow[],
      };
    },
  });

  const statusTone: Record<string, string> = {
    pending: "bg-amber-500/15 text-amber-700", countered: "bg-purple-500/15 text-purple-700", accepted: "bg-blue-500/15 text-blue-700",
    in_progress: "bg-blue-500/15 text-blue-700", completed: "bg-emerald-500/15 text-emerald-700",
    rejected: "bg-rose-500/15 text-rose-700", cancelled: "bg-rose-500/15 text-rose-700",
  };

  async function respond(kind: "worker" | "vendor", id: string, accept: boolean) {
    setBusyId(id);
    try {
      if (kind === "worker") await (accept ? acceptWorkerCounter(id) : rejectWorkerCounter(id, "Counter offer declined by venue owner"));
      else await (accept ? acceptVendorCounter(id) : rejectVendorCounter(id, "Counter offer declined by venue owner"));
      toast.success(accept ? "Counter offer accepted — assignment confirmed" : "Counter offer declined");
      qc.invalidateQueries({ queryKey: ["booking-hired-team", bookingId] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not respond");
    } finally {
      setBusyId(null);
    }
  }

  const nothing = !isLoading && (data?.workers.length ?? 0) === 0 && (data?.vendors.length ?? 0) === 0;

  return (
    <div className="mt-4 border-t border-border pt-4">
      {isLoading ? (
        <div className="text-xs text-muted-foreground">Loading hired team…</div>
      ) : nothing ? (
        <div className="text-xs text-muted-foreground">No worker or vendor has been hired for this event yet — use "Hire Workers" / "Hire Vendors" and pick this event.</div>
      ) : (
        <div className="space-y-2">
          {data!.workers.map((w) => {
            const fee = w.final_fee ?? w.proposed_fee;
            return (
            <div key={`w-${w.id}`} className="rounded-xl bg-muted/40 px-3 py-2 text-xs">
              <div className="flex items-center justify-between gap-3">
                <span className="flex items-center gap-2 font-medium">
                  <HardHat className="h-3.5 w-3.5 text-muted-foreground" /> {w.worker?.full_name ?? "Worker"} — {w.task_name}
                  {w.service_category && <span className="rounded-full bg-accent px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">{w.service_category}</span>}
                </span>
                <span className="flex items-center gap-2">
                  {fee != null && <span className="font-semibold text-foreground">₹{fee.toLocaleString("en-IN")}</span>}
                  <span className={`rounded-full px-2 py-0.5 font-semibold capitalize ${statusTone[w.status] ?? "bg-muted"}`}>{w.status.replace("_", " ")}</span>
                  {w.payment_status === "paid" && <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 font-semibold text-emerald-700">Paid</span>}
                </span>
              </div>
              {w.status === "countered" && (
                <div className="mt-2 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-purple-300/60 bg-purple-50 dark:bg-purple-950/20 px-2.5 py-2">
                  <span className="flex items-center gap-1.5 font-semibold text-purple-800 dark:text-purple-300"><MessageSquareWarning className="h-3.5 w-3.5" /> Countered ₹{(w.counter_offer_amount ?? 0).toLocaleString("en-IN")}{w.counter_offer_note ? ` — "${w.counter_offer_note}"` : ""}</span>
                  <span className="flex gap-1.5">
                    <button disabled={busyId === w.id} onClick={() => respond("worker", w.id, true)} className="rounded-full bg-emerald-600 px-2.5 py-1 font-semibold text-white hover:bg-emerald-700 disabled:opacity-50">Accept</button>
                    <button disabled={busyId === w.id} onClick={() => respond("worker", w.id, false)} className="rounded-full border border-input px-2.5 py-1 font-semibold hover:bg-accent disabled:opacity-50">Decline</button>
                  </span>
                </div>
              )}
            </div>
            );
          })}
          {data!.vendors.map((v) => {
            const fee = v.final_fee ?? v.proposed_fee;
            return (
            <div key={`v-${v.id}`} className="rounded-xl bg-muted/40 px-3 py-2 text-xs">
              <div className="flex items-center justify-between gap-3">
                <span className="flex items-center gap-2 font-medium">
                  <Store className="h-3.5 w-3.5 text-muted-foreground" /> {v.vendor?.business_name ?? "Vendor"} — {v.task_name}
                  {v.service_category && <span className="rounded-full bg-accent px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">{v.service_category}</span>}
                </span>
                <span className="flex items-center gap-2">
                  {fee != null && <span className="font-semibold text-foreground">₹{fee.toLocaleString("en-IN")}</span>}
                  <span className={`rounded-full px-2 py-0.5 font-semibold capitalize ${statusTone[v.status] ?? "bg-muted"}`}>{v.status.replace("_", " ")}</span>
                  {v.payment_status === "paid" && <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 font-semibold text-emerald-700">Paid</span>}
                </span>
              </div>
              {v.status === "countered" && (
                <div className="mt-2 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-purple-300/60 bg-purple-50 dark:bg-purple-950/20 px-2.5 py-2">
                  <span className="flex items-center gap-1.5 font-semibold text-purple-800 dark:text-purple-300"><MessageSquareWarning className="h-3.5 w-3.5" /> Countered ₹{(v.counter_offer_amount ?? 0).toLocaleString("en-IN")}{v.counter_offer_note ? ` — "${v.counter_offer_note}"` : ""}</span>
                  <span className="flex gap-1.5">
                    <button disabled={busyId === v.id} onClick={() => respond("vendor", v.id, true)} className="rounded-full bg-emerald-600 px-2.5 py-1 font-semibold text-white hover:bg-emerald-700 disabled:opacity-50">Accept</button>
                    <button disabled={busyId === v.id} onClick={() => respond("vendor", v.id, false)} className="rounded-full border border-input px-2.5 py-1 font-semibold hover:bg-accent disabled:opacity-50">Decline</button>
                  </span>
                </div>
              )}
            </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function BookingDetailsModal({ booking, onClose }: { booking: HallBooking; onClose: () => void }) {
  const requestedServices = (booking.details?.requested_services as { category: string; name: string; requirement_note?: string | null }[] | undefined) ?? [];
  const priceBreakdown = (booking.details?.price_breakdown as PriceLine[] | undefined) ?? [];
  const balancePending = booking.amount != null ? Math.max(booking.amount - booking.advance_paid_amount, 0) : null;
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
    // Full money picture — previously only the raw `amount` (final
    // price) was shown here with no ₹ formatting and no mention of the
    // advance/balance split, so an owner glancing at this modal had no
    // way to tell how much of the money had actually come in yet.
    ["Advance requested", booking.advance_amount != null ? `₹${booking.advance_amount.toLocaleString("en-IN")}` : "Not set yet"],
    ["Advance received", `₹${booking.advance_paid_amount.toLocaleString("en-IN")}`],
    ["Total price", booking.amount != null ? `₹${booking.amount.toLocaleString("en-IN")}` : "Not priced yet"],
    ["Balance pending", balancePending != null ? `₹${balancePending.toLocaleString("en-IN")}` : "—"],
    ["Payment status", booking.payment_status],
    [
      "Requested services (with customer's requirement for each)",
      requestedServices.length > 0
        ? requestedServices.map((s) => `${s.name} (${s.category})${s.requirement_note ? ` — "${s.requirement_note}"` : ""}`).join("; ")
        : "None requested",
    ],
    ["Special instructions", booking.notes],
    ["Status", booking.status],
    ...(booking.status === "cancelled" && booking.decline_reason ? [["Decline/cancel reason", booking.decline_reason] as [string, unknown]] : []),
  ];

  function printThis() {
    window.print();
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4 print:static print:bg-white" onClick={onClose}>
      {/* Scopes window.print() to ONLY this modal's content. Without
          this, window.print() prints the whole page as the browser
          sees it — the modal is just an overlay, so the full bookings
          table sitting underneath printed too (every booking, not the
          one the owner opened this for). */}
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #booking-detail-print-area, #booking-detail-print-area * { visibility: visible; }
          #booking-detail-print-area { position: absolute; left: 0; top: 0; width: 100%; }
        }
      `}</style>
      <div
        id="booking-detail-print-area"
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
        {priceBreakdown.length > 0 && (
          <div className="mb-4 rounded-xl border border-border bg-muted/20 p-3">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">Itemised price</div>
            <div className="space-y-1 text-sm">
              {priceBreakdown.map((l, i) => (
                <div key={i} className="flex items-center justify-between">
                  <span>{l.label}</span>
                  <span className="font-medium">₹{l.amount.toLocaleString("en-IN")}</span>
                </div>
              ))}
              <div className="flex items-center justify-between border-t border-border/60 pt-1 font-semibold">
                <span>Total</span>
                <span>₹{priceBreakdown.reduce((s, l) => s + l.amount, 0).toLocaleString("en-IN")}</span>
              </div>
            </div>
          </div>
        )}
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
