import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { SiteLayout } from "@/components/SiteLayout";
import { PageHeader } from "@/components/PageHeader";
import { MapPin, Star, BadgeCheck, Loader2, Search, Users, ArrowRight, Building2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type Hall = {
  id: string; name: string; city: string | null; state: string | null;
  category: string | null; cover_url: string | null; gallery: string[];
  price_per_day: number | null; max_guests: number | null;
  verified: boolean; rating: number; review_count: number;
};

export const Route = createFileRoute("/marketplace")({
  head: () => ({
    meta: [
      { title: "Venue marketplace — EventSphere AI" },
      { name: "description", content: "Discover verified banquet halls, lawns, resorts and event venues across India with transparent pricing and instant enquiries." },
      { property: "og:title", content: "Venue marketplace — EventSphere AI" },
      { property: "og:description", content: "Verified halls, transparent pricing, instant enquiries." },
      { property: "og:url", content: "/marketplace" },
    ],
    links: [{ rel: "canonical", href: "/marketplace" }],
  }),
  component: Marketplace,
});

function Marketplace() {
  const [halls, setHalls] = useState<Hall[] | null>(null);
  const [q, setQ] = useState("");
  const [city, setCity] = useState<string>("");

  useEffect(() => {
    supabase.from("halls")
      .select("id,name,city,state,category,cover_url,gallery,price_per_day,max_guests,verified,rating,review_count")
      .eq("status", "published").is("deleted_at", null)
      .order("verified", { ascending: false })
      .then(({ data }) => setHalls((data as unknown as Hall[]) ?? []));
  }, []);

  const filtered = (halls ?? []).filter((h) => {
    const okQ = !q || h.name.toLowerCase().includes(q.toLowerCase()) || (h.city ?? "").toLowerCase().includes(q.toLowerCase());
    const okCity = !city || h.city === city;
    return okQ && okCity;
  });
  const cities = Array.from(new Set((halls ?? []).map((h) => h.city).filter(Boolean))) as string[];

  return (
    <SiteLayout>
      <PageHeader
        eyebrow="Marketplace"
        title="Discover verified venues across India."
        description="Every hall on EventSphere is verified by our team. Filter by city, capacity and category, then enquire directly.">
        <div className="mt-6 grid gap-3 sm:grid-cols-[1fr_200px_auto] max-w-2xl">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search venue or city…"
              className="w-full rounded-full border border-input bg-card pl-10 pr-4 py-2.5 text-sm outline-none focus:border-brand-violet" />
          </div>
          <select value={city} onChange={(e) => setCity(e.target.value)} className="rounded-full border border-input bg-card px-4 py-2.5 text-sm outline-none">
            <option value="">All cities</option>
            {cities.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <Link to="/register" className="inline-flex items-center justify-center gap-2 rounded-full btn-brand btn-brand-hover px-5 py-2.5 text-sm font-semibold">
            List your venue <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </PageHeader>

      <section className="mx-auto max-w-7xl px-5 md:px-8 py-16">
        {halls === null ? (
          <div className="py-20 grid place-items-center text-muted-foreground"><Loader2 className="h-6 w-6 animate-spin" /></div>
        ) : filtered.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {filtered.map((h) => (
              <Link key={h.id} to="/hall/$id" params={{ id: h.id }}
                className="group overflow-hidden rounded-2xl border border-border bg-card shadow-soft hover:shadow-elegant transition-all">
                <div className="relative h-44 overflow-hidden bg-accent">
                  {h.cover_url || h.gallery[0] ? (
                    <img src={h.cover_url || h.gallery[0]} alt={h.name} loading="lazy"
                      className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" />
                  ) : (
                    <div className="grid h-full place-items-center text-muted-foreground"><Building2 className="h-8 w-8" /></div>
                  )}
                  {h.category && <span className="absolute left-3 top-3 rounded-full bg-white/90 text-[10px] font-semibold text-brand-navy px-2 py-1">{h.category}</span>}
                  {h.verified && (
                    <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-brand-blue/90 text-white text-[10px] font-semibold px-2 py-1">
                      <BadgeCheck className="h-3 w-3" /> Verified
                    </span>
                  )}
                </div>
                <div className="p-4">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-display text-base font-semibold truncate">{h.name}</h3>
                    {h.review_count > 0 && (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold">
                        <Star className="h-3.5 w-3.5 fill-brand-orange text-brand-orange" />{h.rating.toFixed(1)}
                      </span>
                    )}
                  </div>
                  <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{[h.city, h.state].filter(Boolean).join(", ")}</span>
                    {h.max_guests && <span className="inline-flex items-center gap-1"><Users className="h-3.5 w-3.5" />{h.max_guests}</span>}
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <div className="text-sm font-semibold">
                      {h.price_per_day ? `₹${h.price_per_day.toLocaleString("en-IN")}/day` : "On request"}
                    </div>
                    <span className="rounded-full btn-brand btn-brand-hover text-xs font-semibold px-3 py-1.5">View</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </SiteLayout>
  );
}

function EmptyState() {
  return (
    <div className="mx-auto max-w-xl text-center rounded-3xl border border-border bg-card p-10 shadow-soft">
      <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-gradient-brand text-white shadow-glow">
        <Building2 className="h-6 w-6" />
      </div>
      <h2 className="mt-6 font-display text-2xl font-semibold">The marketplace opens with our partner launch.</h2>
      <p className="mt-2 text-muted-foreground">We're onboarding verified venue partners across India. If you own a hall, banquet or lawn, list your venue and we'll get you live within 48 hours.</p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <Link to="/register" className="rounded-full btn-brand btn-brand-hover px-5 py-3 text-sm font-semibold">List your venue</Link>
        <Link to="/contact" className="rounded-full border border-input px-5 py-3 text-sm font-semibold hover:bg-accent">Talk to our team</Link>
      </div>
    </div>
  );
}
