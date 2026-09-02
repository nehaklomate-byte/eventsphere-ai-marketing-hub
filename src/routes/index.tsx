import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { motion } from "framer-motion";
import {
  ArrowRight, Building2, Store, UserCheck, ShieldCheck, Users2,
  BellRing, Wallet, ClipboardCheck, Search, FileCheck2, CalendarRange, ChevronRight,
  MapPin, BriefcaseBusiness, Sparkles, Check,
} from "lucide-react";
import { useEffect, useState } from "react";
import { SiteLayout } from "@/components/SiteLayout";
import { supabase } from "@/integrations/supabase/client";
import { resolveDashboardPath } from "@/lib/auth-redirect";
import { isNativeAppShell } from "@/lib/platform";
import heroImage from "@/assets/event-operations-hero.jpg";


export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "EventOrbit — Event operations, without the scramble" },
      { name: "description", content: "EventOrbit brings venue discovery, enquiries, job assignment and work tracking into one clear workspace." },
      { property: "og:title", content: "EventOrbit — Event operations, without the scramble" },
      { property: "og:description", content: "Find the right venue, coordinate the right people and keep every event detail in one place." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:url", content: "/" },
    ],
    links: [{ rel: "canonical", href: "/" }],
  }),
  component: Home,
});

const reveal = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-80px" },
  transition: { duration: 0.65, ease: [0.22, 1, 0.36, 1] as const },
};

function Home() {
  const navigate = useNavigate();
  const isApp = isNativeAppShell();

  useEffect(() => {
    if (!isApp) return;

    const redirect = async () => {
      const { data } = await supabase.auth.getSession();

      if (data.session) {
        const path = await resolveDashboardPath(data.session.user.id);
        navigate({ to: path, replace: true } as never);
      } else {
        navigate({ to: "/login", replace: true } as never);
      }
    };

    redirect();
  }, [isApp, navigate]);

  // Android app मध्ये homepage अजिबात render करू नका
  if (isApp) {
    return <div className="min-h-dvh bg-background" />;
  }

  // Browser मध्ये homepage पूर्वीसारखीच राहील
  return (
    <SiteLayout>
      <Hero />
      <MarketplaceIntro />
      <Platform />
      <WhoItsFor />
      <HowItWorks />
      <Trust />
      <FAQ />
      <CTA />
    </SiteLayout>
  );
}

/* ---------------- HERO ---------------- */
function Hero() {
  return (
    <section className="relative isolate min-h-[680px] overflow-hidden bg-brand-navy text-primary-foreground">
      <img src={heroImage} alt="Event manager preparing a contemporary venue" width={1408} height={912} className="absolute inset-0 -z-20 h-full w-full object-cover object-center" />
      <div aria-hidden className="absolute inset-0 -z-10 bg-brand-navy/80" />
      <div className="mx-auto flex min-h-[680px] max-w-7xl flex-col justify-between px-5 py-16 md:px-8 md:py-24">
        <motion.div {...reveal} className="max-w-2xl">
          <span className="eyebrow-dark"><Sparkles className="h-3.5 w-3.5 text-brand-orange" /> Built for the work behind every event</span>
          <h1 className="mt-7 max-w-3xl font-display text-5xl font-semibold leading-[1.02] tracking-tight sm:text-6xl md:text-7xl">
            Make the event feel effortless.
          </h1>
          <p className="mt-6 max-w-xl text-base leading-relaxed text-primary-foreground/75 md:text-lg">
            Find trusted venues and event professionals, keep enquiries clear, and move every assignment from accepted to complete in one workspace.
          </p>
          <div className="mt-9 flex flex-wrap gap-3">
            <Link to="/marketplace" className="group inline-flex items-center gap-2 rounded-full bg-primary-foreground px-6 py-3 text-sm font-semibold text-brand-navy shadow-elegant transition-transform hover:-translate-y-0.5">
              Explore the marketplace <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <Link to="/register" className="inline-flex items-center gap-2 rounded-full border border-primary-foreground/35 px-6 py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-foreground/10">
              Join EventOrbit
            </Link>
          </div>
        </motion.div>
        <motion.div {...reveal} transition={{ ...reveal.transition, delay: 0.14 }} className="mt-16 grid max-w-4xl gap-3 sm:grid-cols-3">
          {[
            { icon: Search, label: "Discover", text: "Verified venues and providers" },
            { icon: BriefcaseBusiness, label: "Coordinate", text: "Jobs, people and timelines" },
            { icon: Check, label: "Deliver", text: "A clear record from start to finish" },
          ].map((item) => (
            <div key={item.label} className="hero-mini-card">
              <item.icon className="h-4 w-4 text-brand-orange" />
              <div><div className="text-xs font-semibold uppercase tracking-[0.16em] text-primary-foreground/55">{item.label}</div><div className="mt-1 text-sm text-primary-foreground/90">{item.text}</div></div>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

function MarketplaceIntro() {
  return (
    <section className="border-b border-border bg-secondary/40">
      <div className="mx-auto grid max-w-7xl gap-10 px-5 py-16 md:grid-cols-[1fr_1.2fr] md:items-center md:px-8 md:py-20">
        <motion.div {...reveal}>
          <SectionEyebrow>Start with the marketplace</SectionEyebrow>
          <h2 className="mt-4 max-w-xl font-display text-3xl font-semibold leading-tight md:text-4xl">The fastest way to get moving.</h2>
          <p className="mt-4 max-w-lg text-muted-foreground">Browse by city and category, open a real profile, then send an enquiry when the fit is right.</p>
          <Link to="/marketplace" className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-brand-blue hover:text-brand-navy">Browse venues and professionals <ArrowRight className="h-4 w-4" /></Link>
        </motion.div>
        <motion.div {...reveal} transition={{ ...reveal.transition, delay: 0.1 }} className="grid gap-3 sm:grid-cols-3">
          {[
            { icon: Building2, title: "Venues", text: "Gallery, facilities and availability" },
            { icon: Store, title: "Vendors", text: "Services, work history and areas" },
            { icon: UserCheck, title: "Workers", text: "Skills, rates and verified profiles" },
          ].map((item) => (
            <Link to="/marketplace" key={item.title} className="group rounded-2xl border border-border bg-card p-4 shadow-soft transition-all hover:-translate-y-1 hover:border-brand-blue/35 hover:shadow-elegant">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-brand-blue/10 text-brand-blue transition-colors group-hover:bg-brand-blue group-hover:text-primary-foreground"><item.icon className="h-5 w-5" /></div>
              <h3 className="mt-4 font-display text-base font-semibold">{item.title}</h3>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{item.text}</p>
            </Link>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

/* ---------------- WHO IT'S FOR ---------------- */
const audiences = [
  {
    icon: Building2,
    title: "Venue owners",
    problem: "Enquiries arrive across calls, WhatsApp and walk-ins, so dates get double-promised.",
    solution: "A public venue profile with gallery and capacity details, one enquiry inbox, and the ability to hire vendors and workers for confirmed dates.",
    href: "/solutions",
  },
  {
    icon: Store,
    title: "Vendors",
    problem: "Work comes from word of mouth, and job details change over phone with nothing written down.",
    solution: "A verified business profile, assigned jobs with venue, date and payout on record, and your own worker crew hired from inside the platform.",
    href: "/solutions",
  },
  {
    icon: UserCheck,
    title: "Event workers & agencies",
    problem: "No proof of work history, unclear shift details, and payments chased after the event.",
    solution: "A profile you own, jobs assigned only to you, accept/start/complete tracking with check-in, and an earnings record per job.",
    href: "/solutions",
  },
  {
    icon: Users2,
    title: "Customers & organizations",
    problem: "Booking an event means comparing options with no verified information and no single record.",
    solution: "Search verified venues, vendors and workers, send enquiries, and keep your bookings, payments and reviews in one dashboard.",
    href: "/solutions",
  },
];

function WhoItsFor() {
  return (
    <section className="mx-auto max-w-7xl px-5 py-20 md:px-8 md:py-28">
      <motion.div {...reveal} className="max-w-2xl">
        <SectionEyebrow>Who it's for</SectionEyebrow>
        <h2 className="mt-4 font-display text-3xl font-semibold md:text-4xl">Everyone sees the part of the event they own.</h2>
        <p className="mt-3 max-w-xl text-muted-foreground">Different roles. One shared source of truth.</p>
      </motion.div>
      <div className="stagger-children mt-10 grid gap-4 sm:grid-cols-2">
        {audiences.map((a, i) => (
          <motion.div key={a.title} {...reveal} transition={{ ...reveal.transition, delay: (i % 2) * 0.06 }} className="card-interactive rounded-2xl border border-border bg-card p-6 shadow-soft">
            <div className="grid h-11 w-11 place-items-center rounded-xl bg-brand-blue text-primary-foreground shadow-soft">
              <a.icon className="h-5 w-5" />
            </div>
            <h3 className="mt-4 font-display text-xl font-semibold">{a.title}</h3>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{a.solution}</p>
            <Link to={a.href} className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-brand-blue hover:text-brand-navy">
              See your workflow <ChevronRight className="h-4 w-4" />
            </Link>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

/* ---------------- PLATFORM (only shipped modules) ---------------- */
const modules = [
  { icon: Search, title: "Verified marketplace", desc: "Venues, vendor businesses and worker profiles, searchable by city and category. Only manually approved profiles appear." },
  { icon: Building2, title: "Venue profiles & enquiries", desc: "Gallery, capacity, facilities, pricing and location on a public page, with enquiries landing in the owner's inbox." },
  { icon: ClipboardCheck, title: "Job assignment & tracking", desc: "Assign a job to a vendor or worker with venue, date, time and priority. They accept, start, pause and complete it — every state is timestamped." },
  { icon: Users2, title: "Cross-role hiring", desc: "Venues hire vendors and workers. Vendors hire workers. The same job record is visible to both sides." },
  { icon: BellRing, title: "In-app notifications", desc: "Assignments, status changes and approvals reach the right account in real time. Personal only — no broadcasts." },
  { icon: Wallet, title: "Bookings, payments & earnings", desc: "Booking status, invoices and payment records for customers; per-job earnings and payout details for vendors and workers." },
  { icon: FileCheck2, title: "Verification workflow", desc: "Register → admin approves the account → complete the full profile → submit documents for verification → go live on the marketplace." },
  { icon: ShieldCheck, title: "Role-based security", desc: "Separate dashboards for every role and database-level rules so no account can read another's jobs, documents or payouts." },
];

function Platform() {
  return (
    <section id="platform" className="bg-secondary/45">
      <div className="mx-auto max-w-7xl px-5 py-20 md:px-8 md:py-28">
        <motion.div {...reveal} className="max-w-2xl">
          <SectionEyebrow>Platform</SectionEyebrow>
          <h2 className="mt-4 font-display text-3xl font-semibold md:text-4xl">The essentials, without the noise.</h2>
          <p className="mt-3 max-w-xl text-muted-foreground">A focused toolkit for finding, assigning and finishing event work.</p>
        </motion.div>
        <div className="stagger-children mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {modules.map((f, i) => (
            <motion.div key={f.title} {...reveal} transition={{ ...reveal.transition, delay: (i % 3) * 0.05 }} className="card-interactive rounded-2xl border border-border bg-card p-5 shadow-soft">
              <div className="grid h-11 w-11 place-items-center rounded-xl bg-brand-blue/10 text-brand-blue">
                <f.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-4 font-display text-lg font-semibold">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{f.desc}</p>
            </motion.div>
          ))}
        </div>
        <div className="mt-8">
          <Link to="/features" className="inline-flex items-center gap-2 rounded-full border border-input bg-card px-5 py-2.5 text-sm font-semibold transition-colors hover:bg-accent">
            See every module in detail <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}

/* ---------------- HOW IT WORKS ---------------- */
function HowItWorks() {
  const steps = [
    { icon: UserCheck, title: "Create an account", desc: "Pick your role and share only the basics — name, contact, city and category. It takes about a minute." },
    { icon: ShieldCheck, title: "Get account approval", desc: "Our team reviews the account so the platform stays free of spam and duplicate listings." },
    { icon: FileCheck2, title: "Complete your profile", desc: "Add photos, capacity or skills, service areas, pricing and documents from your dashboard, at your pace." },
    { icon: CalendarRange, title: "Go live and work", desc: "Once verified, you appear in the marketplace, receive enquiries and jobs, and track them to completion." },
  ];
  return (
    <section id="how" className="mx-auto max-w-7xl px-5 py-20 md:px-8 md:py-28">
      <motion.div {...reveal} className="max-w-2xl">
        <SectionEyebrow>How it works</SectionEyebrow>
        <h2 className="mt-4 font-display text-3xl font-semibold md:text-4xl">From first search to finished work.</h2>
      </motion.div>
      <div className="relative mt-14">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((s, i) => (
            <motion.div key={s.title} {...reveal} transition={{ ...reveal.transition, delay: i * 0.08 }} className="relative border-l-2 border-brand-orange/40 pl-5">
              <div className="grid h-11 w-11 place-items-center rounded-xl bg-brand-navy text-primary-foreground shadow-soft">
                <s.icon className="h-5 w-5" />
              </div>
              <div className="mt-4 text-xs font-semibold uppercase tracking-widest text-brand-orange">Step {i + 1}</div>
              <div className="mt-1 font-display text-lg font-semibold">{s.title}</div>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{s.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------------- TRUST ---------------- */
function Trust() {
  const points = [
    { title: "Nothing goes live unreviewed", desc: "Accounts are approved by a person, and profiles are verified against submitted ID and business documents before they reach the marketplace." },
    { title: "Your data stays yours", desc: "Every table enforces owner-level access rules in the database itself, so one account can never query another's jobs, documents or earnings." },
    { title: "Records instead of promises", desc: "Assignments, status changes, approvals and payments are stored with timestamps, so both sides can point at the same history." },
    { title: "Deletion is reversible", desc: "Listings are soft-deleted and administrative actions are written to an audit log, so a mistake never means permanent data loss." },
  ];
  return (
    <section className="bg-background">
      <div className="mx-auto max-w-7xl px-5 py-20 md:px-8 md:py-28">
        <motion.div {...reveal} className="max-w-2xl">
          <SectionEyebrow>Trust</SectionEyebrow>
          <h2 className="mt-4 font-display text-3xl font-semibold md:text-4xl">Clear records build better events.</h2>
        </motion.div>
        <div className="mt-10 grid gap-4 sm:grid-cols-2">
          {points.map((p, i) => (
            <motion.div key={p.title} {...reveal} transition={{ ...reveal.transition, delay: (i % 2) * 0.06 }} className="rounded-2xl border border-border bg-secondary/35 p-6">
              <div className="font-display text-lg font-semibold">{p.title}</div>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{p.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------------- FAQ ---------------- */
function FAQ() {
  const faqs = [
    { q: "Does it cost anything right now?", a: "No. Creating an account, listing a venue, vendor business or worker profile, and receiving jobs are all free during early access. When we introduce paid plans, existing accounts will be told well before anything changes." },
    { q: "How long does verification take?", a: "Account approval and document verification are done manually by our team. In practice this is usually within a working day or two — you can use your dashboard and complete your profile while you wait." },
    { q: "Who can see my documents?", a: "Only you and the reviewing administrator. Documents are stored in private buckets and access rules are enforced by the database, not just the interface." },
    { q: "Can a vendor hire workers, and a venue hire vendors?", a: "Yes. A venue can post or assign work to both vendors and workers, and a vendor can hire workers for its own jobs. Both sides see the same job record and its status history." },
    { q: "What happens if a job is rejected or cancelled?", a: "The job keeps its history with the rejection reason and timestamp, the other side is notified immediately, and the slot can be reassigned without recreating the record." },
    { q: "Is my listing removed if I stop taking work?", a: "No. You can turn marketplace visibility off or block specific dates from your availability page and stay listed for the periods you actually want work." },
  ];
  return (
    <section className="bg-secondary/45">
      <div className="mx-auto max-w-7xl px-5 py-20 md:px-8 md:py-28">
        <motion.div {...reveal} className="max-w-2xl">
          <SectionEyebrow>FAQ</SectionEyebrow>
          <h2 className="mt-3 font-display text-3xl md:text-4xl font-semibold">Questions we get asked most.</h2>
        </motion.div>
        <div className="mt-10 grid gap-4 md:grid-cols-2">
          {faqs.map((f) => (
            <details key={f.q} className="group rounded-2xl border border-border bg-card p-5 shadow-soft open:shadow-elegant">
              <summary className="flex cursor-pointer items-start justify-between gap-4 list-none">
                <span className="font-display text-base font-semibold">{f.q}</span>
                <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground transition-transform group-open:rotate-90" />
              </summary>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{f.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------------- CTA ---------------- */
function CTA() {
  return (
    <section className="mx-auto max-w-7xl px-5 py-20 md:px-8 md:py-28">
      <div className="relative overflow-hidden rounded-3xl bg-brand-navy p-10 text-primary-foreground shadow-elegant md:p-14">
        <div className="relative flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="max-w-xl">
            <h2 className="font-display text-3xl font-semibold leading-tight md:text-4xl">Ready to make the next event simpler?</h2>
            <p className="mt-3 text-primary-foreground/70">Create your account, complete only what matters, and start with the marketplace.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link to="/register" className="rounded-full bg-primary-foreground px-6 py-3 text-sm font-semibold text-brand-navy hover:opacity-90">Create your account</Link>
            <Link to="/contact" className="rounded-full border border-primary-foreground/35 px-6 py-3 text-sm font-semibold hover:bg-primary-foreground/10">Ask us a question</Link>
          </div>
        </div>
      </div>
    </section>
  );
}

function SectionEyebrow({ children }: { children: React.ReactNode }) {
  return (
    <span className="eyebrow">
      {children}
    </span>
  );
}
