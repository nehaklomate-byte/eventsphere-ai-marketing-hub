import { Link, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import { Logo } from "./Logo";

const nav = [
  { to: "/", label: "Home" },
  { to: "/features", label: "Features" },
  { to: "/solutions", label: "Solutions" },
  { to: "/marketplace", label: "Marketplace" },
  { to: "/pricing", label: "Pricing" },
  { to: "/research", label: "Research" },
  { to: "/blog", label: "Blog" },
  { to: "/about", label: "About" },
  { to: "/contact", label: "Contact" },
] as const;

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const { location } = useRouterState();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => { setOpen(false); }, [location.pathname]);

  return (
    <header className={`sticky top-0 z-50 transition-all ${scrolled ? "glass-strong shadow-soft" : "bg-transparent"}`}>
      <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-3 md:px-8">
        <Logo className="h-8 md:h-9" />
        <nav className="hidden lg:flex items-center gap-1">
          {nav.map((n) => {
            const active = location.pathname === n.to;
            return (
              <Link
                key={n.to}
                to={n.to}
                className={`rounded-full px-3.5 py-2 text-sm font-medium transition-colors ${active ? "text-foreground bg-accent" : "text-muted-foreground hover:text-foreground hover:bg-accent/60"}`}
              >
                {n.label}
              </Link>
            );
          })}
        </nav>
        <div className="hidden md:flex items-center gap-2">
          <Link to="/login" className="rounded-full px-4 py-2 text-sm font-medium text-foreground hover:bg-accent">Log in</Link>
          <Link to="/register" className="rounded-full btn-brand btn-brand-hover px-4 py-2 text-sm font-semibold">Get started</Link>
        </div>
        <button className="lg:hidden inline-flex h-10 w-10 items-center justify-center rounded-full hover:bg-accent" onClick={() => setOpen((v) => !v)} aria-label="Toggle menu">
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>
      {open && (
        <div className="lg:hidden glass-strong border-t border-border">
          <div className="mx-auto max-w-7xl px-5 py-4 md:px-8 flex flex-col gap-1">
            {nav.map((n) => (
              <Link key={n.to} to={n.to} className="rounded-lg px-3 py-2.5 text-sm font-medium text-foreground hover:bg-accent">
                {n.label}
              </Link>
            ))}
            <div className="mt-2 grid grid-cols-2 gap-2">
              <Link to="/login" className="rounded-full border border-input px-4 py-2 text-center text-sm font-medium">Log in</Link>
              <Link to="/register" className="rounded-full btn-brand btn-brand-hover px-4 py-2 text-center text-sm font-semibold">Get started</Link>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
