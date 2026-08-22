import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Loader2, Send, Phone, AlertCircle, CheckCircle2 } from "lucide-react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { emailSchema, phoneSchema } from "@/lib/validation";

/* ============================================================
 * What this venue offers in-house vs what a customer books
 * separately (from the vendor marketplace) — see venue's "Services"
 * profile section for the in_house/price/options setup per category.
 * ============================================================ */
export type ServiceOfferingMap = Record<string, {
  in_house: boolean;
  price: number | null;
  options: { id: string; name: string; price: number; per_guest: boolean; items?: string[] }[];
}>;

const ORGANIZER_TYPES = [
  "Individual", "Family", "College / University", "School", "Corporate Company", "Startup",
  "Government Department", "NGO", "Event Management Company", "Religious Organization",
  "Society / Community", "Other",
];

const EVENT_TYPES = [
  "Wedding", "Reception", "Engagement", "Birthday Party", "Baby Shower", "Anniversary",
  "Conference", "Seminar", "Workshop", "Hackathon", "Tech Fest", "Cultural Festival",
  "Sports Tournament", "College Fest", "Annual Function", "Freshers", "Farewell",
  "Placement Drive", "Training Program", "Award Ceremony", "Corporate Meeting", "Product Launch",
  "Exhibition", "Government Program", "Awareness Campaign", "Medical Camp", "NGO Event",
  "Religious Function", "Music Show", "Fashion Show", "Other",
];

/* ============================================================
 * Book Now (real booking, full event details) + Ask a Question
 *
 * Lives on its own dedicated page (/hall/$id/book) instead of the
 * venue profile's sidebar — the profile page only links here via a
 * "Book Now" button so the form gets a full, uncramped page instead
 * of a narrow sidebar column.
 * ============================================================ */

export function BookingAndEnquiry({
  hallId, hallName, pricePerDay, guestPricingTiers, blockedDates, advanceAmount, serviceOfferings, eventId, sourceSlug, initialMode = "booking",
}: {
  hallId: string; hallName: string; pricePerDay: number | null; guestPricingTiers: { max_guests: number; price: number }[];
  blockedDates: string[]; advanceAmount: number | null; serviceOfferings: ServiceOfferingMap;
  eventId?: string; sourceSlug?: string; initialMode?: "booking" | "enquiry";
}) {
  const [mode, setMode] = useState<"booking" | "enquiry">(initialMode);
  return (
    <div>
      <div className="mb-4 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => setMode("booking")}
          className={`rounded-full px-4 py-2 text-sm font-semibold transition ${mode === "booking" ? "bg-brand-violet text-white" : "border border-input text-muted-foreground hover:bg-accent"}`}
        >
          Book Now
        </button>
        <button
          type="button"
          onClick={() => setMode("enquiry")}
          className={`rounded-full px-4 py-2 text-sm font-semibold transition ${mode === "enquiry" ? "bg-brand-violet text-white" : "border border-input text-muted-foreground hover:bg-accent"}`}
        >
          Ask a Question
        </button>
      </div>
      {mode === "booking"
        ? <BookingForm hallId={hallId} hallName={hallName} pricePerDay={pricePerDay} guestPricingTiers={guestPricingTiers} blockedDates={blockedDates} advanceAmount={advanceAmount} serviceOfferings={serviceOfferings} eventId={eventId} sourceSlug={sourceSlug} />
        : <EnquiryForm hallId={hallId} sourceSlug={sourceSlug} />}
    </div>
  );
}

const TODAY_ISO = new Date().toISOString().slice(0, 10);

const bookingSchema = z.object({
  event_name: z.string().trim().min(2, "Enter an event name"),
  organizer_type: z.string().min(1, "Select who's organizing"),
  organizer_type_other: z.string().optional(),
  event_type: z.string().min(1, "Select an event type"),
  event_type_other: z.string().optional(),
  contact_person: z.string().trim().min(2, "Enter contact person's name"),
  contact_phone: phoneSchema,
  contact_email: emailSchema,
  event_date: z.string().min(1, "Pick a start date").refine((v) => v >= TODAY_ISO, "Pick a date from today onwards — past dates can't be booked"),
  event_end_date: z.string().optional(),
  guest_count: z.string().regex(/^\d+$/, "Enter guest count"),
  special_instructions: z.string().max(1000).optional(),
});

function BookingForm({
  hallId, hallName, pricePerDay, guestPricingTiers, blockedDates, advanceAmount, serviceOfferings, eventId, sourceSlug,
}: { hallId: string; hallName: string; pricePerDay: number | null; guestPricingTiers: { max_guests: number; price: number }[]; blockedDates: string[]; advanceAmount: number | null; serviceOfferings: ServiceOfferingMap; eventId?: string; sourceSlug?: string }) {
  const [state, setState] = useState({
    event_name: "", organizer_type: "", organizer_type_other: "", event_type: "", event_type_other: "",
    contact_person: "", contact_phone: "", contact_email: "", event_date: "", event_end_date: "",
    guest_count: "", special_instructions: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [needsLogin, setNeedsLogin] = useState(false);

  // In-house services the customer can build themselves — a category
  // Guest count is still collected — the venue needs it for capacity
  // planning and it's what their guest-count pricing tiers (if any) key
  // off internally — but the customer no longer picks add-ons or sees a
  // computed total here. Pricing (advance now, then a final whole price)
  // is entirely the venue owner's call after they've reviewed the
  // request, set from their Bookings page (migration 20260819150000).
  const inHouseServices = Object.entries(serviceOfferings).filter(([, v]) => v.in_house);
  // Which dates in the picked range are already confirmed for someone
  // else — checked against halls.blocked_dates (kept in sync by the DB
  // trigger in migration 20260819140000 whenever a booking is
  // confirmed/cancelled). Caught here, before the customer even
  // submits, instead of only failing later when the owner tries to
  // confirm a clashing request.
  const clashDate = (() => {
    if (!state.event_date) return null;
    const start = new Date(state.event_date);
    const end = state.event_end_date ? new Date(state.event_end_date) : start;
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const iso = d.toISOString().slice(0, 10);
      if (blockedDates.includes(iso)) return iso;
    }
    return null;
  })();

  const set = (k: string, v: string) => setState((s) => ({ ...s, [k]: v }));
  const [requestedOptions, setRequestedOptions] = useState<Record<string, boolean>>({});
  // Per-service requirement, e.g. under "Decoration" a customer might type
  // "Theme: Royal Rajasthani, red & gold" — kept separate per option so the
  // venue owner sees exactly which service a note belongs to, instead of
  // everything lumped into the one general instructions box below.
  const [serviceNotes, setServiceNotes] = useState<Record<string, string>>({});
  function toggleOption(key: string) {
    setRequestedOptions((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      // Clear a note if the option gets unticked, so a stray note can't
      // silently ride along on a service the customer no longer wants.
      if (!next[key]) setServiceNotes((n) => { const c = { ...n }; delete c[key]; return c; });
      return next;
    });
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErrors({}); setErr(null);
    const parsed = bookingSchema.safeParse(state);
    if (!parsed.success) {
      const fe: Record<string, string> = {};
      parsed.error.issues.forEach((i) => { fe[i.path[0] as string] = i.message; });
      setErrors(fe); return;
    }
    setSubmitting(true);
    const { data: userRes } = await supabase.auth.getUser();
    if (!userRes.user) {
      setSubmitting(false);
      setNeedsLogin(true);
      return;
    }
    const d = parsed.data;
    const { error } = await supabase.from("customer_bookings" as never).insert({
      user_id: userRes.user.id,
      kind: "hall",
      target_id: hallId,
      target_name: hallName,
      customer_event_id: eventId ?? null,
      event_date: d.event_date,
      event_end_date: d.event_end_date || null,
      // No amount/advance_amount here on purpose — the venue owner sets
      // both after reviewing this request (see Bookings page). This
      // customer just describes what they need.
      booking_source: sourceSlug ? "public_profile_link" : "marketplace",
      source_slug: sourceSlug ?? null,
      status: "pending",
      payment_status: "pending",
      notes: d.special_instructions || null,
      details: {
        event_name: d.event_name,
        organizer_type: d.organizer_type === "Other" ? (d.organizer_type_other || "Other") : d.organizer_type,
        event_type: d.event_type === "Other" ? (d.event_type_other || "Other") : d.event_type,
        contact_person: d.contact_person,
        contact_phone: d.contact_phone,
        contact_email: d.contact_email,
        guest_count: Number(d.guest_count),
        // Which in-house options the customer is interested in — no
        // price attached (the venue owner still sets the final price
        // manually, on purpose — see the note above). This just turns
        // "mention it in special instructions" into a structured list
        // so the owner knows exactly what to quote for, without
        // reintroducing customer-computed pricing.
        requested_services: Object.entries(serviceOfferings).flatMap(([cat, svc]) =>
          svc.in_house
            ? svc.options.filter((o) => requestedOptions[o.id]).map((o) => ({
                category: cat,
                name: o.name,
                // What the customer wants FOR this specific service (theme,
                // colours, must-haves, etc.) — the venue owner sees this
                // right next to the item when they price it.
                requirement_note: (serviceNotes[o.id] || "").trim() || null,
              }))
            : []
        ),
      },
    } as never);
    setSubmitting(false);
    if (error) { setErr("Could not create your booking. Please try again."); return; }
    setDone(true);
  }

  if (needsLogin) {
    return (
      <div className="rounded-2xl border border-amber-300/60 bg-amber-50 dark:bg-amber-950/20 p-5 text-sm">
        <p className="font-semibold text-amber-800 dark:text-amber-300">Please sign in to book this venue</p>
        <Link to="/login" className="mt-3 inline-flex items-center justify-center gap-2 rounded-full btn-brand btn-brand-hover px-4 py-2.5 text-sm font-semibold w-full">
          Sign in / Register
        </Link>
      </div>
    );
  }

  if (done) {
    return (
      <div className="rounded-2xl border border-brand-violet/30 bg-accent/40 p-5 text-sm">
        <div className="inline-flex items-center gap-2 font-semibold text-brand-violet"><CheckCircle2 className="h-4 w-4" /> Booking request sent</div>
        <p className="mt-1 text-muted-foreground">The venue owner will review the full details and confirm shortly. Track it anytime from My Bookings in your dashboard.</p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-3">
      <h3 className="font-display text-base font-semibold">Request to book</h3>
      {err && <div role="alert" className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive"><AlertCircle className="h-3.5 w-3.5 mt-0.5" />{err}</div>}

      <Row label="Event name" error={errors.event_name}>
        <input className="input" value={state.event_name} onChange={(e) => set("event_name", e.target.value)} placeholder="e.g., Priya & Rohan's Wedding" />
      </Row>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Row label="Who's organizing?" error={errors.organizer_type}>
          <select className="input" value={state.organizer_type} onChange={(e) => set("organizer_type", e.target.value)}>
            <option value="" disabled>Select…</option>
            {ORGANIZER_TYPES.map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
        </Row>
        {state.organizer_type === "Other" && (
          <Row label="Please specify">
            <input className="input" value={state.organizer_type_other} onChange={(e) => set("organizer_type_other", e.target.value)} />
          </Row>
        )}

        <Row label="Event type" error={errors.event_type}>
          <select className="input" value={state.event_type} onChange={(e) => set("event_type", e.target.value)}>
            <option value="" disabled>Select…</option>
            {EVENT_TYPES.map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
        </Row>
        {state.event_type === "Other" && (
          <Row label="Please specify">
            <input className="input" value={state.event_type_other} onChange={(e) => set("event_type_other", e.target.value)} />
          </Row>
        )}
      </div>

      <Row label="Contact person" error={errors.contact_person}>
        <input className="input" value={state.contact_person} onChange={(e) => set("contact_person", e.target.value)} placeholder="Full name" />
      </Row>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Row label="Mobile number" error={errors.contact_phone}>
          <input type="tel" className="input" value={state.contact_phone} onChange={(e) => set("contact_phone", e.target.value)} placeholder="10-digit mobile" />
        </Row>
        <Row label="Email" error={errors.contact_email}>
          <input type="email" className="input" value={state.contact_email} onChange={(e) => set("contact_email", e.target.value)} placeholder="you@example.com" />
        </Row>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Row label="Event start date" error={errors.event_date}>
          <input type="date" className="input" min={TODAY_ISO} value={state.event_date} onChange={(e) => set("event_date", e.target.value)} />
        </Row>
        <Row label="Event end date (optional — leave blank for a single-day event)" error={errors.event_end_date}>
          <input type="date" className="input" min={state.event_date || TODAY_ISO} value={state.event_end_date} onChange={(e) => set("event_end_date", e.target.value)} />
        </Row>
      </div>
      {clashDate && (
        <p className="rounded-lg bg-rose-50 dark:bg-rose-950/30 px-3 py-2 text-xs font-medium text-rose-700 dark:text-rose-300">
          This venue is already booked on {clashDate} — please pick different dates.
        </p>
      )}

      <Row label="Expected guests" error={errors.guest_count}>
        <input type="number" className="input" value={state.guest_count} onChange={(e) => set("guest_count", e.target.value)} placeholder="e.g., 250" />
      </Row>

      <Row label="Anything else? (optional)" error={errors.special_instructions}>
        <textarea rows={3} className="input" value={state.special_instructions} onChange={(e) => set("special_instructions", e.target.value)} placeholder="Any requirement not covered by a service below — e.g. a specific decoration idea the venue doesn't list" />
      </Row>

      {inHouseServices.length > 0 && (
        <div className="rounded-xl border border-border bg-muted/20 p-3 space-y-2">
          <div className="text-xs font-semibold text-muted-foreground">Interested in any of these in-house services?</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {inHouseServices.map(([cat, svc]) => (
              <div key={cat} className="space-y-1">
                <div className="text-xs font-semibold">{cat}</div>
                {svc.options.length === 0 ? (
                  <span className="rounded-full bg-background border border-border px-2.5 py-1 text-xs text-muted-foreground">Ask about pricing</span>
                ) : (
                  <div className="space-y-1">
                    {svc.options.map((o) => (
                      <div key={o.id} className="rounded-lg bg-background border border-border px-2.5 py-1.5 text-xs">
                        <label className="flex items-start gap-2 cursor-pointer">
                          <input type="checkbox" className="mt-0.5" checked={!!requestedOptions[o.id]} onChange={() => toggleOption(o.id)} />
                          <span>
                            <span className="font-medium">{o.name}</span>
                            {o.items && o.items.length > 0 && <span className="block text-[11px] text-muted-foreground">Includes: {o.items.join(", ")}</span>}
                          </span>
                        </label>
                        {requestedOptions[o.id] && (
                          <textarea
                            rows={2}
                            className="input mt-1.5"
                            placeholder={`Any specific requirement for ${o.name}? (theme, colours, must-haves…)`}
                            value={serviceNotes[o.id] || ""}
                            onChange={(e) => setServiceNotes((n) => ({ ...n, [o.id]: e.target.value }))}
                          />
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
          <p className="text-[11px] text-muted-foreground">Tick what you're interested in and add any specific requirement under it. The venue will price each one and share an itemised total with you.</p>
        </div>
      )}

      <div className="rounded-xl bg-accent/40 px-3.5 py-2.5 text-sm text-muted-foreground">
        No payment is needed to send this request. The venue will review it, price each service you selected, and share an itemised total — you'll pay the advance once they confirm.
      </div>

      <button type="submit" disabled={submitting || !!clashDate} className="w-full inline-flex items-center justify-center gap-2 rounded-full btn-brand btn-brand-hover px-4 py-2.5 text-sm font-semibold disabled:opacity-70">
        {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />} Request booking
      </button>
      <style>{`
        .input { width: 100%; border-radius: 10px; border: 1px solid var(--border); background: var(--background); padding: 8px 12px; font-size: 13px; outline: none; }
        .input:focus { border-color: var(--brand-violet); box-shadow: 0 0 0 3px color-mix(in oklab, var(--brand-violet) 22%, transparent); }
      `}</style>
    </form>
  );
}

const enquirySchema = z.object({
  contact_name: z.string().trim().min(2, "Enter your name"),
  contact_email: emailSchema,
  contact_phone: phoneSchema.optional().or(z.literal("")),
  event_date: z.string().min(1, "Pick a date").refine((v) => v >= TODAY_ISO, "Pick a date from today onwards"),
  guest_count: z.string().regex(/^\d+$/, "Enter guest count"),
  message: z.string().max(1000).optional(),
});

function EnquiryForm({ hallId, sourceSlug }: { hallId: string; sourceSlug?: string }) {
  const [state, setState] = useState({ contact_name: "", contact_email: "", contact_phone: "", event_date: "", guest_count: "", message: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErrors({}); setErr(null);
    const parsed = enquirySchema.safeParse(state);
    if (!parsed.success) {
      const fe: Record<string, string> = {};
      parsed.error.issues.forEach((i) => { fe[i.path[0] as string] = i.message; });
      setErrors(fe); return;
    }
    setSubmitting(true);
    const { data: userRes } = await supabase.auth.getUser();
    const { error } = await supabase.from("enquiries").insert({
      hall_id: hallId,
      requester_id: userRes.user?.id ?? null,
      contact_name: parsed.data.contact_name,
      contact_email: parsed.data.contact_email,
      contact_phone: parsed.data.contact_phone || null,
      event_date: parsed.data.event_date,
      guest_count: Number(parsed.data.guest_count),
      message: parsed.data.message || null,
      booking_source: sourceSlug ? "public_profile_link" : "marketplace",
      source_slug: sourceSlug ?? null,
    } as never);
    setSubmitting(false);
    if (error) { setErr("Could not send enquiry. Please try again."); return; }
    setSent(true);
  }

  if (sent) {
    return (
      <div className="rounded-2xl border border-brand-violet/30 bg-accent/40 p-5 text-sm">
        <div className="inline-flex items-center gap-2 font-semibold text-brand-violet"><CheckCircle2 className="h-4 w-4" /> Enquiry sent</div>
        <p className="mt-1 text-muted-foreground">The venue will respond within 24 hours. We've also emailed you a confirmation.</p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-3">
      <h3 className="font-display text-base font-semibold">Send an enquiry</h3>
      {err && <div role="alert" className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive"><AlertCircle className="h-3.5 w-3.5 mt-0.5" />{err}</div>}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Row label="Your name" error={errors.contact_name}>
          <input className="input" value={state.contact_name} onChange={(e) => setState({ ...state, contact_name: e.target.value })} placeholder="Priya Sharma" />
        </Row>
        <Row label="Email" error={errors.contact_email}>
          <input type="email" className="input" value={state.contact_email} onChange={(e) => setState({ ...state, contact_email: e.target.value })} placeholder="you@example.com" />
        </Row>
      </div>
      <Row label="Phone (optional)" error={errors.contact_phone}>
        <input type="tel" className="input" value={state.contact_phone} onChange={(e) => setState({ ...state, contact_phone: e.target.value })} placeholder="10-digit mobile" />
      </Row>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Row label="Event date" error={errors.event_date}>
          <input type="date" className="input" min={TODAY_ISO} value={state.event_date} onChange={(e) => setState({ ...state, event_date: e.target.value })} />
        </Row>
        <Row label="Guests" error={errors.guest_count}>
          <input type="number" className="input" value={state.guest_count} onChange={(e) => setState({ ...state, guest_count: e.target.value })} placeholder="e.g., 250" />
        </Row>
      </div>
      <Row label="Message" error={errors.message}>
        <textarea rows={3} className="input" value={state.message} onChange={(e) => setState({ ...state, message: e.target.value })} placeholder="Tell the venue about your event" />
      </Row>
      <button type="submit" disabled={submitting} className="w-full inline-flex items-center justify-center gap-2 rounded-full btn-brand btn-brand-hover px-4 py-2.5 text-sm font-semibold disabled:opacity-70">
        {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Send enquiry
      </button>
      <a href={hallId ? `tel:` : "#"} className="w-full inline-flex items-center justify-center gap-2 rounded-full border border-input px-4 py-2.5 text-sm font-semibold hover:bg-accent">
        <Phone className="h-4 w-4" /> Call venue
      </a>
      <style>{`
        .input { width: 100%; border-radius: 10px; border: 1px solid var(--border); background: var(--background); padding: 8px 12px; font-size: 13px; outline: none; }
        .input:focus { border-color: var(--brand-violet); box-shadow: 0 0 0 3px color-mix(in oklab, var(--brand-violet) 22%, transparent); }
      `}</style>
    </form>
  );
}

function Row({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">{label}</span>
      <div className="mt-1">{children}</div>
      {error && <p className="mt-1 text-[11px] font-medium text-destructive">{error}</p>}
    </label>
  );
}
