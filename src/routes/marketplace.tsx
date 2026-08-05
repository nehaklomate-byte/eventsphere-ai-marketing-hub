import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { SiteLayout } from "@/components/SiteLayout";
import { PageHeader } from "@/components/PageHeader";
import { MapPin, Star, BadgeCheck, Loader2, Search, Users, ArrowRight, Building2, Wrench, HardHat } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { WishlistButton } from "@/components/WishlistButton";

type Hall = {
  kind: "venue";
  id: string; name: string; city: string | null; state: string | null;
  category: string | null; cover_url: string | null; gallery: string[];
  price_per_day: number | null; max_guests: number | null;
  verified: boolean; rating: number; review_count: number;
};
type Vendor = {
  kind: "vendor";
  id: string; name: string; city: string | null; state: string | null;
  category: string | null; cover_url: string | null; gallery: string[];
  price_per_day: null; max_guests: null;
  verified: boolean; rating: number; review_count: number;
};
type Worker = {
  kind: "worker";
  id: string; name: string; city: string | null; state: string | null;
  category: string | null; cover_url: string | null; gallery: string[];
  price_per_day: number | null; max_guests: null;
  verified: boolean; rating: number; review_count: number;
};
type Item = Hall | Vendor | Worker;
type Tab = "venue" | "vendor" | "worker";

const TAB_META: Record<Tab, { label: string; icon: typeof Building2; empty: string; detailBase: string; listBtn: string }> = {
  venue: { label: "Venues", icon: Building2, empty: "hall, banquet or lawn", detailBase: "/hall", listBtn: "List your venue" },
  vendor: { label: "Vendors", icon: Wrench, empty: "vendor business (decor, catering, sound…)", detailBase: "/vendor", listBtn: "List your vendor business" },
  worker: { label: "Workers", icon: HardHat, empty: "skilled worker profile", detailBase: "/worker", listBtn: "List your worker profile" },
};

export const Route = createFileRoute("/marketplace")({
  validateSearch: (search: Record<string, unknown>) => ({
    event_id: typeof search.event_id === "string" ? search.event_id : undefined,
    tab: (search.tab === "vendor" || search.tab === "worker" || search.tab === "venue") ? search.tab : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Marketplace — EventOrbit AI" },
      { name: "description", content: "Discover verified venues, vendors and workers across India for your next event — transparent pricing, instant enquiries." },
      { property: "og:title", content: "Marketplace — EventOrbit AI" },
      { property: "og:description", content: "Verified venues, vendors and workers. Transparent pricing, instant enquiries." },
      { property: "og:url", content: "/marketplace" },
    ],
    links: [{ rel: "canonical", href: "/marketplace" }],
  }),
  component: Marketplace,
});

function Marketplace() {
  const search = Route.useSearch();
  const [tab, setTab] = useState<Tab>(search.tab ?? "venue");
  const [items, setItems] = useState<Item[] | null>(null);
  const [q, setQ] = useState("");
  const [city, setCity] = useState<string>("");

  useEffect(() => {
    setItems(null);
    setCity("");
    if (tab === "venue") {
      supabase.from("halls")
        .select("id,name,city,state,category,cover_url,gallery,price_per_day,max_guests,verified,rating,review_count")
        .eq("status", "published").eq("verified", true).is("deleted_at", null)
        .order("verified", { ascending: false })
        .then(({ data }) => setItems(((data ?? []) as unknown[]).map((h) => ({ ...(h as object), kind: "venue" })) as Item[]));
    } else if (tab === "vendor") {
      supabase.from("vendors")
        .select("id,business_name,city,state,category,logo_url,portfolio,verified,rating,review_count")
        .eq("status", "published").eq("verified", true).is("deleted_at", null)
        .order("verified", { ascending: false })
        .then(({ data }) => setItems(((data ?? []) as unknown[]).map((v) => {
          const vv = v as { id: string; business_name: string; city: string | null; state: string | null; category: string | null; logo_url: string | null; portfolio: string[]; verified: boolean; rating: number; review_count: number };
          return { kind: "vendor", id: vv.id, name: vv.business_name, city: vv.city, state: vv.state, category: vv.category, cover_url: vv.logo_url, gallery: vv.portfolio ?? [], price_per_day: null, max_guests: null, verified: vv.verified, rating: vv.rating, review_count: vv.review_count } as Vendor;
        })));
    } else {
      supabase.from("workers")
        .select("id,full_name,city,state,category,photo_url,work_images,daily_charges,verified,rating,review_count,marketplace_visible")
        .eq("verified", true).eq("marketplace_visible", true).is("deleted_at", null)
        .order("verified", { ascending: false })
        .then(({ data }) => setItems(((data ?? []) as unknown[]).map((w) => {
          const ww = w as { id: string; full_name: string; city: string | null; state: string | null; category: string | null; photo_url: string | null; work_images: string[]; daily_charges: number | null; verified: boolean; rating: number; review_count: number };
          return { kind: "worker", id: ww.id, name: ww.full_name, city: ww.city, state: ww.state, category: ww.category, cover_url: ww.photo_url, gallery: ww.work_images ?? [], price_per_day: ww.daily_charges, max_guests: null, verified: ww.verified, rating: ww.rating, review_count: ww.review_count } as Worker;
        })));
    }
  }, [tab]);

  const filtered = (items ?? []).filter((h) => {
    const okQ = !q || h.name.toLowerCase().includes(q.toLowerCase()) || (h.city ?? "").toLowerCase().includes(q.toLowerCase()) || (h.category ?? "").toLowerCase().includes(q.toLowerCase());
    const okCity = !city || h.city === city;
    return okQ && okCity;
  });
  const cities = Array.from(new Set((items ?? []).map((h) => h.city).filter(Boolean))) as string[];
  const meta = TAB_META[tab];

  return (
    <SiteLayout>
      {search.event_id && (
        <div className="mx-auto max-w-7xl px-5 md:px-8 pt-6">
          <Link to="/customer/events/$eventId" params={{ eventId: search.event_id }}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-violet hover:underline">
            ← Back to your event
          </Link>
        </div>
      )}
      <PageHeader
        eyebrow="Marketplace"
        title="Discover verified venues, vendors and workers."
        description="Everyone on EventOrbit is verified by our team before they're listed. Filter by city and category, then enquire or book directly.">
        <div className="mt-6 inline-flex rounded-full border border-border bg-card p-1 text-sm">
          {(Object.keys(TAB_META) as Tab[]).map((t) => {
            const Icon = TAB_META[t].icon;
            return (
              <button key={t} onClick={() => { setTab(t); setQ(""); }}
                className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2 font-semibold transition ${tab === t ? "bg-gradient-brand text-white" : "text-muted-foreground hover:text-foreground"}`}>
                <Icon className="h-3.5 w-3.5" /> {TAB_META[t].label}
              </button>
            );
          })}
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_200px_auto] max-w-2xl">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={`Search ${meta.label.toLowerCase()}, city or category…`}
              className="w-full rounded-full border border-input bg-card pl-10 pr-4 py-2.5 text-sm outline-none focus:border-brand-violet" />
          </div>
          <select value={city} onChange={(e) => setCity(e.target.value)} className="rounded-full border border-input bg-card px-4 py-2.5 text-sm outline-none">
            <option value="">All cities</option>
            {cities.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <Link to="/register" className="inline-flex items-center justify-center gap-2 rounded-full btn-brand btn-brand-hover px-5 py-2.5 text-sm font-semibold">
            {meta.listBtn} <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </PageHeader>

      <section className="mx-auto max-w-7xl px-5 md:px-8 py-16">
        {items === null ? (
          <div className="py-20 grid place-items-center text-muted-foreground"><Loader2 className="h-6 w-6 animate-spin" /></div>
        ) : filtered.length === 0 ? (
          <EmptyState tab={tab} />
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {filtered.map((h) => (
              <Link key={h.id} to={`${meta.detailBase}/$id`} params={{ id: h.id }} search={search.event_id ? { event_id: search.event_id } : undefined}
                className="group overflow-hidden rounded-2xl border border-border bg-card shadow-soft hover:shadow-elegant transition-all">
                <div className="relative h-44 overflow-hidden bg-accent">
                  {h.cover_url || h.gallery[0] ? (
                    <img src={h.cover_url || h.gallery[0]} alt={h.name} loading="lazy"
                      className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" />
                  ) : (
                    <div className="grid h-full place-items-center text-muted-foreground"><meta.icon className="h-8 w-8" /></div>
                  )}
                  {h.category && <span className="absolute left-3 top-3 rounded-full bg-white/90 text-[10px] font-semibold text-brand-navy px-2 py-1">{h.category}</span>}
                  {h.verified && (
                    <span className={`absolute right-3 top-12 inline-flex items-center gap-1 rounded-full bg-brand-blue/90 text-white text-[10px] font-semibold px-2 py-1`}>
                      <BadgeCheck className="h-3 w-3" /> Verified
                    </span>
                  )}
                  <WishlistButton
                    kind={h.kind === "venue" ? "hall" : h.kind}
                    targetId={h.id}
                    targetName={h.name}
                    imageUrl={h.cover_url || h.gallery[0]}
                    className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-full bg-white/90 text-brand-navy shadow-sm hover:bg-white transition"
                  />
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

function EmptyState({ tab }: { tab: Tab }) {
  const meta = TAB_META[tab];
  return (
    <div className="mx-auto max-w-xl text-center rounded-3xl border border-border bg-card p-10 shadow-soft">
      <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-gradient-brand text-white shadow-glow">
        <meta.icon className="h-6 w-6" />
      </div>
      <h2 className="mt-6 font-display text-2xl font-semibold">We're onboarding {meta.label.toLowerCase()} in your area.</h2>
      <p className="mt-2 text-muted-foreground">If you run a {meta.empty}, list it and we'll get you live within 48 hours.</p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <Link to="/register" className="rounded-full btn-brand btn-brand-hover px-5 py-3 text-sm font-semibold">{meta.listBtn}</Link>
        <Link to="/contact" className="rounded-full border border-input px-5 py-3 text-sm font-semibold hover:bg-accent">Talk to our team</Link>
      </div>
    </div>
  );
}
