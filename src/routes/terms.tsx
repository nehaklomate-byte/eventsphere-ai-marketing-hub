import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteLayout } from "@/components/SiteLayout";
import { PageHeader } from "@/components/PageHeader";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms & Conditions — EventOrbit Nova" },
      { name: "description", content: "The terms that govern using the EventOrbit Nova marketplace." },
      { property: "og:title", content: "Terms & Conditions — EventOrbit Nova" },
      { property: "og:description", content: "Our terms of service." },
      { property: "og:url", content: "/terms" },
    ],
    links: [{ rel: "canonical", href: "/terms" }],
  }),
  component: () => (
    <SiteLayout>
      <PageHeader eyebrow="Legal" title="Terms & Conditions" description={`Last updated ${new Date().toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}.`} />
      <section className="mx-auto max-w-3xl px-5 md:px-8 py-16 legal-content">
        <p>
          These Terms & Conditions ("Terms") govern your access to and use of the EventOrbit Nova platform, currently
          operated as an early-stage/beta project by its founder(s) ("Company", "we", "us"). Formal company
          registration (CIN), a registered office address, and a signed legal review are in progress — this section
          will be updated with those details, replacing the [CIN NUMBER]/[ADDRESS] placeholders below, before public
          launch. By registering on the Platform, you agree to these Terms.
        </p>

        <h2>1. Role of the Platform</h2>
        <p>
          EventOrbit Nova is an intermediary marketplace platform that connects Customers, Organizations, Venue
          Owners, Vendors and Workers. We facilitate discovery, booking, task assignment and payment routing between
          these parties. We are not the provider of catering, decoration, venue, or any other event service — the
          actual service is provided directly by the respective Venue Owner, Vendor, or Worker, who is solely
          responsible for the quality, safety, legality and timely delivery of their service.
        </p>

        <h2>2. Eligibility &amp; Account Registration</h2>
        <ul>
          <li>You must be 18 years or older and capable of entering into a binding contract under the Indian Contract Act, 1872 to register.</li>
          <li>You must provide accurate, current and complete information during registration and verification.</li>
          <li>Venue Owners, Vendors, Workers and Organizations must complete document-based verification before their profile becomes visible/bookable. The Company reserves the right to approve, reject, suspend, or revoke verified status at its sole discretion, with reasons communicated to the user.</li>
          <li>You are responsible for maintaining the confidentiality of your account credentials.</li>
        </ul>

        <h2>3. Bookings, Orders &amp; Task Assignments</h2>
        <ul>
          <li>A booking/order is confirmed only when accepted by the relevant Venue Owner/Vendor and, where applicable, payment (advance or full) is made through the Platform.</li>
          <li>Task assignments between Vendors/Venue Owners/Organizations and Workers are agreements between those parties; the Platform provides the tool for assignment and tracking but is not a party to the underlying service contract.</li>
          <li>Cancellation and rescheduling are governed by our <Link to="/refund-policy">Refund & Cancellation Policy</Link>.</li>
        </ul>

        <h2>4. Payments</h2>
        <ul>
          <li>All payments on the Platform are processed through our authorized payment gateway/aggregator partner(s). The Company does not store your full card/bank credentials.</li>
          <li>The Company charges a commission/service fee on successful bookings/orders, as disclosed at the time of transaction.</li>
          <li>Payouts to Venue Owners, Vendors and Workers are made as per the payout schedule disclosed on the Platform, subject to successful completion/verification of the relevant task or booking.</li>
        </ul>

        <h2>5. User Conduct</h2>
        <ul>
          <li>Do not circumvent the Platform to avoid fees by taking a discovered connection off-platform for the same transaction.</li>
          <li>Do not upload false, fraudulent, or misleading documents during verification.</li>
          <li>Do not post content that is unlawful, defamatory, obscene, or infringes any third party's rights.</li>
          <li>Do not use the Platform for any purpose other than genuine event-related discovery, booking, and execution.</li>
        </ul>

        <h2>6. Ratings, Reviews &amp; Content</h2>
        <p>
          Users may submit ratings and reviews after a completed booking/task. Reviews must reflect genuine
          experience. The Company may remove reviews that are fraudulent, abusive, or violate these Terms, and
          reserves rights over user-generated content solely to the extent needed to operate and promote the
          Platform.
        </p>

        <h2>7. Intellectual Property</h2>
        <p>
          The EventOrbit Nova name, logo, and platform technology are the property of the Company. Users retain
          ownership of content they upload (photos, portfolios, descriptions) but grant the Company a license to
          display this content on the Platform for the purpose of operating the marketplace.
        </p>

        <h2>8. Limitation of Liability</h2>
        <p>
          To the maximum extent permitted by law, the Company's liability is limited to the commission/fee received
          for the specific transaction in question. The Company is not liable for the acts, omissions, quality of
          service, or conduct of any Venue Owner, Vendor, Worker, Organization or Customer. Disputes regarding the
          quality or delivery of the underlying event service are primarily between the transacting parties, with
          the Company providing a grievance/dispute-resolution mechanism as described in Section 9.
        </p>

        <h2>9. Grievance Redressal &amp; Dispute Resolution</h2>
        <p>
          Complaints can be raised through the in-app support/dispute center or with our Grievance Officer at
          [Email]. We aim to acknowledge within 24 hours and resolve within 15 days. Unresolved disputes shall be
          referred to arbitration under the Arbitration and Conciliation Act, 1996, seated at [City], with the
          courts at [City] having exclusive jurisdiction, subject to final legal review.
        </p>

        <h2>10. Termination</h2>
        <p>
          The Company may suspend or terminate any account for violation of these Terms, fraudulent activity, or
          repeated user complaints, with notice and reason wherever practicable.
        </p>

        <h2>11. Governing Law</h2>
        <p>These Terms are governed by the laws of India.</p>

        <p className="text-sm italic text-muted-foreground">
          This is a structural draft prepared for planning purposes — the intermediary/facilitator liability
          language, dispute resolution/arbitration clause, and governing law/jurisdiction clause must be finalized
          by a lawyer licensed in India before relying on it as your published Terms.
        </p>

        <style>{`
          .legal-content h2 { font-family: var(--font-display, inherit); font-size: 1.25rem; font-weight: 600; margin-top: 2rem; margin-bottom: 0.75rem; }
          .legal-content h2:first-child { margin-top: 0; }
          .legal-content p { margin-bottom: 1rem; line-height: 1.7; color: var(--foreground); }
          .legal-content ul { list-style: disc; padding-left: 1.5rem; margin-bottom: 1rem; }
          .legal-content li { margin-bottom: 0.5rem; line-height: 1.7; }
          .legal-content a { color: var(--brand-violet); text-decoration: underline; }
        `}</style>
      </section>
    </SiteLayout>
  ),
});
