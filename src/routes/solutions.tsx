import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteLayout } from "@/components/SiteLayout";
import { PageHeader } from "@/components/PageHeader";
import { Building2, Store, HardHat, Users2, Briefcase, ArrowRight, AlertTriangle, CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/solutions")({
  head: () => ({
    meta: [
      { title: "Solutions — Real Problems We Solve, By Role" },
      { name: "description", content: "What actually breaks for venue owners, vendors, event workers, customers and organizations — and exactly how EventOrbit fixes each one today." },
      { property: "og:title", content: "Solutions — Real Problems We Solve, By Role" },
      { property: "og:description", content: "Problem, cost and fix — written out for every role on the platform." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:url", content: "/solutions" },
    ],
    links: [{ rel: "canonical", href: "/solutions" }],
  }),
  component: Solutions,
});

type Case = { problem: string; cost: string; fix: string; status?: "live" | "building" };

const roles: { icon: typeof Building2; title: string; intro: string; cases: Case[] }[] = [
  {
    icon: Building2,
    title: "Venue owners",
    intro: "Halls, lawns, banquet spaces and resorts that take date-based bookings.",
    cases: [
      {
        problem: "Enquiries arrive on three phone numbers, a WhatsApp account and at the gate.",
        cost: "Dates get promised twice, and follow-ups are forgotten when the season gets busy.",
        fix: "Every enquiry from your public venue page lands in one inbox with event date, guest count and contact details, and stays there with a status until you close it.",
      },
      {
        problem: "Customers ask for photos, capacity and rates over and over on call.",
        cost: "Hours a week repeating the same answers, and rate confusion when staff quote differently.",
        fix: "A complete public profile carries your gallery, stage and dining photos, indoor and outdoor capacity, parking, rooms, facilities, working hours, cancellation policy and rates.",
      },
      {
        problem: "Decor, catering and on-ground staff are arranged through personal contacts each time.",
        cost: "No record of who was booked, at what rate, for which date.",
        fix: "Hire vendors and workers from inside your dashboard. The job carries the venue, date, timing, priority and payout, and both sides see the same status history.",
      },
    ],
  },
  {
    icon: Store,
    title: "Vendors",
    intro: "Decorators, caterers, photographers, sound and light, DJs and event service businesses.",
    cases: [
      {
        problem: "New work depends entirely on who remembers your number.",
        cost: "Idle dates in a season where demand exists a district away.",
        fix: "A verified business profile in the marketplace, searchable by city and category, with your service areas and portfolio attached.",
      },
      {
        problem: "Job details change over phone and nothing is written down.",
        cost: "Wrong arrival time, missing equipment, arguments about scope after the event.",
        fix: "Assigned jobs carry venue, address, date, start and end time, priority and description. Accepting or rejecting is recorded, and rejection needs a reason.",
      },
      {
        problem: "Your own crew is arranged separately, usually the night before.",
        cost: "Understaffed events and cash payments with no record.",
        fix: "Hire workers directly from your vendor dashboard, track their status through the job, and keep the payout amount on the same record.",
      },
      {
        problem: "Payment follow-up happens after the event, from memory.",
        cost: "Weeks of chasing and disputed amounts.",
        fix: "Every job stores its payment amount and status, so the earnings page is the single answer to what is pending.",
      },
    ],
  },
  {
    icon: HardHat,
    title: "Event workers & agencies",
    intro: "Stewards, helpers, technicians, cleaners, cooks and staffing agencies.",
    cases: [
      {
        problem: "Years of experience exist only in the memory of a few contractors.",
        cost: "You restart from zero with every new client.",
        fix: "A profile you own with skills, languages, experience, work photos and certificates, plus a verified badge once your ID is checked.",
      },
      {
        problem: "Shift details are relayed third-hand and change on the day.",
        cost: "Travelling to the wrong venue or waiting hours for instructions.",
        fix: "Jobs are assigned to you only, with the full brief attached, and you accept, start, pause and complete them yourself.",
      },
      {
        problem: "Attendance is disputed after the event.",
        cost: "Deductions you cannot argue against.",
        fix: "Check-in and check-out capture time, photo and location on the job record, and completion notes and photos stay attached to it.",
      },
      {
        problem: "You get calls for dates you are already booked or cannot travel to.",
        cost: "Wasted calls on both sides.",
        fix: "Set working hours, blocked dates, preferred cities and travel radius, and turn marketplace visibility off when you are not taking work.",
      },
    ],
  },
  {
    icon: Users2,
    title: "Customers",
    intro: "Families and individuals planning a wedding, function or private event.",
    cases: [
      {
        problem: "Choosing a venue means visiting a dozen places on unverified information.",
        cost: "Weekends spent travelling, and surprises on the event day.",
        fix: "Browse only manually verified venues, vendors and workers, with real capacity, facilities and photos, and send an enquiry without a phone call.",
      },
      {
        problem: "Bookings, advances and receipts live across screenshots and paper slips.",
        cost: "Nobody can say what is paid and what is pending a week before the event.",
        fix: "Your dashboard keeps every booking, its status, payment history and invoices in one place, alongside your event details and guest count.",
      },
      {
        problem: "Feedback after the event goes nowhere.",
        cost: "The next family repeats your mistake.",
        fix: "Rate and review the venue, vendor or worker you actually booked, so ratings on the marketplace come from real bookings.",
      },
    ],
  },
  {
    icon: Briefcase,
    title: "Organizations",
    intro: "Companies, colleges and institutions that run events with an internal team.",
    cases: [
      {
        problem: "Event responsibilities are split over email threads with no defined ownership.",
        cost: "Two people do the same task and a third one is missed.",
        fix: "Invite members, group them into departments, and define custom roles with specific permissions inside one organization workspace.",
      },
      {
        problem: "Vendors and staff for an event are arranged by whoever is free.",
        cost: "No consistency in rates or quality across events.",
        fix: "Hire verified vendors and workers from the same account, with each assignment recorded against the organization.",
      },
      {
        problem: "Internal event registrations are collected on generic form tools.",
        cost: "Data lands outside the system that runs the event.",
        fix: "Build a registration form per event with custom fields and team-size rules, attached to the event itself.",
        status: "building",
      },
      {
        problem: "Participant lists, check-in and attendance reporting.",
        cost: "Still handled manually on the day.",
        fix: "This is next on our roadmap, after the organization workspace is complete. We are not claiming it works yet.",
        status: "building",
      },
    ],
  },
];

function Solutions() {
  return (
    <SiteLayout>
      <PageHeader
        eyebrow="Solutions"
        title="What breaks in event operations — and what we do about it."
        description="We spent our build time on the failures people actually described to us. Here they are, role by role, with the honest status of each fix."
      />
      <section className="mx-auto max-w-7xl px-5 md:px-8 py-20 space-y-16">
        {roles.map((r) => (
          <div key={r.title}>
            <div className="flex items-start gap-4">
              <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-gradient-brand text-white shadow-glow">
                <r.icon className="h-5 w-5" />
              </div>
              <div>
                <h2 className="font-display text-2xl md:text-3xl font-semibold">{r.title}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{r.intro}</p>
              </div>
            </div>
            <div className="mt-8 grid gap-4 md:grid-cols-2">
              {r.cases.map((c) => (
                <article key={c.problem} className="rounded-3xl border border-border bg-card p-6 shadow-soft">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-brand-orange" />
                    <h3 className="font-display text-base font-semibold leading-snug">{c.problem}</h3>
                  </div>
                  <p className="mt-2 pl-6 text-sm text-muted-foreground">{c.cost}</p>
                  <div className="mt-4 flex items-start gap-2 border-t border-border pt-4">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-brand-violet" />
                    <p className="text-sm leading-relaxed text-foreground">{c.fix}</p>
                  </div>
                  {c.status === "building" && (
                    <span className="ml-6 mt-3 inline-block rounded-full bg-accent px-2.5 py-1 text-[11px] font-semibold text-muted-foreground">
                      In progress
                    </span>
                  )}
                </article>
              ))}
            </div>
          </div>
        ))}
      </section>
      <section className="mx-auto max-w-7xl px-5 md:px-8 pb-24">
        <div className="rounded-3xl bg-gradient-brand p-10 md:p-14 text-white shadow-elegant flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="max-w-xl">
            <h2 className="font-display text-2xl md:text-3xl font-semibold">Recognise your own problem here?</h2>
            <p className="mt-2 text-white/85">Create an account and see how much of it disappears in the first week.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link to="/register" className="rounded-full bg-white text-brand-navy px-6 py-3 text-sm font-semibold hover:opacity-90">Get started</Link>
            <Link to="/contact" className="inline-flex items-center gap-2 rounded-full border border-white/40 px-6 py-3 text-sm font-semibold hover:bg-white/10">
              Tell us what we missed <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>
    </SiteLayout>
  );
}
