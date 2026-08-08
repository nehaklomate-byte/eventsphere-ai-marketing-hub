import { createFileRoute } from "@tanstack/react-router";
import { SiteLayout } from "@/components/SiteLayout";
import { PageHeader } from "@/components/PageHeader";
import { BetaNotice } from "@/components/BetaNotice";

export const Route = createFileRoute("/partner-terms")({
  head: () => ({
    meta: [
      { title: "Partner Terms — EventOrbit Nova" },
      { name: "description", content: "Key terms for Vendors, Workers and Venue Owners partnering with EventOrbit Nova." },
      { property: "og:title", content: "Partner Terms — EventOrbit Nova" },
      { property: "og:url", content: "/partner-terms" },
    ],
    links: [{ rel: "canonical", href: "/partner-terms" }],
  }),
  component: () => (
    <SiteLayout>
      <PageHeader eyebrow="Legal" title="Partner Terms" description="Draft — key clauses for Vendors, Workers and Venue Owners. A full digitally-signed Partner Agreement covering these terms in detail is planned; this page is the interim acceptance record shown at verification submission." />
      <BetaNotice />
      <section className="mx-auto max-w-3xl px-5 md:px-8 py-16 legal-content">
        <p>
          By submitting your profile for verification as a Vendor, Worker, or Venue Owner on EventOrbit Nova, you agree
          to the following key terms, in addition to our general <a href="/terms">Terms &amp; Conditions</a>:
        </p>

        <h2>1. Independent Contractor Status</h2>
        <p>You are an independent service provider. You are not an employee, agent, or legal representative of EventOrbit Nova (operating as an early-stage/beta project ahead of formal company registration).</p>

        <h2>2. Commission Structure</h2>
        <p>EventOrbit Nova charges a commission/service fee on successful bookings, as disclosed to you at the time of each transaction. The exact percentage may vary by category and is shown before you accept a booking.</p>

        <h2>3. Payout Schedule</h2>
        <p>Payouts are released to your registered UPI/bank details within the timeframe disclosed in your dashboard, after the relevant task or booking is confirmed complete.</p>

        <h2>4. Verification &amp; Continued Compliance</h2>
        <p>You agree to keep your documents, licenses, and business details current, and to promptly update the Platform on any material change (e.g., license renewal, change in ownership). Your Verified status may be reviewed or revoked if this information becomes outdated or inaccurate.</p>

        <h2>5. Service Standards</h2>
        <p>You agree to maintain reasonable standards of timeliness and professionalism, and not to subcontract a verified task to any unverified individual without disclosure.</p>

        <h2>6. Off-Platform Circumvention</h2>
        <p>You agree not to direct a customer you connected with through EventOrbit Nova to transact outside the Platform for the same event in order to avoid the commission. Doing so may result in suspension of your account.</p>

        <h2>7. Data Use</h2>
        <p>You consent to EventOrbit Nova displaying your public profile, ratings, reviews, and portfolio material on the Platform for the purpose of operating the marketplace, as described in our <a href="/privacy">Privacy Policy</a>.</p>

        <h2>8. Termination</h2>
        <p>Your partner status may be suspended or terminated for verification lapse, repeated poor ratings, fraud, or violation of these terms, with an appeals process available through platform support.</p>

        <h2>9. Indemnity</h2>
        <p>You agree to indemnify EventOrbit Nova (operating as an early-stage/beta project ahead of formal company registration) against claims arising from your own service delivery (e.g., issues with food safety, décor installation, or work performed).</p>

        <p className="text-sm italic text-muted-foreground">
          This is a structural draft. A full, digitally-signed Partner Agreement covering these clauses in complete
          legal detail is planned separately and will supersede this page once available.
        </p>

        <style>{`
          .legal-content h2 { font-size: 1.15rem; font-weight: 600; margin-top: 1.75rem; margin-bottom: 0.5rem; }
          .legal-content h2:first-of-type { margin-top: 1.5rem; }
          .legal-content p { margin-bottom: 1rem; line-height: 1.7; color: var(--foreground); }
          .legal-content a { color: var(--brand-violet); text-decoration: underline; }
        `}</style>
      </section>
    </SiteLayout>
  ),
});
