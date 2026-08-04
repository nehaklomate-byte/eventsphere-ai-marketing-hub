import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteLayout } from "@/components/SiteLayout";
import { PageHeader } from "@/components/PageHeader";
import { ChevronRight, Clock } from "lucide-react";
import { posts } from "@/lib/blog-posts";

export const Route = createFileRoute("/blog")({
  head: () => ({
    meta: [
      { title: "Field Notes — Practical Guides for Event Operations" },
      { name: "description", content: "Working guides for venue owners, vendors, event workers and families planning a function — checklists, scope templates and the questions that prevent disputes." },
      { property: "og:title", content: "Field Notes — Practical Guides for Event Operations" },
      { property: "og:description", content: "Checklists and guides written for the people who run events, not for search engines." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:url", content: "/blog" },
    ],
    links: [{ rel: "canonical", href: "/blog" }],
  }),
  component: Blog,
});

function Blog() {
  return (
    <SiteLayout>
      <PageHeader
        eyebrow="Field notes"
        title="Practical guides for the people who run events."
        description="No industry statistics we cannot source and no trend pieces. These are checklists and templates you can use on your next booking."
      />
      <section className="mx-auto max-w-5xl px-5 md:px-8 py-20 space-y-5">
        {posts.map((p) => (
          <article key={p.slug} className="rounded-3xl border border-border bg-card p-6 md:p-8 shadow-soft hover:shadow-elegant transition">
            <div className="flex flex-wrap items-center gap-3 text-xs">
              <span className="rounded-full bg-gradient-brand px-2.5 py-1 font-semibold text-white">{p.category}</span>
              <span className="text-muted-foreground">{p.audience}</span>
              <span className="inline-flex items-center gap-1 text-muted-foreground"><Clock className="h-3.5 w-3.5" />{p.readMinutes} min read</span>
            </div>
            <h2 className="mt-4 font-display text-2xl font-semibold leading-snug">
              <Link to="/blog/$slug" params={{ slug: p.slug }} className="hover:text-brand-violet">{p.title}</Link>
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{p.description}</p>
            <Link to="/blog/$slug" params={{ slug: p.slug }} className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-brand-violet hover:opacity-80">
              Read the guide <ChevronRight className="h-4 w-4" />
            </Link>
          </article>
        ))}
      </section>
    </SiteLayout>
  );
}
