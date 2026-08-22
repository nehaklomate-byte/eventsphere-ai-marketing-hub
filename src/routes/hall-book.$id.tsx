import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ArrowLeft, MapPin, Users } from "lucide-react";
import { SiteLayout } from "@/components/SiteLayout";
import { supabase } from "@/integrations/supabase/client";
import { BookingAndEnquiry } from "@/components/HallBookingForm";
import { normalize } from "./hall.$id";

export const Route = createFileRoute("/hall/$id/book")({
  validateSearch: (search: Record<string, unknown>) => ({
    event_id: typeof search.event_id === "string" ? search.event_id : undefined,
    ref: typeof search.ref === "string" ? search.ref : undefined,
    mode: search.mode === "enquiry" ? "enquiry" as const : "booking" as const,
  }),
  head: ({ params }) => ({
    meta: [
      { title: `Book venue — EventOrbit Nova` },
      { name: "description", content: "Send a booking request or enquiry to this verified venue on EventOrbit Nova." },
    ],
    links: [{ rel: "canonical", href: `/hall/${params.id}/book` }],
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
  component: HallBookPage,
});

function HallBookPage() {
  const { hall } = Route.useLoaderData();
  const { event_id, ref, mode } = Route.useSearch();
  const cover = hall.cover_url || hall.gallery[0] || "https://images.unsplash.com/photo-1519167758481-83f550bb49b3?auto=format&fit=crop&w=1600&q=70";

  return (
    <SiteLayout>
      <div className="mx-auto max-w-3xl px-5 md:px-8 py-10 md:py-14">
        <Link to="/hall/$id" params={{ id: hall.id }} search={{ event_id, ref }}
          className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back to {hall.name}
        </Link>

        {/* Venue summary strip so the customer never loses context of what
            they're booking, without dragging the whole profile page along. */}
        <div className="mt-5 flex items-center gap-4 rounded-2xl border border-border bg-card p-4 shadow-soft">
          <img src={cover} alt={hall.name} className="h-16 w-16 rounded-xl object-cover shrink-0" />
          <div className="min-w-0">
            <div className="font-display text-lg font-semibold truncate">{hall.name}</div>
            <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
              {(hall.city || hall.state) && (
                <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{[hall.city, hall.state].filter(Boolean).join(", ")}</span>
              )}
              {hall.max_guests && <span className="inline-flex items-center gap-1"><Users className="h-3.5 w-3.5" />Up to {hall.max_guests} guests</span>}
              {hall.price_per_day && <span>Starting at ₹{hall.price_per_day.toLocaleString("en-IN")}</span>}
            </div>
          </div>
        </div>

        <div className="mt-6 rounded-3xl border border-border bg-card shadow-elegant p-6 md:p-8">
          <BookingAndEnquiry
            hallId={hall.id}
            hallName={hall.name}
            pricePerDay={hall.price_per_day}
            guestPricingTiers={hall.guest_pricing_tiers}
            blockedDates={hall.blocked_dates}
            advanceAmount={hall.advance_amount}
            serviceOfferings={hall.service_offerings}
            eventId={event_id}
            sourceSlug={ref}
            initialMode={mode}
          />
        </div>
      </div>
    </SiteLayout>
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
