import { Link } from "@tanstack/react-router";
import { Github, Linkedin, Twitter, Instagram, Youtube, Mail } from "lucide-react";
import { Logo } from "./Logo";

const cols = [
  {
    title: "Company",
    links: [
      { to: "/about", label: "About" },
      { to: "/research", label: "Research" },
      { to: "/blog", label: "Blog" },
      { to: "/contact", label: "Contact" },
    ],
  },
  {
    title: "Product",
    links: [
      { to: "/features", label: "Features" },
      { to: "/solutions", label: "Solutions" },
      { to: "/marketplace", label: "Marketplace" },
      { to: "/pricing", label: "Pricing" },
    ],
  },
  {
    title: "Resources",
    links: [
      { to: "/blog", label: "Guides" },
      { to: "/research", label: "Case Studies" },
      { to: "/contact", label: "Support" },
      { to: "/register", label: "Early Access" },
    ],
  },
  {
    title: "Legal",
    links: [
      { to: "/privacy", label: "Privacy Policy" },
      { to: "/terms", label: "Terms of Service" },
    ],
  },
] as const;

export function Footer() {
  return (
    <footer className="relative mt-24 border-t border-border bg-gradient-brand-soft">
      <div className="mx-auto max-w-7xl px-5 md:px-8 py-16">
        <div className="grid gap-12 md:grid-cols-6">
          <div className="md:col-span-2">
            <Logo className="h-10" />
            <p className="mt-4 max-w-sm text-sm text-muted-foreground">
              One intelligent cloud platform to plan, manage and execute every event — from intimate weddings to enterprise summits.
            </p>
            <div className="mt-6 flex items-center gap-3">
              {[Twitter, Linkedin, Instagram, Youtube, Github].map((Icon, i) => (
                <a key={i} href="#" aria-label="social" className="grid h-9 w-9 place-items-center rounded-full border border-border hover:bg-accent transition-colors">
                  <Icon className="h-4 w-4" />
                </a>
              ))}
            </div>
          </div>
          {cols.map((c) => (
            <div key={c.title}>
              <div className="text-sm font-semibold text-foreground">{c.title}</div>
              <ul className="mt-4 space-y-2.5">
                {c.links.map((l) => (
                  <li key={l.label}>
                    <Link to={l.to} className="text-sm text-muted-foreground hover:text-foreground">{l.label}</Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-14 flex flex-col-reverse items-start justify-between gap-4 border-t border-border pt-6 md:flex-row md:items-center">
          <p className="text-xs text-muted-foreground">© {new Date().getFullYear()} EventSphere AI. All rights reserved.</p>
          <a href="mailto:hello@eventsphere.ai" className="inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground">
            <Mail className="h-3.5 w-3.5" /> hello@eventsphere.ai
          </a>
        </div>
      </div>
    </footer>
  );
}
