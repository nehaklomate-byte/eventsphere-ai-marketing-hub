import { createFileRoute, Outlet, Link, useRouterState, useNavigate, redirect } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  LayoutDashboard, Briefcase, CalendarDays, Clock, Bell, Wallet, User, FileText,
  Settings, LifeBuoy, LogOut, Menu, X, ShieldCheck, BadgeAlert, BadgeCheck,
} from "lucide-react";
import { Logo } from "@/components/Logo";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchMyWorker, computeCompletion } from "@/lib/worker";
import { useSession } from "@/lib/session";

export const Route = createFileRoute("/_authenticated/worker")({
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/login" });
    return { userId: data.user.id };
  },
  component: WorkerShell,
});

const nav: { to: string; label: string; icon: typeof LayoutDashboard; exact?: boolean }[] = [
  { to: "/worker", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/worker/jobs", label: "Assigned Jobs", icon: Briefcase },
  { to: "/worker/calendar", label: "Calendar", icon: CalendarDays },
  { to: "/worker/availability", label: "Availability", icon: Clock },
  { to: "/worker/notifications", label: "Notifications", icon: Bell },
  { to: "/worker/earnings", label: "Earnings", icon: Wallet },
  { to: "/worker/profile", label: "Profile", icon: User },
  { to: "/worker/documents", label: "Documents", icon: FileText },
  { to: "/worker/settings", label: "Settings", icon: Settings },
  { to: "/worker/support", label: "Support", icon: LifeBuoy },
];

function WorkerShell() {
  const { location } = useRouterState();
  const navigate = useNavigate();
  const { user } = useSession();
  const [open, setOpen] = useState(false);
  const qc = useQueryClient();

  const { data: worker } = useQuery({
    queryKey: ["me-worker", user?.id],
    queryFn: () => fetchMyWorker(user!.id),
    enabled: !!user?.id,
  });

  const { data: unread = 0 } = useQuery({
    queryKey: ["notif-unread", user?.id],
    queryFn: async () => {
      const { count } = await supabase.from("worker_notifications" as never)
        .select("id", { count: "exact", head: true })
        .eq("user_id" as never, user!.id as never)
        .is("read_at" as never, null as never);
      return count ?? 0;
    },
    enabled: !!user?.id,
    refetchInterval: 30000,
  });

  useEffect(() => { setOpen(false); }, [location.pathname]);

  useEffect(() => {
    if (!user?.id) return;
    const ch = supabase.channel(`notif-${user.id}`)
      .on("postgres_changes",
        { event: "*", schema: "public", table: "worker_notifications", filter: `user_id=eq.${user.id}` },
        () => { qc.invalidateQueries({ queryKey: ["notif-unread", user.id] }); qc.invalidateQueries({ queryKey: ["notifications", user.id] }); }
      )
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user?.id, qc]);

  const completion = computeCompletion(worker as never);
  const vStatus = worker?.verification_status ?? "unsubmitted";

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/login" });
  }

  const initials = user?.email?.[0]?.toUpperCase() ?? "W";

  return (
    <div className="flex min-h-dvh bg-muted/30">
      {/* Sidebar */}
      <aside className={`fixed lg:sticky top-0 z-40 h-dvh w-72 shrink-0 bg-card/95 backdrop-blur-xl border-r border-border transition-transform ${open ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}>
        <div className="flex h-16 items-center justify-between px-5 border-b border-border">
          <Logo className="h-7" />
          <button className="lg:hidden" onClick={() => setOpen(false)} aria-label="Close menu"><X className="h-5 w-5" /></button>
        </div>
        <div className="p-4">
          <div className="rounded-2xl border border-border bg-gradient-to-br from-brand-violet/10 to-secondary/10 p-4">
            <div className="flex items-center gap-3">
              {worker?.photo_url ? (
                <img src={worker.photo_url} alt="" className="h-11 w-11 rounded-full object-cover" />
              ) : (
                <div className="grid h-11 w-11 place-items-center rounded-full bg-gradient-brand text-white text-sm font-semibold">{initials}</div>
              )}
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold text-foreground">{worker?.full_name ?? user?.email}</div>
                <div className="text-xs text-muted-foreground truncate">{worker?.category ?? "Worker"}</div>
              </div>
            </div>
            <div className="mt-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Profile</span>
                <span className="font-semibold text-foreground">{completion}%</span>
              </div>
              <div className="mt-1.5 h-1.5 rounded-full bg-border overflow-hidden">
                <div className="h-full bg-gradient-brand transition-all" style={{ width: `${completion}%` }} />
              </div>
              <div className="mt-3 flex items-center gap-1.5 text-[11px]">
                {vStatus === "approved" ? (
                  <><BadgeCheck className="h-3.5 w-3.5 text-emerald-600" /><span className="text-emerald-700 font-medium">Verified</span></>
                ) : vStatus === "pending" ? (
                  <><ShieldCheck className="h-3.5 w-3.5 text-amber-600" /><span className="text-amber-700 font-medium">Verification pending</span></>
                ) : vStatus === "rejected" ? (
                  <><BadgeAlert className="h-3.5 w-3.5 text-rose-600" /><span className="text-rose-700 font-medium">Verification rejected</span></>
                ) : (
                  <><BadgeAlert className="h-3.5 w-3.5 text-muted-foreground" /><span className="text-muted-foreground">Not submitted</span></>
                )}
              </div>
            </div>
          </div>
        </div>
        <nav className="px-3 space-y-0.5">
          {nav.map((n) => {
            const active = n.exact ? location.pathname === n.to : location.pathname.startsWith(n.to);
            const Icon = n.icon;
            return (
              <Link key={n.to} to={n.to as never}
                className={`group flex items-center justify-between rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${active ? "bg-brand-violet/10 text-brand-violet" : "text-muted-foreground hover:bg-accent hover:text-foreground"}`}>
                <span className="flex items-center gap-3"><Icon className="h-4 w-4" />{n.label}</span>
                {n.to === "/worker/notifications" && unread > 0 && (
                  <span className="min-w-[20px] rounded-full bg-rose-500 px-1.5 py-0.5 text-center text-[10px] font-bold text-white">{unread > 99 ? "99+" : unread}</span>
                )}
              </Link>
            );
          })}
        </nav>
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-border">
          <button onClick={signOut} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-destructive/10 hover:text-destructive">
            <LogOut className="h-4 w-4" /> Sign out
          </button>
        </div>
      </aside>

      {open && <div className="fixed inset-0 z-30 bg-black/40 lg:hidden" onClick={() => setOpen(false)} />}

      {/* Main */}
      <div className="flex-1 min-w-0">
        <header className="sticky top-0 z-20 h-16 flex items-center justify-between border-b border-border bg-background/80 backdrop-blur px-4 md:px-8">
          <button className="lg:hidden inline-flex h-9 w-9 items-center justify-center rounded-full hover:bg-accent" onClick={() => setOpen(true)} aria-label="Open menu"><Menu className="h-5 w-5" /></button>
          <div className="hidden md:block text-sm text-muted-foreground">Worker workspace</div>
          <div className="flex items-center gap-3">
            <Link to="/worker/notifications" className="relative inline-flex h-9 w-9 items-center justify-center rounded-full hover:bg-accent" aria-label="Notifications">
              <Bell className="h-4.5 w-4.5" />
              {unread > 0 && <span className="absolute -top-0.5 -right-0.5 min-w-[16px] rounded-full bg-rose-500 px-1 py-0.5 text-center text-[9px] font-bold text-white">{unread > 9 ? "9+" : unread}</span>}
            </Link>
          </div>
        </header>
        <main className="p-4 md:p-8">
          {completion < 60 && vStatus === "unsubmitted" && location.pathname !== "/worker/profile" && (
            <div className="mb-6 rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-foreground">Welcome to EventSphere AI 👋</div>
                <div className="text-xs text-muted-foreground">Complete your profile to start receiving assigned jobs. You're at {completion}%.</div>
              </div>
              <Link to="/worker/profile" className="rounded-full btn-brand btn-brand-hover px-4 py-2 text-xs font-semibold text-white">Complete Profile</Link>
            </div>
          )}
          <Outlet />
        </main>
      </div>
    </div>
  );
}
