import { createFileRoute, Outlet, Link, useRouterState, useNavigate, redirect } from "@tanstack/react-router";
import { useState } from "react";
import {
  LayoutDashboard, ShieldCheck, Users, Building2, Landmark, Briefcase, HardHat,
  Bell, Settings, LogOut, Menu, X,
} from "lucide-react";
import { Logo } from "@/components/Logo";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { useSession } from "@/lib/session";

export const Route = createFileRoute("/_authenticated/admin")({
  // Extra layer on top of /_authenticated's "is logged in" check: this route
  // additionally requires an 'admin' row in user_roles. Without this guard,
  // any logged-in user (customer, vendor, etc.) could open /admin by URL and
  // see/act on other users' verification data — that gap existed before this
  // route was split out from the old single admin.tsx placeholder.
  beforeLoad: async () => {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) throw redirect({ to: "/login" });

    const { data: roleRow } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userData.user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleRow) throw redirect({ to: "/" });
    return { userId: userData.user.id };
  },
  component: AdminShell,
});

// Organizations / Venue Owners / Vendors / Workers all open the same
// Verification Center, pre-filtered to that role via the `role` search
// param (verification.tsx already reads it) — a dedicated page per role
// would just duplicate that screen, so this reuses it instead of stubbing
// out four "Coming soon" placeholders.
const NAV = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/admin/verification", label: "Verification Center", icon: ShieldCheck },
  { to: "/admin/verification", label: "Organizations", icon: Building2, search: { role: "organization" } },
  { to: "/admin/verification", label: "Venue Owners", icon: Landmark, search: { role: "venue" } },
  { to: "/admin/verification", label: "Vendors", icon: Briefcase, search: { role: "vendor" } },
  { to: "/admin/verification", label: "Workers", icon: HardHat, search: { role: "worker" } },
  { to: "/admin/users", label: "Users", icon: Users },
  { to: "/admin/notifications", label: "Broadcast Center", icon: Bell, soon: true },
  { to: "/admin/settings", label: "Settings", icon: Settings, soon: true },
];

function AdminShell() {
  const { user } = useSession();
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

  const isActive = (to: string, exact?: boolean) =>
    exact ? pathname === to : pathname === to || pathname.startsWith(to + "/");

  return (
    <div className="min-h-dvh bg-muted/30">
      <div className="md:hidden sticky top-0 z-40 flex h-14 items-center justify-between border-b border-border bg-background/90 backdrop-blur px-4">
        <Link to="/admin"><Logo className="h-7" /></Link>
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
              const currentRole = new URLSearchParams(pathname === "/admin/verification" ? window.location.search : "").get("role");
              const active = it.search
                ? pathname === it.to && currentRole === it.search.role
                : isActive(it.to, it.exact) && (it.to !== "/admin/verification" || !currentRole);
              const Icon = it.icon;
              return (
                <Link
                  key={it.label}
                  to={it.soon ? "/admin/verification" : (it.to as never)}
                  search={it.search as never}
                  onClick={() => setOpen(false)}
                  className={`group flex items-center justify-between rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                    active ? "bg-gradient-to-r from-brand-violet/15 to-secondary/10 text-foreground shadow-sm" : "text-muted-foreground hover:bg-accent hover:text-foreground"
                  }`}
                >
                  <span className="flex items-center gap-3">
                    <Icon className="h-4 w-4" /> {it.label}
                  </span>
                  {it.soon && <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">Soon</span>}
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
                {user?.email?.[0]?.toUpperCase() ?? "A"}
              </div>
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold">Super Admin</div>
                <div className="truncate text-xs text-muted-foreground">{user?.email}</div>
              </div>
            </div>
          </div>
        </aside>

        {open && <div className="fixed inset-0 z-40 bg-black/40 md:hidden" onClick={() => setOpen(false)} />}

        <main className="min-h-dvh flex-1 px-4 md:px-8 py-6 md:py-10">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
