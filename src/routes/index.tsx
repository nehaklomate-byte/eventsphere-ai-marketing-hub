import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { motion } from "framer-motion";
import {
  ArrowRight, Building2, Store, UserCheck, ShieldCheck, CheckCircle2, Users2,
  BellRing, Wallet, ClipboardCheck, Search, FileCheck2, CalendarRange, ChevronRight,
  CircleDashed, Hammer, Loader2,
} from "lucide-react";
import { useEffect, useState } from "react";
import { SiteLayout } from "@/components/SiteLayout";
import { supabase } from "@/integrations/supabase/client";
import { resolveDashboardPath } from "@/lib/auth-redirect";
import { isNativeAppShell } from "@/lib/platform";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "EventOrbit — Event Operations Platform for Venues, Vendors & Teams" },
      { name: "description", content: "EventOrbit connects organizations, venues, vendors and event workers on one verified platform — listings, enquiries, job assignment, task tracking and payouts in a single workspace." },
      { property: "og:title", content: "EventOrbit — Event Operations Platform" },
      { property: "og:description", content: "One verified workspace for venues, vendors, workers and the teams that hire them." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:url", content: "/" },
    ],
    links: [{ rel: "canonical", href: "/" }],
  }),
  component: Home,
});

const fadeUp = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-80px" },
  transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] as const },
};

function Home() {
  // When the app is opened from the installed home-screen icon (PWA
  // "standalone" mode) rather than a normal browser tab, a signed-in
  // person should land straight on their dashboard, not the marketing
  // homepage — that's what made the installed app feel like "just the
  // website" instead of a real app. Regular browser visits to "/" are
  // untouched, even when logged in.
  const navigate = useNavigate();
  const [checkingStandaloneAuth, setCheckingStandaloneAuth] = useState(false);

 useEffect(() => {
    if (!isNativeAppShell()) return;

    setCheckingStandaloneAuth(true);
    supabase.auth.getSession().then(async ({ data }) => {
      if (data.session) {
        const path = await resolveDashboardPath(data.session.user.id);
        navigate({ to: path, replace: true } as never);
        return;
      }
      navigate({ to: "/login", replace: true } as never);
    });
  }, [navigate]);

  if (checkingStandaloneAuth) {
    return (
      <div className="grid min-h-dvh place-items-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-brand-violet" />
      </div>
    );
  }

  return (
    <SiteLayout>
      <Hero />
      <WhoItsFor />
      <Platform />
      <HowItWorks />
      <Trust />
      <BuildStatus />
      <FAQ />
      <CTA />
    </SiteLayout>
  );
}

/* ---------------- HERO ---------------- */
function Hero() {
  return (
    <section className="relative overflow-hidden bg-gradient-hero">
      <div aria-hidden className="pointer-events-none absolute -top-24 left-1/2 h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-gradient-warm opacity-20 blur-3xl animate-float-slow" />
      <div className="mx-auto max-w-4xl px-5 pt-20 pb-20 text-center md:px-8 md:pt-28 md:pb-24">
        <motion.div {...fadeUp}>
          <span className="inline-flex items-center gap-2 rounded-full glass px-3 py-1.5 text-xs font-medium text-foreground/80">
            <CircleDashed className="h-3.5 w-3.5 text-brand-violet" />
            Early access — onboarding venues, vendors and workers now
          </span>
          <h1 className="mt-6 font-display text-4xl font-semibold leading-[1.06] tracking-tight text-foreground sm:text-5xl md:text-6xl">
            Run every event on <span className="text-gradient-brand">one operations platform.</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-muted-foreground md:text-lg">
            EventOrbit brings venues, vendors, event workers and the teams that hire them into a single verified workspace — listings and enquiries, job assignment, live task tracking, and payment records. No spreadsheets, no lost WhatsApp threads.
          </p>
          <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
            <Link to="/register" className="group inline-flex items-center gap-2 rounded-full btn-brand btn-brand-hover px-6 py-3 text-sm font-semibold">
              Create your account <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <Link to="/marketplace" className="inline-flex items-center gap-2 rounded-full border border-input bg-background/70 px-6 py-3 text-sm font-semibold backdrop-blur hover:bg-accent">
              Explore the marketplace
            </Link>
          </div>
          <div className="mt-9 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5"><ShieldCheck className="h-4 w-4 text-brand-blue" /> Role-based access on every record</span>
            <span className="inline-flex items-center gap-1.5"><FileCheck2 className="h-4 w-4 text-brand-violet" /> Manual verification before any listing goes live</span>
            <span className="inline-flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-brand-magenta" /> Free while we are in early access</span>
          </div>
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
    <section className="mx-auto max-w-7xl px-5 md:px-8 py-20">
      <motion.div {...fadeUp} className="max-w-2xl">
        <SectionEyebrow>Who it's for</SectionEyebrow>
        <h2 className="mt-3 font-display text-3xl md:text-4xl font-semibold">Four sides of an event, one shared record.</h2>
        <p className="mt-3 text-muted-foreground">
          Everyone works in their own dashboard, but a booking, a job and a payout exist once — not four times in four notebooks.
        </p>
      </motion.div>
      <div className="mt-10 grid gap-4 sm:grid-cols-2">
        {audiences.map((a, i) => (
          <motion.div key={a.title} {...fadeUp} transition={{ ...fadeUp.transition, delay: (i % 2) * 0.06 }}
            className="rounded-3xl border border-border bg-card p-6 shadow-soft hover:shadow-elegant transition-shadow">
            <div className="grid h-11 w-11 place-items-center rounded-xl bg-gradient-brand text-white shadow-glow">
              <a.icon className="h-5 w-5" />
            </div>
            <h3 className="mt-4 font-display text-xl font-semibold">{a.title}</h3>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              <span className="font-semibold text-foreground">Today: </span>{a.problem}
            </p>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              <span className="font-semibold text-foreground">On EventOrbit: </span>{a.solution}
            </p>
            <Link to={a.href} className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-brand-violet hover:opacity-80">
              See the full workflow <ChevronRight className="h-4 w-4" />
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
    <section id="platform" className="bg-gradient-brand-soft">
      <div className="mx-auto max-w-7xl px-5 md:px-8 py-20">
        <motion.div {...fadeUp} className="max-w-2xl">
          <SectionEyebrow>Platform</SectionEyebrow>
          <h2 className="mt-3 font-display text-3xl md:text-4xl font-semibold">What is live today.</h2>
          <p className="mt-3 text-muted-foreground">
            Everything listed here is built and usable right now. What we are still building is listed further down — we would rather under-promise.
          </p>
        </motion.div>
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {modules.map((f, i) => (
            <motion.div key={f.title} {...fadeUp} transition={{ ...fadeUp.transition, delay: (i % 4) * 0.05 }}
              className="group rounded-2xl border border-border bg-card p-5 shadow-soft transition-all hover:-translate-y-0.5 hover:shadow-elegant">
              <div className="grid h-11 w-11 place-items-center rounded-xl bg-gradient-brand text-white shadow-glow">
                <f.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-4 font-display text-lg font-semibold">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{f.desc}</p>
            </motion.div>
          ))}
        </div>
        <div className="mt-8">
          <Link to="/features" className="inline-flex items-center gap-2 rounded-full border border-input bg-card px-5 py-2.5 text-sm font-semibold hover:bg-accent">
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
    <section id="how" className="mx-auto max-w-7xl px-5 md:px-8 py-20">
      <motion.div {...fadeUp} className="max-w-2xl">
        <SectionEyebrow>How it works</SectionEyebrow>
        <h2 className="mt-3 font-display text-3xl md:text-4xl font-semibold">Four steps from signup to your first job.</h2>
      </motion.div>
      <div className="relative mt-14">
        <div aria-hidden className="absolute left-0 right-0 top-6 hidden h-px bg-gradient-brand lg:block" />
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((s, i) => (
            <motion.div key={s.title} {...fadeUp} transition={{ ...fadeUp.transition, delay: i * 0.08 }}
              className="relative rounded-2xl border border-border bg-card p-5 shadow-soft">
              <div className="relative -mt-10 grid h-12 w-12 place-items-center rounded-2xl bg-gradient-brand text-white shadow-glow">
                <s.icon className="h-5 w-5" />
              </div>
              <div className="mt-4 text-xs font-semibold uppercase tracking-widest text-brand-violet">Step {i + 1}</div>
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
      <div className="mx-auto max-w-7xl px-5 md:px-8 py-20">
        <motion.div {...fadeUp} className="max-w-2xl">
          <SectionEyebrow>Trust</SectionEyebrow>
          <h2 className="mt-3 font-display text-3xl md:text-4xl font-semibold">Why people can rely on what they see here.</h2>
        </motion.div>
        <div className="mt-10 grid gap-4 sm:grid-cols-2">
          {points.map((p, i) => (
            <motion.div key={p.title} {...fadeUp} transition={{ ...fadeUp.transition, delay: (i % 2) * 0.06 }}
              className="rounded-2xl glass p-6 shadow-soft">
              <div className="font-display text-lg font-semibold">{p.title}</div>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{p.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------------- BUILD STATUS ---------------- */
function BuildStatus() {
  const building = [
    { title: "Organization workspace", desc: "Members, departments, roles and internal event forms exist. Registration forms for participants and end-to-end event execution are still being finished." },
    { title: "Online payments", desc: "Payment and payout records are in place. Live card and UPI collection is behind final gateway activation." },
    { title: "Mobile OTP verification", desc: "Email and password sign-in works today. Phone verification arrives with our SMS provider." },
    { title: "Attendance & participants", desc: "Guest lists, check-in and headcount reporting are planned once the organization workspace is complete." },
  ];
  return (
    <section className="mx-auto max-w-7xl px-5 md:px-8 py-20">
      <motion.div {...fadeUp} className="max-w-2xl">
        <SectionEyebrow>In progress</SectionEyebrow>
        <h2 className="mt-3 font-display text-3xl md:text-4xl font-semibold">What we are still building.</h2>
        <p className="mt-3 text-muted-foreground">
          We publish this openly so nobody signs up expecting something that is not ready yet.
        </p>
      </motion.div>
      <div className="mt-10 grid gap-4 sm:grid-cols-2">
        {building.map((b) => (
          <motion.div key={b.title} {...fadeUp} className="rounded-2xl border border-dashed border-border bg-card/60 p-6">
            <div className="flex items-center gap-2">
              <Hammer className="h-4 w-4 text-brand-orange" />
              <div className="font-display text-lg font-semibold">{b.title}</div>
            </div>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{b.desc}</p>
          </motion.div>
        ))}
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
    <section className="bg-gradient-brand-soft">
      <div className="mx-auto max-w-7xl px-5 md:px-8 py-20">
        <motion.div {...fadeUp} className="max-w-2xl">
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
    <section className="mx-auto max-w-7xl px-5 md:px-8 py-20">
      <div className="relative overflow-hidden rounded-3xl bg-gradient-brand p-10 md:p-14 text-white shadow-elegant">
        <div aria-hidden className="absolute -top-16 -right-16 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
        <div className="relative flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="max-w-xl">
            <h2 className="font-display text-3xl md:text-4xl font-semibold leading-tight">Get listed before the season starts.</h2>
            <p className="mt-3 text-white/85">
              Create an account in a minute, complete your profile from your dashboard, and start receiving enquiries and jobs once you are verified.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link to="/register" className="rounded-full bg-white text-brand-navy px-6 py-3 text-sm font-semibold hover:opacity-90">Create your account</Link>
            <Link to="/contact" className="rounded-full border border-white/40 px-6 py-3 text-sm font-semibold hover:bg-white/10">Ask us a question</Link>
          </div>
        </div>
      </div>
    </section>
  );
}

function SectionEyebrow({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full glass px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-brand-violet">
      {children}
    </span>
  );
}
