import { createFileRoute, Outlet, Link, useRouterState, useNavigate, redirect } from "@tanstack/react-router";
import { useState } from "react";
import {
  LayoutDashboard, Inbox, CalendarCheck, Building2, Settings, LogOut, Menu, X, Clock, ShieldAlert, MailWarning,
} from "lucide-react";
import { Logo } from "@/components/Logo";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSession } from "@/lib/session";

// beforeLoad here does the redirect-only gatekeeping (role check, and
// bouncing to /venue/profile when the hall isn't approved yet). It
// deliberately does NOT return data for the component to read via
// Route.useRouteContext() — that pattern broke this project's TanStack
// route-generator during the Vercel build ("SyntaxError: Unexpected
// token" while crawling this file), silently leaving every deploy on a
// stale build. The component instead re-fetches what it needs itself
// with a normal useQuery, the same way every other dashboard page here
// already does.
export const Route = createFileRoute("/_authenticated/venue")({
  beforeLoad: async ({ location }) => {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) throw redirect({ to: "/login" });

    const { data: profile } = await supabase
      .from("profiles")
      .select("primary_role, account_status")
      .eq("id", userData.user.id)
      .maybeSingle();

    if (profile?.primary_role !== "hall_owner") throw redirect({ to: "/" });
    if (profile.account_status !== "approved") return; // waiting screen renders itself, no redirect target needed

    const { data: hall } = await supabase
      .from("halls")
      .select("id, verification_status")
      .eq("owner_id", userData.user.id)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const isApproved = hall?.verification_status === "approved";
    if (!isApproved && location.pathname !== "/venue/profile") {
      throw redirect({ to: "/venue/profile" });
    }
  },
  component: VenueShell,
});

type ProfileGate = { primary_role: string | null; account_status: "pending_approval" | "approved" | "rejected" | null; account_rejection_reason: string | null };
type HallGate = { id: string; verification_status: string; rejection_reason: string | null } | null;

async function fetchGateData(): Promise<{ profile: ProfileGate | null; hall: HallGate }> {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { profile: null, hall: null };
  const { data: profile } = await supabase
    .from("profiles")
    .select("primary_role, account_status, account_rejection_reason")
    .eq("id", userData.user.id)
    .maybeSingle();
  if (profile?.account_status !== "approved") return { profile: profile as ProfileGate, hall: null };
  const { data: hall } = await supabase
    .from("halls")
    .select("id, verification_status, rejection_reason")
    .eq("owner_id", userData.user.id)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return { profile: profile as ProfileGate, hall: hall as HallGate };
}

const NAV = [
  { to: "/venue", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/venue/enquiries", label: "Enquiries", icon: Inbox },
  { to: "/venue/bookings", label: "Bookings", icon: CalendarCheck },
  { to: "/venue/profile", label: "Venue Profile", icon: Building2 },
  { to: "/venue/settings", label: "Settings", icon: Settings, soon: true },
];

function VenueShell() {
  const { user } = useSession();
  const { data, isLoading } = useQuery({ queryKey: ["venue-gate"], queryFn: fetchGateData });
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const qc = useQueryClient();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/login", replace: true } as never);
  }

  if (isLoading) {
    return <div className="grid min-h-dvh place-items-center bg-background"><Loader className="h-6 w-6" /></div>;
  }

  const accountStatus = data?.profile?.account_status ?? "pending_approval";
  const hall = data?.hall ?? null;

  // ---- Step 1 gate: account not yet approved — full-screen, no sidebar ----
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
                {data?.profile?.account_rejection_reason || "Your account application wasn't approved. Please contact support for details."}
              </p>
            </>
          ) : (
            <>
              <Clock className="mx-auto mb-3 h-9 w-9 text-amber-500" />
              <h1 className="font-display text-xl font-semibold">Waiting for admin approval</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Thanks for registering as a Venue Owner. An admin needs to approve your account before you can
                access your dashboard — you'll get a notification the moment that happens.
              </p>
            </>
          )}
          <button onClick={signOut} className="mt-6 flex w-full items-center justify-center gap-2 rounded-full border border-input px-4 py-2.5 text-sm font-semibold hover:bg-accent">
            <LogOut className="h-4 w-4" /> Logout
          </button>
        </div>
      </div>
    );
  }

  const isApproved = hall?.verification_status === "approved";
  const isActive = (to: string, exact?: boolean) =>
    exact ? pathname === to : pathname === to || pathname.startsWith(to + "/");

  return (
    <div className="min-h-dvh bg-muted/30">
      <div className="md:hidden sticky top-0 z-40 flex h-14 items-center justify-between border-b border-border bg-background/90 backdrop-blur px-4">
        <Link to="/venue"><Logo className="h-7" /></Link>
        <button onClick={() => setOpen(true)} aria-label="Open menu" className="rounded-lg p-2 hover:bg-accent">
          <Menu className="h-5 w-5" />
        </button>
      </div>

      <div className="mx-auto flex max-w-[1400px]">
        <aside className={`${open ? "translate-x-0" : "-translate-x-full"} md:translate-x-0 fixed md:sticky top-0 z-50 md:z-30 h-dvh w-72 shrink-0 border-r border-border bg-background/95 backdrop-blur transition-transform`}>
          <div className="flex h-16 items-center justify-between px-5 border-b border-border">
            <Link to="/" className="flex items-center"><Logo className="h-7" /></Link>
            <button onClick={() => setOpen(false)} aria-label="Close menu" className="md:hidden rounded-lg p-2 hover:bg-accent">
              <X className="h-5 w-5" />
            </button>
          </div>
          <nav className="flex flex-col gap-0.5 p-3">
            {NAV.map((it) => {
              const locked = !isApproved && it.to !== "/venue/profile";
              const active = isActive(it.to, it.exact);
              const Icon = it.icon;
              return (
                <Link
                  key={it.label}
                  to={it.soon || locked ? "/venue/profile" : (it.to as never)}
                  onClick={() => setOpen(false)}
                  className={`group flex items-center justify-between rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                    active ? "bg-gradient-to-r from-brand-violet/15 to-secondary/10 text-foreground shadow-sm" : "text-muted-foreground hover:bg-accent hover:text-foreground"
                  } ${locked ? "opacity-50" : ""}`}
                >
                  <span className="flex items-center gap-3">
                    <Icon className="h-4 w-4" /> {it.label}
                  </span>
                  {it.soon && <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">Soon</span>}
                  {locked && !it.soon && <Clock className="h-3.5 w-3.5" />}
                </Link>
              );
            })}
            <button onClick={signOut} className="mt-2 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground">
              <LogOut className="h-4 w-4" /> Logout
            </button>
          </nav>
          <div className="mt-auto absolute bottom-0 left-0 right-0 border-t border-border p-4">
            <div className="flex items-center gap-3">
              <div className="grid h-9 w-9 place-items-center rounded-full bg-gradient-brand text-white text-xs font-semibold">
                {user?.email?.[0]?.toUpperCase() ?? "V"}
              </div>
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold">Venue Owner</div>
                <div className="truncate text-xs text-muted-foreground">{user?.email}</div>
              </div>
            </div>
          </div>
        </aside>

        {open && <div className="fixed inset-0 z-40 bg-black/40 md:hidden" onClick={() => setOpen(false)} />}

        <main className="min-h-dvh flex-1 px-4 md:px-8 py-6 md:py-10">
          {!isApproved && (
            <div className={`mb-6 flex items-center gap-2 rounded-2xl px-5 py-3 text-sm font-semibold ${
              hall?.verification_status === "rejected" ? "bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300" : "bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300"
            }`}>
              {hall?.verification_status === "rejected" ? <ShieldAlert className="h-4 w-4" /> : <MailWarning className="h-4 w-4" />}
              {hall?.verification_status === "rejected"
                ? `Your profile submission was rejected${hall.rejection_reason ? `: ${hall.rejection_reason}` : ""}. Update your details to resubmit.`
                : "Your account is approved — now complete your venue profile fully and submit it for verification. Other tools unlock once that's approved."}
            </div>
          )}
          <Outlet />
        </main>
      </div>
    </div>
  );
}

function Loader({ className }: { className?: string }) {
  return (
    <svg className={`${className} animate-spin text-brand-violet`} viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}
