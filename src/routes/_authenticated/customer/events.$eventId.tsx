import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Calendar, MapPin, Users, Wallet, Building2, Store, HardHat, Plus, ArrowLeft, IndianRupee, Download } from "lucide-react";

export const Route = createFileRoute("/_authenticated/customer/events/$eventId")({
  head: () => ({ meta: [{ title: "Event — EventOrbit Nova" }] }),
  component: EventDetailPage,
});

type EventRow = {
  id: string; name: string; event_type: string | null; event_date: string | null;
  venue: string | null; guests: number | null; budget: number | null; status: string; notes: string | null;
};

async function fetchEventBundle(eventId: string) {
  const [{ data: event, error: eErr }, { data: venueBookings, error: vErr }, { data: vendors, error: vdErr }, { data: workers, error: wErr }] = await Promise.all([
    supabase.from("customer_events").select("*").eq("id", eventId).maybeSingle(),
    supabase.from("customer_bookings" as never).select("id,target_name,event_date,status,payment_status,amount")
      .eq("customer_event_id" as never, eventId as never).eq("kind" as never, "hall" as never),
    supabase.from("vendor_tasks" as never).select("id,task_name,status,payment_status,payment_amount,vendor:vendors(business_name)")
      .eq("customer_event_id" as never, eventId as never),
    supabase.from("worker_tasks" as never).select("id,task_name,status,payment_status,payment_amount,worker:workers(full_name)")
      .eq("customer_event_id" as never, eventId as never),
  ]);
  if (eErr) throw eErr;
  if (vErr) throw vErr;
  if (vdErr) throw vdErr;
  if (wErr) throw wErr;
  return {
    event: event as unknown as EventRow | null,
    venueBookings: (venueBookings ?? []) as unknown as { id: string; target_name: string; event_date: string | null; status: string; payment_status: string; amount: number }[],
    vendors: (vendors ?? []) as unknown as { id: string; task_name: string; status: string; payment_status: string; payment_amount: number | null; vendor: { business_name: string } | null }[],
    workers: (workers ?? []) as unknown as { id: string; task_name: string; status: string; payment_status: string; payment_amount: number | null; worker: { full_name: string } | null }[],
  };
}

const statusTone: Record<string, string> = {
  pending: "bg-amber-500/15 text-amber-700", confirmed: "bg-blue-500/15 text-blue-700", accepted: "bg-blue-500/15 text-blue-700",
  in_progress: "bg-blue-500/15 text-blue-700", completed: "bg-emerald-500/15 text-emerald-700",
  rejected: "bg-rose-500/15 text-rose-700", cancelled: "bg-rose-500/15 text-rose-700", reschedule_requested: "bg-amber-500/15 text-amber-700",
};

function EventDetailPage() {
  const { eventId } = Route.useParams();
  const { data, isLoading } = useQuery({ queryKey: ["customer-event-bundle", eventId], queryFn: () => fetchEventBundle(eventId) });

  if (isLoading) return <div className="h-40 rounded-2xl bg-card animate-pulse border border-border" />;
  if (!data?.event) return <div className="rounded-2xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">Event not found.</div>;

  const { event, venueBookings, vendors, workers } = data;

  return (
    <div className="space-y-6">
      <Link to="/customer/events" className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> All events
      </Link>

      <div className="rounded-2xl border border-border bg-card p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{event.name}</h1>
            <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
              {event.event_type && <span>{event.event_type}</span>}
              {event.event_date && <span className="flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5" /> {new Date(event.event_date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</span>}
              {event.guests != null && <span className="flex items-center gap-1.5"><Users className="h-3.5 w-3.5" /> {event.guests} guests</span>}
              {event.budget != null && <span className="flex items-center gap-1.5"><Wallet className="h-3.5 w-3.5" /> ₹{Number(event.budget).toLocaleString("en-IN")} budget</span>}
            </div>
          </div>
          <span className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${statusTone[event.status] ?? "bg-muted"}`}>{event.status.replace("_", " ")}</span>
        </div>
        {event.notes && <p className="mt-3 text-sm text-muted-foreground border-t border-border pt-3">{event.notes}</p>}
      </div>

      <EventQuoteSummary eventName={event.name} venueBookings={venueBookings} vendors={vendors} workers={workers} />

      {/* Venue */}
      <Section
        icon={Building2} title="Venue"
        actionTo={{ to: "/marketplace", search: { event_id: eventId, tab: "venue" as const } }}
        actionLabel={venueBookings.length > 0 ? "Book another venue" : "Find a venue for this event"}
      >
        {venueBookings.length === 0 ? (
          <EmptyRow text="No venue booked for this event yet." />
        ) : venueBookings.map((b) => (
          <Row key={b.id} id={b.id} kind="hall" name={b.target_name} status={b.status} paid={b.payment_status === "paid"} amount={b.amount} />
        ))}
      </Section>

      {/* Vendors */}
      <Section
        icon={Store} title="Vendors"
        actionTo={{ to: "/marketplace", search: { event_id: eventId, tab: "vendor" as const } }}
        actionLabel="Find a vendor for this event"
      >
        {vendors.length === 0 ? (
          <EmptyRow text="No vendor hired for this event yet." />
        ) : vendors.map((v) => (
          <Row key={v.id} id={v.id} kind="vendor" name={`${v.vendor?.business_name ?? "Vendor"} — ${v.task_name}`} status={v.status} paid={v.payment_status === "paid"} amount={v.payment_amount ?? undefined} />
        ))}
      </Section>

      {/* Workers */}
      <Section
        icon={HardHat} title="Workers"
        actionTo={{ to: "/marketplace", search: { event_id: eventId, tab: "worker" as const } }}
        actionLabel="Find a worker for this event"
      >
        {workers.length === 0 ? (
          <EmptyRow text="No worker hired for this event yet." />
        ) : workers.map((w) => (
          <Row key={w.id} id={w.id} kind="worker" name={`${w.worker?.full_name ?? "Worker"} — ${w.task_name}`} status={w.status} paid={w.payment_status === "paid"} amount={w.payment_amount ?? undefined} />
        ))}
      </Section>
    </div>
  );
}

function EventQuoteSummary({
  eventName, venueBookings, vendors, workers,
}: {
  eventName: string;
  venueBookings: { id: string; target_name: string; amount: number; payment_status: string }[];
  vendors: { id: string; task_name: string; vendor: { business_name: string } | null; payment_amount: number | null; payment_status: string }[];
  workers: { id: string; task_name: string; worker: { full_name: string } | null; payment_amount: number | null; payment_status: string }[];
}) {
  // Lines with no amount yet (e.g. a hall booking still awaiting the
  // owner's advance/final price, per the owner-set pricing flow) are
  // shown as "Pending" rather than counted as ₹0 — the total only
  // adds up amounts that are actually known, and says so.
  type Line = { name: string; amount: number | null; paid: boolean };
  const lines: Line[] = [
    ...venueBookings.map((b) => ({ name: b.target_name, amount: b.amount ?? null, paid: b.payment_status === "paid" })),
    ...vendors.map((v) => ({ name: `${v.vendor?.business_name ?? "Vendor"} — ${v.task_name}`, amount: v.payment_amount, paid: v.payment_status === "paid" })),
    ...workers.map((w) => ({ name: `${w.worker?.full_name ?? "Worker"} — ${w.task_name}`, amount: w.payment_amount, paid: w.payment_status === "paid" })),
  ];

  if (lines.length === 0) return null;

  const known = lines.filter((l) => l.amount != null);
  const pendingCount = lines.length - known.length;
  const total = known.reduce((sum, l) => sum + (l.amount ?? 0), 0);
  const paidTotal = known.filter((l) => l.paid).reduce((sum, l) => sum + (l.amount ?? 0), 0);

  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      <div className="flex items-center gap-2 text-sm font-semibold"><IndianRupee className="h-4 w-4" /> Event summary — {eventName}</div>
      <div className="mt-3 divide-y divide-border/60">
        {lines.map((l, i) => (
          <div key={i} className="flex items-center justify-between gap-3 py-2 text-sm">
            <span className="text-muted-foreground">{l.name}</span>
            <span className="font-semibold">
              {l.amount != null ? `₹${l.amount.toLocaleString("en-IN")}` : <span className="text-xs italic text-muted-foreground">Pending — price not set yet</span>}
            </span>
          </div>
        ))}
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3">
        <div className="text-xs text-muted-foreground">
          {paidTotal > 0 && <>₹{paidTotal.toLocaleString("en-IN")} already paid. </>}
          {pendingCount > 0 && <>{pendingCount} item{pendingCount > 1 ? "s" : ""} still awaiting a price.</>}
        </div>
        <div className="text-base font-bold">Total{pendingCount > 0 ? " so far" : ""}: ₹{total.toLocaleString("en-IN")}</div>
      </div>
    </div>
  );
}

function Section({ icon: Icon, title, children, actionTo, actionLabel }: {
  icon: React.ComponentType<{ className?: string }>; title: string; children: React.ReactNode;
  actionTo: { to: string; search: Record<string, string> }; actionLabel: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm font-semibold"><Icon className="h-4 w-4" /> {title}</div>
        <Link to={actionTo.to as never} search={actionTo.search as never}
          className="inline-flex items-center gap-1.5 rounded-full border border-input px-3.5 py-2 text-xs font-semibold hover:bg-accent">
          <Plus className="h-3.5 w-3.5" /> {actionLabel}
        </Link>
      </div>
      <div className="mt-3 space-y-2">{children}</div>
    </div>
  );
}

function Row({ id, kind, name, status, paid, amount }: { id: string; kind: "hall" | "vendor" | "worker"; name: string; status: string; paid: boolean; amount?: number }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-muted/40 px-3 py-2 text-sm">
      <span className="font-medium">{name}</span>
      <span className="flex items-center gap-2 text-xs">
        <span className={`rounded-full px-2 py-0.5 font-semibold capitalize ${statusTone[status] ?? "bg-muted"}`}>{status.replace("_", " ")}</span>
        {amount != null && <span className="flex items-center gap-0.5 font-semibold text-foreground"><IndianRupee className="h-3 w-3" />{amount.toLocaleString("en-IN")}</span>}
        {paid && (
          <>
            <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 font-semibold text-emerald-700">Paid</span>
            <Link to="/receipt/$type/$id" params={{ type: kind, id }} target="_blank"
              className="inline-flex items-center gap-1 rounded-full border border-input px-2 py-0.5 font-semibold text-brand-violet hover:bg-accent">
              <Download className="h-3 w-3" /> Receipt
            </Link>
          </>
        )}
      </span>
    </div>
  );
}

function EmptyRow({ text }: { text: string }) {
  return <div className="flex items-center gap-2 rounded-xl bg-muted/30 px-3 py-2 text-xs text-muted-foreground"><MapPin className="h-3.5 w-3.5" /> {text}</div>;
}
