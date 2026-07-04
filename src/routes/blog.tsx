import { createFileRoute } from "@tanstack/react-router";
import { SiteLayout } from "@/components/SiteLayout";
import { PageHeader } from "@/components/PageHeader";
import { ChevronRight } from "lucide-react";

const posts = [
  { title: "The 2026 State of Indian Event Operations", tag: "Report", date: "Mar 2026", img: "https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=1200&q=70" },
  { title: "How AI is Rewriting the Wedding Playbook", tag: "AI", date: "Feb 2026", img: "https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1200&q=70" },
  { title: "A Framework for Hall Occupancy Growth", tag: "Playbook", date: "Jan 2026", img: "https://images.unsplash.com/photo-1519167758481-83f550bb49b3?auto=format&fit=crop&w=1200&q=70" },
  { title: "Vendor Payouts That Don't Break Trust", tag: "Ops", date: "Dec 2025", img: "https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&w=1200&q=70" },
  { title: "Designing Run-of-Show for 10,000 Attendees", tag: "Design", date: "Nov 2025", img: "https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?auto=format&fit=crop&w=1200&q=70" },
  { title: "Government Events: A Compliance Handbook", tag: "Compliance", date: "Oct 2025", img: "https://images.unsplash.com/photo-1505373877841-8d25f7d46678?auto=format&fit=crop&w=1200&q=70" },
];

export const Route = createFileRoute("/blog")({
  head: () => ({
    meta: [
      { title: "Blog — EventSphere AI" },
      { name: "description", content: "Ideas, research and playbooks for teams running unforgettable events." },
      { property: "og:title", content: "Blog — EventSphere AI" },
      { property: "og:description", content: "Ideas, research and playbooks from the EventSphere team." },
      { property: "og:url", content: "/blog" },
    ],
    links: [{ rel: "canonical", href: "/blog" }],
  }),
  component: () => (
    <SiteLayout>
      <PageHeader eyebrow="Blog" title="Ideas, research and playbooks." description="What we're learning while building the operating system for events." />
      <section className="mx-auto max-w-7xl px-5 md:px-8 py-20 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {posts.map((p) => (
          <article key={p.title} className="group overflow-hidden rounded-3xl border border-border bg-card shadow-soft hover:shadow-elegant transition">
            <div className="relative h-48 overflow-hidden">
              <img src={p.img} alt={p.title} loading="lazy" className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" />
              <span className="absolute left-3 top-3 rounded-full glass-strong text-white text-[10px] font-semibold px-2 py-1">{p.tag}</span>
            </div>
            <div className="p-5">
              <div className="text-xs text-muted-foreground">{p.date}</div>
              <h3 className="mt-1 font-display text-lg font-semibold leading-snug">{p.title}</h3>
              <div className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-brand-violet">Read article <ChevronRight className="h-4 w-4" /></div>
            </div>
          </article>
        ))}
      </section>
    </SiteLayout>
  ),
});
