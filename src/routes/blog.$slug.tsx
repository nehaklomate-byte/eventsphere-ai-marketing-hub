import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { SiteLayout } from "@/components/SiteLayout";
import { ArrowLeft, Clock } from "lucide-react";
import { getPost, posts } from "@/lib/blog-posts";

export const Route = createFileRoute("/blog/$slug")({
  loader: ({ params }) => {
    const post = getPost(params.slug);
    if (!post) throw notFound();
    return { post };
  },
  head: ({ loaderData }) => {
    if (!loaderData) {
      return { meta: [{ title: "Guide not found — EventOrbit" }, { name: "robots", content: "noindex" }] };
    }
    const { post } = loaderData;
    return {
      meta: [
        { title: `${post.title} — EventOrbit` },
        { name: "description", content: post.description },
        { property: "og:title", content: post.title },
        { property: "og:description", content: post.description },
        { property: "og:type", content: "article" },
        { name: "twitter:card", content: "summary_large_image" },
      ],
      links: [{ rel: "canonical", href: `/blog/${post.slug}` }],
    };
  },
  notFoundComponent: GuideNotFound,
  component: Post,
});

function Post() {
  const { post } = Route.useLoaderData();
  const others = posts.filter((p) => p.slug !== post.slug).slice(0, 3);
  return (
    <SiteLayout>
      <article className="mx-auto max-w-3xl px-5 md:px-8 py-16 md:py-24">
        <Link to="/blog" className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> All guides
        </Link>
        <div className="mt-6 flex flex-wrap items-center gap-3 text-xs">
          <span className="rounded-full bg-gradient-brand px-2.5 py-1 font-semibold text-white">{post.category}</span>
          <span className="text-muted-foreground">{post.audience}</span>
          <span className="inline-flex items-center gap-1 text-muted-foreground"><Clock className="h-3.5 w-3.5" />{post.readMinutes} min read</span>
        </div>
        <h1 className="mt-4 font-display text-3xl md:text-4xl font-semibold leading-tight">{post.title}</h1>
        <p className="mt-4 text-lg leading-relaxed text-muted-foreground">{post.description}</p>
        <div className="mt-10 space-y-5">
          {post.body.map((block, i) => {
            if ("h" in block) return <h2 key={i} className="pt-4 font-display text-xl md:text-2xl font-semibold">{block.h}</h2>;
            if ("list" in block) return (
              <ul key={i} className="space-y-2">
                {block.list.map((li) => (
                  <li key={li} className="flex gap-2 leading-relaxed text-muted-foreground">
                    <span aria-hidden className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-violet" />
                    <span>{li}</span>
                  </li>
                ))}
              </ul>
            );
            return <p key={i} className="leading-relaxed text-muted-foreground">{block.p}</p>;
          })}
        </div>
        <div className="mt-14 rounded-3xl bg-gradient-brand p-8 text-white shadow-elegant">
          <h2 className="font-display text-xl font-semibold">Put this into practice</h2>
          <p className="mt-2 text-sm text-white/85">Create a free account and keep your enquiries, jobs and payments in one record.</p>
          <Link to="/register" className="mt-5 inline-block rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-brand-navy hover:opacity-90">Get started</Link>
        </div>
        {others.length > 0 && (
          <section className="mt-14">
            <h2 className="font-display text-xl font-semibold">More guides</h2>
            <div className="mt-4 space-y-3">
              {others.map((o) => (
                <Link key={o.slug} to="/blog/$slug" params={{ slug: o.slug }}
                  className="block rounded-2xl border border-border bg-card p-5 shadow-soft hover:shadow-elegant transition">
                  <div className="text-xs text-muted-foreground">{o.category}</div>
                  <div className="mt-1 font-display text-base font-semibold">{o.title}</div>
                </Link>
              ))}
            </div>
          </section>
        )}
      </article>
    </SiteLayout>
  );
}

function GuideNotFound() {
  return (
    <SiteLayout>
      <div className="mx-auto max-w-2xl px-5 py-32 text-center">
        <h1 className="font-display text-3xl font-semibold">We couldn't find that guide.</h1>
        <p className="mt-3 text-muted-foreground">It may have been renamed. All published guides are listed on the index.</p>
        <Link to="/blog" className="mt-6 inline-block rounded-full btn-brand btn-brand-hover px-6 py-3 text-sm font-semibold">Browse all guides</Link>
      </div>
    </SiteLayout>
  );
}
