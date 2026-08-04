import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteLayout } from "@/components/SiteLayout";
import { PageHeader } from "@/components/PageHeader";
import {
  Search, Building2, Store, HardHat, ClipboardCheck, BellRing, Wallet, FileCheck2,
  ShieldCheck, CalendarRange, Hammer, ArrowRight,
} from "lucide-react";

export const Route = createFileRoute("/features")({
  head: () => ({
    meta: [
      { title: "Features — What EventOrbit Can Do Today" },
      { name: "description", content: "Verified marketplace, venue and vendor profiles, job assignment with live status tracking, cross-role hiring, notifications, earnings and role-based security — plus an honest list of what is still being built." },
      { property: "og:title", content: "Features — What EventOrbit Can Do Today" },
      { property: "og:description", content: "Every module that is live, described plainly — and what is still in progress." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:url", content: "/features" },
    ],
    links: [{ rel: "canonical", href: "/features" }],
  }),
  component: Features,
});

const live = [
  {
    icon: Search,
    title: "Verified marketplace",
    desc: "One searchable directory of venues, vendor businesses and worker profiles, filterable by city and category.",
    details: [
      "Only profiles approved by our team are visible publicly",
      "Separate tabs for venues, vendors and workers",
      "Ratings and review counts shown once real reviews exist",
    ],
  },
  {
    icon: Building2,
    title: "Venue profiles & enquiry inbox",
    desc: "A complete public page per venue, with enquiries routed straight to the owner's dashboard.",
    details: [
      "Gallery, stage, dining, parking, rooms and washroom photo sets",
      "Indoor, outdoor and dining capacity, plus parking and room counts",
      "Facilities, working hours, cancellation policy and map location",
      "Enquiry form with event date, guest count and contact details",
    ],
  },
  {
    icon: Store,
    title: "Vendor workspace",
    desc: "A business profile plus the operational tools to actually run the work that comes from it.",
    details: [
      "Category, experience, service areas, portfolio and catalogue",
      "Availability with working hours and blocked dates",
      "Job board of open postings, plus applications you have sent",
      "Earnings, documents vault and support pages",
    ],
  },
  {
    icon: HardHat,
    title: "Worker & agency workspace",
    desc: "Individual professionals and staffing agencies both get a profile they own and jobs assigned only to them.",
    details: [
      "Guided profile completion with a live percentage",
      "Skills, languages, travel radius and charge structure",
      "Photo, video and certificate portfolio",
      "ID proof, selfie and emergency contact for verification",
    ],
  },
  {
    icon: ClipboardCheck,
    title: "Job assignment & status tracking",
    desc: "Work is a record, not a phone call. Every state change is stored with who did it and when.",
    details: [
      "Assign with event name, venue, address, date, time and priority",
      "Accept, reject with reason, start, pause, resume and complete",
      "Worker check-in and check-out with photo and location",
      "Completion notes and photos attached to the job",
    ],
  },
  {
    icon: CalendarRange,
    title: "Calendar & availability",
    desc: "A month view of committed work, colour-coded by status, and control over the dates you accept.",
    details: [
      "Today, upcoming, completed and urgent jobs distinguished",
      "Blocked dates and working hours per profile",
      "Marketplace visibility toggle when you are not taking work",
    ],
  },
  {
    icon: BellRing,
    title: "Personal notifications",
    desc: "Assignments, status changes, approvals and rejections arrive in the account they concern — never as broadcasts.",
    details: [
      "Unread badge in the sidebar and notification page per role",
      "Generated automatically by the database when work changes",
      "Realtime updates for customers without refreshing",
    ],
  },
  {
    icon: Wallet,
    title: "Bookings, payments & earnings",
    desc: "The money side of an event kept in the same place as the work itself.",
    details: [
      "Customer bookings for halls, vendors and workers with status",
      "Payment history, invoice numbers and refund status",
      "Per-job earnings and payment status for vendors and workers",
      "Payout UPI details stored on the profile",
    ],
  },
  {
    icon: FileCheck2,
    title: "Verification workflow",
    desc: "A defined path from signup to a live listing, with a clear state at every point.",
    details: [
      "Account approval by an administrator after registration",
      "Full profile completion tracked as a percentage",
      "Document submission, review, approval or rejection with reason",
      "Verified badge shown on public profiles only after approval",
    ],
  },
  {
    icon: ShieldCheck,
    title: "Role-based access & audit trail",
    desc: "Security enforced in the database, not just hidden in the interface.",
    details: [
      "Separate dashboards for customer, venue, vendor, worker, organization and admin",
      "Row-level rules so accounts can only read their own records",
      "Private document storage per account",
      "Soft delete on listings and an audit log of administrative actions",
    ],
  },
];

const inProgress = [
  { title: "Organization workspace", desc: "Members, departments, custom roles, internal events and event registration forms exist, but participant handling and end-to-end event execution are unfinished. Organization accounts work today as a team directory and hiring account." },
  { title: "Online payment collection", desc: "Payment and payout records are stored, and the gateway integration is written. Live collection switches on once merchant activation is complete." },
  { title: "Mobile OTP verification", desc: "Sign-in is email and password today, with Google sign-in available. Phone verification arrives with our SMS provider." },
  { title: "Attendance & participant management", desc: "Guest lists, check-in and headcount reporting are planned after the organization workspace lands. We are not shipping a half-working scanner." },
];

function Features() {
  return (
    <SiteLayout>
      <PageHeader
        eyebrow="Platform"
        title="Every module, described exactly as it works."
        description="No feature on this page is a mockup. If something is unfinished, it is listed at the bottom under what we are still building."
      />
      <section className="mx-auto max-w-7xl px-5 md:px-8 py-20 grid gap-5 md:grid-cols-2">
        {live.map((f) => (
          <div key={f.title} className="rounded-3xl border border-border bg-card p-6 shadow-soft hover:shadow-elegant transition">
            <div className="grid h-12 w-12 place-items-center rounded-xl bg-gradient-brand text-white shadow-glow">
              <f.icon className="h-5 w-5" />
            </div>
            <h2 className="mt-4 font-display text-xl font-semibold">{f.title}</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{f.desc}</p>
            <ul className="mt-4 space-y-2">
              {f.details.map((d) => (
                <li key={d} className="flex gap-2 text-sm text-muted-foreground">
                  <span aria-hidden className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-violet" />
                  <span>{d}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </section>

      <section className="bg-gradient-brand-soft">
        <div className="mx-auto max-w-7xl px-5 md:px-8 py-20">
          <h2 className="font-display text-3xl font-semibold">Still being built</h2>
          <p className="mt-3 max-w-2xl text-muted-foreground">
            We would rather you know now than discover it after signing up.
          </p>
          <div className="mt-10 grid gap-4 md:grid-cols-2">
            {inProgress.map((b) => (
              <div key={b.title} className="rounded-2xl border border-dashed border-border bg-card/70 p-6">
                <div className="flex items-center gap-2">
                  <Hammer className="h-4 w-4 text-brand-orange" />
                  <h3 className="font-display text-lg font-semibold">{b.title}</h3>
                </div>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{b.desc}</p>
              </div>
            ))}
          </div>
          <Link to="/register" className="mt-10 inline-flex items-center gap-2 rounded-full btn-brand btn-brand-hover px-6 py-3 text-sm font-semibold">
            Create your account <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </SiteLayout>
  );
}
