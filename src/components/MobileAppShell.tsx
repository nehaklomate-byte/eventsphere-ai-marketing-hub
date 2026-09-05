import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useState, type ComponentType } from "react";
import { Bell, LogOut, MoreHorizontal, X } from "lucide-react";
import { Logo } from "@/components/Logo";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/session";

/**
 * MobileAppShell
 * ----------------
 * Drop-in replacement for the old desktop sidebar layout used inside each
 * role's route.tsx (admin / customer / vendor / venue / worker /
 * organization / team-member).
 *
 * Usage (inside e.g. src/routes/_authenticated/customer/route.tsx):
 *
 *   const PRIMARY = NAV.slice(0, 4);      // shown directly in bottom bar
 *   const MORE = NAV.slice(4);            // shown inside the "More" sheet
 *
 *   return (
 *     <MobileAppShell
 *       roleLabel="Customer"
 *       primaryNav={PRIMARY}
 *       moreNav={MORE}
 *       unreadCount={unread}
 *       onSignOut={signOut}
 *     >
 *       <Outlet />
 *     </MobileAppShell>
 *   );
 *
 * Layout:
 *   - Top bar (fixed):   Logo | Page title            Bell(badge)  Avatar
 *   - Content (scroll):  children, padded top+bottom for the fixed bars
 *   - Bottom tab bar (fixed): up to 4 primary tabs + "More"
 *   - "More" tab opens a bottom sheet listing every remaining nav item,
 *     plus Notifications / Settings / Sign out so nothing from the old
 *     sidebar is ever unreachable.
 */

export type NavEntry = {
  to: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  exact?: boolean;
  soon?: boolean;
};

export function MobileAppShell({
  roleLabel,
  primaryNav,
  moreNav,
  unreadCount = 0,
  notificationsTo,
  settingsTo,
  onSignOut,
  children,
}: {
  roleLabel: string;
  primaryNav: NavEntry[]; // max 4 recommended — the 5th slot is always "More"
  moreNav: NavEntry[]; // everything else (Settings/Support/Logout are appended automatically)
  unreadCount?: number;
  notificationsTo?: string;
  settingsTo?: string;
  onSignOut: () => void | Promise<void>;
  children: React.ReactNode;
}) {
  const { user } = useSession();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [moreOpen, setMoreOpen] = useState(false);
  const [avatarOpen, setAvatarOpen] = useState(false);

  const isActive = (to: string, exact?: boolean) =>
    exact ? pathname === to : pathname === to || pathname.startsWith(to + "/");

  const currentLabel =
    [...primaryNav, ...moreNav].find((n) => isActive(n.to, n.exact))?.label ?? roleLabel;

  const initials = user?.email?.[0]?.toUpperCase() ?? "U";
  const tabs = primaryNav.slice(0, 4);

  return (
    <div className="min-h-dvh bg-muted/30">
      {/* ---------- TOP BAR (fixed) ---------- */}
      <header className="fixed inset-x-0 top-0 z-40 h-14 border-b border-border bg-background/90 backdrop-blur">
        <div className="flex h-full items-center justify-between px-4">
          <div className="flex items-center gap-2 min-w-0">
            <Logo className="h-6 shrink-0" />
            <span className="truncate text-sm font-semibold text-foreground/90">{currentLabel}</span>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <Link
              to={(notificationsTo ?? primaryNav[0]?.to ?? "/") as never}
              className="relative grid h-9 w-9 place-items-center rounded-full hover:bg-accent"
              aria-label="Notifications"
            >
              <Bell className="h-[18px] w-[18px]" />
              {unreadCount > 0 && (
                <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-red-500" />
              )}
            </Link>
            <button
              onClick={() => setAvatarOpen(true)}
              className="grid h-9 w-9 place-items-center rounded-full bg-gradient-brand text-[11px] font-semibold text-white"
              aria-label="Account menu"
            >
              {initials}
            </button>
          </div>
        </div>
      </header>

      {/* ---------- CONTENT ---------- */}
      <main className="px-4 pb-24 pt-[4.5rem]">{children}</main>

      {/* ---------- BOTTOM TAB BAR (fixed) ---------- */}
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 backdrop-blur pb-[env(safe-area-inset-bottom)]">
        <div className="grid h-16 grid-cols-5">
          {tabs.map((item) => {
            const active = isActive(item.to, item.exact);
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to as never}
                className={`flex flex-col items-center justify-center gap-1 text-[11px] font-medium ${
                  active ? "text-brand-violet" : "text-muted-foreground"
                }`}
              >
                <Icon className="h-5 w-5" />
                <span className="truncate max-w-[64px]">{item.label}</span>
              </Link>
            );
          })}
          {/* 5th slot: always "More" so every page from the old sidebar stays reachable */}
          <button
            onClick={() => setMoreOpen(true)}
            className={`flex flex-col items-center justify-center gap-1 text-[11px] font-medium ${
              moreOpen ? "text-brand-violet" : "text-muted-foreground"
            }`}
          >
            <MoreHorizontal className="h-5 w-5" />
            <span>More</span>
          </button>
        </div>
      </nav>

      {/* ---------- "MORE" BOTTOM SHEET ---------- */}
      {moreOpen && (
        <div className="fixed inset-0 z-50" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMoreOpen(false)} />
          <div className="absolute inset-x-0 bottom-0 max-h-[75vh] overflow-y-auto rounded-t-3xl border-t border-border bg-background p-5 pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
            <div className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-border" />
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-display text-lg font-semibold">More · {roleLabel}</h2>
              <button onClick={() => setMoreOpen(false)} aria-label="Close">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {moreNav.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.to}
                    to={item.to as never}
                    onClick={() => setMoreOpen(false)}
                    className="flex flex-col items-center gap-2 rounded-2xl border border-border p-4 text-center hover:bg-accent"
                  >
                    <Icon className="h-5 w-5" />
                    <span className="text-xs font-medium leading-tight">{item.label}</span>
                    {item.soon && <span className="text-[10px] text-muted-foreground">Soon</span>}
                  </Link>
                );
              })}
              {settingsTo && (
                <Link
                  to={settingsTo as never}
                  onClick={() => setMoreOpen(false)}
                  className="flex flex-col items-center gap-2 rounded-2xl border border-border p-4 text-center hover:bg-accent"
                >
                  <span className="text-xs font-medium">Settings</span>
                </Link>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ---------- AVATAR / ACCOUNT SHEET ---------- */}
      {avatarOpen && (
        <div className="fixed inset-0 z-50" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-black/40" onClick={() => setAvatarOpen(false)} />
          <div className="absolute inset-x-0 bottom-0 rounded-t-3xl border-t border-border bg-background p-5 pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
            <div className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-border" />
            <p className="mb-4 truncate text-sm text-muted-foreground">{user?.email}</p>
            {settingsTo && (
              <Link
                to={settingsTo as never}
                onClick={() => setAvatarOpen(false)}
                className="mb-2 block rounded-xl px-4 py-3 text-sm font-medium hover:bg-accent"
              >
                Settings
              </Link>
            )}
            <button
              onClick={() => {
                setAvatarOpen(false);
                onSignOut();
              }}
              className="flex w-full items-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold text-red-600 hover:bg-red-50"
            >
              <LogOut className="h-4 w-4" /> Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
