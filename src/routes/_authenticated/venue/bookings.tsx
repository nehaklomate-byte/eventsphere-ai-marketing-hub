import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { CalendarCheck, Check, X, Loader2, IndianRupee } from "lucide-react";
import { fetchMyHalls, fetchHallBookings, updateBookingStatus, type HallBooking } from "@/lib/venue";

export const Route = createFileRoute("/_authenticated/venue/bookings")({
  head: () => ({ meta: [{ title: "Bookings — EventOrbit AI" }, { name: "robots", content: "noindex" }] }),
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl md:text-3xl font-bold tracking-tight">
          <CalendarCheck className="h-7 w-7 text-brand-violet" /> Bookings
        </h1>
        <p className="mt-1 text-muted-foreground">Confirm, cancel, or track every booking made on your venue.</p>
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
                      {b.event_date ? new Date(b.event_date).toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" }) : "Date TBD"}
                    </h3>
                    <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${STATUS_STYLE[b.status]}`}>
                      {b.status.replace("_", " ")}
                    </span>
                  </div>
                  <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1"><IndianRupee className="h-3.5 w-3.5" /> {b.amount.toLocaleString("en-IN")}</span>
                    <span className="capitalize">Payment: {b.payment_status}</span>
                  </div>
                  {b.notes && <p className="mt-2 text-sm text-foreground/80">{b.notes}</p>}
                </div>

                <div className="flex flex-wrap gap-2">
                  {b.status === "pending" && (
                    <>
                      <button
                        disabled={busyId === b.id}
                        onClick={() => setStatus(b.id, "confirmed")}
                        className="flex items-center gap-1.5 rounded-full bg-emerald-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                      >
                        {busyId === b.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />} Confirm
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
                  {b.status === "confirmed" && (
                    <button
                      disabled={busyId === b.id}
                      onClick={() => setStatus(b.id, "completed")}
                      className="flex items-center gap-1.5 rounded-full bg-zinc-800 px-3.5 py-2 text-xs font-semibold text-white hover:bg-zinc-900 disabled:opacity-50"
                    >
                      {busyId === b.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />} Mark completed
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
