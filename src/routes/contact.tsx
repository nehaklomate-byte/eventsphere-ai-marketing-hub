import { createFileRoute } from "@tanstack/react-router";
import { SiteLayout } from "@/components/SiteLayout";
import { PageHeader } from "@/components/PageHeader";
import { Mail, MapPin, Phone } from "lucide-react";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact EventOrbit — Talk to the Team" },
      { name: "description", content: "Questions about listing your venue, vendor business or worker profile, verification, or a feature you need? Send us a message and we'll reply within one business day." },
      { property: "og:title", content: "Contact EventOrbit — Talk to the Team" },
      { property: "og:description", content: "Get help with listing, verification or anything on the roadmap." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:url", content: "/contact" },
    ],
    links: [{ rel: "canonical", href: "/contact" }],
  }),
  component: () => (
    <SiteLayout>
      <PageHeader eyebrow="Contact" title="Talk to the people building it." description="Listing help, verification questions, partnership ideas or a feature you need — it reaches the team directly." />
      <section className="mx-auto max-w-7xl px-5 md:px-8 py-20 grid gap-10 lg:grid-cols-2">
        <form onSubmit={(e) => e.preventDefault()} className="rounded-3xl border border-border bg-card p-6 md:p-8 shadow-soft space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="First name"><input className="input" placeholder="Priya" /></Field>
            <Field label="Last name"><input className="input" placeholder="Sharma" /></Field>
          </div>
          <Field label="Work email"><input type="email" className="input" placeholder="you@company.com" /></Field>
          <Field label="Company"><input className="input" placeholder="Meridian Halls" /></Field>
          <Field label="How can we help?"><textarea rows={5} className="input resize-none" placeholder="Tell us what you're planning…" /></Field>
          <button className="rounded-full btn-brand btn-brand-hover px-5 py-3 text-sm font-semibold">Send message</button>
        </form>
        <div className="space-y-6">
          <div className="rounded-3xl glass-strong p-6 shadow-soft">
            <h3 className="font-display text-lg font-semibold">Reach us directly</h3>
            <div className="mt-4 space-y-3 text-sm">
              <div className="flex items-center gap-3"><Mail className="h-4 w-4 text-brand-violet" /> hello@eventorbit.ai</div>
              <div className="flex items-center gap-3"><Phone className="h-4 w-4 text-brand-violet" /> +91 98765 43210</div>
              <div className="flex items-center gap-3"><MapPin className="h-4 w-4 text-brand-violet" /> Pune, India</div>
            </div>
          </div>
          <div className="rounded-3xl bg-gradient-brand text-white p-6 shadow-elegant">
            <h3 className="font-display text-lg font-semibold">Enterprise & Government</h3>
            <p className="mt-2 text-sm text-white/85">Dedicated implementation, security review and SLAs. We'll get you a tailored proposal within 48 hours.</p>
          </div>
        </div>
      </section>
      <style>{`
        .input { width: 100%; border-radius: 12px; border: 1px solid var(--border); background: color-mix(in oklab, var(--card) 90%, transparent); padding: 10px 14px; font-size: 14px; outline: none; }
        .input:focus { border-color: var(--brand-violet); box-shadow: 0 0 0 3px color-mix(in oklab, var(--brand-violet) 25%, transparent); }
      `}</style>
    </SiteLayout>
  ),
});

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{label}</span>
      <div className="mt-1.5">{children}</div>
    </label>
  );
}
