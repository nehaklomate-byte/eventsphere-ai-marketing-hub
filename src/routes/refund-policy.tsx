
import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteLayout } from "@/components/SiteLayout";
import { PageHeader } from "@/components/PageHeader";


export const Route = createFileRoute("/refund-policy")({
  head: () => ({
    meta: [
      { title: "Refund & Cancellation Policy — EventOrbit Nova" },
      { name: "description", content: "How cancellations and refunds work on EventOrbit Nova today, while in-app payment collection is still being switched on." },
      { property: "og:title", content: "Refund & Cancellation Policy — EventOrbit Nova" },
      { property: "og:description", content: "How cancellations and refunds work on EventOrbit today." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:url", content: "/refund-policy" },
      { name: "robots", content: "noindex" },
    ],
    links: [{ rel: "canonical", href: "/refund-policy" }],
  }),
  component: RefundPolicy,
});

type Section = { title: string; body: string[] };

const sections: Section[] = [
  {
    title: "1. EventOrbit is a marketplace, not the seller",
    body: [
      "EventOrbit Nova connects customers with independent Venue Owners, Vendors and Workers. The venue, vendor or worker you book is the party actually providing the service, and cancellation or refund terms for a specific booking are set out on that listing's own cancellation policy at the time you book — please read it before confirming.",
    ],
  },
  {
    title: "2. How online payment works",
    body: [
      "Where you pay online through EventOrbit, payment is collected through a single, platform-wide payment gateway used across the whole platform — not a separate gateway per venue, vendor or worker. A venue, vendor or worker may instead list other payment method(s) they accept directly on their profile; a payment arranged directly with a partner outside our gateway is between you and that partner, and this refund process doesn't apply to it.",
    ],
  },
  {
    title: "3. Refunds for payments made through our gateway",
    body: [
      "If you're entitled to a refund — because a booking is cancelled within the partner's stated cancellation window, a partner cancels on you, or EventOrbit approves a refund after looking into a dispute — we initiate it back to your original payment method through our payment gateway.",
      "Once initiated, the refund is subject to our payment gateway's and your bank or card issuer's own processing time, which is typically a few business days and outside our direct control.",
      "Any EventOrbit commission already collected on a refunded booking is also reversed or adjusted accordingly.",
    ],
  },
  {
    title: "4. If a booking is cancelled",
    body: [
      "If you need to cancel, contact the venue, vendor or worker directly (or through in-app messaging) as early as possible and refer to their stated cancellation policy for what, if anything, is refundable.",
      "If a partner cancels on you, or you're unable to reach a fair outcome together, write to hello@eventorbitnova.com with your booking details. We'll look into it and, for payments made through our gateway, can issue a refund per section 3 above where warranted. For a payment arranged directly with a partner outside our gateway, we can help mediate but can't guarantee a specific refund outcome, since we're not a party to that payment.",
    ],
  },
  {
    title: "5. If EventOrbit removes a listing or suspends an account",
    body: [
      "If we suspend or remove a listing or account for a Terms of Service violation, any EventOrbit commission already charged on affected bookings may be reversed or adjusted at our discretion.",
    ],
  },
  {
    title: "6. Changes to this policy",
    body: [
      "We'll update this page as our payment infrastructure develops, and note the \"last updated\" date below when we do.",
    ],
  },
  {
    title: "7. Contact",
    body: [
      "Questions about a specific booking can be sent to hello@eventorbitnova.com.",
    ],
  },
];

function RefundPolicy() {
  return (
    <SiteLayout>
      <PageHeader
        eyebrow="Legal"
        title="Refund & Cancellation Policy"
        description="How cancellations and refunds work today, and what changes once in-app payments go live."
      />
      <BetaNotice />
      <article className="mx-auto max-w-3xl px-5 md:px-8 py-12 md:py-16">
        <p className="text-sm text-muted-foreground">
          Last updated: 14 August 2026. Published by EventOrbit Nova, registered under the Maharashtra Shops
          and Establishments Act, 2017, operating from Maharashtra, India.
        </p>
        <div className="mt-10 space-y-10">
          {sections.map((s) => (
            <section key={s.title}>
              <h2 className="font-display text-xl md:text-2xl font-semibold">{s.title}</h2>
              <div className="mt-3 space-y-3">
                {s.body.map((p, i) => (
                  <p key={i} className="leading-relaxed text-muted-foreground">{p}</p>
                ))}
              </div>
            </section>
          ))}
        </div>
        <p className="mt-14 text-sm text-muted-foreground">
          Also see our <Link to="/terms" className="font-semibold text-brand-violet underline">Terms of Service</Link>,{" "}
          <Link to="/privacy" className="font-semibold text-brand-violet underline">Privacy Policy</Link> and{" "}
          <Link to="/partner-terms" className="font-semibold text-brand-violet underline">Partner Terms</Link>.
        </p>
      </article>
    </SiteLayout>
  );
}
