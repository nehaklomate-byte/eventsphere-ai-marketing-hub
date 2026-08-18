import { createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  ArrowLeft, MapPin, Star, BadgeCheck, HardHat, Send, CheckCircle2, Wallet, Clock, Languages,
  Users, IndianRupee, Navigation, Briefcase,
} from "lucide-react";
import { SiteLayout } from "@/components/SiteLayout";
import { supabase } from "@/integrations/supabase/client";
import { WishlistButton } from "@/components/WishlistButton";

type WorkerProfile = {
  id: string;
  owner_id: string;
  full_name: string;
  photo_url: string | null;
  category: string | null;
  skills: string[];
  years_experience: number | null;
  languages: string[];
  city: string | null;
  state: string | null;
  work_images: string[];
  bio: string | null;
  daily_charges: number | null;
  hourly_charges: number | null;
  pricing_options: { id: string; name: string; price: number; per_guest: boolean }[];
  payment_type: string | null;
  working_hours_start: string | null;
  working_hours_end: string | null;
  verified: boolean;
  rating: number;
  review_count: number;
  // Already existed in the DB (added 20260706070753 / 20260805062502) but
  // were never selected/rendered on this page — customers had no way to
  // see them even though the worker had filled them in.
  worker_type: "individual" | "agency" | null;
  max_travel_km: number | null;
  agency_name: string | null;
  agency_team_size: number | null;
  team_size: number | null;
  min_booking_qty: number | null;
  max_booking_qty: number | null;
};

/** Completed-jobs count + a rough "how fast do they respond" signal,
 * computed from worker_tasks rather than stored — avoids a migration
 * and stays accurate as more jobs happen. Capped at 200 rows so this
 * stays a cheap query even for a busy worker. */
function useWorkerStats(workerId: string) {
  const [stats, setStats] = useState<{ completed: number; avgResponseMins: number | null; acceptanceRate: number | null } | null>(null);
  useEffect(() => {
    let cancelled = false;
    supabase
      .from("worker_tasks" as never)
      .select("status, created_at, accepted_at, rejected_at" as never)
      .eq("worker_id" as never, workerId as never)
      .order("created_at" as never, { ascending: false })
      .limit(200)
      .then(({ data }) => {
        if (cancelled) return;
        const rows = (data as unknown as { status: string; created_at: string; accepted_at: string | null; rejected_at: string | null }[]) ?? [];
        const completed = rows.filter((r) => r.status === "completed").length;
        const decided = rows.filter((r) => r.accepted_at || r.rejected_at);
        const acceptanceRate = decided.length > 0 ? Math.round((rows.filter((r) => r.accepted_at).length / decided.length) * 100) : null;
        const responseTimes = rows.filter((r) => r.accepted_at).map((r) => (new Date(r.accepted_at!).getTime() - new Date(r.created_at).getTime()) / 60000);
        const avgResponseMins = responseTimes.length > 0 ? Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length) : null;
        setStats({ completed, avgResponseMins, acceptanceRate });
      });
    return () => { cancelled = true; };
  }, [workerId]);
  return stats;
}

export const Route = createFileRoute("/worker/$id")({
  validateSearch: (search: Record<string, unknown>) => ({
    event_id: typeof search.event_id === "string" ? search.event_id : undefined,
    ref: typeof search.ref === "string" ? search.ref : undefined,
  }),
  head: ({ params }) => ({
    meta: [
      { title: "Worker profile — EventOrbit Nova" },
      { name: "description", content: "Verified event worker on EventOrbit Nova." },
      { property: "og:url", content: `/worker/${params.id}` },
    ],
    links: [{ rel: "canonical", href: `/worker/${params.id}` }],
  }),
  loader: async ({ params }) => {
    const { data, error } = await supabase.from("workers").select("*").eq("id", params.id).eq("verified", true).eq("marketplace_visible", true).is("deleted_at", null).maybeSingle();
    if (error || !data) throw notFound();
    return { worker: data as unknown as WorkerProfile };
  },
  component: WorkerDetail,
});

function WorkerDetail() {
  const { worker } = Route.useLoaderData();
  const { event_id, ref } = Route.useSearch();
  const stats = useWorkerStats(worker.id);

  return (
    <SiteLayout>
      <div className="mx-auto max-w-6xl px-5 md:px-8 py-10">
        <div className="flex items-center justify-between">
          <Link to="/marketplace" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Back to marketplace
          </Link>
          <WishlistButton
            kind="worker"
            targetId={worker.id}
            targetName={worker.full_name}
            imageUrl={worker.photo_url}
            className="grid h-9 w-9 place-items-center rounded-full border border-border bg-card text-brand-navy shadow-sm hover:bg-accent transition"
          />
        </div>

        <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_380px]">
          <div>
            <div className="flex items-start gap-4">
              {worker.photo_url ? (
                <img src={worker.photo_url} alt={worker.full_name} className="h-20 w-20 rounded-full object-cover border border-border" />
              ) : (
                <div className="grid h-20 w-20 place-items-center rounded-full bg-accent text-muted-foreground"><HardHat className="h-8 w-8" /></div>
              )}
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="font-display text-2xl md:text-3xl font-semibold">{worker.full_name}</h1>
                  {worker.verified && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-brand-blue/10 text-brand-blue text-xs font-semibold px-2.5 py-1">
                      <BadgeCheck className="h-3.5 w-3.5" /> Verified
                    </span>
                  )}
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                  {worker.category && <span>{worker.category}</span>}
                  {worker.city && <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{[worker.city, worker.state].filter(Boolean).join(", ")}</span>}
                  {worker.years_experience != null && <span>{worker.years_experience}+ yrs experience</span>}
                  {worker.review_count > 0 && <span className="inline-flex items-center gap-1"><Star className="h-3.5 w-3.5 fill-brand-orange text-brand-orange" />{worker.rating.toFixed(1)} ({worker.review_count})</span>}
                </div>

                {/* Booking-decision info a customer actually needs before tapping
                    Book — this data already lived in the DB (worker_type,
                    daily/hourly charges, max_travel_km) but wasn't shown here. */}
                <div className="mt-3 flex flex-wrap gap-2 text-xs">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-accent px-3 py-1 font-medium">
                    <Users className="h-3.5 w-3.5" />
                    {worker.worker_type === "agency" ? "Agency" : "Individual"}
                  </span>
                  {worker.daily_charges != null && (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-accent px-3 py-1 font-medium">
                      <IndianRupee className="h-3.5 w-3.5" />Starting ₹{Number(worker.daily_charges).toLocaleString("en-IN")} / day
                    </span>
                  )}
                  {worker.hourly_charges != null && (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-accent px-3 py-1 font-medium">
                      <IndianRupee className="h-3.5 w-3.5" />₹{Number(worker.hourly_charges).toLocaleString("en-IN")} / hr
                    </span>
                  )}
                  {worker.max_travel_km != null && (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-accent px-3 py-1 font-medium">
                      <Navigation className="h-3.5 w-3.5" />Travels up to {worker.max_travel_km} km
                    </span>
                  )}
                  {stats && stats.completed > 0 && (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-accent px-3 py-1 font-medium">
                      <Briefcase className="h-3.5 w-3.5" />{stats.completed} jobs completed
                    </span>
                  )}
                  {stats?.acceptanceRate != null && (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-accent px-3 py-1 font-medium">
                      {stats.acceptanceRate}% acceptance
                    </span>
                  )}
                  {stats?.avgResponseMins != null && (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-accent px-3 py-1 font-medium">
                      <Clock className="h-3.5 w-3.5" />
                      Responds in ~{stats.avgResponseMins < 60 ? `${stats.avgResponseMins} min` : `${Math.round(stats.avgResponseMins / 60)} hr`}
                    </span>
                  )}
                </div>

                {worker.worker_type === "agency" && (worker.agency_name || worker.agency_team_size) && (
                  <div className="mt-3 rounded-xl border border-border bg-accent/40 px-4 py-3 text-sm">
                    <div className="font-semibold">{worker.agency_name || "Agency"}</div>
                    {worker.agency_team_size != null && (
                      <div className="mt-0.5 text-muted-foreground">{worker.agency_team_size} workers on the team</div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {worker.bio && <p className="mt-6 text-sm text-muted-foreground leading-relaxed">{worker.bio}</p>}

            {worker.skills?.length > 0 && (
              <div className="mt-6">
                <h2 className="font-display text-lg font-semibold mb-2">Skills</h2>
                <div className="flex flex-wrap gap-2">
                  {(worker.skills as string[]).map((s: string) => <span key={s} className="rounded-full bg-accent px-3 py-1 text-xs font-medium">{s}</span>)}
                </div>
              </div>
            )}

            {worker.languages?.length > 0 && (
              <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
                <Languages className="h-4 w-4" /> {worker.languages.join(", ")}
              </div>
            )}

            {(worker.working_hours_start || worker.working_hours_end) && (
              <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" /> Available {worker.working_hours_start ?? "—"} – {worker.working_hours_end ?? "—"}
              </div>
            )}

            {worker.work_images?.length > 0 && (
              <div className="mt-8">
                <h2 className="font-display text-lg font-semibold mb-3">Work photos</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {(worker.work_images as string[]).map((url: string, i: number) => (
                    <div key={i} className="aspect-[16/11] overflow-hidden rounded-xl border border-border">
                      <img src={url} alt={`Work ${i + 1}`} loading="lazy" className="h-full w-full object-cover hover:scale-105 transition-transform duration-500" />
                    </div>
                  ))}
                </div>
              </div>
            )}

            <WorkerReviews workerId={worker.id} />
          </div>

          <div>
            <HireCard worker={worker} eventId={event_id} sourceSlug={ref} />
          </div>
        </div>
      </div>
    </SiteLayout>
  );
}

function HireCard({ worker, eventId, sourceSlug }: { worker: WorkerProfile; eventId?: string; sourceSlug?: string }) {
  const navigate = useNavigate();
  const [loggedIn, setLoggedIn] = useState<boolean | null>(null);
  const [state, setState] = useState({ event_name: "", task_name: "", venue: "", venue_address: "", event_date: "", start_time: "", end_time: "", guest_count: "", pay_amount: "" });
  const isAgency = worker.worker_type === "agency";
  const minQty = worker.min_booking_qty ?? 1;
  const maxQty = worker.max_booking_qty ?? worker.agency_team_size ?? 99;
  const [quantity, setQuantity] = useState(minQty);
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const options = worker.pricing_options ?? [];
  const [selectedOptions, setSelectedOptions] = useState<Record<string, boolean>>({});
  const hasPerGuestOption = options.some((o) => o.per_guest);
  const guestCount = Number(state.guest_count) || 0;

  useEffect(() => { supabase.auth.getUser().then(({ data }) => setLoggedIn(!!data.user)); }, []);

  // Base = daily rate × headcount for an agency, else just the daily
  // rate — plus every ticked add-on (per-guest ones × guest count).
  // Kept in sync so pay_amount always reflects what was actually
  // picked, instead of the customer guessing an offer amount.
  const basePrice = isAgency ? (worker.daily_charges ?? 0) * quantity : (worker.daily_charges ?? 0);
  const optionsTotal = options.reduce((s, o) => s + (selectedOptions[o.id] ? (o.per_guest ? o.price * guestCount : o.price) : 0), 0);
  const estimatedTotal = basePrice + optionsTotal;

  useEffect(() => {
    if (estimatedTotal > 0) setState((s) => ({ ...s, pay_amount: String(estimatedTotal) }));
  }, [estimatedTotal]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    if (!state.event_name.trim() || !state.task_name.trim() || !state.event_date) {
      setErr("Event name, task and date are required.");
      return;
    }
    if (isAgency && (quantity < minQty || quantity > maxQty)) {
      setErr(`This agency takes bookings of ${minQty}–${maxQty} workers.`);
      return;
    }
    setSubmitting(true);
    const { data: userRes } = await supabase.auth.getUser();
    if (!userRes.user) { setSubmitting(false); setErr("Please log in first."); return; }

    const chosenOptions = options.filter((o) => selectedOptions[o.id]);
    const selectionSummary = [
      isAgency ? `${quantity} workers × ₹${(worker.daily_charges ?? 0).toLocaleString("en-IN")}/day` : null,
      ...chosenOptions.map((o) => `${o.name}: ₹${o.price.toLocaleString("en-IN")}${o.per_guest ? ` × ${guestCount} guests` : ""}`),
    ].filter(Boolean).join("\n");
    const selectedItems = [
      isAgency ? { name: `${quantity} workers × ₹${(worker.daily_charges ?? 0).toLocaleString("en-IN")}/day`, amount: basePrice } : (worker.daily_charges ? { name: "Base charge", amount: worker.daily_charges } : null),
      ...chosenOptions.map((o) => ({ name: o.per_guest ? `${o.name} (× ${guestCount} guests)` : o.name, amount: o.per_guest ? o.price * guestCount : o.price })),
    ].filter(Boolean);
    const { error } = await supabase.from("worker_tasks" as never).insert({
      worker_id: worker.id,
      worker_user_id: worker.owner_id,
      assigned_by: userRes.user.id,
      organization_id: null,
      organization_name: "Direct booking",
      customer_event_id: eventId ?? null,
      event_name: state.event_name.trim(),
      task_name: state.task_name.trim(),
      description: selectionSummary || null,
      selected_items: selectedItems,
      venue: state.venue || null,
      venue_address: state.venue_address || null,
      event_date: state.event_date,
      start_time: state.start_time || null,
      end_time: state.end_time || null,
      priority: "normal",
      status: "pending",
      payment_amount: state.pay_amount ? Number(state.pay_amount) : null,
      quantity: isAgency ? quantity : 1,
      booking_source: sourceSlug ? "public_profile_link" : "marketplace",
      source_slug: sourceSlug ?? null,
    } as never);
    setSubmitting(false);
    if (error) { setErr(error.message || "Could not send the request. Please try again."); return; }
    setSent(true);
  }

  if (sent) {
    return (
      <div className="rounded-2xl border border-brand-violet/30 bg-accent/40 p-5 text-sm sticky top-24">
        <div className="flex items-center gap-2 font-semibold text-foreground"><CheckCircle2 className="h-5 w-5 text-emerald-600" /> Request sent!</div>
        <p className="mt-1.5 text-muted-foreground">{worker.full_name} will accept or decline from their dashboard — you'll be notified either way.</p>
      </div>
    );
  }

  if (loggedIn === false) {
    return (
      <div className="rounded-2xl border border-border bg-card p-5 shadow-soft sticky top-24 text-sm">
        <h3 className="font-display text-lg font-semibold">Book {worker.full_name}</h3>
        <p className="mt-2 text-muted-foreground">Log in to send a direct booking request — this becomes a real job on their dashboard once they accept.</p>
        <button onClick={() => navigate({ to: "/login" })} className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-full btn-brand btn-brand-hover px-4 py-2.5 text-sm font-semibold">
          Log in to book
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="rounded-2xl border border-border bg-card p-5 shadow-soft sticky top-24 space-y-3">
      <h3 className="font-display text-lg font-semibold">Book {worker.full_name}</h3>
      <p className="text-xs text-muted-foreground -mt-1">They'll need to accept before this becomes confirmed work.</p>
      <input placeholder="Event name" value={state.event_name} onChange={(e) => setState((s) => ({ ...s, event_name: e.target.value }))}
        className="w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm outline-none focus:border-brand-violet" />
      <input placeholder="What should they do? (task)" value={state.task_name} onChange={(e) => setState((s) => ({ ...s, task_name: e.target.value }))}
        className="w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm outline-none focus:border-brand-violet" />
      <input placeholder="Venue name (optional)" value={state.venue} onChange={(e) => setState((s) => ({ ...s, venue: e.target.value }))}
        className="w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm outline-none focus:border-brand-violet" />
      {isAgency && (
        <div className="rounded-xl border border-border bg-muted/30 px-3.5 py-2.5">
          <label className="text-xs font-semibold text-muted-foreground">How many workers?</label>
          <div className="mt-1.5 flex items-center gap-3">
            <button type="button" onClick={() => setQuantity((q) => Math.max(minQty, q - 1))}
              className="grid h-8 w-8 place-items-center rounded-full border border-input text-sm font-semibold hover:bg-accent">−</button>
            <span className="min-w-[2ch] text-center text-sm font-semibold">{quantity}</span>
            <button type="button" onClick={() => setQuantity((q) => Math.min(maxQty, q + 1))}
              className="grid h-8 w-8 place-items-center rounded-full border border-input text-sm font-semibold hover:bg-accent">+</button>
            <span className="text-xs text-muted-foreground">{minQty}–{maxQty} workers</span>
          </div>
        </div>
      )}
      <input type="date" value={state.event_date} onChange={(e) => setState((s) => ({ ...s, event_date: e.target.value }))}
        className="w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm outline-none focus:border-brand-violet" />
      <div className="grid grid-cols-2 gap-2">
        <input type="time" value={state.start_time} onChange={(e) => setState((s) => ({ ...s, start_time: e.target.value }))}
          className="w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm outline-none focus:border-brand-violet" />
        <input type="time" value={state.end_time} onChange={(e) => setState((s) => ({ ...s, end_time: e.target.value }))}
          className="w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm outline-none focus:border-brand-violet" />
      </div>
      {options.length > 0 && (
        <div className="rounded-xl border border-border bg-muted/20 p-3 space-y-1.5">
          <div className="text-xs font-semibold text-muted-foreground">Add-ons — pick what you actually need</div>
          {options.map((o) => (
            <label key={o.id} className="flex items-center justify-between gap-2 text-sm">
              <span className="flex items-center gap-2">
                <input type="checkbox" checked={!!selectedOptions[o.id]} onChange={(e) => setSelectedOptions((s) => ({ ...s, [o.id]: e.target.checked }))} />
                {o.name}
              </span>
              <span className="font-semibold">+₹{o.price.toLocaleString("en-IN")}{o.per_guest ? "/guest" : ""}</span>
            </label>
          ))}
          {hasPerGuestOption && (
            <input type="number" placeholder="Expected guests (for per-guest add-ons)" value={state.guest_count}
              onChange={(e) => setState((s) => ({ ...s, guest_count: e.target.value }))}
              className="mt-1 w-full rounded-xl border border-input bg-background px-3.5 py-2 text-xs outline-none focus:border-brand-violet" />
          )}
        </div>
      )}
      {estimatedTotal > 0 && (
        <div className="flex items-center justify-between rounded-xl bg-accent/40 px-3.5 py-2.5 text-sm font-semibold">
          <span>Estimated total</span>
          <span>₹{estimatedTotal.toLocaleString("en-IN")}</span>
        </div>
      )}
      <div className="relative">
        <Wallet className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input type="number" placeholder="Pay amount (₹, optional)" value={state.pay_amount} onChange={(e) => setState((s) => ({ ...s, pay_amount: e.target.value }))}
          className="w-full rounded-xl border border-input bg-background pl-9 pr-3.5 py-2.5 text-sm outline-none focus:border-brand-violet" />
      </div>
      <p className="-mt-2 text-[11px] text-muted-foreground">
        {estimatedTotal > 0 ? "Pre-filled from your selections above — adjust it if you'd like to negotiate." : "Not sure what to pay? Leave it blank and discuss with them after they accept."}
      </p>
      {err && <p className="text-xs text-destructive">{err}</p>}
      <button type="submit" disabled={submitting} className="inline-flex w-full items-center justify-center gap-2 rounded-full btn-brand btn-brand-hover px-4 py-2.5 text-sm font-semibold disabled:opacity-70">
        <Send className="h-4 w-4" /> {submitting ? "Sending…" : "Send booking request"}
      </button>
    </form>
  );
}

function WorkerReviews({ workerId }: { workerId: string }) {
  const [reviews, setReviews] = useState<Array<{ id: string; rating: number; comment: string | null; created_at: string }>>([]);
  useEffect(() => {
    supabase.from("customer_reviews" as never)
      .select("id,rating,comment,created_at")
      .eq("kind" as never, "worker" as never)
      .eq("target_id" as never, workerId as never)
      .order("created_at" as never, { ascending: false })
      .limit(6)
      .then(({ data }) => setReviews((data as never) ?? []));
  }, [workerId]);

  return (
    <div className="mt-8 border-t border-border pt-8">
      <h2 className="font-display text-lg font-semibold mb-3">Reviews</h2>
      {reviews.length === 0 ? (
        <p className="text-sm text-muted-foreground">No reviews yet. Be the first to review after your booking.</p>
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
    </div>
  );
}
