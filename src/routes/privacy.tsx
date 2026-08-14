
import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteLayout } from "@/components/SiteLayout";
import { PageHeader } from "@/components/PageHeader";
import { BetaNotice } from "@/components/BetaNotice";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy — EventOrbit Nova" },
      { name: "description", content: "What information EventOrbit Nova collects, why, how it's stored, and the controls you have over it." },
      { property: "og:title", content: "Privacy Policy — EventOrbit Nova" },
      { property: "og:description", content: "What we collect, why, and the controls you have over your data." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:url", content: "/privacy" },
      { name: "robots", content: "noindex" },
    ],
    links: [{ rel: "canonical", href: "/privacy" }],
  }),
  component: Privacy,
});

type Section = { title: string; body: string[] };

const sections: Section[] = [
  {
    title: "1. What this policy covers",
    body: [
      "This Privacy Policy explains what information EventOrbit Nova (\"EventOrbit\", \"we\", \"us\") collects when you use our website and app, why we collect it, and the choices you have. EventOrbit is registered under the Maharashtra Shops and Establishments Act, 2017 and operates from Maharashtra, India.",
    ],
  },
  {
    title: "2. Information you give us",
    body: [
      "Account basics: your name, email, phone number, and — if you add them — an alternate phone number, date of birth, gender, username and profile photo.",
      "Verification details, for Venue Owner, Vendor and Worker accounts: business or property information, portfolio photos, and — for Workers — ID proof, a selfie and an emergency contact, submitted so our team can review and approve your listing.",
      "Booking and job details: enquiry information such as event date and guest count, job assignment records, status updates, completion notes, and — where a worker chooses to share it — a check-in/check-out photo and location for a job, and photos of completed work.",
      "Payment and payout details: if you pay online, our payment gateway provider directly collects your card, UPI or netbanking details — we don't see or store those; we only receive a payment reference, amount and status. If you're a Venue Owner, Vendor or Worker, we also store the UPI ID you add so we know where to send a payout.",
      "Messages you send through in-app chat, and anything you submit through our contact form.",
      "If you sign up or sign in with Google, we receive the basic profile information (name, email) Google shares with us for that purpose.",
    ],
  },
  {
    title: "3. Information collected automatically",
    body: [
      "We use an essential cookie to keep you signed in, and a basic analytics cookie to understand how the site is used, as described in the cookie banner shown on your first visit. You can find more detail in the cookie notice itself.",
      "Standard technical information — such as browser type, device type and IP address — may be logged for security and troubleshooting purposes.",
    ],
  },
  {
    title: "4. How we use this information",
    body: [
      "To run the marketplace: creating and displaying your profile, matching enquiries with venues, vendors and workers, and keeping a shared record of jobs and their status.",
      "To verify Venue Owner, Vendor and Worker accounts before a listing goes public.",
      "To send you notifications you've asked for (push, email or SMS, depending on the channels you enable) about bookings, jobs, messages and payments.",
      "To calculate commission and payouts, respond to support requests, investigate reports of misuse, and meet our legal obligations.",
    ],
  },
  {
    title: "5. Who your information is shared with",
    body: [
      "With other users, only as needed to make the platform work — for example, your enquiry details are shared with the venue you contacted, and a job's location is shared with the worker assigned to it.",
      "With service providers who help us run the platform, such as our database, hosting and file storage provider, our payment gateway provider for online payments, and, where enabled, email/SMS/push notification providers — under obligations to protect your data and use it only to provide that service to us.",
      "We don't sell your personal information, and we don't share it with advertisers.",
      "We may disclose information if required by law, or to protect the safety, rights or property of EventOrbit or our users.",
    ],
  },
  {
    title: "6. How your information is stored",
    body: [
      "Your data is stored in a managed database and file storage service, with row-level access rules so an account can only read its own records, and verification documents kept in private storage rather than public folders.",
      "No online service can guarantee perfect security, but we take reasonable, industry-standard steps to protect your information.",
    ],
  },
  {
    title: "7. Your controls",
    body: [
      "From your account settings, you can choose whether your mobile number or email is shown on your public profile, whether you're visible in search, whether direct chat or calls are allowed, and which notifications you receive on which channel.",
      "You can request account deletion from your account settings at any time; we'll process the request and remove or anonymise your personal information, except where we need to keep certain records (for example, completed booking or payment records) for legal or accounting reasons.",
      "To access, correct or ask questions about your information, write to hello@eventorbitnova.com.",
    ],
  },
  {
    title: "8. How long we keep information",
    body: [
      "We keep account information for as long as your account is active, and booking, job and payment records for as long as reasonably needed for support, dispute resolution, and any applicable legal or accounting requirement, even after an account is deleted.",
    ],
  },
  {
    title: "9. Children",
    body: [
      "EventOrbit is not intended for anyone under 18, and we don't knowingly collect information from children.",
    ],
  },
  {
    title: "10. Changes to this policy",
    body: [
      "We may update this Privacy Policy as the platform develops. We'll change the \"last updated\" date below, and for material changes we'll make a reasonable effort to notify active users.",
    ],
  },
  {
    title: "11. Contact",
    body: [
      "For any question, request or concern about your data or this policy, write to hello@eventorbitnova.com. We aim to respond promptly.",
    ],
  },
];

function Privacy() {
  return (
    <SiteLayout>
      <PageHeader
        eyebrow="Legal"
        title="Privacy Policy"
        description="What we collect, why we collect it, and the controls you have over your information."
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
          <Link to="/refund-policy" className="font-semibold text-brand-violet underline">Refund & Cancellation Policy</Link> and{" "}
          <Link to="/partner-terms" className="font-semibold text-brand-violet underline">Partner Terms</Link>.
        </p>
      </article>
    </SiteLayout>
  );
}
