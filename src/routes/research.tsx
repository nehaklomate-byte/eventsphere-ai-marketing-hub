import { createFileRoute } from "@tanstack/react-router";
import { SiteLayout } from "@/components/SiteLayout";
import { PageHeader } from "@/components/PageHeader";
import { ArrowRight } from "lucide-react";

export const Route = createFileRoute("/research")({
  head: () => ({
    meta: [
      { title: "Research — EventSphere AI" },
      { name: "description", content: "We're collaborating with organizers and organizations to understand event operations at depth. Join the research." },
      { property: "og:title", content: "Research — EventSphere AI" },
      { property: "og:description", content: "Shape the future of event operations with us." },
      { property: "og:url", content: "/research" },
    ],
    links: [{ rel: "canonical", href: "/research" }],
  }),
  component: () => (
    <SiteLayout>
      <PageHeader eyebrow="Research" title="Built with the industry, not for it." description="EventSphere AI is collaborating with event organizers and organizations across India to understand how the industry really works." />
      <section className="mx-auto max-w-7xl px-5 md:px-8 py-20 grid gap-10 lg:grid-cols-2 items-start">
        <div className="prose prose-neutral dark:prose-invert max-w-none">
          <h2 className="font-display text-2xl font-semibold">Why we research</h2>
          <p className="text-muted-foreground">
            Events are deeply human and deeply operational. We spend hundreds of hours listening to hall owners, wedding planners, corporate ops leads, government coordinators, decorators and photographers — mapping the workflows that never quite make it into a product spec.
          </p>
          <p className="text-muted-foreground">
            Our findings shape the EventSphere AI roadmap. Every partner in our research program gets early access, direct product influence, and named credit in our published reports.
          </p>
        </div>
        <div className="rounded-3xl glass-strong p-6 md:p-8 shadow-elegant">
          <h3 className="font-display text-xl font-semibold">Participate in our research survey</h3>
          <p className="mt-2 text-sm text-muted-foreground">Takes ~7 minutes. We only ask what we actually need.</p>
          <form className="mt-6 space-y-4" onSubmit={(e) => e.preventDefault()}>
            <Field label="Full name"><input className="input" placeholder="Priya Sharma" /></Field>
            <Field label="Organization"><input className="input" placeholder="e.g. IIT Bombay" /></Field>
            <Field label="Role"><input className="input" placeholder="Cultural Secretary" /></Field>
            <Field label="Work email"><input type="email" className="input" placeholder="you@company.com" /></Field>
            <Field label="What's your biggest operational headache?">
              <textarea rows={4} className="input resize-none" placeholder="Tell us what breaks most often…" />
            </Field>
            <button className="inline-flex items-center gap-2 rounded-full btn-brand btn-brand-hover px-5 py-3 text-sm font-semibold">
              Submit survey <ArrowRight className="h-4 w-4" />
            </button>
          </form>
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
