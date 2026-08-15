import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteLayout } from "@/components/SiteLayout";
import { PageHeader } from "@/components/PageHeader";

export const Route = createFileRoute("/refund-policy")({
  head: () => ({
    meta: [
      { title: "Refund & Cancellation Policy — EventOrbit Nova" },
      { name: "description", content: "How cancellations and refunds work on EventOrbit Nova." },
      { property: "og:title", content: "Refund & Cancellation Policy — EventOrbit Nova" },
      { property: "og:description", content: "Our refund and cancellation terms." },
      { property: "og:url", content: "/refund-policy" },
    ],
    links: [{ rel: "canonical", href: "/refund-policy" }],
  }),
  component: () => (
    <SiteLayout>
      <PageHeader eyebrow="Legal" title="Refund & Cancellation Policy" description={`Last updated ${new Date().toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}.`} />
      <section className="mx-auto max-w-3xl px-5 md:px-8 py-16">
        <div className="legal-content">
          <p>
            This policy explains what happens to your payment when a booking or task on EventOrbit Nova is cancelled,
            rescheduled, or not completed as agreed. It applies alongside our <Link to="/terms">Terms & Conditions</Link>.
          </p>
        </div>

        <div className="mt-8 overflow-x-auto rounded-2xl border border-border">
          <table className="w-full text-sm">
            <thead className="bg-accent/40 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-5 py-3">Scenario</th>
                <th className="px-5 py-3">Refund to customer</th>
                <th className="px-5 py-3">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              <tr>
                <td className="px-5 py-4 font-medium">Customer cancels 15+ days before event</td>
                <td className="px-5 py-4">90–100% of advance</td>
                <td className="px-5 py-4 text-muted-foreground">Platform fee may be non-refundable. Encourages early, honest planning.</td>
              </tr>
              <tr>
                <td className="px-5 py-4 font-medium">Customer cancels 7–14 days before event</td>
                <td className="px-5 py-4">50% of advance</td>
                <td className="px-5 py-4 text-muted-foreground">—</td>
              </tr>
              <tr>
                <td className="px-5 py-4 font-medium">Customer cancels &lt;7 days before event</td>
                <td className="px-5 py-4">0–25% of advance</td>
                <td className="px-5 py-4 text-muted-foreground">The venue/vendor has likely already blocked the date/resources.</td>
              </tr>
              <tr>
                <td className="px-5 py-4 font-medium">Venue Owner / Vendor cancels after confirmation</td>
                <td className="px-5 py-4">100% refund</td>
                <td className="px-5 py-4 text-muted-foreground">Platform may offer a rebooking credit. Repeated cancellations trigger a review of verified status.</td>
              </tr>
              <tr>
                <td className="px-5 py-4 font-medium">Task not completed / completed unsatisfactorily by Worker</td>
                <td className="px-5 py-4">Partial or full refund of that task's payment</td>
                <td className="px-5 py-4 text-muted-foreground">After dispute review — photos and chat logs are considered by Admin.</td>
              </tr>
              <tr>
                <td className="px-5 py-4 font-medium">Force majeure (natural disaster, government restriction, etc.)</td>
                <td className="px-5 py-4">Full refund or reschedule credit</td>
                <td className="px-5 py-4 text-muted-foreground">No cancellation penalty on either side.</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="legal-content mt-8">
          <h2>How refunds are processed</h2>
          <p>
            Approved refunds are issued to the original payment method through our payment gateway partner. Processing
            typically takes 5–7 business days depending on your bank, after Admin approves the refund.
          </p>
          <h2>Disputed tasks and bookings</h2>
          <p>
            If you believe a task or booking wasn't delivered as agreed, raise a dispute from the booking/task detail
            page within 48 hours of the scheduled completion time. Our Admin team reviews evidence (photos, check-in/
            check-out records, chat logs) from both sides before deciding on a refund.
          </p>
          <p className="text-sm italic text-muted-foreground">
            This is a structural draft prepared for planning purposes — exact refund percentages and windows must be
            finalized against our real vendor/venue contracts and reviewed by a lawyer before publication.
          </p>
        </div>

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
