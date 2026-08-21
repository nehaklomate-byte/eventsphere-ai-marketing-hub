import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { PartyPopper, Building2, Store, HardHat, IndianRupee, Download, Loader2, Search, CheckCircle2 } from "lucide-react";
import { fetchEventFinancials, downloadCsv, type EventFinancialRow, type EventPartyRow } from "@/lib/admin";

export const Route = createFileRoute("/_authenticated/admin/events")({
  head: () => ({ meta: [{ title: "Event Payments — EventOrbit Nova" }, { name: "robots", content: "noindex" }] }),
  component: EventPaymentsPage,
});

function money(n: number) { return `₹${Number(n || 0).toLocaleString("en-IN")}`; }

const ROLE_ICON: Record<EventPartyRow["role"], typeof Building2> = { venue: Building2, vendor: Store, worker: HardHat };
const ROLE_LABEL: Record<EventPartyRow["role"], string> = { venue: "Venue", vendor: "Vendor", worker: "Worker" };
const ROLE_STYLE: Record<EventPartyRow["role"], string> = {
  venue: "bg-purple-100 text-purple-800 dark:bg-purple-950/40 dark:text-purple-300",
  vendor: "bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300",
  worker: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300",
};

function EventPaymentsPage() {
  const { data, isLoading } = useQuery({ queryKey: ["admin-event-financials"], queryFn: fetchEventFinancials });
  const [q, setQ] = useState("");

  const rows = data ?? [];
  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return rows;
    return rows.filter((e) =>
      e.name.toLowerCase().includes(query) ||
      (e.customer_name ?? "").toLowerCase().includes(query) ||
      [...e.venue, ...e.vendors, ...e.workers].some((p) => p.name.toLowerCase().includes(query))
    );
  }, [rows, q]);

  const grandCollected = rows.reduce((s, e) => s + e.totalCollected, 0);
  const grandCommission = rows.reduce((s, e) => s + e.totalCommission, 0);
  const grandOwed = rows.reduce((s, e) => s + e.totalOwed, 0);
  const grandPaidOut = rows.reduce((s, e) => s + e.totalPaidOut, 0);

  function csvExport() {
    const flat: Record<string, unknown>[] = [];
    for (const e of rows) {
      for (const p of [...e.venue, ...e.vendors, ...e.workers]) {
        flat.push({
          event: e.name, event_type: e.event_type ?? "", event_date: e.event_date ?? "", customer: e.customer_name ?? "",
          role: p.role, booking_name: p.name, amount: p.amount, commission: p.commission, payout: p.payout,
          payment_status: p.paymentStatus, payout_status: p.payoutStatus, razorpay_payment_id: p.razorpayPaymentId ?? "",
        });
      }
    }
    downloadCsv("event-payments.csv", flat);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl md:text-3xl font-bold tracking-tight">
            <PartyPopper className="h-7 w-7 text-brand-violet" /> Event Payments
          </h1>
          <p className="mt-1 text-muted-foreground">Per event — which venue, vendor and worker were booked, what the customer paid, platform commission, and what's owed (or already paid) to each role.</p>
        </div>
        <button onClick={csvExport} className="inline-flex items-center gap-1.5 rounded-full border border-input px-3.5 py-2 text-xs font-semibold hover:bg-accent">
          <Download className="h-3.5 w-3.5" /> Export CSV
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={IndianRupee} label="Collected from customers" value={money(grandCollected)} tone="text-emerald-600" />
        <StatCard icon={IndianRupee} label="Platform commission" value={money(grandCommission)} tone="text-brand-violet" />
        <StatCard icon={IndianRupee} label="Owed to venue/vendor/worker" value={money(grandOwed)} tone="text-amber-600" />
        <StatCard icon={CheckCircle2} label="Already paid out" value={money(grandPaidOut)} tone="text-emerald-600" />
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search event, customer, venue, vendor, worker…"
          className="w-full rounded-full border border-input bg-background py-2.5 pl-10 pr-4 text-sm outline-none focus:border-brand-violet" />
      </div>

      {isLoading ? (
        <div className="rounded-2xl border border-border bg-card p-10 text-center text-sm text-muted-foreground"><Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin" /> Loading…</div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card/40 p-10 text-center text-sm text-muted-foreground">No events with bookings found.</div>
      ) : (
        <div className="space-y-4">
          {filtered.map((e) => <EventCard key={e.id} event={e} />)}
        </div>
      )}
    </div>
  );
}

function StatCard({ icon: Icon, label, value, tone }: { icon: React.ElementType; label: string; value: string; tone: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="flex items-center gap-2 text-sm text-muted-foreground"><Icon className={`h-4 w-4 ${tone}`} /> {label}</div>
      <div className="mt-1.5 text-2xl font-bold">{value}</div>
    </div>
  );
}

function EventCard({ event }: { event: EventFinancialRow }) {
  const parties = [...event.venue, ...event.vendors, ...event.workers];
  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border bg-muted/30 p-5">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-bold tracking-tight">{event.name}</h2>
            {event.event_type && <span className="rounded-full bg-muted px-2.5 py-0.5 text-[11px] font-semibold capitalize text-muted-foreground">{event.event_type}</span>}
            {event.id.startsWith("standalone-") && <span className="rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 px-2.5 py-0.5 text-[11px] font-semibold">Direct booking — not linked to an event</span>}
          </div>
          <div className="mt-1 text-xs text-muted-foreground">
            {event.customer_name && <>Customer: <span className="font-medium text-foreground">{event.customer_name}</span> · </>}
            {event.event_date ? new Date(event.event_date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "No date set"}
          </div>
        </div>
        <div className="flex flex-wrap gap-4 text-right text-xs">
          <div><div className="text-muted-foreground">Collected</div><div className="font-semibold text-emerald-600">{money(event.totalCollected)}</div></div>
          <div><div className="text-muted-foreground">Commission</div><div className="font-semibold text-brand-violet">{money(event.totalCommission)}</div></div>
          <div><div className="text-muted-foreground">Owed out</div><div className="font-semibold text-amber-600">{money(event.totalOwed - event.totalPaidOut)}</div></div>
          <div><div className="text-muted-foreground">Paid out</div><div className="font-semibold text-emerald-600">{money(event.totalPaidOut)}</div></div>
        </div>
      </div>

      <div className="divide-y divide-border">
        {parties.length === 0 ? (
          <div className="p-5 text-sm text-muted-foreground">No bookings recorded for this event yet.</div>
        ) : parties.map((p) => <PartyRow key={`${p.role}-${p.id}`} party={p} />)}
      </div>
    </div>
  );
}

function PartyRow({ party }: { party: EventPartyRow }) {
  const Icon = ROLE_ICON[party.role];
  const [expanded, setExpanded] = useState(false);
  const snap = party.snapshot;
  return (
    <div className="p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${ROLE_STYLE[party.role]}`}>
            <Icon className="h-3 w-3" /> {ROLE_LABEL[party.role]}
          </span>
          <span className="font-medium truncate">{party.name}</span>
          {snap && (
            <button type="button" onClick={() => setExpanded((v) => !v)} className="text-[11px] font-semibold text-brand-violet hover:underline shrink-0">
              {expanded ? "Hide frozen details" : "View frozen details"}
            </button>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-4 text-xs">
          <Figure label="Amount" value={money(party.amount)} />
          <Figure label="Commission" value={money(party.commission)} tone="text-brand-violet" />
          <Figure label="Payout" value={money(party.payout)} tone="text-amber-600" />
          {party.paymentStatus === "paid" ? (
            <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-400 font-semibold"><CheckCircle2 className="h-3.5 w-3.5" /> Paid by customer</span>
          ) : (
            <span className="rounded-full bg-muted px-2.5 py-0.5 font-semibold capitalize text-muted-foreground">{party.paymentStatus}</span>
          )}
          {party.payoutStatus === "paid" && <span className="rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 px-2.5 py-0.5 font-semibold">Payout sent</span>}
          {party.payoutStatus === "pending" && <span className="rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 px-2.5 py-0.5 font-semibold">Payout pending</span>}
          {party.paymentStatus === "paid" && (
            <Link to="/receipt/$type/$id" params={{ type: party.role === "venue" ? "hall" : party.role, id: party.id }} target="_blank"
              className="inline-flex items-center gap-1 rounded-full border border-input px-2.5 py-1 font-semibold text-brand-violet hover:bg-accent">
              <Download className="h-3.5 w-3.5" /> Receipt
            </Link>
          )}
        </div>
      </div>
      {expanded && snap && (
        // Frozen at the moment the owner set the final price — never
        // re-derived from the venue's current profile, so this stays
        // accurate even if the venue has since changed its pricing.
        <div className="mt-3 rounded-xl bg-muted/30 p-3 text-xs space-y-1.5">
          <div className="flex justify-between"><span className="text-muted-foreground">Venue base price used</span><span className="font-medium">{snap.venue_base_price_used != null ? money(snap.venue_base_price_used) : "—"}</span></div>
          {snap.applicable_guest_tier && (
            <div className="flex justify-between"><span className="text-muted-foreground">Guest tier applied</span><span className="font-medium">Up to {snap.applicable_guest_tier.max_guests} guests — {money(snap.applicable_guest_tier.price)}</span></div>
          )}
          {snap.guest_count != null && (
            <div className="flex justify-between"><span className="text-muted-foreground">Guest count</span><span className="font-medium">{snap.guest_count}</span></div>
          )}
          {snap.amenities.length > 0 && (
            <div className="flex justify-between gap-4"><span className="text-muted-foreground shrink-0">Amenities included</span><span className="font-medium text-right">{snap.amenities.join(", ")}</span></div>
          )}
          {snap.requested_services.length > 0 && (
            <div>
              <span className="text-muted-foreground">Services at the time</span>
              <div className="mt-1 space-y-0.5">
                {snap.requested_services.map((s, i) => (
                  <div key={i} className="flex justify-between">
                    <span>{s.name} <span className="text-muted-foreground">({s.category})</span></span>
                    <span className="font-medium">{s.price != null ? `${money(s.price)}${s.per_guest ? "/guest" : ""}` : "no price at request time"}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Figure({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="text-right">
      <div className="text-muted-foreground">{label}</div>
      <div className={`font-semibold ${tone ?? "text-foreground"}`}>{value}</div>
    </div>
  );
}
