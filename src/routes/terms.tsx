import { createFileRoute } from "@tanstack/react-router";
import { SiteLayout } from "@/components/SiteLayout";
import { PageHeader } from "@/components/PageHeader";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms of Service — EventSphere AI" },
      { name: "description", content: "The terms governing your use of EventSphere AI." },
      { property: "og:title", content: "Terms of Service — EventSphere AI" },
      { property: "og:description", content: "Our terms of service." },
      { property: "og:url", content: "/terms" },
    ],
    links: [{ rel: "canonical", href: "/terms" }],
  }),
  component: () => (
    <SiteLayout>
      <PageHeader eyebrow="Legal" title="Terms of Service" description="Last updated July 4, 2026" />
      <section className="mx-auto max-w-3xl px-5 md:px-8 py-16 prose prose-neutral dark:prose-invert">
        <p>By accessing or using EventSphere AI, you agree to these Terms of Service. Please read them carefully.</p>
        <h2>Use of service</h2>
        <p>You must comply with all applicable laws and use the service only for lawful purposes.</p>
        <h2>Accounts</h2>
        <p>You are responsible for safeguarding your account credentials and any activity under your account.</p>
        <h2>Payments</h2>
        <p>Paid plans will be governed by additional terms shared at checkout. Payment processing is coming soon.</p>
        <h2>Termination</h2>
        <p>We may suspend or terminate access for violations of these terms. You may cancel at any time.</p>
        <h2>Contact</h2>
        <p>Questions? Reach us at legal@eventsphere.ai.</p>
      </section>
    </SiteLayout>
  ),
});
