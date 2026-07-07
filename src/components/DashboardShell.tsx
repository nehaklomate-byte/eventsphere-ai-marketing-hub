import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { LogOut, ArrowUpRight } from "lucide-react";
import { Logo } from "@/components/Logo";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/session";
import type { ReactNode } from "react";

export function DashboardShell({
  title,
  subtitle,
  accent,
  children,
}: {
  title: string;
  subtitle: string;
  accent: string;
  children: ReactNode;
}) {
  const { user } = useSession();
  const navigate = useNavigate();
  const qc = useQueryClient();

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/login", replace: true } as never);
  }

  const initials = user?.email?.[0]?.toUpperCase() ?? "U";

  return (
    <div className="min-h-dvh bg-muted/30">
      <header className="sticky top-0 z-30 h-16 border-b border-border bg-background/85 backdrop-blur">
        <div className="mx-auto flex h-full max-w-7xl items-center justify-between px-5 md:px-8">
          <Link to="/"><Logo className="h-8" /></Link>
          <div className="flex items-center gap-3">
            <span className="hidden md:inline text-xs text-muted-foreground">{user?.email}</span>
            <div className="grid h-9 w-9 place-items-center rounded-full bg-gradient-brand text-white text-xs font-semibold">{initials}</div>
            <button onClick={signOut} className="inline-flex items-center gap-1.5 rounded-full border border-input px-3 py-1.5 text-xs font-semibold hover:bg-accent">
              <LogOut className="h-3.5 w-3.5" /> Sign out
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-5 md:px-8 py-8 md:py-12">
        <div className="rounded-3xl border border-border bg-gradient-to-br from-brand-violet/10 via-secondary/5 to-background p-8 md:p-10">
          <span className="inline-flex rounded-full bg-white/60 dark:bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-widest text-brand-violet">
            {accent}
          </span>
          <h1 className="mt-4 font-display text-3xl md:text-4xl font-semibold tracking-tight">{title}</h1>
          <p className="mt-2 max-w-2xl text-muted-foreground">{subtitle}</p>
        </div>
        <div className="mt-8">{children}</div>
      </main>
    </div>
  );
}

export function DashboardCard({
  title,
  desc,
  to,
  cta = "Open",
}: {
  title: string;
  desc: string;
  to?: string;
  cta?: string;
}) {
  return (
    <div className="group rounded-2xl border border-border bg-card p-6 transition hover:border-brand-violet/40 hover:shadow-soft">
      <h3 className="font-display text-lg font-semibold">{title}</h3>
      <p className="mt-1.5 text-sm text-muted-foreground">{desc}</p>
      {to && (
        <Link to={to as never} className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-violet">
          {cta} <ArrowUpRight className="h-3.5 w-3.5" />
        </Link>
      )}
    </div>
  );
}

export function ComingSoonNote() {
  return (
    <div className="mt-8 rounded-2xl border border-dashed border-border bg-card/40 p-6 text-sm text-muted-foreground">
      More tools for this workspace are rolling out ahead of public launch. Your data is safely stored and will appear here as modules go live.
    </div>
  );
}
