import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Menu, X, LogOut, LayoutGrid } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { Logo } from "./Logo";
import { useSession } from "@/lib/session";
import { supabase } from "@/integrations/supabase/client";
import { resolveDashboardPath } from "@/lib/auth-redirect";

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
  const [menu, setMenu] = useState(false);
  const [workspacePath, setWorkspacePath] = useState<string>("/auth/callback");
  const { location } = useRouterState();
  const { user, loading } = useSession();
  const navigate = useNavigate();
  const qc = useQueryClient();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => { setOpen(false); setMenu(false); }, [location.pathname]);

  useEffect(() => {
    if (!user?.id) { setWorkspacePath("/auth/callback"); return; }
    resolveDashboardPath(user.id).then(setWorkspacePath).catch(() => setWorkspacePath("/onboarding"));
  }, [user?.id]);

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    setMenu(false);
    navigate({ to: "/login", replace: true } as never);
  }

  const initials = (user?.user_metadata?.full_name as string | undefined)?.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase()
    || user?.email?.[0]?.toUpperCase() || "U";

  return (
    <header className={`sticky top-0 z-50 transition-all ${scrolled ? "glass-strong shadow-soft" : "bg-transparent"}`}>
      <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-3 md:px-8">
        <Logo className="h-8 md:h-9" />
        <nav className="hidden lg:flex items-center gap-1">
          {nav.map((n) => {
            const active = location.pathname === n.to;
            return (
              <Link key={n.to} to={n.to}
                className={`rounded-full px-3.5 py-2 text-sm font-medium transition-colors ${active ? "text-foreground bg-accent" : "text-muted-foreground hover:text-foreground hover:bg-accent/60"}`}>
                {n.label}
              </Link>
            );
          })}
        </nav>
        <div className="hidden md:flex items-center gap-2">
          {loading ? (
            <div className="h-9 w-24 rounded-full bg-accent/40 animate-pulse" />
          ) : user ? (
            <div className="relative">
              <button onClick={() => setMenu((v) => !v)}
                className="inline-flex items-center gap-2 rounded-full border border-input pl-2 pr-3 py-1.5 text-sm font-semibold hover:bg-accent">
                <span className="grid h-7 w-7 place-items-center rounded-full bg-gradient-brand text-white text-xs">{initials}</span>
                <span className="max-w-[140px] truncate">{user.email}</span>
              </button>
              {menu && (
                <div role="menu" className="absolute right-0 mt-2 w-56 rounded-2xl border border-border bg-card shadow-elegant p-2 z-50">
                  <div className="px-3 py-2 text-xs text-muted-foreground truncate">{user.email}</div>
                  <Link to={workspacePath as never} className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm hover:bg-accent"><LayoutGrid className="h-4 w-4" /> Workspace</Link>
                  <button onClick={signOut} className="w-full flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-destructive hover:bg-destructive/10">
                    <LogOut className="h-4 w-4" /> Sign out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <>
              <Link to="/login" className="rounded-full px-4 py-2 text-sm font-medium text-foreground hover:bg-accent">Log in</Link>
              <Link to="/register" className="rounded-full btn-brand btn-brand-hover px-4 py-2 text-sm font-semibold">Get started</Link>
            </>
          )}
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
            {user ? (
              <button onClick={signOut} className="mt-2 rounded-full border border-input px-4 py-2 text-sm font-medium">Sign out</button>
            ) : (
              <div className="mt-2 grid grid-cols-2 gap-2">
                <Link to="/login" className="rounded-full border border-input px-4 py-2 text-center text-sm font-medium">Log in</Link>
                <Link to="/register" className="rounded-full btn-brand btn-brand-hover px-4 py-2 text-center text-sm font-semibold">Get started</Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
