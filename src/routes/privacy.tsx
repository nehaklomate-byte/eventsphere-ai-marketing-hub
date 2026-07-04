import { createFileRoute } from "@tanstack/react-router";
import { SiteLayout } from "@/components/SiteLayout";
import { PageHeader } from "@/components/PageHeader";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy — EventSphere AI" },
      { name: "description", content: "How EventSphere AI collects, uses, and protects your information." },
      { property: "og:title", content: "Privacy Policy — EventSphere AI" },
      { property: "og:description", content: "Our privacy commitments." },
      { property: "og:url", content: "/privacy" },
    ],
    links: [{ rel: "canonical", href: "/privacy" }],
  }),
  component: () => (
    <SiteLayout>
      <PageHeader eyebrow="Legal" title="Privacy Policy" description="Last updated July 4, 2026" />
      <section className="mx-auto max-w-3xl px-5 md:px-8 py-16 prose prose-neutral dark:prose-invert">
        <p>EventSphere AI ("we", "us", "our") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, and safeguard information when you use our services.</p>
        <h2>Information we collect</h2>
        <p>Account information such as name and email, event operational data you provide, and usage telemetry to improve the product.</p>
        <h2>How we use information</h2>
        <p>To provide, secure and improve our services, and to communicate important updates. We never sell your data.</p>
        <h2>Data protection</h2>
        <p>We encrypt data in transit and at rest, use role-based access controls, and follow SOC 2-aligned practices.</p>
        <h2>Your rights</h2>
        <p>You may request access, correction or deletion of your data at any time by emailing privacy@eventsphere.ai.</p>
        <h2>Contact</h2>
        <p>Questions? Reach us at privacy@eventsphere.ai.</p>
      </section>
    </SiteLayout>
  ),
});
