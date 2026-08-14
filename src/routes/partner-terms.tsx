
import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteLayout } from "@/components/SiteLayout";
import { PageHeader } from "@/components/PageHeader";
import { BetaNotice } from "@/components/BetaNotice";

export const Route = createFileRoute("/partner-terms")({
  head: () => ({
    meta: [
      { title: "Partner Terms — EventOrbit Nova" },
      { name: "description", content: "Additional terms for Venue Owners, Vendors and Workers listing their business or profile on EventOrbit Nova." },
      { property: "og:title", content: "Partner Terms — EventOrbit Nova" },
      { property: "og:description", content: "Additional terms for Venue Owners, Vendors and Workers on EventOrbit." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:url", content: "/partner-terms" },
      { name: "robots", content: "noindex" },
    ],
    links: [{ rel: "canonical", href: "/partner-terms" }],
  }),
  component: PartnerTerms,
});

type Section = { title: string; body: string[] };

const sections: Section[] = [
  {
    title: "1. Who these terms are for",
    body: [
      "These Partner Terms apply in addition to our general Terms of Service, to anyone listing a business or professional profile on EventOrbit as a Venue Owner, Vendor, or Worker/Agency (together, \"Partners\"). By checking \"I accept the Partner Terms\" when you submit your profile for verification, you agree to this page. That checkbox and its timestamp are our current record of your acceptance, ahead of a fuller, digitally-signed partner agreement.",
    ],
  },
  {
    title: "2. Verification",
    body: [
      "Before your listing goes public, our team reviews the details and documents you submit — for example ID proof, a selfie and emergency contact for Workers, or business and property information for Vendors and Venue Owners. We may approve, reject, or ask for more information, and a \"Verified\" badge only reflects that our team reviewed what you submitted.",
      "Submitting false or misleading documents is a serious breach of these terms and may lead to permanent removal from the platform.",
    ],
  },
  {
    title: "3. Keeping your listing accurate",
    body: [
      "You're responsible for keeping your rates, capacity, availability, service areas and cancellation policy accurate and up to date. Customers rely on this information to decide whether to book you.",
    ],
  },
  {
    title: "4. Commission",
    body: [
      "EventOrbit may apply a commission, set as a percentage and configurable separately for Venue, Vendor and Worker bookings, calculated on the payment amount recorded for a booking or job and deducted from your payout. We'll give reasonable notice before changing the applicable rate.",
    ],
  },
  {
    title: "5. Payouts",
    body: [
      "Payouts are currently reconciled manually by our team and sent to the UPI ID you provide in your dashboard. You're responsible for keeping that UPI ID correct; we aren't liable for a payout sent to an incorrect ID you supplied. As the platform develops, payouts may move to an automated transfer process without changing how you provide your payout details.",
    ],
  },
  {
    title: "6. Job conduct",
    body: [
      "Respond to job assignments promptly — accept or reject with a reason — and keep the job's status updated as work progresses. Workers are required to provide a photo at check-in and check-out (and may optionally share location) and photos of completed work, as the record of that job.",
      "Conduct yourself professionally with customers and other Partners at all times.",
    ],
  },
  {
    title: "7. Independent status",
    body: [
      "As a Partner, you operate your own independent business or provide your services independently — you are not an employee, agent or representative of EventOrbit Nova, and nothing in these terms creates an employment, partnership or agency relationship.",
      "You're solely responsible for any licences, registrations and taxes that apply to your own business or work, and for complying with labour law, including not employing anyone under the legal working age.",
    ],
  },
  {
    title: "8. Suspension and termination",
    body: [
      "We may suspend or remove a Partner listing for a breach of these terms, a failed or fraudulent verification, unsafe conduct, or a pattern of unresolved customer complaints.",
      "You can stop accepting new work and request removal of your listing at any time through your dashboard or by writing to us.",
    ],
  },
  {
    title: "9. Liability",
    body: [
      "EventOrbit facilitates the connection between you and customers; you remain solely responsible for the quality, safety and legal compliance of the service, venue or work you provide.",
    ],
  },
  {
    title: "10. Changes and contact",
    body: [
      "We may update these Partner Terms as the platform develops, and will change the \"last updated\" date below when we do. Questions can be sent to hello@eventorbitnova.com.",
    ],
  },
];

function PartnerTerms() {
  return (
    <SiteLayout>
      <PageHeader
        eyebrow="Legal"
        title="Partner Terms"
        description="Additional terms for Venue Owners, Vendors and Workers listing on EventOrbit Nova."
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
          <Link to="/refund-policy" className="font-semibold text-brand-violet underline">Refund & Cancellation Policy</Link>.
        </p>
      </article>
    </SiteLayout>
  );
}
