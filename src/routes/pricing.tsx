import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteLayout } from "@/components/SiteLayout";
import { PageHeader } from "@/components/PageHeader";
import { CheckCircle2 } from "lucide-react";

const tiers = [
  { name: "Starter", price: "Free", desc: "For small teams planning up to 3 events per month.", features: ["Up to 3 active events", "Basic vendor & venue tools", "QR attendance", "Email support"], cta: "Start free" },
  { name: "Professional", price: "Coming Soon", featured: true, desc: "For growing organizations that need to scale operations.", features: ["Unlimited events", "Vendor & worker marketplace", "Budget & analytics", "Priority support"], cta: "Notify me" },
  { name: "Enterprise", price: "Custom", desc: "For venues, chains and government bodies.", features: ["SSO & role-based access", "Custom workflows & SLAs", "Dedicated success manager", "On-prem / VPC options"], cta: "Talk to sales" },
];

export const Route = createFileRoute("/pricing")({
  head: () => ({
    meta: [
      { title: "Pricing — EventSphere AI" },
      { name: "description", content: "Simple pricing that scales with you. Payment processing coming soon." },
      { property: "og:title", content: "Pricing — EventSphere AI" },
      { property: "og:description", content: "Simple, transparent pricing for teams of every size." },
      { property: "og:url", content: "/pricing" },
    ],
    links: [{ rel: "canonical", href: "/pricing" }],
  }),
  component: () => (
    <SiteLayout>
      <PageHeader eyebrow="Pricing" title="Simple pricing that scales with you." description="Payment processing is coming soon — join early access to lock in launch pricing." />
      <section className="mx-auto max-w-7xl px-5 md:px-8 py-20 grid gap-6 lg:grid-cols-3">
        {tiers.map((t) => (
          <div key={t.name} className={`relative rounded-3xl p-7 shadow-soft ${t.featured ? "bg-gradient-brand text-white shadow-elegant" : "bg-card border border-border"}`}>
            {t.featured && <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-white text-brand-navy text-[11px] font-bold px-3 py-1 shadow-soft">Most Popular</span>}
            <div className="font-display text-xl font-semibold">{t.name}</div>
            <div className={`mt-2 font-display text-4xl font-semibold ${t.featured ? "" : "text-gradient-brand"}`}>{t.price}</div>
            <p className={`mt-3 text-sm ${t.featured ? "text-white/85" : "text-muted-foreground"}`}>{t.desc}</p>
            <ul className={`mt-6 space-y-2.5 text-sm ${t.featured ? "text-white/95" : "text-foreground"}`}>
              {t.features.map((f) => (
                <li key={f} className="flex items-start gap-2">
                  <CheckCircle2 className={`h-4 w-4 mt-0.5 ${t.featured ? "text-white" : "text-brand-violet"}`} />
                  <span>{f}</span>
                </li>
              ))}
            </ul>
            <Link to="/contact" className={`mt-8 inline-flex w-full items-center justify-center rounded-full px-4 py-2.5 text-sm font-semibold ${t.featured ? "bg-white text-brand-navy hover:opacity-90" : "border border-input hover:bg-accent"}`}>
              {t.cta}
            </Link>
          </div>
        ))}
      </section>
    </SiteLayout>
  ),
});
