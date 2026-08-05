import { createFileRoute, Outlet, Link, useRouterState, useNavigate, redirect } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  LayoutDashboard, Store, Settings, LogOut, Menu, X, ShieldCheck, BadgeAlert, BadgeCheck, ShieldAlert, Loader2, Clock, Briefcase, Bell,
  ClipboardList, CalendarDays, CalendarCheck, UsersRound, Wallet, FileText, LifeBuoy,
  MessageCircle,
} from "lucide-react";

import { Logo } from "@/components/Logo";
import { PayoutBanner } from "@/components/PayoutBanner";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { fetchMyVendor, computeVendorCompletion } from "@/lib/vendor";
import { useSession } from "@/lib/session";
import { PhoneVerifyBanner } from "@/components/PhoneVerifyBanner";

// Mirrors src/routes/_authenticated/worker/route.tsx exactly (Step-1
// account_status gate, sidebar shell, verification badge) — same
// conventions, adapted to the vendor field set.
export const Route = createFileRoute("/_authenticated/vendor")({
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/login" });
    return { userId: data.user.id };
  },
  component: VendorShell,
});

const nav: { to: string; label: string; icon: typeof LayoutDashboard; exact?: boolean }[] = [
  { to: "/vendor", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/vendor/jobs", label: "Assigned Jobs", icon: Briefcase },
  { to: "/vendor/board", label: "Job Board", icon: ClipboardList },
  { to: "/vendor/calendar", label: "Calendar", icon: CalendarDays },
  { to: "/vendor/availability", label: "Availability", icon: CalendarCheck },
  { to: "/vendor/hire-workers", label: "Hire Workers", icon: UsersRound },
  { to: "/vendor/earnings", label: "Earnings", icon: Wallet },
  { to: "/vendor/notifications", label: "Notifications", icon: Bell },
  { to: "/vendor/messages", label: "Messages", icon: MessageCircle },
  { to: "/vendor/profile", label: "Vendor Profile", icon: Store },
  { to: "/vendor/settings", label: "Settings", icon: Settings },
  { to: "/vendor/support", label: "Support", icon: LifeBuoy },
];


function VendorShell() {
  const { location } = useRouterState();
  const navigate = useNavigate();
  const { user } = useSession();
  const [open, setOpen] = useState(false);
  const qc = useQueryClient();

  // Step 1 gate: an account that hasn't been approved by admin yet must
  // never reach the dashboard/profile — same check already enforced in
  // the Organization, Venue Owner, and Worker shells.
  const { data: gate, isLoading: gateLoading } = useQuery({
    queryKey: ["vendor-account-gate", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data } = await supabase
        .from("profiles")
        .select("account_status, account_rejection_reason")
        .eq("id", user.id)
        .maybeSingle();
      return data as { account_status: "pending_approval" | "approved" | "rejected" | null; account_rejection_reason: string | null } | null;
    },
    enabled: !!user?.id,
  });

  const { data: vendor } = useQuery({
    queryKey: ["me-vendor", user?.id],
    queryFn: () => fetchMyVendor(user!.id),
    enabled: !!user?.id && gate?.account_status === "approved",
  });

  useEffect(() => { setOpen(false); }, [location.pathname]);

  const { data: unread = 0 } = useQuery({
    queryKey: ["vendor-notif-unread", user?.id],
    queryFn: async () => {
      const { count } = await supabase.from("vendor_notifications" as never)
        .select("id", { count: "exact", head: true })
        .eq("user_id" as never, user!.id as never)
        .is("read_at" as never, null as never);
      return count ?? 0;
    },
    enabled: !!user?.id,
    refetchInterval: 30000,
  });

  useEffect(() => {
    if (!user?.id) return;
    const ch = supabase.channel(`vendor-notif-${user.id}`)
      .on("postgres_changes",
        { event: "*", schema: "public", table: "vendor_notifications", filter: `user_id=eq.${user.id}` },
        () => { qc.invalidateQueries({ queryKey: ["vendor-notif-unread", user.id] }); qc.invalidateQueries({ queryKey: ["vendor-notifications", user.id] }); }
      )
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user?.id, qc]);

  const completion = computeVendorCompletion(vendor ?? {});
  const vStatus = vendor?.verification_status ?? "pending";

  const savePayout = useMutation({
    mutationFn: async (upi: string) => {
      if (!vendor?.id) throw new Error("Vendor profile not found");
      const { error } = await supabase.from("vendors").update({ payout_upi_id: upi }).eq("id", vendor.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["me-vendor", user?.id] }),
  });

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/login" });
  }

  const initials = user?.email?.[0]?.toUpperCase() ?? "V";

  if (gateLoading) {
    return <div className="grid min-h-dvh place-items-center bg-background"><Loader2 className="h-6 w-6 animate-spin text-brand-violet" /></div>;
  }

  const accountStatus = gate?.account_status ?? "pending_approval";
  if (accountStatus !== "approved") {
    const rejected = accountStatus === "rejected";
    return (
      <div className="grid min-h-dvh place-items-center bg-muted/30 px-6">
        <div className="w-full max-w-md rounded-3xl border border-border bg-card p-8 text-center">
          <Link to="/" className="mx-auto mb-6 flex justify-center"><Logo className="h-8" /></Link>
          {rejected ? (
            <>
              <ShieldAlert className="mx-auto mb-3 h-9 w-9 text-rose-500" />
              <h1 className="font-display text-xl font-semibold">Account not approved</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                {gate?.account_rejection_reason || "Your account application wasn't approved. Please contact support for details."}
              </p>
            </>
          ) : (
            <>
              <Clock className="mx-auto mb-3 h-9 w-9 text-amber-500" />
              <h1 className="font-display text-xl font-semibold">Waiting for admin approval</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Thanks for registering. An admin needs to approve your account before you can access your vendor
                dashboard and complete your profile — you'll be notified the moment that happens.
              </p>
            </>
          )}
          <button onClick={signOut} className="mt-6 flex w-full items-center justify-center gap-2 rounded-full border border-input px-4 py-2.5 text-sm font-semibold hover:bg-accent">
            <LogOut className="h-4 w-4" /> Sign out
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh bg-muted/30">
      {/* Sidebar */}
      <aside className={`fixed lg:sticky top-0 z-40 h-dvh w-72 shrink-0 bg-card/95 backdrop-blur-xl border-r border-border transition-transform flex flex-col ${open ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}>
        <div className="flex h-16 shrink-0 items-center justify-between px-5 border-b border-border">
          <Logo className="h-7" />
          <button className="lg:hidden" onClick={() => setOpen(false)} aria-label="Close menu"><X className="h-5 w-5" /></button>
        </div>
        <div className="p-4 shrink-0">
          <div className="rounded-2xl border border-border bg-gradient-to-br from-brand-violet/10 to-secondary/10 p-4">
            <div className="flex items-center gap-3">
              {vendor?.logo_url ? (
                <img src={vendor.logo_url} alt="" className="h-11 w-11 rounded-full object-cover" />
              ) : (
                <div className="grid h-11 w-11 place-items-center rounded-full bg-gradient-brand text-white text-sm font-semibold">{initials}</div>
              )}
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold text-foreground">{vendor?.business_name ?? user?.email}</div>
                <div className="text-xs text-muted-foreground truncate">{vendor?.category ?? "Vendor"}</div>
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
        <nav className="flex-1 min-h-0 overflow-y-auto px-3 py-1 space-y-0.5">
          {nav.map((n) => {
            const active = n.exact ? location.pathname === n.to : location.pathname.startsWith(n.to);
            const Icon = n.icon;
            return (
              <Link key={n.to} to={n.to as never}
                className={`group flex items-center justify-between rounded-xl px-3 py-2 text-sm font-medium transition-colors ${active ? "bg-brand-violet/10 text-brand-violet" : "text-muted-foreground hover:bg-accent hover:text-foreground"}`}>
                <span className="flex items-center gap-3"><Icon className="h-4 w-4 shrink-0" />{n.label}</span>
                {n.to === "/vendor/notifications" && unread > 0 && (
                  <span className="min-w-[20px] rounded-full bg-rose-500 px-1.5 py-0.5 text-center text-[10px] font-bold text-white">{unread > 99 ? "99+" : unread}</span>
                )}
              </Link>
            );
          })}
        </nav>
        <div className="shrink-0 p-4 border-t border-border">
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
          <div className="hidden md:block text-sm text-muted-foreground">Vendor workspace</div>
          <Link to={"/vendor/notifications" as never} className="relative inline-flex h-9 w-9 items-center justify-center rounded-full hover:bg-accent" aria-label="Notifications">
            <Bell className="h-5 w-5" />
            {unread > 0 && <span className="absolute -top-0.5 -right-0.5 min-w-[16px] rounded-full bg-rose-500 px-1 py-0.5 text-center text-[9px] font-bold text-white">{unread > 9 ? "9+" : unread}</span>}
          </Link>
        </header>
        <main className="p-4 md:p-8">
          {user && !user.phone_confirmed_at && <PhoneVerifyBanner user={user} />}
          {vendor && !vendor.payout_upi_id && (
            <PayoutBanner saving={savePayout.isPending} onSave={(upi) => savePayout.mutateAsync(upi)} />
          )}
          {completion < 60 && vStatus !== "approved" && location.pathname !== "/vendor/profile" && (
            <div className="mb-6 rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-foreground">Welcome to EventOrbit AI 👋</div>
                <div className="text-xs text-muted-foreground">Complete your profile to get verified and start receiving enquiries. You're at {completion}%.</div>
              </div>
              <Link to="/vendor/profile" className="rounded-full btn-brand btn-brand-hover px-4 py-2 text-xs font-semibold text-white">Complete Profile</Link>
            </div>
          )}
          <Outlet />
        </main>
      </div>
    </div>
  );
}
