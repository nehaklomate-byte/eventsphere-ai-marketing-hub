import { createFileRoute } from "@tanstack/react-router";
import { SiteLayout } from "@/components/SiteLayout";
import { PageHeader } from "@/components/PageHeader";
import { Handshake, Building, GraduationCap, Cake, PartyPopper, Landmark } from "lucide-react";

const items = [
  { icon: Handshake, title: "Wedding Management", img: "https://images.unsplash.com/photo-1519225421980-715cb0215aed?auto=format&fit=crop&w=1200&q=70", desc: "Save-the-dates to send-offs: coordinate every ceremony." },
  { icon: Building, title: "Corporate Events", img: "https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&w=1200&q=70", desc: "Summits, offsites, product launches and town halls." },
  { icon: GraduationCap, title: "College Festivals", img: "https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=1200&q=70", desc: "Multi-day festivals with sponsors, artists and volunteers." },
  { icon: Cake, title: "Birthday Parties", img: "https://images.unsplash.com/photo-1530103862676-de8c9debad1d?auto=format&fit=crop&w=1200&q=70", desc: "Themes, vendors and RSVPs — beautifully simple." },
  { icon: PartyPopper, title: "Cultural Events", img: "https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?auto=format&fit=crop&w=1200&q=70", desc: "Community celebrations with volunteer coordination." },
  { icon: Landmark, title: "Government Events", img: "https://images.unsplash.com/photo-1505373877841-8d25f7d46678?auto=format&fit=crop&w=1200&q=70", desc: "Compliance-first workflows and audit trails." },
];

export const Route = createFileRoute("/solutions")({
  head: () => ({
    meta: [
      { title: "Solutions — EventSphere AI" },
      { name: "description", content: "Tailored workflows for weddings, corporate events, festivals, birthdays and government events." },
      { property: "og:title", content: "Solutions — EventSphere AI" },
      { property: "og:description", content: "Built for every kind of gathering." },
      { property: "og:url", content: "/solutions" },
    ],
    links: [{ rel: "canonical", href: "/solutions" }],
  }),
  component: () => (
    <SiteLayout>
      <PageHeader eyebrow="Solutions" title="Built for every kind of gathering." description="From intimate ceremonies to national summits — templates, roles and analytics tuned for you." />
      <section className="mx-auto max-w-7xl px-5 md:px-8 py-20 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {items.map((s) => (
          <article key={s.title} className="group overflow-hidden rounded-3xl border border-border bg-card shadow-soft hover:shadow-elegant transition">
            <div className="relative h-56 overflow-hidden">
              <img src={s.img} alt={s.title} loading="lazy" className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
              <div className="absolute left-4 top-4 grid h-10 w-10 place-items-center rounded-xl glass-strong">
                <s.icon className="h-5 w-5 text-white" />
              </div>
              <div className="absolute inset-x-0 bottom-0 p-4 text-white font-display text-lg font-semibold">{s.title}</div>
            </div>
            <p className="p-5 text-sm text-muted-foreground">{s.desc}</p>
          </article>
        ))}
      </section>
    </SiteLayout>
  ),
});
