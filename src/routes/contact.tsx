import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { SiteLayout } from "@/components/SiteLayout";
import { PageHeader } from "@/components/PageHeader";
import { Mail, MapPin, CheckCircle2, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

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
  component: ContactPage,
});

function ContactPage() {
  return (
    <SiteLayout>
      <PageHeader eyebrow="Contact" title="Talk to the people building it." description="Listing help, verification questions, partnership ideas or a feature you need — it reaches the team directly." />
      <section className="mx-auto max-w-7xl px-5 md:px-8 py-20 grid gap-10 lg:grid-cols-2">
        <ContactForm />
        <div className="space-y-6">
          <div className="rounded-3xl glass-strong p-6 shadow-soft">
            <h3 className="font-display text-lg font-semibold">What to expect</h3>
            <div className="mt-4 space-y-3 text-sm text-muted-foreground">
              <p>Messages are read by the team building the product, not a call centre. We reply within one business day.</p>
              <p className="flex items-center gap-3 text-foreground"><Mail className="h-4 w-4 text-brand-violet" /> hello@eventorbitnova.com</p>
              <p className="flex items-center gap-3 text-foreground"><MapPin className="h-4 w-4 text-brand-violet" /> Operating from Maharashtra, India</p>
            </div>
          </div>
          <div className="rounded-3xl bg-gradient-brand text-white p-6 shadow-elegant">
            <h3 className="font-display text-lg font-semibold">Getting listed faster</h3>
            <p className="mt-2 text-sm text-white/85">Create your account first and complete your profile — then message us here and we will prioritise the verification review.</p>
          </div>
        </div>

      </section>
      <style>{`
        .input { width: 100%; border-radius: 12px; border: 1px solid var(--border); background: color-mix(in oklab, var(--card) 90%, transparent); padding: 10px 14px; font-size: 14px; outline: none; }
        .input:focus { border-color: var(--brand-violet); box-shadow: 0 0 0 3px color-mix(in oklab, var(--brand-violet) 25%, transparent); }
      `}</style>
    </SiteLayout>
  );
}

function ContactForm() {
  const [form, setForm] = useState({ firstName: "", lastName: "", email: "", organisation: "", message: "" });
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  function set<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    if (!form.firstName.trim() || !form.lastName.trim() || !form.email.trim() || !form.message.trim()) {
      setErr("Please fill in your name, email and message.");
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.from("contact_messages" as never).insert({
      first_name: form.firstName.trim(),
      last_name: form.lastName.trim(),
      email: form.email.trim(),
      organisation: form.organisation.trim() || null,
      message: form.message.trim(),
    } as never);
    setSubmitting(false);
    if (error) {
      setErr(error.message || "Could not send your message. Please try again.");
      return;
    }
    setSent(true);
  }

  if (sent) {
    return (
      <div className="rounded-3xl border border-border bg-card p-6 md:p-8 shadow-soft flex flex-col items-center justify-center text-center gap-3 min-h-[320px]">
        <CheckCircle2 className="h-10 w-10 text-emerald-600" />
        <h3 className="font-display text-lg font-semibold">Message sent!</h3>
        <p className="text-sm text-muted-foreground max-w-sm">Thanks for reaching out — we reply within one business day at {form.email}.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-3xl border border-border bg-card p-6 md:p-8 shadow-soft space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="First name"><input className="input" placeholder="Priya" value={form.firstName} onChange={(e) => set("firstName", e.target.value)} required /></Field>
        <Field label="Last name"><input className="input" placeholder="Sharma" value={form.lastName} onChange={(e) => set("lastName", e.target.value)} required /></Field>
      </div>
      <Field label="Work email"><input type="email" className="input" placeholder="you@company.com" value={form.email} onChange={(e) => set("email", e.target.value)} required /></Field>
      <Field label="Organisation (optional)"><input className="input" placeholder="Your venue, business or company" value={form.organisation} onChange={(e) => set("organisation", e.target.value)} /></Field>
      <Field label="How can we help?"><textarea rows={5} className="input resize-none" placeholder="Listing your venue, verification status, a feature you need…" value={form.message} onChange={(e) => set("message", e.target.value)} required /></Field>
      {err && <p className="text-sm text-rose-600">{err}</p>}
      <button type="submit" disabled={submitting} className="inline-flex items-center gap-2 rounded-full btn-brand btn-brand-hover px-5 py-3 text-sm font-semibold disabled:opacity-70">
        {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
        {submitting ? "Sending…" : "Send message"}
      </button>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{label}</span>
      <div className="mt-1.5">{children}</div>
    </label>
  );
}
