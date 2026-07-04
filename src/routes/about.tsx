import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteLayout } from "@/components/SiteLayout";
import { PageHeader } from "@/components/PageHeader";
import { Target, Compass, Users, Sparkles } from "lucide-react";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About — EventSphere AI" },
      { name: "description", content: "Meet the team building the operating system for events." },
      { property: "og:title", content: "About — EventSphere AI" },
      { property: "og:description", content: "Meet the team building the operating system for events." },
      { property: "og:url", content: "/about" },
    ],
    links: [{ rel: "canonical", href: "/about" }],
  }),
  component: About,
});

function About() {
  const values = [
    { icon: Target, title: "Focus", desc: "We solve real, painful, unglamorous problems in event operations." },
    { icon: Compass, title: "Craft", desc: "Every pixel, every workflow, every latency budget is deliberate." },
    { icon: Users, title: "Partnership", desc: "We build with our customers — not just for them." },
    { icon: Sparkles, title: "Intelligence", desc: "AI woven into the workflow, never bolted on for show." },
  ];
  return (
    <SiteLayout>
      <PageHeader eyebrow="About" title="Helping organizations run events that matter." description="EventSphere AI is on a mission to become the operating system for the world's events — from a neighborhood birthday to a national summit." />
      <section className="mx-auto max-w-7xl px-5 md:px-8 py-20 grid gap-12 lg:grid-cols-2 items-start">
        <div>
          <h2 className="font-display text-3xl font-semibold">Our story</h2>
          <p className="mt-4 text-muted-foreground leading-relaxed">
            We started EventSphere after watching planners, hall owners and vendors juggle spreadsheets, WhatsApp threads and paper receipts to pull off unforgettable moments. Every event is a symphony of moving parts — and we believe teams deserve a platform as ambitious as their ambitions.
          </p>
          <p className="mt-4 text-muted-foreground leading-relaxed">
            Today, we're building a unified cloud platform that brings planning, venues, vendors, workers, budgets and analytics together — with AI quietly compounding every decision.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {values.map((v) => (
            <div key={v.title} className="rounded-2xl border border-border bg-card p-5 shadow-soft">
              <div className="grid h-11 w-11 place-items-center rounded-xl bg-gradient-brand text-white shadow-glow">
                <v.icon className="h-5 w-5" />
              </div>
              <div className="mt-4 font-display text-lg font-semibold">{v.title}</div>
              <p className="mt-1 text-sm text-muted-foreground">{v.desc}</p>
            </div>
          ))}
        </div>
      </section>
      <section className="mx-auto max-w-7xl px-5 md:px-8 pb-24">
        <div className="rounded-3xl bg-gradient-brand text-white p-10 md:p-14 shadow-elegant flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h3 className="font-display text-2xl md:text-3xl font-semibold">Want to build with us?</h3>
            <p className="mt-2 text-white/85">We're hiring designers, engineers, and event industry veterans.</p>
          </div>
          <Link to="/contact" className="rounded-full bg-white text-brand-navy px-6 py-3 font-semibold hover:opacity-90 text-center">Get in touch</Link>
        </div>
      </section>
    </SiteLayout>
  );
}
