import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import {
  ArrowRight, PlayCircle, Sparkles, CalendarCheck, Building2, Users2, Store, UserCheck,
  Wallet, BarChart3, BrainCircuit, QrCode, BellRing, ShieldCheck, Search, MousePointerClick,
  CheckCircle2, Handshake, Star, MapPin, Quote, Rocket, Cake, GraduationCap, Landmark,
  PartyPopper, Building, ChevronRight,
} from "lucide-react";
import { SiteLayout } from "@/components/SiteLayout";
import { Counter } from "@/components/Counter";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "EventSphere AI — Plan • Manage • Connect" },
      { name: "description", content: "The intelligent event operations platform. Plan weddings, corporate events, festivals and more — halls, vendors, workers, budgets and attendees in one place." },
      { property: "og:title", content: "EventSphere AI — Plan • Manage • Connect" },
      { property: "og:description", content: "One intelligent cloud platform for every event." },
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
  return (
    <SiteLayout>
      <Hero />
      <TrustedBy />
      <Stats />
      <Features />
      <Solutions />
      <Marketplace />
      <HowItWorks />
      <PricingPreview />
      <Research />
      <Testimonials />
      <BlogPreview />
      <FAQ />
      <Newsletter />
    </SiteLayout>
  );
}

/* ---------------- HERO ---------------- */
function Hero() {
  return (
    <section className="relative overflow-hidden bg-gradient-hero">
      <div aria-hidden className="pointer-events-none absolute -top-24 left-1/2 h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-gradient-warm opacity-20 blur-3xl animate-float-slow" />
      <div className="mx-auto grid max-w-7xl items-center gap-14 px-5 pt-16 pb-24 md:pt-24 md:pb-32 md:px-8 lg:grid-cols-2">
        <motion.div {...fadeUp}>
          <span className="inline-flex items-center gap-2 rounded-full glass px-3 py-1.5 text-xs font-medium text-foreground/80">
            <Sparkles className="h-3.5 w-3.5 text-brand-violet" />
            Now onboarding partners for private beta
          </span>
          <h1 className="mt-6 font-display text-4xl font-semibold leading-[1.05] tracking-tight text-foreground sm:text-5xl md:text-6xl">
            Manage Every Event with <br />
            <span className="text-gradient-brand">One Intelligent Platform.</span>
          </h1>
          <p className="mt-6 max-w-xl text-base leading-relaxed text-muted-foreground md:text-lg">
            EventSphere AI helps organizations, halls, vendors and event professionals manage planning, bookings, teams, budgets and operations from one unified cloud platform.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link to="/register" className="group inline-flex items-center gap-2 rounded-full btn-brand btn-brand-hover px-5 py-3 text-sm font-semibold">
              Get started free <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <Link to="/marketplace" className="inline-flex items-center gap-2 rounded-full border border-input bg-background/70 px-5 py-3 text-sm font-semibold backdrop-blur hover:bg-accent">
              Browse venues
            </Link>
            <Link to="/contact" className="inline-flex items-center gap-2 rounded-full px-3 py-3 text-sm font-semibold text-foreground hover:text-brand-violet">
              <PlayCircle className="h-5 w-5" /> Request a demo
            </Link>
          </div>
          <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5"><ShieldCheck className="h-4 w-4 text-brand-blue" /> Encrypted & role-based access</span>
            <span className="inline-flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-brand-violet" /> Built on secure cloud infrastructure</span>
            <span className="inline-flex items-center gap-1.5"><Sparkles className="h-4 w-4 text-brand-magenta" /> AI-assisted planning</span>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 40, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
          className="relative"
        >
          <HeroPreview />
        </motion.div>
      </div>
    </section>
  );
}

function HeroPreview() {
  return (
    <div className="relative">
      <div className="absolute -inset-8 bg-gradient-brand opacity-20 blur-3xl rounded-[3rem]" aria-hidden />
      <div className="relative rounded-3xl glass-strong shadow-elegant overflow-hidden">
        <div className="flex items-center gap-2 border-b border-border/60 px-4 py-3">
          <div className="flex gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-red-400/70" />
            <span className="h-2.5 w-2.5 rounded-full bg-yellow-400/70" />
            <span className="h-2.5 w-2.5 rounded-full bg-green-400/70" />
          </div>
          <div className="ml-3 text-xs text-muted-foreground">app.eventsphere.ai / dashboard</div>
        </div>
        <div className="grid grid-cols-3 gap-3 p-4">
          {[
            { label: "Upcoming Events", value: "24", tone: "from-brand-blue to-brand-violet" },
            { label: "Vendors Booked", value: "116", tone: "from-brand-violet to-brand-magenta" },
            { label: "Revenue MTD", value: "₹8.4L", tone: "from-brand-magenta to-brand-orange" },
          ].map((s) => (
            <div key={s.label} className="rounded-2xl border border-border/60 p-3">
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{s.label}</div>
              <div className={`mt-1 bg-gradient-to-r ${s.tone} bg-clip-text text-transparent text-2xl font-semibold font-display`}>{s.value}</div>
            </div>
          ))}
        </div>
        <div className="px-4 pb-4">
          <div className="rounded-2xl border border-border/60 overflow-hidden">
            <img
              src="https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1400&q=70"
              alt="Wedding event preview"
              className="h-56 w-full object-cover"
              loading="lazy"
            />
            <div className="flex items-center justify-between p-3">
              <div>
                <div className="text-sm font-semibold">Aarav & Meera — Garden Wedding</div>
                <div className="text-xs text-muted-foreground">Sat, Dec 14 • The Grand Lawns, Pune</div>
              </div>
              <span className="rounded-full bg-gradient-brand text-white text-[10px] font-semibold px-2.5 py-1">On track</span>
            </div>
          </div>
        </div>
      </div>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="absolute -left-6 bottom-8 hidden md:block rounded-2xl glass-strong shadow-glow px-4 py-3"
      >
        <div className="flex items-center gap-3">
          <div className="grid h-9 w-9 place-items-center rounded-full bg-gradient-warm text-white"><QrCode className="h-4 w-4" /></div>
          <div>
            <div className="text-xs text-muted-foreground">QR Check-in</div>
            <div className="text-sm font-semibold">312 guests arrived</div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

/* ---------------- TRUSTED BY ---------------- */
function TrustedBy() {
  const logos = ["Everly", "Halcyon", "Northwind", "Meridian", "Lumen&Co", "Voltera", "Solstice", "Auralis"];
  return (
    <section className="border-y border-border/60 bg-background/60">
      <div className="mx-auto max-w-7xl px-5 md:px-8 py-10">
        <p className="text-center text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          Trusted by fast-growing organizations
        </p>
        <div className="mt-6 grid grid-cols-2 gap-6 sm:grid-cols-4 lg:grid-cols-8">
          {logos.map((l) => (
            <div key={l} className="flex items-center justify-center opacity-60 hover:opacity-100 transition-opacity">
              <span className="font-display text-lg font-semibold text-foreground/70">{l}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------------- WHY (replaces fabricated stats pre-launch) ---------------- */
function Stats() {
  const items = [
    { label: "One unified workspace", desc: "Planning, bookings, vendors, workers and reporting in a single console." },
    { label: "Role-based by design", desc: "Distinct workflows for organizations, halls, vendors and professionals." },
    { label: "Verified marketplace", desc: "Every listed partner is verified before going live to your team." },
    { label: "Built for India first", desc: "GST, INR, regional languages and payment rails supported end to end." },
  ];
  return (
    <section className="mx-auto max-w-7xl px-5 md:px-8 py-20">
      <motion.div {...fadeUp} className="max-w-2xl">
        <SectionEyebrow>Why EventSphere</SectionEyebrow>
        <h2 className="mt-3 font-display text-3xl md:text-4xl font-semibold">Purpose-built for the way events actually run.</h2>
        <p className="mt-3 text-muted-foreground">Replace scattered spreadsheets, WhatsApp threads and manual paperwork with a single system your entire team can trust.</p>
      </motion.div>
      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {items.map((s, i) => (
          <motion.div key={s.label} {...fadeUp} transition={{ ...fadeUp.transition, delay: i * 0.05 }}
            className="rounded-2xl glass shadow-soft p-5 hover:shadow-glow transition-shadow">
            <div className="font-display text-lg font-semibold text-foreground">{s.label}</div>
            <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{s.desc}</p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

/* ---------------- FEATURES ---------------- */
const features = [
  { icon: CalendarCheck, title: "Event Planning", desc: "Timelines, checklists and collaborative run-of-show for any event size." },
  { icon: Building2, title: "Venue Booking", desc: "Discover, compare and reserve halls with real-time availability." },
  { icon: Store, title: "Vendor Management", desc: "One source of truth for contracts, deliverables and payments." },
  { icon: UserCheck, title: "Worker Marketplace", desc: "On-demand staffing for stewards, chefs, technicians and more." },
  { icon: Users2, title: "Participant Management", desc: "Invites, RSVPs, seat maps and guest communications, unified." },
  { icon: Wallet, title: "Budget Tracking", desc: "Live budget vs. actuals across categories and vendors." },
  { icon: BarChart3, title: "Reports & Analytics", desc: "Executive dashboards for revenue, attendance and satisfaction." },
  { icon: BrainCircuit, title: "AI Automation", desc: "Smart schedules, vendor suggestions and follow-ups.", soon: true },
  { icon: QrCode, title: "QR Attendance", desc: "Contactless check-ins with real-time headcounts." },
  { icon: BellRing, title: "Notifications", desc: "Multi-channel reminders across email, SMS and WhatsApp." },
];

function Features() {
  return (
    <section id="features" className="mx-auto max-w-7xl px-5 md:px-8 py-20">
      <motion.div {...fadeUp} className="max-w-2xl">
        <SectionEyebrow>Platform</SectionEyebrow>
        <h2 className="mt-3 font-display text-3xl md:text-4xl font-semibold">Everything you need to run world-class events.</h2>
        <p className="mt-3 text-muted-foreground">A modular platform designed for planners, organizations, and venue operators — with AI woven in.</p>
      </motion.div>
      <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {features.map((f, i) => (
          <motion.div
            key={f.title}
            {...fadeUp}
            transition={{ ...fadeUp.transition, delay: (i % 4) * 0.05 }}
            className="group relative rounded-2xl border border-border bg-card p-5 shadow-soft transition-all hover:-translate-y-0.5 hover:shadow-elegant"
          >
            <div className="grid h-11 w-11 place-items-center rounded-xl bg-gradient-brand text-white shadow-glow">
              <f.icon className="h-5 w-5" />
            </div>
            <div className="mt-4 flex items-center gap-2">
              <h3 className="font-display text-lg font-semibold">{f.title}</h3>
              {f.soon && <span className="rounded-full bg-gradient-warm text-white text-[10px] font-semibold px-2 py-0.5">Soon</span>}
            </div>
            <p className="mt-2 text-sm text-muted-foreground">{f.desc}</p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

/* ---------------- SOLUTIONS ---------------- */
const solutions = [
  { icon: Handshake, title: "Wedding Management", img: "https://images.unsplash.com/photo-1519225421980-715cb0215aed?auto=format&fit=crop&w=900&q=70" },
  { icon: Building, title: "Corporate Events", img: "https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&w=900&q=70" },
  { icon: GraduationCap, title: "College Festivals", img: "https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=900&q=70" },
  { icon: Cake, title: "Birthday Parties", img: "https://images.unsplash.com/photo-1530103862676-de8c9debad1d?auto=format&fit=crop&w=900&q=70" },
  { icon: PartyPopper, title: "Cultural Events", img: "https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?auto=format&fit=crop&w=900&q=70" },
  { icon: Landmark, title: "Government Events", img: "https://images.unsplash.com/photo-1505373877841-8d25f7d46678?auto=format&fit=crop&w=900&q=70" },
];

function Solutions() {
  return (
    <section id="solutions" className="bg-gradient-brand-soft">
      <div className="mx-auto max-w-7xl px-5 md:px-8 py-20">
        <motion.div {...fadeUp} className="max-w-2xl">
          <SectionEyebrow>Solutions</SectionEyebrow>
          <h2 className="mt-3 font-display text-3xl md:text-4xl font-semibold">Built for every kind of gathering.</h2>
          <p className="mt-3 text-muted-foreground">From intimate ceremonies to national conferences — tailored workflows out of the box.</p>
        </motion.div>
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {solutions.map((s, i) => (
            <motion.div key={s.title} {...fadeUp} transition={{ ...fadeUp.transition, delay: (i % 3) * 0.06 }}
              className="group relative overflow-hidden rounded-3xl border border-border bg-card shadow-soft">
              <div className="relative h-56 overflow-hidden">
                <img src={s.img} alt={s.title} loading="lazy" className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
                <div className="absolute left-4 top-4 grid h-10 w-10 place-items-center rounded-xl glass-strong">
                  <s.icon className="h-5 w-5 text-white" />
                </div>
                <div className="absolute inset-x-0 bottom-0 p-4 text-white">
                  <div className="font-display text-lg font-semibold">{s.title}</div>
                </div>
              </div>
              <div className="flex items-center justify-between px-4 py-3">
                <span className="text-xs text-muted-foreground">Workflow templates included</span>
                <Link to="/solutions" className="inline-flex items-center gap-1 text-xs font-semibold text-brand-violet hover:opacity-80">
                  Explore <ChevronRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------------- MARKETPLACE ---------------- */
const market = [
  { title: "The Grand Lawns", type: "Venue", loc: "Pune, MH", price: "₹1.8L / day", rating: 4.9, badge: "Available", img: "https://images.unsplash.com/photo-1519167758481-83f550bb49b3?auto=format&fit=crop&w=900&q=70" },
  { title: "Bloom Decor Studio", type: "Decorator", loc: "Mumbai, MH", price: "₹45k+", rating: 4.8, badge: "Top Rated", img: "https://images.unsplash.com/photo-1519671482749-fd09be7ccebf?auto=format&fit=crop&w=900&q=70" },
  { title: "Frame & Light", type: "Photographer", loc: "Bengaluru, KA", price: "₹35k/day", rating: 4.9, badge: "Available", img: "https://images.unsplash.com/photo-1502635385003-ee1e6a1a742d?auto=format&fit=crop&w=900&q=70" },
  { title: "Saffron Kitchen", type: "Catering", loc: "Delhi, DL", price: "₹850 / plate", rating: 4.7, badge: "Available", img: "https://images.unsplash.com/photo-1555244162-803834f70033?auto=format&fit=crop&w=900&q=70" },
  { title: "Amplify Sound", type: "Sound", loc: "Hyderabad, TS", price: "₹28k/day", rating: 4.8, badge: "Available", img: "https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?auto=format&fit=crop&w=900&q=70" },
  { title: "Neon Nights DJ", type: "DJ", loc: "Goa", price: "₹60k/night", rating: 4.9, badge: "Few Slots", img: "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?auto=format&fit=crop&w=900&q=70" },
  { title: "Rohan Kapoor", type: "Anchor", loc: "Mumbai, MH", price: "₹40k/event", rating: 4.8, badge: "Available", img: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=900&q=70" },
  { title: "OnCall Crew", type: "Workers", loc: "Pan-India", price: "₹800/shift", rating: 4.7, badge: "Available", img: "https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=900&q=70" },
];

function Marketplace() {
  return (
    <section id="marketplace" className="mx-auto max-w-7xl px-5 md:px-8 py-20">
      <motion.div {...fadeUp} className="flex items-end justify-between gap-6 flex-wrap">
        <div className="max-w-2xl">
          <SectionEyebrow>Marketplace</SectionEyebrow>
          <h2 className="mt-3 font-display text-3xl md:text-4xl font-semibold">A curated marketplace of trusted partners.</h2>
          <p className="mt-3 text-muted-foreground">Book venues, decorators, photographers, catering, sound, DJs, anchors and on-ground staff — verified and rated.</p>
        </div>
        <Link to="/marketplace" className="inline-flex items-center gap-2 rounded-full border border-input px-4 py-2 text-sm font-semibold hover:bg-accent">
          Browse all <ArrowRight className="h-4 w-4" />
        </Link>
      </motion.div>
      <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {market.map((m, i) => (
          <motion.article key={m.title} {...fadeUp} transition={{ ...fadeUp.transition, delay: (i % 4) * 0.05 }}
            className="group overflow-hidden rounded-2xl border border-border bg-card shadow-soft hover:shadow-elegant transition-all">
            <div className="relative h-44 overflow-hidden">
              <img src={m.img} alt={m.title} loading="lazy" className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" />
              <span className="absolute left-3 top-3 rounded-full bg-white/90 text-[10px] font-semibold text-brand-navy px-2 py-1">{m.type}</span>
              <span className="absolute right-3 top-3 rounded-full bg-gradient-warm text-white text-[10px] font-semibold px-2 py-1">{m.badge}</span>
            </div>
            <div className="p-4">
              <div className="flex items-center justify-between">
                <h3 className="font-display text-base font-semibold truncate">{m.title}</h3>
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-foreground">
                  <Star className="h-3.5 w-3.5 fill-brand-orange text-brand-orange" />{m.rating}
                </span>
              </div>
              <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                <MapPin className="h-3.5 w-3.5" />{m.loc}
              </div>
              <div className="mt-3 flex items-center justify-between">
                <div className="text-sm font-semibold text-foreground">{m.price}</div>
                <button className="rounded-full btn-brand btn-brand-hover text-xs font-semibold px-3 py-1.5">Book</button>
              </div>
            </div>
          </motion.article>
        ))}
      </div>
    </section>
  );
}

/* ---------------- HOW IT WORKS ---------------- */
function HowItWorks() {
  const steps = [
    { icon: Users2, title: "Customer", desc: "Discovers EventSphere and creates a request." },
    { icon: Search, title: "Search Venue", desc: "Filter by capacity, city, budget and date." },
    { icon: MousePointerClick, title: "Book", desc: "Reserve instantly with transparent pricing." },
    { icon: CheckCircle2, title: "Organizer Confirmation", desc: "Vendors and staff confirm and sync calendars." },
    { icon: Rocket, title: "Successful Event", desc: "Run-of-show, QR check-ins and post-event reports." },
  ];
  return (
    <section id="how" className="bg-background">
      <div className="mx-auto max-w-7xl px-5 md:px-8 py-20">
        <motion.div {...fadeUp} className="max-w-2xl">
          <SectionEyebrow>How it works</SectionEyebrow>
          <h2 className="mt-3 font-display text-3xl md:text-4xl font-semibold">From idea to encore, in five steps.</h2>
        </motion.div>
        <div className="relative mt-14">
          <div aria-hidden className="absolute left-0 right-0 top-6 hidden h-px bg-gradient-brand lg:block" />
          <div className="grid gap-6 lg:grid-cols-5">
            {steps.map((s, i) => (
              <motion.div key={s.title} {...fadeUp} transition={{ ...fadeUp.transition, delay: i * 0.08 }}
                className="relative rounded-2xl border border-border bg-card p-5 shadow-soft">
                <div className="relative -mt-10 grid h-12 w-12 place-items-center rounded-2xl bg-gradient-brand text-white shadow-glow">
                  <s.icon className="h-5 w-5" />
                </div>
                <div className="mt-4 text-xs font-semibold uppercase tracking-widest text-brand-violet">Step {i + 1}</div>
                <div className="mt-1 font-display text-lg font-semibold">{s.title}</div>
                <p className="mt-1 text-sm text-muted-foreground">{s.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------------- PRICING ---------------- */
function PricingPreview() {
  const tiers = [
    { name: "Starter", price: "Free", desc: "Perfect for small teams planning up to 3 events per month.", features: ["Up to 3 active events", "Basic vendor & venue tools", "QR attendance", "Email support"], cta: "Start free" },
    { name: "Professional", price: "Coming Soon", featured: true, desc: "Everything a growing organization needs to scale operations.", features: ["Unlimited events", "Vendor & worker marketplace", "Budget & analytics", "Priority support"], cta: "Notify me" },
    { name: "Enterprise", price: "Custom", desc: "For venues, chains and government bodies with advanced needs.", features: ["SSO & role-based access", "Custom workflows & SLAs", "Dedicated success manager", "On-prem / VPC options"], cta: "Talk to sales" },
  ];
  return (
    <section id="pricing" className="mx-auto max-w-7xl px-5 md:px-8 py-20">
      <motion.div {...fadeUp} className="max-w-2xl">
        <SectionEyebrow>Pricing</SectionEyebrow>
        <h2 className="mt-3 font-display text-3xl md:text-4xl font-semibold">Simple pricing that scales with you.</h2>
        <p className="mt-3 text-muted-foreground">Payment processing is coming soon. Join early access to lock in launch pricing.</p>
      </motion.div>
      <div className="mt-12 grid gap-6 lg:grid-cols-3">
        {tiers.map((t) => (
          <motion.div key={t.name} {...fadeUp}
            className={`relative rounded-3xl p-7 shadow-soft transition-all ${t.featured ? "bg-gradient-brand text-white shadow-elegant" : "bg-card border border-border"}`}>
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
            <Link to="/pricing" className={`mt-8 inline-flex w-full items-center justify-center rounded-full px-4 py-2.5 text-sm font-semibold ${t.featured ? "bg-white text-brand-navy hover:opacity-90" : "border border-input hover:bg-accent"}`}>
              {t.cta}
            </Link>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

/* ---------------- RESEARCH ---------------- */
function Research() {
  return (
    <section id="research" className="bg-gradient-brand-soft">
      <div className="mx-auto max-w-7xl px-5 md:px-8 py-20">
        <div className="grid gap-10 lg:grid-cols-2 items-center">
          <motion.div {...fadeUp}>
            <SectionEyebrow>Research</SectionEyebrow>
            <h2 className="mt-3 font-display text-3xl md:text-4xl font-semibold">Built with the industry, not for it.</h2>
            <p className="mt-4 text-muted-foreground">
              EventSphere AI is collaborating with organizers, hall owners, vendors and government bodies across India to deeply understand event operations. Your insights directly shape our roadmap.
            </p>
            <Link to="/research" className="mt-6 inline-flex items-center gap-2 rounded-full btn-brand btn-brand-hover px-5 py-3 text-sm font-semibold">
              Participate in Research Survey <ArrowRight className="h-4 w-4" />
            </Link>
          </motion.div>
          <motion.div {...fadeUp} className="relative">
            <div className="rounded-3xl glass-strong shadow-elegant p-6">
              <div className="grid grid-cols-2 gap-3">
                {[
                  { k: "Interviews", v: "140+" },
                  { k: "Cities", v: "22" },
                  { k: "Hours listened", v: "310" },
                  { k: "Insights logged", v: "1,860" },
                ].map((c) => (
                  <div key={c.k} className="rounded-2xl border border-border/60 p-4">
                    <div className="text-xs uppercase tracking-widest text-muted-foreground">{c.k}</div>
                    <div className="mt-1 font-display text-2xl font-semibold text-gradient-brand">{c.v}</div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

/* ---------------- ADVISORY (honest pre-launch) ---------------- */
function Testimonials() {
  const items = [
    { title: "Wedding planners", desc: "Codesigning coordinator workflows, budget dashboards and vendor payouts." },
    { title: "Banquet halls & lawns", desc: "Building the availability calendar, enquiry inbox and dynamic pricing engine." },
    { title: "Colleges & institutions", desc: "Shaping cultural fest workflows with volunteer, sponsor and artist tracking." },
  ];
  return (
    <section className="mx-auto max-w-7xl px-5 md:px-8 py-20">
      <motion.div {...fadeUp} className="max-w-2xl">
        <SectionEyebrow>Advisory network</SectionEyebrow>
        <h2 className="mt-3 font-display text-3xl md:text-4xl font-semibold">Built alongside operators, not in a vacuum.</h2>
        <p className="mt-3 text-muted-foreground">EventSphere AI is being shaped in the open with venues, planners and institutions who run events every week.</p>
      </motion.div>
      <div className="mt-12 grid gap-5 md:grid-cols-3">
        {items.map((t, i) => (
          <motion.figure key={t.title} {...fadeUp} transition={{ ...fadeUp.transition, delay: i * 0.06 }}
            className="rounded-3xl border border-border bg-card p-6 shadow-soft">
            <Quote className="h-6 w-6 text-brand-violet" />
            <div className="mt-3 font-display text-lg font-semibold">{t.title}</div>
            <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{t.desc}</p>
          </motion.figure>
        ))}
      </div>
    </section>
  );
}

/* ---------------- BLOG ---------------- */
function BlogPreview() {
  const posts = [
    { title: "The 2026 State of Indian Event Operations", tag: "Report", img: "https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=900&q=70" },
    { title: "How AI is Rewriting the Wedding Playbook", tag: "AI", img: "https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=900&q=70" },
    { title: "A Framework for Hall Occupancy Growth", tag: "Playbook", img: "https://images.unsplash.com/photo-1519167758481-83f550bb49b3?auto=format&fit=crop&w=900&q=70" },
  ];
  return (
    <section className="bg-background">
      <div className="mx-auto max-w-7xl px-5 md:px-8 py-20">
        <motion.div {...fadeUp} className="flex items-end justify-between gap-6 flex-wrap">
          <div className="max-w-2xl">
            <SectionEyebrow>From the blog</SectionEyebrow>
            <h2 className="mt-3 font-display text-3xl md:text-4xl font-semibold">Ideas, research and playbooks.</h2>
          </div>
          <Link to="/blog" className="inline-flex items-center gap-2 rounded-full border border-input px-4 py-2 text-sm font-semibold hover:bg-accent">
            All articles <ArrowRight className="h-4 w-4" />
          </Link>
        </motion.div>
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {posts.map((p, i) => (
            <motion.article key={p.title} {...fadeUp} transition={{ ...fadeUp.transition, delay: i * 0.06 }}
              className="group overflow-hidden rounded-3xl border border-border bg-card shadow-soft hover:shadow-elegant transition-all">
              <div className="relative h-48 overflow-hidden">
                <img src={p.img} alt={p.title} loading="lazy" className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" />
                <span className="absolute left-3 top-3 rounded-full glass-strong text-white text-[10px] font-semibold px-2 py-1">{p.tag}</span>
              </div>
              <div className="p-5">
                <h3 className="font-display text-lg font-semibold leading-snug">{p.title}</h3>
                <div className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-brand-violet">Read article <ChevronRight className="h-4 w-4" /></div>
              </div>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------------- FAQ ---------------- */
function FAQ() {
  const faqs = [
    { q: "When will EventSphere AI launch publicly?", a: "We're currently in private beta with select partners. Join early access to receive an invite as we roll out cohorts through 2026." },
    { q: "Which events does the platform support?", a: "Weddings, corporate events, college festivals, birthdays, cultural and government events — with tailored templates for each." },
    { q: "Can venue owners list their halls?", a: "Yes. Halls can be onboarded through our partner program with calendar sync, dynamic pricing and payout support." },
    { q: "Do you support workers and vendors?", a: "Vendors and on-ground workers can create profiles, receive bookings, manage payments and build a verified reputation." },
    { q: "Is the platform secure and compliant?", a: "We follow industry best practices with encryption in transit and at rest, role-based access, and SOC 2 controls." },
    { q: "Can we integrate with our existing tools?", a: "Yes — Google/Outlook calendars, WhatsApp, payment gateways and CRMs are on the roadmap and available on request." },
  ];
  return (
    <section className="mx-auto max-w-7xl px-5 md:px-8 py-20">
      <motion.div {...fadeUp} className="max-w-2xl">
        <SectionEyebrow>FAQ</SectionEyebrow>
        <h2 className="mt-3 font-display text-3xl md:text-4xl font-semibold">Frequently asked questions.</h2>
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
    </section>
  );
}

/* ---------------- NEWSLETTER ---------------- */
function Newsletter() {
  return (
    <section className="mx-auto max-w-7xl px-5 md:px-8 pb-4">
      <div className="relative overflow-hidden rounded-3xl bg-gradient-brand p-10 md:p-14 text-white shadow-elegant">
        <div aria-hidden className="absolute -top-16 -right-16 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
        <div className="relative grid gap-8 md:grid-cols-2 md:items-center">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-white/80">Stay updated</div>
            <h2 className="mt-2 font-display text-3xl md:text-4xl font-semibold leading-tight">
              Get product updates, playbooks & research.
            </h2>
            <p className="mt-3 text-white/85 max-w-md">One email per month. No spam. Unsubscribe anytime.</p>
          </div>
          <form onSubmit={(e) => e.preventDefault()} className="flex flex-col sm:flex-row gap-2 md:justify-end">
            <label htmlFor="newsletter-email" className="sr-only">Email</label>
            <input id="newsletter-email" type="email" required placeholder="you@company.com"
              className="w-full sm:w-72 rounded-full bg-white/95 text-brand-navy placeholder:text-brand-navy/50 px-5 py-3 text-sm outline-none focus:ring-2 focus:ring-white" />
            <button className="rounded-full bg-white text-brand-navy px-5 py-3 text-sm font-semibold hover:opacity-90">
              Subscribe
            </button>
          </form>
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
