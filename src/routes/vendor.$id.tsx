import { createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  ArrowLeft, MapPin, Star, BadgeCheck, Wrench, Send, Phone, CheckCircle2, Globe, Instagram, Facebook,
  Users, IndianRupee, Briefcase, Clock,
} from "lucide-react";
import { SiteLayout } from "@/components/SiteLayout";
import { WishlistButton } from "@/components/WishlistButton";
import { supabase } from "@/integrations/supabase/client";

/** Same idea as the worker profile's useWorkerStats — completed-jobs
 * count and average response time computed from vendor_tasks instead
 * of a stored column, so it stays accurate with no extra migration. */
function useVendorStats(vendorId: string) {
  const [stats, setStats] = useState<{ completed: number; avgResponseMins: number | null; acceptanceRate: number | null } | null>(null);
  useEffect(() => {
    let cancelled = false;
    supabase
      .from("vendor_tasks" as never)
      .select("status, created_at, accepted_at, rejected_at" as never)
      .eq("vendor_id" as never, vendorId as never)
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
  }, [vendorId]);
  return stats;
}


type Vendor = {
  id: string;
  owner_id: string;
  team_size: number | null;
  pricing_mode: "individual" | "team" | null;
  base_price: number | null;
  business_name: string;
  owner_full_name: string | null;
  category: string | null;
  years_experience: number | null;
  city: string | null;
  state: string | null;
  address: string | null;
  portfolio: string[];
  price_catalogue_url: string | null;
  pricing_options: { id: string; name: string; price: number; per_guest: boolean }[];
  logo_url: string | null;
  instagram: string | null;
  facebook: string | null;
  website: string | null;
  service_areas: string[];
  verified: boolean;
  rating: number;
  review_count: number;
};

export const Route = createFileRoute("/vendor/$id")({
  validateSearch: (search: Record<string, unknown>) => ({
    event_id: typeof search.event_id === "string" ? search.event_id : undefined,
    ref: typeof search.ref === "string" ? search.ref : undefined,
  }),
  head: ({ params }) => ({
    meta: [
      { title: "Vendor details — EventOrbit Nova" },
      { name: "description", content: "Verified event vendor on EventOrbit Nova." },
      { property: "og:url", content: `/vendor/${params.id}` },
    ],
    links: [{ rel: "canonical", href: `/vendor/${params.id}` }],
  }),
  loader: async ({ params }) => {
    const { data, error } = await supabase.from("vendors").select("*").eq("id", params.id).eq("status", "published").is("deleted_at", null).maybeSingle();
    if (error || !data) throw notFound();
    return { vendor: data as unknown as Vendor };
  },
  component: VendorDetail,
});

function VendorDetail() {
  const { vendor } = Route.useLoaderData() as { vendor: Vendor };
  const { event_id, ref } = Route.useSearch();
  const stats = useVendorStats(vendor.id);

  return (
    <SiteLayout>
      <div className="mx-auto max-w-6xl px-5 md:px-8 py-10">
        <Link to="/marketplace" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back to marketplace
        </Link>

        <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_380px]">
          <div>
            <div className="flex items-start gap-4">
              {vendor.logo_url ? (
                <img src={vendor.logo_url} alt={vendor.business_name} className="h-20 w-20 rounded-2xl object-cover border border-border" />
              ) : (
                <div className="grid h-20 w-20 place-items-center rounded-2xl bg-accent text-muted-foreground"><Wrench className="h-8 w-8" /></div>
              )}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="font-display text-2xl md:text-3xl font-semibold">{vendor.business_name}</h1>
                  {vendor.verified && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-brand-blue/10 text-brand-blue text-xs font-semibold px-2.5 py-1">
                      <BadgeCheck className="h-3.5 w-3.5" /> Verified
                    </span>
                  )}
                  <WishlistButton kind="vendor" targetId={vendor.id} targetName={vendor.business_name} imageUrl={vendor.logo_url} className="ml-auto" />
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                  {vendor.category && <span>{vendor.category}</span>}
                  {vendor.city && <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{[vendor.city, vendor.state].filter(Boolean).join(", ")}</span>}
                  {vendor.years_experience != null && <span>{vendor.years_experience}+ yrs experience</span>}
                  {vendor.review_count > 0 && <span className="inline-flex items-center gap-1"><Star className="h-3.5 w-3.5 fill-brand-orange text-brand-orange" />{vendor.rating.toFixed(1)} ({vendor.review_count})</span>}
                </div>
                <div className="mt-3 flex flex-wrap gap-2 text-xs">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-accent px-3 py-1 font-medium">
                    <Users className="h-3.5 w-3.5" />
                    {vendor.team_size && vendor.team_size > 1 ? `Team of ${vendor.team_size}` : vendor.team_size === 1 ? "Solo professional" : "Team size not listed"}
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-accent px-3 py-1 font-medium">
                    <IndianRupee className="h-3.5 w-3.5" />
                    {vendor.base_price
                      ? `Starting ₹${Number(vendor.base_price).toLocaleString("en-IN")} ${vendor.pricing_mode === "individual" ? "per person" : "for the whole team"}`
                      : "Price on request"}
                  </span>
                  {stats && stats.completed > 0 && (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-accent px-3 py-1 font-medium">
                      <Briefcase className="h-3.5 w-3.5" />{stats.completed} events completed
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
              </div>
            </div>


            {vendor.portfolio?.length > 0 && (
              <div className="mt-8">
                <h2 className="font-display text-lg font-semibold mb-3">Portfolio</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {(vendor.portfolio as string[]).map((url: string, i: number) => (
                    <div key={i} className="aspect-[16/11] overflow-hidden rounded-xl border border-border">
                      <img src={url} alt={`Work ${i + 1}`} loading="lazy" className="h-full w-full object-cover hover:scale-105 transition-transform duration-500" />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {vendor.service_areas?.length > 0 && (
              <div className="mt-8">
                <h2 className="font-display text-lg font-semibold mb-2">Service areas</h2>
                <div className="flex flex-wrap gap-2">
                  {(vendor.service_areas as string[]).map((a: string) => <span key={a} className="rounded-full bg-accent px-3 py-1 text-xs font-medium">{a}</span>)}
                </div>
              </div>
            )}

            {(vendor.website || vendor.instagram || vendor.facebook) && (
              <div className="mt-8 flex flex-wrap gap-4 text-sm">
                {vendor.website && <a href={vendor.website} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-brand-violet hover:underline"><Globe className="h-4 w-4" /> Website</a>}
                {vendor.instagram && <a href={vendor.instagram} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-brand-violet hover:underline"><Instagram className="h-4 w-4" /> Instagram</a>}
                {vendor.facebook && <a href={vendor.facebook} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-brand-violet hover:underline"><Facebook className="h-4 w-4" /> Facebook</a>}
              </div>
            )}

            <VendorReviews vendorId={vendor.id} />
          </div>

          <div>
            <BookOrEnquire vendor={vendor} eventId={event_id} sourceSlug={ref} />
          </div>
        </div>
      </div>
    </SiteLayout>
  );
}

/** Direct hire only — creates a real vendor_tasks job the vendor
 *  accepts/rejects from their dashboard, with in-app chat attached.
 *  The old "just send an enquiry" path is removed: it went nowhere
 *  trackable for the customer (see MessagesInbox/ChatPanel instead). */
function BookOrEnquire({ vendor, eventId, sourceSlug }: { vendor: Vendor; eventId?: string; sourceSlug?: string }) {
  return (
    <div className="sticky top-24 space-y-3">
      <VendorHireCard vendor={vendor} eventId={eventId} sourceSlug={sourceSlug} />
    </div>
  );
}

function VendorHireCard({ vendor, eventId, sourceSlug }: { vendor: Vendor; eventId?: string; sourceSlug?: string }) {
  const navigate = useNavigate();
  const [loggedIn, setLoggedIn] = useState<boolean | null>(null);
  const [packages, setPackages] = useState<{ id: string; name: string; price: number; description: string | null }[]>([]);
  const [selectedPackage, setSelectedPackage] = useState<string | null>(null);
  const [state, setState] = useState({ event_name: "", task_name: "", venue: "", venue_address: "", event_date: "", start_time: "", end_time: "", guest_count: "", requirements: "" });
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const options = vendor.pricing_options ?? [];
  const [selectedOptions, setSelectedOptions] = useState<Record<string, boolean>>({});
  const hasPerGuestOption = options.some((o) => o.per_guest);
  const guestCount = Number(state.guest_count) || 0;

  useEffect(() => { supabase.auth.getUser().then(({ data }) => setLoggedIn(!!data.user)); }, []);
  useEffect(() => {
    supabase.from("vendor_packages" as never).select("id,name,price,description").eq("vendor_id" as never, vendor.id as never).order("sort_order" as never, { ascending: true })
      .then(({ data }) => setPackages((data as never) ?? []));
  }, [vendor.id]);

  function pickPackage(pkgId: string) {
    const pkg = packages.find((p) => p.id === pkgId);
    setSelectedPackage((prev) => (prev === pkgId ? null : pkgId));
    if (pkg) setState((s) => ({ ...s, task_name: s.task_name || pkg.name }));
  }

  // Base = whichever package is picked, else the vendor's starting
  // price — plus every ticked add-on (per-guest ones × guest count).
  // Shown to the customer purely as a REFERENCE figure so they know
  // roughly what they're looking at — it is never submitted as a
  // price. The vendor reviews the actual requirement below and sends
  // back their own real quote (see "Review & send price" in
  // vendor/jobs.tsx / confirmVendorTaskWithPricing in lib/vendor.ts).
  const basePrice = selectedPackage ? (packages.find((p) => p.id === selectedPackage)?.price ?? 0) : (vendor.base_price ?? 0);
  const optionsTotal = options.reduce((s, o) => s + (selectedOptions[o.id] ? (o.per_guest ? o.price * guestCount : o.price) : 0), 0);
  const estimatedTotal = basePrice + optionsTotal;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    if (!state.event_name.trim() || !state.task_name.trim() || !state.event_date) {
      setErr("Event name, service and date are required."); return;
    }
    setSubmitting(true);
    const { data: userRes } = await supabase.auth.getUser();
    if (!userRes.user) { setSubmitting(false); setErr("Please log in first."); return; }
    const chosenOptions = options.filter((o) => selectedOptions[o.id]);
    const pkgName = selectedPackage ? packages.find((p) => p.id === selectedPackage)?.name : null;
    // Reference only, folded into the free-text description so the
    // vendor sees what caught the customer's eye — never a binding
    // price. selected_items stays empty on purpose: that's what keeps
    // tg_recompute_vendor_task_amount (see migration
    // 20260820090000_server_authoritative_task_pricing.sql) from
    // computing a payment_amount here or later when the vendor sets
    // their real price via confirmVendorTaskWithPricing.
    const selectionSummary = [
      pkgName ? `Interested in package: ${pkgName} (listed from ₹${basePrice.toLocaleString("en-IN")} — reference only, vendor will confirm the final price)` : null,
      ...chosenOptions.map((o) => `Interested in add-on: ${o.name} (listed at ₹${o.price.toLocaleString("en-IN")}${o.per_guest ? "/guest" : ""} — reference only)`),
    ].filter(Boolean).join("\n");
    const { error } = await supabase.from("vendor_tasks" as never).insert({
      vendor_id: vendor.id,
      vendor_user_id: vendor.owner_id,
      assigned_by: userRes.user.id,
      organization_name: "Direct booking",
      customer_event_id: eventId ?? null,
      event_name: state.event_name.trim(),
      task_name: state.task_name.trim(),
      description: selectionSummary || null,
      customer_requirements: state.requirements.trim() || null,
      // Deliberately empty — this is a requirement-only request, same
      // pattern as a hall booking request. The vendor reviews it and
      // sets the real price themselves (see "Review & send price" in
      // vendor/jobs.tsx). Leaving this empty is what keeps the price
      // out of the customer's hands, now and when the vendor prices it.
      selected_items: [],
      guest_count: guestCount || null,
      venue: state.venue || null,
      venue_address: state.venue_address || null,
      event_date: state.event_date,
      start_time: state.start_time || null,
      end_time: state.end_time || null,
      priority: "normal",
      status: "pending",
      // No price yet — the vendor sets this after reviewing the requirement.
      payment_amount: null,
      booking_source: sourceSlug ? "public_profile_link" : "marketplace",
      source_slug: sourceSlug ?? null,
    } as never);
    setSubmitting(false);
    if (error) { setErr(error.message || "Could not send the request. Please try again."); return; }
    setSent(true);
  }

  if (sent) {
    return (
      <div className="rounded-2xl border border-brand-violet/30 bg-accent/40 p-5 text-sm">
        <div className="flex items-center gap-2 font-semibold text-foreground"><CheckCircle2 className="h-5 w-5 text-emerald-600" /> Request sent!</div>
        <p className="mt-1.5 text-muted-foreground">
          {vendor.business_name} will review your requirement and send you a price — you only pay after that. Track it — and chat with them — under Bookings in your workspace.
        </p>
      </div>
    );
  }

  if (loggedIn === false) {
    return (
      <div className="rounded-2xl border border-border bg-card p-5 shadow-soft text-sm">
        <h3 className="font-display text-lg font-semibold">Book {vendor.business_name}</h3>
        <p className="mt-2 text-muted-foreground">Log in to send a direct booking request — it becomes a real job on their dashboard once they accept.</p>
        <button onClick={() => navigate({ to: "/login" })} className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-full btn-brand btn-brand-hover px-4 py-2.5 text-sm font-semibold">
          Log in to book
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="rounded-2xl border border-border bg-card p-5 shadow-soft space-y-3">
      <h3 className="font-display text-lg font-semibold">Book {vendor.business_name}</h3>
      <p className="text-xs text-muted-foreground -mt-1">
        Tell them what you need — they'll review it and send you a real price. You only pay after that, from Bookings in your workspace.
      </p>
      {packages.length > 0 && (
        <div>
          <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">Choose a package (optional)</label>
          <div className="grid grid-cols-1 gap-2">
            {packages.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => pickPackage(p.id)}
                className={`rounded-xl border px-3.5 py-2.5 text-left text-sm transition ${
                  selectedPackage === p.id ? "border-brand-violet bg-brand-violet/5" : "border-input hover:bg-accent"
                }`}
              >
                <div className="flex items-center justify-between font-semibold">
                  <span>{p.name}</span>
                  <span>₹{Number(p.price).toLocaleString("en-IN")}</span>
                </div>
                {p.description && <p className="mt-0.5 text-xs text-muted-foreground">{p.description}</p>}
              </button>
            ))}
          </div>
        </div>
      )}
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
      <input placeholder="Event name" value={state.event_name} onChange={(e) => setState((s) => ({ ...s, event_name: e.target.value }))}
        className="w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm outline-none focus:border-brand-violet" />
      <input placeholder="What service do you need?" value={state.task_name} onChange={(e) => setState((s) => ({ ...s, task_name: e.target.value }))}
        className="w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm outline-none focus:border-brand-violet" />
      <input placeholder="Venue name (optional)" value={state.venue} onChange={(e) => setState((s) => ({ ...s, venue: e.target.value }))}
        className="w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm outline-none focus:border-brand-violet" />
      <input type="date" value={state.event_date} onChange={(e) => setState((s) => ({ ...s, event_date: e.target.value }))}
        className="w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm outline-none focus:border-brand-violet" />
      <div className="grid grid-cols-2 gap-2">
        <label className="text-xs text-muted-foreground">From
          <input type="time" value={state.start_time} onChange={(e) => setState((s) => ({ ...s, start_time: e.target.value }))}
            className="mt-1 w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm outline-none focus:border-brand-violet" />
        </label>
        <label className="text-xs text-muted-foreground">To
          <input type="time" value={state.end_time} onChange={(e) => setState((s) => ({ ...s, end_time: e.target.value }))}
            className="mt-1 w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm outline-none focus:border-brand-violet" />
        </label>
      </div>
      <textarea
        placeholder="Tell them exactly what you need — dietary preferences, theme/colours, must-haves, anything specific to your event."
        value={state.requirements}
        onChange={(e) => setState((s) => ({ ...s, requirements: e.target.value }))}
        rows={3}
        className="w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm outline-none focus:border-brand-violet"
      />
      {estimatedTotal > 0 && (
        <div className="flex items-center justify-between rounded-xl bg-accent/40 px-3.5 py-2.5 text-sm font-semibold">
          <span>Reference total for your selections</span>
          <span>₹{estimatedTotal.toLocaleString("en-IN")}</span>
        </div>
      )}
      <p className="-mt-2 text-[11px] text-muted-foreground">
        This is just a guide based on their listed prices — {vendor.business_name} will look at your actual requirement and send you their real, final price before you pay anything.
      </p>
      {err && <p className="text-xs text-destructive">{err}</p>}
      <button type="submit" disabled={submitting} className="inline-flex w-full items-center justify-center gap-2 rounded-full btn-brand btn-brand-hover px-4 py-2.5 text-sm font-semibold disabled:opacity-70">
        <Send className="h-4 w-4" /> {submitting ? "Sending…" : "Send booking request"}
      </button>
    </form>
  );
}

function VendorReviews({ vendorId }: { vendorId: string }) {
  const [reviews, setReviews] = useState<Array<{ id: string; rating: number; comment: string | null; created_at: string }>>([]);
  useEffect(() => {
    supabase.from("customer_reviews" as never)
      .select("id,rating,comment,created_at")
      .eq("kind" as never, "vendor" as never)
      .eq("target_id" as never, vendorId as never)
      .order("created_at" as never, { ascending: false })
      .limit(6)
      .then(({ data }) => setReviews((data as never) ?? []));
  }, [vendorId]);

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
