import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteLayout } from "@/components/SiteLayout";
import { PageHeader } from "@/components/PageHeader";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms of Service — EventOrbit Nova" },
      { name: "description", content: "The terms that govern your use of EventOrbit Nova — accounts, listings, bookings, fees and payouts, and the rules everyone on the platform agrees to." },
      { property: "og:title", content: "Terms of Service — EventOrbit Nova" },
      { property: "og:description", content: "How accounts, listings, bookings and payouts work on EventOrbit." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:url", content: "/terms" },
      { name: "robots", content: "noindex" },
    ],
    links: [{ rel: "canonical", href: "/terms" }],
  }),
  component: Terms,
});

type Section = { title: string; body: string[] };

const sections: Section[] = [
  {
    title: "1. Who these terms are between",
    body: [
      "These Terms of Service (\"Terms\") are an agreement between you and EventOrbit Nova (\"EventOrbit\", \"we\", \"us\"), registered under the Maharashtra Shops and Establishments Act, 2017 and operating from Maharashtra, India.",
      "By creating an account or using the EventOrbit website or app, you agree to these Terms and to our Privacy Policy. If you don't agree, please don't use the platform.",
    ],
  },
  {
    title: "2. Who can use EventOrbit",
    body: [
      "You must be at least 18 years old and able to enter into a legally binding contract under Indian law to create an account.",
      "You're responsible for the accuracy of the information on your profile and for keeping your login credentials confidential. Let us know immediately at hello@eventorbitnova.com if you think your account has been accessed without your permission.",
    ],
  },
  {
    title: "3. Accounts and verification",
    body: [
      "EventOrbit supports several account types — Customer, Venue Owner, Vendor, Worker/Agency and Organization — each with its own dashboard and permissions.",
      "Venue, Vendor and Worker accounts go through a verification step: our team reviews the documents and details you submit (for example ID proof, a selfie, or business/property information) before your profile becomes publicly visible, and may approve, reject, or ask for more information. A \"Verified\" badge means our team reviewed the documents you submitted — it is not a guarantee of the quality, safety or outcome of any booking.",
    ],
  },
  {
    title: "4. What EventOrbit is — and isn't",
    body: [
      "EventOrbit is a marketplace that helps venues, vendors, workers, organizations and customers find each other, exchange enquiries, and keep a shared record of jobs, status and payment. We are not a party to the booking or hiring agreement that forms between a customer and a venue, vendor or worker, and we don't own the venues or employ the vendors or workers listed on the platform.",
      "Rates, capacity, availability, facilities and cancellation terms shown on a listing are entered by the venue owner, vendor or worker themselves. We don't independently verify every detail on a listing, and you should confirm anything important directly with the other party before relying on it.",
    ],
  },
  {
    title: "5. Enquiries, bookings and jobs",
    body: [
      "When you send an enquiry or make a booking, the details (event date, guest count, contact information, and similar) are shared with the venue, vendor or worker you're contacting so they can respond.",
      "Jobs assigned through the platform carry a status (for example accepted, in progress, completed) that updates as work happens. Workers may be asked for a photo — and, where they choose to share it, their location — at check-in and check-out, and photos of completed work, as a record of the job.",
    ],
  },
  {
    title: "6. Fees and commission",
    body: [
      "EventOrbit may charge Venue Owners, Vendors and Workers a commission, set as a percentage by role, on payments processed through a job or booking. Where a commission applies, it's deducted from the partner's payout, not charged separately to the customer.",
      "There are no paid subscription plans at this time. If that changes, we'll give clear notice before any new fee applies to you.",
    ],
  },
  {
    title: "7. Payments and payouts",
    body: [
      "Where a booking or job is paid for online through EventOrbit, payment is collected through a single, platform-wide payment gateway, not through a separate arrangement with each individual venue, vendor or worker. Card, UPI and other payment details you enter are handled directly by our payment gateway provider — EventOrbit does not see or store your full card or bank details, only a payment reference and the amount and status of the transaction.",
      "A venue, vendor or worker may also list other payment method(s) they accept directly on their profile; where payment for a booking is arranged directly between you and that partner rather than through our gateway, EventOrbit is not a party to that payment and this section does not apply to it.",
      "Payouts to Venue Owners, Vendors and Workers are currently reconciled manually by our team and sent to the UPI ID the partner has provided in their dashboard, after our commission (if any) is deducted. You're responsible for keeping that UPI ID correct and up to date; we aren't liable for a payout sent to an incorrect ID you supplied.",
    ],
  },
  {
    title: "8. Cancellations and refunds",
    body: [
      "Cancellation and refund terms for a specific booking are set out on the individual venue, vendor or worker listing, and by our Refund & Cancellation Policy. Please review both before booking.",
    ],
  },
  {
    title: "9. Acceptable use",
    body: [
      "Don't post false or misleading listing information, impersonate another person or business, circumvent our verification process, or use the platform for anything illegal.",
      "Don't harass, threaten or discriminate against another user. Employing anyone under the legal working age is not permitted on or off the platform.",
      "We may remove content, suspend or terminate an account that we reasonably believe violates these Terms.",
    ],
  },
  {
    title: "10. Reviews and messaging",
    body: [
      "Reviews should reflect a genuine experience with the listing you're reviewing. We may remove a review that is fraudulent, abusive, or unrelated to an actual booking.",
      "In-app messaging is provided to coordinate bookings and jobs. We don't routinely monitor message content, but may review a conversation if it's reported to us or needed to resolve a dispute or safety concern.",
    ],
  },
  {
    title: "11. Content and intellectual property",
    body: [
      "You keep ownership of the photos, descriptions and other content you upload. By posting it, you give EventOrbit a licence to display it on the platform for the purpose of running your listing.",
      "The EventOrbit name, logo and the platform's own design and code belong to us and may not be copied or reused without permission.",
    ],
  },
  {
    title: "12. Disclaimers and limitation of liability",
    body: [
      "EventOrbit is provided \"as is\" during this early-access period. We don't guarantee uninterrupted availability, and features described as still in progress on our Features page aren't yet complete.",
      "To the maximum extent permitted by law, EventOrbit is not liable for losses arising from a booking, job, or interaction between users, since we are not a party to that agreement. Nothing in these Terms limits liability that cannot be limited under Indian law.",
    ],
  },
  {
    title: "13. Suspension and termination",
    body: [
      "You may stop using EventOrbit and request account deletion at any time from your account settings or by writing to us. We may suspend or terminate an account for a breach of these Terms, a failed or fraudulent verification, or repeated complaints from other users.",
    ],
  },
  {
    title: "14. Changes to these Terms",
    body: [
      "We may update these Terms as the platform develops. We'll change the \"last updated\" date below, and for material changes we'll make a reasonable effort to notify active users.",
    ],
  },
  {
    title: "15. Governing law and contact",
    body: [
      "These Terms are governed by the laws of India, and any dispute will be subject to the jurisdiction of the courts of Maharashtra, India.",
      "For any question or concern about these Terms or your use of EventOrbit, write to hello@eventorbitnova.com. We aim to respond promptly.",
    ],
  },
];

function Terms() {
  return (
    <SiteLayout>
      <PageHeader
        eyebrow="Legal"
        title="Terms of Service"
        description="The rules that govern accounts, listings, bookings and payouts on EventOrbit Nova."
      />
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
          Also see our <Link to="/privacy" className="font-semibold text-brand-violet underline">Privacy Policy</Link>,{" "}
          <Link to="/refund-policy" className="font-semibold text-brand-violet underline">Refund & Cancellation Policy</Link> and{" "}
          <Link to="/partner-terms" className="font-semibold text-brand-violet underline">Partner Terms</Link>.
        </p>
      </article>
    </SiteLayout>
  );
}
