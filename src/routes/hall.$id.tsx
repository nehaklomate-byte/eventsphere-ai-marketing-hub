import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowLeft, MapPin, Star, Users, Wifi, Car, Utensils, Bed, Sparkles, ShieldCheck, Calendar,
  BadgeCheck, Loader2, Zap, Accessibility, ArrowUpDown, PartyPopper, ChevronRight, Send, Phone,
  AlertCircle, CheckCircle2,
} from "lucide-react";
import { SiteLayout } from "@/components/SiteLayout";
import { supabase } from "@/integrations/supabase/client";
import { z } from "zod";
import { emailSchema, phoneSchema } from "@/lib/validation";
import { WishlistButton } from "@/components/WishlistButton";

type Hall = {
  id: string;
  name: string;
  category: string | null;
  city: string | null;
  state: string | null;
  address: string | null;
  cover_url: string | null;
  gallery: string[];
  stage_photos: string[];
  dining_photos: string[];
  parking_photos: string[];
  room_photos: string[];
  washroom_photos: string[];
  extra: Record<string, unknown>;
  min_guests: number | null;
  max_guests: number | null;
  indoor_capacity: number | null;
  outdoor_capacity: number | null;
  dining_capacity: number | null;
  parking_slots: number | null;
  num_rooms: number | null;
  facilities: Record<string, boolean>;
  price_per_day: number | null;
  price_per_hour: number | null;
  advance_amount: number | null;
  cancellation_policy: string | null;
  working_hours: string | null;
  google_maps_url: string | null;
  website: string | null;
  verified: boolean;
  rating: number;
  review_count: number;
};

export const Route = createFileRoute("/hall/$id")({
  validateSearch: (search: Record<string, unknown>) => ({
    event_id: typeof search.event_id === "string" ? search.event_id : undefined,
  }),
  head: ({ params }) => ({
    meta: [
      { title: `Venue details — EventOrbit Nova` },
      { name: "description", content: "Verified venue on EventOrbit Nova. See capacity, facilities, pricing and availability." },
      { property: "og:title", content: "Venue on EventOrbit Nova" },
      { property: "og:url", content: `/hall/${params.id}` },
    ],
    links: [{ rel: "canonical", href: `/hall/${params.id}` }],
  }),
  loader: async ({ params }) => {
    const { data, error } = await supabase.from("halls")
      .select("*")
      .eq("id", params.id)
      .eq("status", "published")
      .is("deleted_at", null)
      .maybeSingle();
    if (error) throw error;
    if (!data) throw notFound();
    return { hall: normalize(data) };
  },
  notFoundComponent: NotFound,
  errorComponent: ErrorView,
  component: HallDetail,
});

function normalize(d: Record<string, unknown>): Hall {
  return {
    id: String(d.id),
    name: String(d.name ?? ""),
    category: (d.category as string) ?? null,
    city: (d.city as string) ?? null,
    state: (d.state as string) ?? null,
    address: (d.address as string) ?? null,
    cover_url: (d.cover_url as string) ?? null,
    gallery: Array.isArray(d.gallery) ? (d.gallery as string[]) : [],
    stage_photos: Array.isArray(d.stage_photos) ? (d.stage_photos as string[]) : [],
    dining_photos: Array.isArray(d.dining_photos) ? (d.dining_photos as string[]) : [],
    parking_photos: Array.isArray(d.parking_photos) ? (d.parking_photos as string[]) : [],
    room_photos: Array.isArray(d.room_photos) ? (d.room_photos as string[]) : [],
    washroom_photos: Array.isArray(d.washroom_photos) ? (d.washroom_photos as string[]) : [],
    extra: (d.additional_info as Record<string, unknown>) ?? {},
    min_guests: (d.min_guests as number) ?? null,
    max_guests: (d.max_guests as number) ?? null,
    indoor_capacity: (d.indoor_capacity as number) ?? null,
    outdoor_capacity: (d.outdoor_capacity as number) ?? null,
    dining_capacity: (d.dining_capacity as number) ?? null,
    parking_slots: (d.parking_slots as number) ?? null,
    num_rooms: (d.num_rooms as number) ?? null,
    facilities: (d.facilities as Record<string, boolean>) ?? {},
    price_per_day: (d.price_per_day as number) ?? null,
    price_per_hour: (d.price_per_hour as number) ?? null,
    advance_amount: (d.advance_amount as number) ?? null,
    cancellation_policy: (d.cancellation_policy as string) ?? null,
    working_hours: (d.working_hours as string) ?? null,
    google_maps_url: (d.google_maps_url as string) ?? null,
    website: (d.website as string) ?? null,
    verified: Boolean(d.verified),
    rating: Number(d.rating ?? 0),
    review_count: Number(d.review_count ?? 0),
  };
}

function HallDetail() {
  const { hall } = Route.useLoaderData();
  const { event_id } = Route.useSearch();
  const [reviews, setReviews] = useState<Array<{ id: string; rating: number; comment: string | null; created_at: string; author: string | null }>>([]);

  // Reviews come from two places: legacy hall_reviews and the customer
  // workspace's customer_reviews. Both are shown, newest first, so a review
  // a customer just left from their dashboard appears here immediately.
  useEffect(() => {
    let cancelled = false;
    Promise.all([
      supabase.from("hall_reviews").select("id,rating,comment,created_at").eq("hall_id", hall.id).order("created_at", { ascending: false }).limit(20),
      supabase.from("customer_reviews").select("id,rating,comment,created_at").eq("kind", "hall").eq("target_id", hall.id).order("created_at", { ascending: false }).limit(20),
    ]).then(([a, b]) => {
      if (cancelled) return;
      const merged = [
        ...((a.data ?? []) as { id: string; rating: number; comment: string | null; created_at: string }[]),
        ...((b.data ?? []) as { id: string; rating: number; comment: string | null; created_at: string }[]),
      ]
        .map((r) => ({ ...r, author: null as string | null }))
        .sort((x, y) => +new Date(y.created_at) - +new Date(x.created_at));
      setReviews(merged);
    });
    return () => { cancelled = true; };
  }, [hall.id]);

  const cover = hall.cover_url || hall.gallery[0] || "https://images.unsplash.com/photo-1519167758481-83f550bb49b3?auto=format&fit=crop&w=1600&q=70";

  return (
    <SiteLayout>
      <section className="relative h-[62vh] min-h-[460px] w-full overflow-hidden">
        <img src={cover} alt={hall.name} className="h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-black/40" />
        <div className="absolute inset-x-0 top-0 mx-auto max-w-7xl px-5 md:px-8 py-6 flex items-center justify-between">
          <Link to="/marketplace" className="inline-flex items-center gap-2 rounded-full glass-strong text-white px-4 py-2 text-sm font-semibold">
            <ArrowLeft className="h-4 w-4" /> Back to marketplace
          </Link>
          <WishlistButton
            kind="hall"
            targetId={hall.id}
            targetName={hall.name}
            imageUrl={cover}
            className="grid h-10 w-10 place-items-center rounded-full glass-strong text-white hover:bg-white/20 transition"
          />
        </div>
        <div className="absolute inset-x-0 bottom-0 mx-auto max-w-7xl px-5 md:px-8 py-8 text-white">
          <div className="flex items-center gap-2 text-xs">
            {hall.verified && (
              <span className="inline-flex items-center gap-1 rounded-full bg-brand-blue/90 px-2.5 py-1 font-semibold">
                <BadgeCheck className="h-3.5 w-3.5" /> Verified
              </span>
            )}
            {hall.category && <span className="rounded-full bg-white/15 px-2.5 py-1 font-semibold backdrop-blur">{hall.category}</span>}
          </div>
          <h1 className="mt-3 font-display text-3xl md:text-5xl font-semibold tracking-tight">{hall.name}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-white/90">
            <span className="inline-flex items-center gap-1"><MapPin className="h-4 w-4" />{[hall.city, hall.state].filter(Boolean).join(", ")}</span>
            {hall.review_count > 0 && (
              <span className="inline-flex items-center gap-1"><Star className="h-4 w-4 fill-brand-orange text-brand-orange" />{hall.rating.toFixed(1)} ({hall.review_count})</span>
            )}
            {hall.max_guests && <span className="inline-flex items-center gap-1"><Users className="h-4 w-4" />Up to {hall.max_guests} guests</span>}
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-5 md:px-8 py-14 grid gap-10 lg:grid-cols-[1fr_360px]">
        {/* MAIN */}
        <div className="space-y-12">
          {/* CAPACITY */}
          <Card title="Capacity at a glance" icon={Users}>
            <div className="grid gap-4 sm:grid-cols-3">
              <Stat label="Min guests" value={hall.min_guests} />
              <Stat label="Max guests" value={hall.max_guests} />
              <Stat label="Dining capacity" value={hall.dining_capacity} />
              <Stat label="Indoor capacity" value={hall.indoor_capacity} />
              <Stat label="Outdoor capacity" value={hall.outdoor_capacity} />
              <Stat label="Parking slots" value={hall.parking_slots} />
              <Stat label="Rooms" value={hall.num_rooms} />
            </div>
          </Card>

          {/* GALLERY */}
          {hall.gallery.length > 0 && (
            <Card title="Gallery" icon={PartyPopper}
              trailing={<span className="text-xs text-muted-foreground inline-flex items-center gap-1"><Sparkles className="h-3.5 w-3.5" /> 360° tour coming soon</span>}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {hall.gallery.map((src: string, i: number) => (
                  <div key={i} className="aspect-[16/11] overflow-hidden rounded-xl border border-border">
                    <img src={src} alt={`${hall.name} ${i + 1}`} loading="lazy" className="h-full w-full object-cover hover:scale-105 transition-transform duration-500" />
                  </div>
                ))}
              </div>
            </Card>
          )}

          <PhotoSection title="Stage" photos={hall.stage_photos} hallName={hall.name} />
          <PhotoSection title="Dining area" photos={hall.dining_photos} hallName={hall.name} />
          <PhotoSection title="Parking" photos={hall.parking_photos} hallName={hall.name} />
          <PhotoSection title="Guest rooms" photos={hall.room_photos} hallName={hall.name} />

          {/* FACILITIES — only what this venue actually offers */}
          {(() => {
            const list = facilityList(hall.facilities, hall.parking_slots, hall.num_rooms);
            if (list.length === 0) return null;
            return (
              <Card title="Facilities & amenities" icon={ShieldCheck}>
                <div className="grid gap-3 sm:grid-cols-2">
                  {list.map((f) => (
                    <div key={f.key} className="flex items-center gap-2 rounded-xl border border-brand-violet/30 bg-accent/40 px-3 py-2 text-sm">
                      <f.icon className="h-4 w-4 text-brand-violet" />
                      {f.label}
                    </div>
                  ))}
                </div>
              </Card>
            );
          })()}

          {/* GOOD TO KNOW — venue's own rules, filled in by the owner */}
          {(() => {
            const rows: Array<[string, string]> = [];
            const s = (k: string) => (typeof hall.extra[k] === "string" ? (hall.extra[k] as string).trim() : "");
            if (s("catering_policy")) rows.push(["Catering", s("catering_policy")]);
            if (s("decoration_policy")) rows.push(["Decoration", s("decoration_policy")]);
            if (s("alcohol_policy")) rows.push(["Alcohol", s("alcohol_policy")]);
            if (s("music_curfew")) rows.push(["Music / DJ curfew", s("music_curfew")]);
            if (s("power_backup")) rows.push(["Power backup", s("power_backup")]);
            const eventTypes = Array.isArray(hall.extra.event_types) ? (hall.extra.event_types as string[]) : [];
            const notes = s("extra_notes");
            if (rows.length === 0 && eventTypes.length === 0 && !notes) return null;
            return (
              <Card title="Good to know" icon={CheckCircle2}>
                {rows.length > 0 && (
                  <dl className="grid gap-3 sm:grid-cols-2">
                    {rows.map(([k, v]) => (
                      <div key={k} className="rounded-xl border border-border p-3">
                        <dt className="text-[10px] uppercase tracking-widest text-muted-foreground">{k}</dt>
                        <dd className="mt-1 text-sm font-medium">{v}</dd>
                      </div>
                    ))}
                  </dl>
                )}
                {eventTypes.length > 0 && (
                  <div className="mt-4">
                    <div className="text-sm font-semibold">Events hosted here</div>
                    <div className="mt-1.5 flex flex-wrap gap-2">
                      {eventTypes.map((t) => (
                        <span key={t} className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">{t}</span>
                      ))}
                    </div>
                  </div>
                )}
                {notes && <p className="mt-4 text-sm text-muted-foreground leading-relaxed">{notes}</p>}
              </Card>
            );
          })()}

          {/* LOCATION */}
          {(hall.address || hall.google_maps_url || typeof hall.extra.google_maps_link === "string" || typeof hall.extra.nearby_landmark === "string") && (
            <Card title="Location" icon={MapPin}>
              {hall.address && <p className="text-sm text-muted-foreground">{hall.address}</p>}
              {typeof hall.extra.nearby_landmark === "string" && hall.extra.nearby_landmark && (
                <p className="mt-2 text-sm"><span className="font-semibold">Landmark:</span> <span className="text-muted-foreground">{hall.extra.nearby_landmark}</span></p>
              )}
              {(hall.google_maps_url || (typeof hall.extra.google_maps_link === "string" && hall.extra.google_maps_link)) && (
                <a href={hall.google_maps_url || (hall.extra.google_maps_link as string)} target="_blank" rel="noreferrer"
                  className="mt-4 inline-flex items-center gap-2 rounded-full border border-input px-4 py-2 text-sm font-semibold hover:bg-accent">
                  Open in Google Maps <ChevronRight className="h-4 w-4" />
                </a>
              )}
            </Card>
          )}

          {/* POLICIES & PAYMENT */}
          {(() => {
            const methods = Array.isArray(hall.extra.payment_methods) ? (hall.extra.payment_methods as string[]) : [];
            const terms = typeof hall.extra.payment_terms === "string" ? hall.extra.payment_terms : "";
            const upi = typeof hall.extra.payment_upi === "string" ? hall.extra.payment_upi : "";
            if (!hall.cancellation_policy && !hall.working_hours && methods.length === 0 && !terms && !upi) return null;
            return (
              <Card title="Payment & policies" icon={ShieldCheck}>
                {hall.working_hours && <p className="text-sm"><span className="font-semibold">Working hours:</span> <span className="text-muted-foreground">{hall.working_hours}</span></p>}
                {methods.length > 0 && (
                  <div className="mt-3">
                    <div className="text-sm font-semibold">Payment methods accepted</div>
                    <div className="mt-1.5 flex flex-wrap gap-2">
                      {methods.map((m: string) => (
                        <span key={m} className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">{m}</span>
                      ))}
                    </div>
                  </div>
                )}
                {terms && (
                  <div className="mt-3">
                    <div className="text-sm font-semibold">Booking & payment terms</div>
                    <p className="mt-1 text-sm text-muted-foreground leading-relaxed">{terms}</p>
                  </div>
                )}
                {upi && (
                  <div className="mt-3">
                    <div className="text-sm font-semibold">UPI ID for advance</div>
                    <p className="mt-1 font-mono text-sm text-muted-foreground">{upi}</p>
                  </div>
                )}
                {hall.cancellation_policy && (
                  <div className="mt-3">
                    <div className="text-sm font-semibold">Cancellation policy</div>
                    <p className="mt-1 text-sm text-muted-foreground leading-relaxed">{hall.cancellation_policy}</p>
                  </div>
                )}
              </Card>
            );
          })()}

          {/* AVAILABILITY */}
          <Card title="Availability" icon={Calendar}>
            <p className="text-sm text-muted-foreground">
              Real-time availability calendar unlocks once the venue confirms your enquiry. Share your preferred dates below and the team will respond within 24 hours.
            </p>
          </Card>

          {/* REVIEWS */}
          <Card title="Reviews" icon={Star}>
            {reviews.length === 0 ? (
              <p className="text-sm text-muted-foreground">No reviews yet. Be the first to review after your event.</p>
            ) : (
              <div className="space-y-4">
                {reviews.map((r) => (
                  <div key={r.id} className="rounded-xl border border-border p-4">
                    <div className="flex items-center gap-1 text-brand-orange">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star key={i} className={`h-4 w-4 ${i < r.rating ? "fill-brand-orange" : "text-muted-foreground/40"}`} />
                      ))}
                    </div>
                    {r.comment && <p className="mt-2 text-sm text-foreground/90">{r.comment}</p>}
                    <p className="mt-1 text-[11px] text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</p>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* SIDEBAR */}
        <aside className="lg:sticky lg:top-24 h-fit">
          <div className="rounded-3xl border border-border bg-card shadow-elegant p-6">
            <div>
              {hall.price_per_day ? (
                <>
                  <div className="text-xs uppercase tracking-widest text-muted-foreground">Starting at</div>
                  <div className="mt-1 font-display text-3xl font-semibold text-gradient-brand">₹{hall.price_per_day.toLocaleString("en-IN")}</div>
                  <div className="text-xs text-muted-foreground">per day{hall.price_per_hour ? ` • ₹${hall.price_per_hour.toLocaleString("en-IN")}/hour` : ""}</div>
                </>
              ) : (
                <div className="text-sm text-muted-foreground">Contact venue for pricing</div>
              )}
              {hall.advance_amount != null && hall.advance_amount > 0 && (
                <p className="mt-3 text-xs text-muted-foreground">Advance to confirm: ₹{hall.advance_amount.toLocaleString("en-IN")}</p>
              )}
            </div>
            <div className="mt-6">
              <BookingAndEnquiry hallId={hall.id} hallName={hall.name} pricePerDay={hall.price_per_day} advanceAmount={hall.advance_amount} eventId={event_id} />
            </div>
          </div>
        </aside>
      </div>
    </SiteLayout>
  );
}

function Card({ title, icon: Icon, children, trailing }: { title: string; icon: React.ComponentType<{ className?: string }>; children: React.ReactNode; trailing?: React.ReactNode }) {
  return (
    <motion.section initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.4 }}
      className="rounded-3xl border border-border bg-card p-6 md:p-8 shadow-soft">
      <div className="flex items-center justify-between gap-4">
        <h2 className="inline-flex items-center gap-2 font-display text-xl font-semibold">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-brand text-white"><Icon className="h-4 w-4" /></span>
          {title}
        </h2>
        {trailing}
      </div>
      <div className="mt-5">{children}</div>
    </motion.section>
  );
}

function Stat({ label, value }: { label: string; value: number | null }) {
  if (value == null) return null;
  return (
    <div className="rounded-xl border border-border p-4">
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className="mt-1 font-display text-2xl font-semibold">{value.toLocaleString("en-IN")}</div>
    </div>
  );
}

function PhotoSection({ title, photos, hallName }: { title: string; photos: string[]; hallName: string }) {
  if (photos.length === 0) return null;
  return (
    <Card title={title} icon={PartyPopper}>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {photos.map((src, i) => (
          <div key={i} className="aspect-[16/11] overflow-hidden rounded-xl border border-border">
            <img src={src} alt={`${hallName} — ${title} ${i + 1}`} loading="lazy" className="h-full w-full object-cover hover:scale-105 transition-transform duration-500" />
          </div>
        ))}
      </div>
    </Card>
  );
}

/**
 * Renders the amenities the owner actually switched on in their venue
 * profile — including custom ones they typed themselves — instead of a
 * fixed checklist. Parking and guest rooms are inferred from the counts
 * when the owner filled those in but didn't tick the matching amenity.
 */
const FACILITY_ICONS: Array<[RegExp, React.ComponentType<{ className?: string }>]> = [
  [/\bac\b|air.?condition/i, Zap],
  [/generator|backup|power/i, Zap],
  [/lift|elevator/i, ArrowUpDown],
  [/wheelchair|accessib/i, Accessibility],
  [/wi.?fi|internet/i, Wifi],
  [/cater|dining|food|kitchen/i, Utensils],
  [/room|stay|suite/i, Bed],
  [/parking|valet|car/i, Car],
  [/pool|garden|lawn|stage|dj|sound|decor/i, PartyPopper],
];

function iconFor(label: string) {
  return FACILITY_ICONS.find(([re]) => re.test(label))?.[1] ?? CheckCircle2;
}

function facilityList(f: Record<string, boolean>, parkingSlots: number | null, numRooms: number | null) {
  const items = Object.entries(f ?? {})
    .filter(([, on]) => !!on)
    .map(([label]) => ({ key: label, label, icon: iconFor(label) }));

  const has = (re: RegExp) => items.some((i) => re.test(i.label));
  if ((parkingSlots ?? 0) > 0 && !has(/parking/i)) {
    items.push({ key: "__parking", label: `Parking (${parkingSlots} slots)`, icon: Car });
  }
  if ((numRooms ?? 0) > 0 && !has(/room/i)) {
    items.push({ key: "__rooms", label: `${numRooms} guest rooms`, icon: Bed });
  }
  return items;
}

/* ============================================================
 * Book Now (real booking, full event details) + Ask a Question
 * ============================================================ */

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

function BookingAndEnquiry({
  hallId, hallName, pricePerDay, advanceAmount, eventId,
}: { hallId: string; hallName: string; pricePerDay: number | null; advanceAmount: number | null; eventId?: string }) {
  const [mode, setMode] = useState<"booking" | "enquiry">("booking");
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
        ? <BookingForm hallId={hallId} hallName={hallName} pricePerDay={pricePerDay} advanceAmount={advanceAmount} eventId={eventId} />
        : <EnquiryForm hallId={hallId} />}
    </div>
  );
}

const bookingSchema = z.object({
  event_name: z.string().trim().min(2, "Enter an event name"),
  organizer_type: z.string().min(1, "Select who's organizing"),
  organizer_type_other: z.string().optional(),
  event_type: z.string().min(1, "Select an event type"),
  event_type_other: z.string().optional(),
  contact_person: z.string().trim().min(2, "Enter contact person's name"),
  contact_phone: phoneSchema,
  contact_email: emailSchema,
  event_date: z.string().min(1, "Pick a date"),
  start_time: z.string().min(1, "Pick a start time"),
  end_time: z.string().min(1, "Pick an end time"),
  guest_count: z.string().regex(/^\d+$/, "Enter guest count"),
  special_instructions: z.string().max(1000).optional(),
});

function BookingForm({
  hallId, hallName, pricePerDay, advanceAmount, eventId,
}: { hallId: string; hallName: string; pricePerDay: number | null; advanceAmount: number | null; eventId?: string }) {
  const [state, setState] = useState({
    event_name: "", organizer_type: "", organizer_type_other: "", event_type: "", event_type_other: "",
    contact_person: "", contact_phone: "", contact_email: "", event_date: "", start_time: "", end_time: "",
    guest_count: "", special_instructions: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [needsLogin, setNeedsLogin] = useState(false);

  const set = (k: string, v: string) => setState((s) => ({ ...s, [k]: v }));

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
      amount: pricePerDay ?? 0,
      advance_amount: advanceAmount ?? null,
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
        start_time: d.start_time,
        end_time: d.end_time,
        guest_count: Number(d.guest_count),
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
    <form onSubmit={submit} noValidate className="space-y-3 max-h-[70vh] overflow-y-auto pr-1">
      <h3 className="font-display text-base font-semibold">Request to book</h3>
      {err && <div role="alert" className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive"><AlertCircle className="h-3.5 w-3.5 mt-0.5" />{err}</div>}

      <Row label="Event name" error={errors.event_name}>
        <input className="input" value={state.event_name} onChange={(e) => set("event_name", e.target.value)} placeholder="e.g., Priya & Rohan's Wedding" />
      </Row>

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

      <Row label="Contact person" error={errors.contact_person}>
        <input className="input" value={state.contact_person} onChange={(e) => set("contact_person", e.target.value)} placeholder="Full name" />
      </Row>
      <div className="grid grid-cols-2 gap-3">
        <Row label="Mobile number" error={errors.contact_phone}>
          <input type="tel" className="input" value={state.contact_phone} onChange={(e) => set("contact_phone", e.target.value)} placeholder="10-digit mobile" />
        </Row>
        <Row label="Email" error={errors.contact_email}>
          <input type="email" className="input" value={state.contact_email} onChange={(e) => set("contact_email", e.target.value)} placeholder="you@example.com" />
        </Row>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Row label="Event date" error={errors.event_date}>
          <input type="date" className="input" value={state.event_date} onChange={(e) => set("event_date", e.target.value)} />
        </Row>
        <Row label="Start time" error={errors.start_time}>
          <input type="time" className="input" value={state.start_time} onChange={(e) => set("start_time", e.target.value)} />
        </Row>
        <Row label="End time" error={errors.end_time}>
          <input type="time" className="input" value={state.end_time} onChange={(e) => set("end_time", e.target.value)} />
        </Row>
      </div>

      <Row label="Expected guests" error={errors.guest_count}>
        <input type="number" className="input" value={state.guest_count} onChange={(e) => set("guest_count", e.target.value)} placeholder="e.g., 250" />
      </Row>

      <Row label="Special instructions (optional)" error={errors.special_instructions}>
        <textarea rows={3} className="input" value={state.special_instructions} onChange={(e) => set("special_instructions", e.target.value)} placeholder="Anything the venue should know" />
      </Row>

      {advanceAmount != null && advanceAmount > 0 && (
        <p className="text-xs text-muted-foreground">An advance of ₹{advanceAmount.toLocaleString("en-IN")} will be requested once the venue confirms.</p>
      )}
      <button type="submit" disabled={submitting} className="w-full inline-flex items-center justify-center gap-2 rounded-full btn-brand btn-brand-hover px-4 py-2.5 text-sm font-semibold disabled:opacity-70">
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
  event_date: z.string().min(1, "Pick a date"),
  guest_count: z.string().regex(/^\d+$/, "Enter guest count"),
  message: z.string().max(1000).optional(),
});

function EnquiryForm({ hallId }: { hallId: string }) {
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
    });
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
      <Row label="Your name" error={errors.contact_name}>
        <input className="input" value={state.contact_name} onChange={(e) => setState({ ...state, contact_name: e.target.value })} placeholder="Priya Sharma" />
      </Row>
      <Row label="Email" error={errors.contact_email}>
        <input type="email" className="input" value={state.contact_email} onChange={(e) => setState({ ...state, contact_email: e.target.value })} placeholder="you@example.com" />
      </Row>
      <Row label="Phone (optional)" error={errors.contact_phone}>
        <input type="tel" className="input" value={state.contact_phone} onChange={(e) => setState({ ...state, contact_phone: e.target.value })} placeholder="10-digit mobile" />
      </Row>
      <div className="grid grid-cols-2 gap-3">
        <Row label="Event date" error={errors.event_date}>
          <input type="date" className="input" value={state.event_date} onChange={(e) => setState({ ...state, event_date: e.target.value })} />
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

function NotFound() {
  return (
    <SiteLayout>
      <div className="mx-auto max-w-xl px-5 py-32 text-center">
        <h1 className="font-display text-3xl font-semibold">Venue not found</h1>
        <p className="mt-2 text-muted-foreground">This venue may have been unpublished or moved. Browse the marketplace for verified alternatives.</p>
        <Link to="/marketplace" className="mt-6 inline-flex items-center gap-2 rounded-full btn-brand btn-brand-hover px-5 py-3 text-sm font-semibold">
          Back to marketplace
        </Link>
      </div>
    </SiteLayout>
  );
}

function ErrorView() {
  return (
    <SiteLayout>
      <div className="mx-auto max-w-xl px-5 py-32 text-center">
        <h1 className="font-display text-3xl font-semibold">Could not load venue</h1>
        <p className="mt-2 text-muted-foreground">Please try again in a moment.</p>
        <Link to="/marketplace" className="mt-6 inline-flex items-center gap-2 rounded-full btn-brand btn-brand-hover px-5 py-3 text-sm font-semibold">Back to marketplace</Link>
      </div>
    </SiteLayout>
  );
}
