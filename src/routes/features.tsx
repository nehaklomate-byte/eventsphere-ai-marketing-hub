import { createFileRoute } from "@tanstack/react-router";
import { SiteLayout } from "@/components/SiteLayout";
import { PageHeader } from "@/components/PageHeader";
import { CalendarCheck, Building2, Users2, Store, UserCheck, Wallet, BarChart3, BrainCircuit, QrCode, BellRing, ShieldCheck, Zap } from "lucide-react";

const features = [
  { icon: CalendarCheck, title: "Event Planning", desc: "Timelines, checklists and collaborative run-of-show." },
  { icon: Building2, title: "Venue Booking", desc: "Real-time availability across partner halls." },
  { icon: Store, title: "Vendor Management", desc: "Contracts, deliverables and payments in one hub." },
  { icon: UserCheck, title: "Worker Marketplace", desc: "On-demand staffing with rating and verification." },
  { icon: Users2, title: "Participant Management", desc: "RSVPs, seat maps and guest comms." },
  { icon: Wallet, title: "Budget Tracking", desc: "Live budget vs actuals across categories." },
  { icon: BarChart3, title: "Reports & Analytics", desc: "Executive dashboards for revenue and satisfaction." },
  { icon: BrainCircuit, title: "AI Automation", desc: "Smart schedules and vendor suggestions.", soon: true },
  { icon: QrCode, title: "QR Attendance", desc: "Contactless check-in and real-time headcount." },
  { icon: BellRing, title: "Notifications", desc: "Email, SMS and WhatsApp reminders." },
  { icon: ShieldCheck, title: "Enterprise Security", desc: "SSO, RBAC and audit logs (Enterprise)." },
  { icon: Zap, title: "Integrations", desc: "Calendars, CRMs and payment gateways." },
];

export const Route = createFileRoute("/features")({
  head: () => ({
    meta: [
      { title: "Features — EventSphere AI" },
      { name: "description", content: "A modular platform for planning, venues, vendors, workers, budgets and analytics — with AI woven in." },
      { property: "og:title", content: "Features — EventSphere AI" },
      { property: "og:description", content: "Everything you need to run world-class events." },
      { property: "og:url", content: "/features" },
    ],
    links: [{ rel: "canonical", href: "/features" }],
  }),
  component: () => (
    <SiteLayout>
      <PageHeader eyebrow="Platform" title="Everything you need to run world-class events." description="Purpose-built modules for the entire event lifecycle — from first idea to final report." />
      <section className="mx-auto max-w-7xl px-5 md:px-8 py-20 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {features.map((f) => (
          <div key={f.title} className="rounded-2xl border border-border bg-card p-6 shadow-soft hover:shadow-elegant transition">
            <div className="grid h-12 w-12 place-items-center rounded-xl bg-gradient-brand text-white shadow-glow">
              <f.icon className="h-5 w-5" />
            </div>
            <div className="mt-4 flex items-center gap-2">
              <h3 className="font-display text-lg font-semibold">{f.title}</h3>
              {f.soon && <span className="rounded-full bg-gradient-warm text-white text-[10px] font-semibold px-2 py-0.5">Soon</span>}
            </div>
            <p className="mt-2 text-sm text-muted-foreground">{f.desc}</p>
          </div>
        ))}
      </section>
    </SiteLayout>
  ),
});
