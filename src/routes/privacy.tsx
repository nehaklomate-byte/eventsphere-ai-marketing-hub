import { createFileRoute } from "@tanstack/react-router";
import { SiteLayout } from "@/components/SiteLayout";
import { PageHeader } from "@/components/PageHeader";
import { BetaNotice } from "@/components/BetaNotice";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy — EventOrbit Nova" },
      { name: "description", content: "How EventOrbit Nova collects, uses, and protects your information." },
      { property: "og:title", content: "Privacy Policy — EventOrbit Nova" },
      { property: "og:description", content: "Our privacy commitments." },
      { property: "og:url", content: "/privacy" },
    ],
    links: [{ rel: "canonical", href: "/privacy" }],
  }),
  component: () => (
    <SiteLayout>
      <PageHeader eyebrow="Legal" title="Privacy Policy" description="Draft — last updated [DATE]. Pending final legal review before publication." />
      <BetaNotice />
      <section className="mx-auto max-w-3xl px-5 md:px-8 py-16 legal-content">
        <p>
          EventOrbit Nova ("we", "us", "our") — currently an early-stage/beta project, ahead of formal company
          registration — operates the EventOrbit Nova website and mobile application (together, the "Platform"), a
          marketplace connecting Customers, Venue Owners, Vendors, Workers, Organizations and Admin users for
          event-related services. This Privacy Policy explains what personal data we collect, why, how we use and
          protect it, and the rights you have over it, in accordance with the Digital Personal Data Protection Act,
          2023 and other applicable Indian law.
        </p>

        <h2>1. Information We Collect</h2>
        <ul>
          <li>Account information: name, mobile number, email, password/OTP credentials, city/location.</li>
          <li>Role-specific verification information: for Venue Owners, Vendors, Workers and Organizations — government ID proof (e.g., Aadhaar/PAN), business registration/GST numbers, ownership/lease documents, bank account/UPI details, and portfolio material.</li>
          <li>Booking and transaction information: event details, service requests, task assignments, payment amounts and status, invoices.</li>
          <li>Location data: for near-me search and mapping of venues/service areas (with permission).</li>
          <li>Communications: messages exchanged through in-platform chat tied to a booking, and support/chatbot conversations.</li>
          <li>Device and usage data: IP address, device identifiers, app usage analytics, cookies (on web).</li>
        </ul>

        <h2>2. Why We Collect It (Purpose Limitation)</h2>
        <ul>
          <li>To create and verify accounts, and to display the "Verified" badge only for Venue Owners, Vendors, Workers and Organizations who pass document verification.</li>
          <li>To enable bookings, task assignment, payments and communication between the relevant parties to an event.</li>
          <li>To send booking, task, and payment notifications.</li>
          <li>To improve search relevance and provide the AI assistant's recommendations.</li>
          <li>To detect fraud, resolve disputes, and comply with legal obligations.</li>
          <li>We do not use your verification documents for any purpose other than verification, fraud prevention and legal compliance.</li>
        </ul>

        <h2>3. Consent</h2>
        <p>
          We collect and process your personal data only after obtaining your clear, informed consent (or another
          lawful basis recognized under the DPDP Act, 2023, such as a legitimate use directly connected to the
          service you have requested). You may withdraw consent at any time through your account settings, subject
          to the effect this may have on your ability to use the Platform (e.g., withdrawing consent for document
          verification will mean your account cannot remain in "Verified" status).
        </p>

        <h2>4. How We Share Information</h2>
        <ul>
          <li>With the other party to a specific booking/task (e.g., a customer's event details are shared only with the venue owner/vendor/worker assigned to that event, not with unrelated users).</li>
          <li>With payment gateway/aggregator partners strictly to process payments and payouts.</li>
          <li>With Admin, for verification review, dispute resolution, and platform safety.</li>
          <li>With law enforcement or regulators where legally required.</li>
          <li>We do not sell personal data to third parties for advertising.</li>
        </ul>

        <h2>5. Data Retention &amp; Deletion</h2>
        <p>
          We retain account and transaction data for as long as the account is active and as required by applicable
          law (e.g., financial records for the period mandated under tax/company law). Verification documents are
          retained only as long as necessary for verification and legal record-keeping, after which they are
          securely deleted or anonymized. You may request deletion of your account and associated data from your
          account settings, subject to retention obligations under law.
        </p>

        <h2>6. Your Rights</h2>
        <ul>
          <li>Right to access the personal data we hold about you.</li>
          <li>Right to correct inaccurate or incomplete data.</li>
          <li>Right to withdraw consent.</li>
          <li>Right to grievance redressal through our Grievance Officer (see Section 9).</li>
          <li>Right to nominate another individual to exercise these rights on your behalf in the event of death or incapacity, as provided under the DPDP Act, 2023.</li>
        </ul>

        <h2>7. Security</h2>
        <p>
          We use reasonable technical and organizational safeguards — encryption in transit and at rest for
          sensitive documents, role-based access control, and regular security reviews — to protect your data. No
          system is 100% secure, and we will notify affected users and the relevant authority of any data breach as
          required by law.
        </p>

        <h2>8. Children's Data</h2>
        <p>
          The Platform is intended for users who are 18 years or older (or the age of majority in their
          jurisdiction). We do not knowingly collect data from minors. Organization-role events involving student
          participants under 18 (e.g., school-level events) must be registered and managed by an adult authorized
          representative of the Organization.
        </p>

        <h2>9. Grievance Officer</h2>
        <p>
          In accordance with the Information Technology Act, 2000 and rules made thereunder, the contact details of
          our Grievance Officer are: [Name], [Designation], [Email], [Address]. Complaints will be acknowledged
          within 24 hours and resolved within 15 days, as prescribed.
        </p>

        <h2>10. Changes to this Policy</h2>
        <p>
          We may update this Privacy Policy from time to time. Material changes will be notified to you through the
          Platform or via email before they take effect.
        </p>

        <p className="text-sm italic text-muted-foreground">
          This is a structural draft prepared for planning purposes and must be reviewed and finalized by a lawyer
          licensed in India before relying on it as your published policy.
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
