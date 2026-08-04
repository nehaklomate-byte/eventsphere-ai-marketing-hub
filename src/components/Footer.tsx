import { Link } from "@tanstack/react-router";
import { Mail } from "lucide-react";
import { Logo } from "./Logo";

const cols = [
  {
    title: "Platform",
    links: [
      { to: "/features", label: "Features" },
      { to: "/solutions", label: "Solutions" },
      { to: "/marketplace", label: "Marketplace" },
      { to: "/research", label: "Roadmap" },
    ],
  },
  {
    title: "Company",
    links: [
      { to: "/about", label: "About" },
      { to: "/blog", label: "Field notes" },
      { to: "/contact", label: "Contact" },
    ],
  },
  {
    title: "Get started",
    links: [
      { to: "/register", label: "Create an account" },
      { to: "/login", label: "Sign in" },
      { to: "/privacy", label: "Privacy Policy" },
      { to: "/terms", label: "Terms of Service" },
    ],
  },
] as const;

export function Footer() {
  return (
    <footer className="relative mt-24 border-t border-border bg-gradient-brand-soft">
      <div className="mx-auto max-w-7xl px-5 md:px-8 py-16">
        <div className="grid gap-12 md:grid-cols-5">
          <div className="md:col-span-2">
            <Logo className="h-10" />
            <p className="mt-4 max-w-sm text-sm text-muted-foreground">
              One workspace for venues, vendors, event workers and the teams that hire them — verified listings, assigned jobs and payment records in one place.
            </p>
            <p className="mt-4 text-xs text-muted-foreground">
              Early access. Free to create an account and get listed while we onboard our first partners.
            </p>
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
          <p className="text-xs text-muted-foreground">© {new Date().getFullYear()} EventOrbit. All rights reserved.</p>
          <Link to="/contact" className="inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground">
            <Mail className="h-3.5 w-3.5" /> Contact the team
          </Link>
        </div>
      </div>
    </footer>
  );
}
