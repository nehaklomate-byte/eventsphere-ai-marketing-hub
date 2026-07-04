import { createFileRoute } from "@tanstack/react-router";
import { SiteLayout } from "@/components/SiteLayout";
import { PageHeader } from "@/components/PageHeader";
import { MapPin, Star } from "lucide-react";

const market = [
  { title: "The Grand Lawns", type: "Venue", loc: "Pune, MH", price: "₹1.8L / day", rating: 4.9, badge: "Available", img: "https://images.unsplash.com/photo-1519167758481-83f550bb49b3?auto=format&fit=crop&w=900&q=70" },
  { title: "Bloom Decor Studio", type: "Decorator", loc: "Mumbai, MH", price: "₹45k+", rating: 4.8, badge: "Top Rated", img: "https://images.unsplash.com/photo-1519671482749-fd09be7ccebf?auto=format&fit=crop&w=900&q=70" },
  { title: "Frame & Light", type: "Photographer", loc: "Bengaluru, KA", price: "₹35k/day", rating: 4.9, badge: "Available", img: "https://images.unsplash.com/photo-1502635385003-ee1e6a1a742d?auto=format&fit=crop&w=900&q=70" },
  { title: "Saffron Kitchen", type: "Catering", loc: "Delhi, DL", price: "₹850 / plate", rating: 4.7, badge: "Available", img: "https://images.unsplash.com/photo-1555244162-803834f70033?auto=format&fit=crop&w=900&q=70" },
  { title: "Amplify Sound", type: "Sound", loc: "Hyderabad, TS", price: "₹28k/day", rating: 4.8, badge: "Available", img: "https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?auto=format&fit=crop&w=900&q=70" },
  { title: "Neon Nights DJ", type: "DJ", loc: "Goa", price: "₹60k/night", rating: 4.9, badge: "Few Slots", img: "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?auto=format&fit=crop&w=900&q=70" },
  { title: "Rohan Kapoor", type: "Anchor", loc: "Mumbai, MH", price: "₹40k/event", rating: 4.8, badge: "Available", img: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=900&q=70" },
  { title: "OnCall Crew", type: "Workers", loc: "Pan-India", price: "₹800/shift", rating: 4.7, badge: "Available", img: "https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=900&q=70" },
  { title: "Royal Palace Hall", type: "Venue", loc: "Jaipur, RJ", price: "₹2.4L / day", rating: 4.9, badge: "Available", img: "https://images.unsplash.com/photo-1522673607200-164d1b6ce486?auto=format&fit=crop&w=900&q=70" },
  { title: "Petal & Bloom", type: "Decorator", loc: "Chennai, TN", price: "₹52k+", rating: 4.8, badge: "Available", img: "https://images.unsplash.com/photo-1478146059778-26028b07395a?auto=format&fit=crop&w=900&q=70" },
  { title: "Studio Aperture", type: "Photographer", loc: "Kolkata, WB", price: "₹42k/day", rating: 4.9, badge: "Available", img: "https://images.unsplash.com/photo-1554941829-202a0b2403b8?auto=format&fit=crop&w=900&q=70" },
  { title: "Spice Route Catering", type: "Catering", loc: "Ahmedabad, GJ", price: "₹720 / plate", rating: 4.7, badge: "Available", img: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=900&q=70" },
];

export const Route = createFileRoute("/marketplace")({
  head: () => ({
    meta: [
      { title: "Marketplace — EventSphere AI" },
      { name: "description", content: "Book venues, decorators, photographers, catering, sound, DJs, anchors and staff — verified and rated." },
      { property: "og:title", content: "Marketplace — EventSphere AI" },
      { property: "og:description", content: "A curated marketplace of trusted event partners." },
      { property: "og:url", content: "/marketplace" },
    ],
    links: [{ rel: "canonical", href: "/marketplace" }],
  }),
  component: () => (
    <SiteLayout>
      <PageHeader eyebrow="Marketplace" title="A curated marketplace of trusted partners." description="Discover verified venues, vendors and workers — with transparent pricing and instant booking." />
      <section className="mx-auto max-w-7xl px-5 md:px-8 py-20 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {market.map((m) => (
          <article key={m.title} className="group overflow-hidden rounded-2xl border border-border bg-card shadow-soft hover:shadow-elegant transition">
            <div className="relative h-44 overflow-hidden">
              <img src={m.img} alt={m.title} loading="lazy" className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" />
              <span className="absolute left-3 top-3 rounded-full bg-white/90 text-[10px] font-semibold text-brand-navy px-2 py-1">{m.type}</span>
              <span className="absolute right-3 top-3 rounded-full bg-gradient-warm text-white text-[10px] font-semibold px-2 py-1">{m.badge}</span>
            </div>
            <div className="p-4">
              <div className="flex items-center justify-between">
                <h3 className="font-display text-base font-semibold truncate">{m.title}</h3>
                <span className="inline-flex items-center gap-1 text-xs font-semibold">
                  <Star className="h-3.5 w-3.5 fill-brand-orange text-brand-orange" />{m.rating}
                </span>
              </div>
              <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground"><MapPin className="h-3.5 w-3.5" />{m.loc}</div>
              <div className="mt-3 flex items-center justify-between">
                <div className="text-sm font-semibold">{m.price}</div>
                <button className="rounded-full btn-brand btn-brand-hover text-xs font-semibold px-3 py-1.5">Book</button>
              </div>
            </div>
          </article>
        ))}
      </section>
    </SiteLayout>
  ),
});
