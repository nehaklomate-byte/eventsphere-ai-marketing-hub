import { createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  ArrowLeft, MapPin, Star, BadgeCheck, Wrench, Send, Phone, CheckCircle2, Globe, Instagram, Facebook,
  Users, IndianRupee, Wallet,
} from "lucide-react";
import { SiteLayout } from "@/components/SiteLayout";
import { WishlistButton } from "@/components/WishlistButton";
import { supabase } from "@/integrations/supabase/client";


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
  head: ({ params }) => ({
    meta: [
      { title: "Vendor details — EventOrbit AI" },
      { name: "description", content: "Verified event vendor on EventOrbit AI." },
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
  const { vendor } = Route.useLoaderData();

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
                      ? `₹${Number(vendor.base_price).toLocaleString("en-IN")} ${vendor.pricing_mode === "individual" ? "per person" : "for the whole team"}`
                      : "Price on request"}
                  </span>
                </div>
              </div>
            </div>


            {vendor.portfolio?.length > 0 && (
              <div className="mt-8">
                <h2 className="font-display text-lg font-semibold mb-3">Portfolio</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {(vendor.portfolio as string[]).map((url: string, i: number) => (
                    <img key={i} src={url} alt={`Work ${i + 1}`} className="h-32 w-full rounded-xl object-cover border border-border" />
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
            <BookOrEnquire vendor={vendor} />
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
function BookOrEnquire({ vendor }: { vendor: Vendor }) {
  return (
    <div className="sticky top-24 space-y-3">
      <VendorHireCard vendor={vendor} />
    </div>
  );
}

function VendorHireCard({ vendor }: { vendor: Vendor }) {
  const navigate = useNavigate();
  const [loggedIn, setLoggedIn] = useState<boolean | null>(null);
  const [state, setState] = useState({ event_name: "", task_name: "", venue: "", venue_address: "", event_date: "", start_time: "", end_time: "", pay_amount: "" });
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => { supabase.auth.getUser().then(({ data }) => setLoggedIn(!!data.user)); }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    if (!state.event_name.trim() || !state.task_name.trim() || !state.event_date) {
      setErr("Event name, service and date are required."); return;
    }
    setSubmitting(true);
    const { data: userRes } = await supabase.auth.getUser();
    if (!userRes.user) { setSubmitting(false); setErr("Please log in first."); return; }
    const { error } = await supabase.from("vendor_tasks" as never).insert({
      vendor_id: vendor.id,
      vendor_user_id: vendor.owner_id,
      assigned_by: userRes.user.id,
      organization_name: "Direct booking",
      event_name: state.event_name.trim(),
      task_name: state.task_name.trim(),
      venue: state.venue || null,
      venue_address: state.venue_address || null,
      event_date: state.event_date,
      start_time: state.start_time || null,
      end_time: state.end_time || null,
      priority: "normal",
      status: "pending",
      payment_amount: state.pay_amount ? Number(state.pay_amount) : null,
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
          {vendor.business_name} will accept or decline from their dashboard. Track it — and chat with them — under Bookings in your workspace.
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
        They accept or decline first — you only pay after that, from Bookings in your workspace.
      </p>
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
      <div className="relative">
        <Wallet className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input type="number" placeholder="Offer amount (₹, optional)" value={state.pay_amount} onChange={(e) => setState((s) => ({ ...s, pay_amount: e.target.value }))}
          className="w-full rounded-xl border border-input bg-background pl-9 pr-3.5 py-2.5 text-sm outline-none focus:border-brand-violet" />
      </div>
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
