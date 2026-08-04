import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteLayout } from "@/components/SiteLayout";
import { PageHeader } from "@/components/PageHeader";
import { CheckCircle2, Hammer, CircleDashed, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/research")({
  head: () => ({
    meta: [
      { title: "Roadmap — What EventOrbit Has Shipped and What Is Next" },
      { name: "description", content: "An open roadmap: the modules that are live today, what is currently being built, and what is queued next for EventOrbit's event operations platform." },
      { property: "og:title", content: "Roadmap — Shipped, Building, Next" },
      { property: "og:description", content: "Our build status in the open, updated as modules ship." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:url", content: "/research" },
    ],
    links: [{ rel: "canonical", href: "/research" }],
  }),
  component: Roadmap,
});

const shipped = [
  "Email and password sign-in, Google sign-in, and session persistence across refresh",
  "Role-based accounts and dashboards for customer, venue owner, vendor, worker, organization and admin",
  "Two-stage onboarding: short registration, then a full profile completed from the dashboard",
  "Admin account approval and document verification with rejection reasons",
  "Public marketplace with verified venues, vendor businesses and worker profiles",
  "Venue profiles with galleries, capacity, facilities, policy, map location and an enquiry inbox",
  "Job assignment with accept, reject, start, pause, resume and complete tracking",
  "Worker check-in and check-out with time, photo and location on the job record",
  "Cross-role hiring: venues hire vendors and workers, vendors hire workers",
  "Personal in-app notifications generated automatically when work or approvals change",
  "Bookings, invoices, payment records, earnings pages and payout details",
  "Reviews and ratings tied to real bookings",
  "Row-level access rules, private document storage, soft delete and an admin audit log",
];

const building = [
  { title: "Organization workspace", detail: "Members, departments, custom roles and per-event registration forms are in place. Event execution end to end and participant handling are being finished." },
  { title: "Online payment collection", detail: "Records and the gateway integration exist; live collection turns on with merchant activation." },
  { title: "Mobile OTP verification", detail: "Waiting on an SMS provider. Email verification covers signup today." },
];

const next = [
  { title: "Participants & attendance", detail: "Guest lists, check-in and headcount reporting, after the organization workspace is complete." },
  { title: "Availability calendar sync", detail: "Two-way sync with Google and Outlook calendars for venues and vendors." },
  { title: "Contracts & quotations", detail: "Generate a scoped quotation from a job or enquiry, and keep the accepted version on the record." },
  { title: "Reporting", detail: "Occupancy, revenue and job completion reporting per venue, vendor and organization." },
];

function Roadmap() {
  return (
    <SiteLayout>
      <PageHeader
        eyebrow="Roadmap"
        title="What we have shipped, what we are building, what comes next."
        description="We publish our build status openly instead of a marketing roadmap. If something is not on the shipped list, it does not work yet."
      />
      <section className="mx-auto max-w-5xl px-5 md:px-8 py-20 space-y-14">
        <div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-brand-violet" />
            <h2 className="font-display text-2xl font-semibold">Live today</h2>
          </div>
          <ul className="mt-6 grid gap-3 sm:grid-cols-2">
            {shipped.map((s) => (
              <li key={s} className="flex gap-2 rounded-2xl border border-border bg-card p-4 text-sm leading-relaxed text-muted-foreground shadow-soft">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-brand-violet" />
                <span>{s}</span>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <div className="flex items-center gap-2">
            <Hammer className="h-5 w-5 text-brand-orange" />
            <h2 className="font-display text-2xl font-semibold">Currently building</h2>
          </div>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {building.map((b) => (
              <div key={b.title} className="rounded-2xl border border-dashed border-border bg-card/70 p-5">
                <div className="font-display text-lg font-semibold">{b.title}</div>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{b.detail}</p>
              </div>
            ))}
          </div>
        </div>

        <div>
          <div className="flex items-center gap-2">
            <CircleDashed className="h-5 w-5 text-muted-foreground" />
            <h2 className="font-display text-2xl font-semibold">Queued next</h2>
          </div>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {next.map((n) => (
              <div key={n.title} className="rounded-2xl border border-border bg-card p-5 shadow-soft">
                <div className="font-display text-lg font-semibold">{n.title}</div>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{n.detail}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-3xl bg-gradient-brand p-8 md:p-12 text-white shadow-elegant">
          <h2 className="font-display text-2xl font-semibold">Priorities are set by the people using this</h2>
          <p className="mt-2 max-w-2xl text-white/85">
            If something on the queued list would change how your week works, tell us. Requests from active accounts move up the order.
          </p>
          <Link to="/contact" className="mt-6 inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-semibold text-brand-navy hover:opacity-90">
            Send us your priority <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </SiteLayout>
  );
}
