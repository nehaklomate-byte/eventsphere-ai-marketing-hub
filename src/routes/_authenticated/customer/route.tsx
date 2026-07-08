import { createFileRoute, Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import {
  LayoutDashboard, CalendarDays, ReceiptText, Heart, Store, Bell, Wallet,
  Star, Settings, LogOut, Menu, X, User,
} from "lucide-react";
import { Logo } from "@/components/Logo";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/session";
import { ensureCustomerBootstrapped } from "@/lib/customer";

export const Route = createFileRoute("/_authenticated/customer")({
  head: () => ({ meta: [{ title: "Customer workspace — EventSphere AI" }, { name: "robots", content: "noindex" }] }),
  component: CustomerLayout,
});

const NAV = [
  { to: "/customer", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/customer/events", label: "My Events", icon: CalendarDays },
  { to: "/customer/bookings", label: "Bookings", icon: ReceiptText },
  { to: "/customer/wishlist", label: "Wishlist", icon: Heart },
  { to: "/marketplace", label: "Marketplace", icon: Store, external: true },
  { to: "/customer/notifications", label: "Notifications", icon: Bell },
  { to: "/customer/payments", label: "Payments", icon: Wallet },
  { to: "/customer/reviews", label: "Reviews", icon: Star },
  { to: "/customer/profile", label: "Profile", icon: User },
  { to: "/customer/settings", label: "Settings", icon: Settings },
];

function CustomerLayout() {
  const { user } = useSession();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const qc = useQueryClient();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    if (!user?.id) return;
    ensureCustomerBootstrapped(user.id, {
      full_name: (user.user_metadata?.full_name as string) ?? null,
      phone: (user.user_metadata?.phone as string) ?? null,
      email: user.email ?? null,
    }).catch(() => {});
  }, [user?.id, user?.email, user?.user_metadata]);

  // Realtime unread badge
  const [unread, setUnread] = useState(0);
  useEffect(() => {
    if (!user?.id) return;
    let mounted = true;
    const refresh = async () => {
      const { count } = await supabase
        .from("customer_notifications")
        .select("id", { count: "exact", head: true })
        .is("read_at", null);
      if (mounted) setUnread(count ?? 0);
    };
    refresh();
    const ch = supabase.channel("cnotif-" + user.id)
      .on("postgres_changes", { event: "*", schema: "public", table: "customer_notifications", filter: `user_id=eq.${user.id}` }, refresh)
      .subscribe();
    return () => { mounted = false; supabase.removeChannel(ch); };
  }, [user?.id]);

  async function signOut() {
    await qc.cancelQueries(); qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/login", replace: true } as never);
  }

  const initials = (user?.user_metadata?.full_name as string)?.[0]?.toUpperCase()
    ?? user?.email?.[0]?.toUpperCase() ?? "U";

  const isActive = (to: string, exact?: boolean) =>
    exact ? pathname === to : pathname === to || pathname.startsWith(to + "/");

  return (
    <div className="min-h-dvh bg-muted/30">
      {/* Mobile top bar */}
      <div className="md:hidden sticky top-0 z-40 flex h-14 items-center justify-between border-b border-border bg-background/90 backdrop-blur px-4">
        <Link to="/customer"><Logo className="h-7" /></Link>
        <button onClick={() => setOpen(true)} aria-label="Open menu" className="rounded-lg p-2 hover:bg-accent"><Menu className="h-5 w-5" /></button>
      </div>

      <div className="mx-auto flex max-w-[1400px]">
        {/* Sidebar */}
        <aside className={`${open ? "translate-x-0" : "-translate-x-full"} md:translate-x-0 fixed md:sticky top-0 z-50 md:z-30 h-dvh w-72 shrink-0 border-r border-border bg-background/95 backdrop-blur transition-transform`}>
          <div className="flex h-16 items-center justify-between px-5 border-b border-border">
            <Link to="/" className="flex items-center"><Logo className="h-7" /></Link>
            <button onClick={() => setOpen(false)} aria-label="Close menu" className="md:hidden rounded-lg p-2 hover:bg-accent"><X className="h-5 w-5" /></button>
          </div>
          <nav className="flex flex-col gap-0.5 p-3">
            {NAV.map((it) => {
              const active = isActive(it.to, it.exact);
              const Icon = it.icon;
              return (
                <Link key={it.to} to={it.to as never} onClick={() => setOpen(false)}
                  className={`group flex items-center justify-between rounded-xl px-3 py-2.5 text-sm font-medium transition ${active ? "bg-gradient-to-r from-brand-violet/15 to-secondary/10 text-foreground shadow-sm" : "text-muted-foreground hover:bg-accent hover:text-foreground"}`}>
                  <span className="flex items-center gap-3"><Icon className="h-4 w-4" /> {it.label}</span>
                  {it.to === "/customer/notifications" && unread > 0 && (
                    <span className="rounded-full bg-brand-violet px-2 py-0.5 text-[10px] font-semibold text-white">{unread > 99 ? "99+" : unread}</span>
                  )}
                </Link>
              );
            })}
            <button onClick={signOut} className="mt-2 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground">
              <LogOut className="h-4 w-4" /> Logout
            </button>
          </nav>
          <div className="mt-auto absolute bottom-0 left-0 right-0 border-t border-border p-4">
            <div className="flex items-center gap-3">
              <div className="grid h-9 w-9 place-items-center rounded-full bg-gradient-brand text-white text-xs font-semibold">{initials}</div>
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold">{(user?.user_metadata?.full_name as string) ?? "Customer"}</div>
                <div className="truncate text-xs text-muted-foreground">{user?.email}</div>
              </div>
            </div>
          </div>
        </aside>

        {/* Backdrop */}
        {open && <div className="fixed inset-0 z-40 bg-black/40 md:hidden" onClick={() => setOpen(false)} />}

        <main className="min-h-dvh flex-1 px-4 md:px-8 py-6 md:py-10">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
