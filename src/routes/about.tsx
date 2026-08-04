import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteLayout } from "@/components/SiteLayout";
import { PageHeader } from "@/components/PageHeader";
import { ShieldCheck, Layers, HandHeart, Eye, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About EventOrbit — Why We Are Building This" },
      { name: "description", content: "EventOrbit is an early-stage event operations platform for Indian venues, vendors, workers and organizers. Read what we are building, how we work, and where we are today." },
      { property: "og:title", content: "About EventOrbit — Why We Are Building This" },
      { property: "og:description", content: "An early-stage platform for the people who actually run events. Here is where we are today." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:url", content: "/about" },
    ],
    links: [{ rel: "canonical", href: "/about" }],
  }),
  component: About,
});

const principles = [
  { icon: Eye, title: "Say what is true", desc: "If a module is unfinished, it says so on the website and inside the product. We would rather lose a signup than earn one on a false claim." },
  { icon: Layers, title: "Records over reminders", desc: "Anything two people can argue about later — a rate, a timing, a completion — is stored as a record with a timestamp, not left to memory." },
  { icon: ShieldCheck, title: "Access is enforced, not implied", desc: "Every rule about who can see what lives in the database. Hiding a button is not security, and we do not treat it as such." },
  { icon: HandHeart, title: "Built for the person doing the work", desc: "The steward, the decorator and the hall manager are users, not line items. Their screens get the same care as the owner's dashboard." },
];

const timeline = [
  { phase: "Foundation", detail: "Accounts, role-based dashboards, admin approval and document verification for every role on the platform." },
  { phase: "Marketplace", detail: "Public venue, vendor and worker profiles with enquiries, so demand and supply can find each other without an intermediary." },
  { phase: "Operations", detail: "Job assignment with accept, start, pause and complete tracking, worker check-in, notifications and per-job earnings." },
  { phase: "Next", detail: "Finishing the organization workspace, switching on online payment collection, mobile OTP verification, then participants and attendance." },
];

function About() {
  return (
    <SiteLayout>
      <PageHeader
        eyebrow="About"
        title="We are building the boring layer that makes events work."
        description="EventOrbit is an early-stage platform for the venues, vendors, workers and organizers who run events in India. This page tells you honestly where we are."
      />

      <section className="mx-auto max-w-7xl px-5 md:px-8 py-20 grid gap-14 lg:grid-cols-2 items-start">
        <div>
          <h2 className="font-display text-3xl font-semibold">Why we started</h2>
          <p className="mt-4 leading-relaxed text-muted-foreground">
            An event is one of the most operationally complex things ordinary people organise, and almost all of it runs on memory. A hall keeps its bookings in a register. A decorator confirms scope on a call. A crew of twenty is arranged the night before and paid in cash without a receipt. When something goes wrong, there is no shared record to look at — only two versions of the same conversation.
          </p>
          <p className="mt-4 leading-relaxed text-muted-foreground">
            None of these people need a fancier tool. They need the same facts to exist in one place for everyone involved: which date is held, what was agreed, who is arriving at what time, what has been paid. That is what we are building, one role at a time.
          </p>
          <h2 className="mt-12 font-display text-3xl font-semibold">Where we are today</h2>
          <p className="mt-4 leading-relaxed text-muted-foreground">
            We are in early access. Accounts, verification, the marketplace, enquiries, cross-role hiring, job tracking, notifications and earnings all work. The organization workspace, online payment collection, mobile OTP and participant management are not finished, and we list them plainly on the features page rather than hiding them behind a "coming soon" badge.
          </p>
          <p className="mt-4 leading-relaxed text-muted-foreground">
            There are no paid plans yet. Everything is free while we are onboarding the first venues, vendors and workers, and we will give clear notice long before that changes.
          </p>
        </div>

        <div className="space-y-4">
          {principles.map((p) => (
            <div key={p.title} className="rounded-2xl border border-border bg-card p-6 shadow-soft">
              <div className="grid h-11 w-11 place-items-center rounded-xl bg-gradient-brand text-white shadow-glow">
                <p.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-4 font-display text-lg font-semibold">{p.title}</h3>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{p.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-gradient-brand-soft">
        <div className="mx-auto max-w-7xl px-5 md:px-8 py-20">
          <h2 className="font-display text-3xl font-semibold">How the product has grown</h2>
          <p className="mt-3 max-w-2xl text-muted-foreground">Each stage shipped before the next one started.</p>
          <ol className="mt-10 grid gap-4 md:grid-cols-4">
            {timeline.map((t, i) => (
              <li key={t.phase} className="rounded-2xl border border-border bg-card p-6 shadow-soft">
                <div className="text-xs font-semibold uppercase tracking-widest text-brand-violet">Stage {i + 1}</div>
                <div className="mt-1 font-display text-lg font-semibold">{t.phase}</div>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{t.detail}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 md:px-8 py-20">
        <div className="rounded-3xl bg-gradient-brand p-10 md:p-14 text-white shadow-elegant flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="max-w-xl">
            <h2 className="font-display text-2xl md:text-3xl font-semibold">Want to shape what we build next?</h2>
            <p className="mt-2 text-white/85">
              Early partners get direct influence on the roadmap. Tell us what breaks in your week and we will show you what we can do about it.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link to="/contact" className="rounded-full bg-white text-brand-navy px-6 py-3 text-sm font-semibold hover:opacity-90">Get in touch</Link>
            <Link to="/research" className="inline-flex items-center gap-2 rounded-full border border-white/40 px-6 py-3 text-sm font-semibold hover:bg-white/10">
              See the open roadmap <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>
    </SiteLayout>
  );
}
