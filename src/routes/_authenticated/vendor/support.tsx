import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { LifeBuoy, Mail, ChevronDown, Send, CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/vendor/support")({
  head: () => ({ meta: [{ title: "Support — EventOrbit Nova" }, { name: "robots", content: "noindex" }] }),
  component: SupportPage,
});

const FAQS = [
  { q: "How long does vendor verification take?", a: "Our team reviews submitted profiles within 2 business days. You'll get a notification the moment your verification status changes, and your listing goes live on the marketplace as soon as it's approved." },
  { q: "Why can't clients find my business?", a: "Your listing appears on the marketplace only when your verification is approved and your profile is published. Check the Review tab of your Vendor Profile to publish." },
  { q: "When do I get paid for a booking?", a: "Payment is released after you mark the booking complete and the client confirms. Settled amounts appear under Earnings and are transferred to the payout account on your profile." },
  { q: "Can a client cancel a confirmed booking?", a: "Yes. Cancellations show up instantly in Assigned Jobs and you'll receive a notification. Cancelled bookings are excluded from your earnings." },
  { q: "How do I hire workers for my own jobs?", a: "Use Hire Workers in the sidebar to browse verified workers and send them a booking request. You'll manage those assignments the same way clients manage yours." },
];

function SupportPage() {
  const [open, setOpen] = useState<number | null>(0);
  const [sent, setSent] = useState(false);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");

  return (
    <div className="space-y-8 max-w-3xl">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Support</h1>
        <p className="mt-1 text-sm text-muted-foreground">Answers to common vendor questions, and a direct line to our team.</p>
      </div>

      <section className="rounded-2xl border border-border bg-card divide-y divide-border">
        {FAQS.map((f, i) => (
          <div key={f.q}>
            <button onClick={() => setOpen(open === i ? null : i)} className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left">
              <span className="text-sm font-semibold">{f.q}</span>
              <ChevronDown className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${open === i ? "rotate-180" : ""}`} />
            </button>
            {open === i && <p className="px-5 pb-4 text-sm text-muted-foreground">{f.a}</p>}
          </div>
        ))}
      </section>

      <section className="rounded-2xl border border-border bg-card p-6">
        <h2 className="flex items-center gap-2 text-sm font-semibold"><LifeBuoy className="h-4 w-4 text-brand-violet" /> Contact our team</h2>
        {sent ? (
          <div className="mt-4 flex items-center gap-2 rounded-xl bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700">
            <CheckCircle2 className="h-4 w-4" /> Thanks — your message is ready to send. Open your email client to finish.
          </div>
        ) : (
          <form
            className="mt-4 space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              window.location.href = `mailto:support@eventorbitnova.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
              setSent(true);
            }}
          >
            <input value={subject} onChange={(e) => setSubject(e.target.value)} required placeholder="Subject"
              className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm" />
            <textarea value={body} onChange={(e) => setBody(e.target.value)} required rows={5} placeholder="Describe the issue in as much detail as you can."
              className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm" />
            <button type="submit" className="inline-flex items-center gap-2 rounded-full btn-brand btn-brand-hover px-5 py-2.5 text-sm font-semibold text-white">
              <Send className="h-4 w-4" /> Send message
            </button>
          </form>
        )}
        <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1.5"><Mail className="h-3.5 w-3.5" /> support@eventorbitnova.com</span>
          <Link to="/contact" className="font-semibold text-brand-violet hover:underline">Contact page</Link>
        </div>
      </section>
    </div>
  );
}
