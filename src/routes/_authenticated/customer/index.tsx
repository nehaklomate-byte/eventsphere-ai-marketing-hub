import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  CalendarDays, ReceiptText, Heart, Wallet, Star, Bell, Store, Plus, Building2,
  Sparkles, ArrowUpRight, User, LifeBuoy,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/session";
import { computeCompletion, type Customer } from "@/lib/customer";

export const Route = createFileRoute("/_authenticated/customer/")({
  component: Dashboard,
});

function Dashboard() {
  const { user } = useSession();
  const uid = user?.id;

  const { data } = useQuery({
    queryKey: ["customer-dashboard", uid],
    enabled: !!uid,
    queryFn: async () => {
      const [customer, events, bookings, payments, wishlist, notifications, reviews] = await Promise.all([
        supabase.from("customers").select("*").eq("user_id", uid!).maybeSingle(),
        supabase.from("customer_events").select("*").eq("user_id", uid!).order("event_date", { ascending: true }).limit(5),
        supabase.from("customer_bookings").select("*").eq("user_id", uid!).order("created_at", { ascending: false }).limit(5),
        supabase.from("customer_payments").select("*").eq("user_id", uid!).order("created_at", { ascending: false }).limit(5),
        supabase.from("customer_wishlist").select("*").eq("user_id", uid!).order("created_at", { ascending: false }).limit(6),
        supabase.from("customer_notifications").select("*").eq("user_id", uid!).order("created_at", { ascending: false }).limit(5),
        supabase.from("customer_reviews").select("*").eq("user_id", uid!).order("created_at", { ascending: false }).limit(3),
      ]);
      return {
        customer: (customer.data as Customer | null) ?? null,
        events: events.data ?? [],
        bookings: bookings.data ?? [],
        payments: payments.data ?? [],
        wishlist: wishlist.data ?? [],
        notifications: notifications.data ?? [],
        reviews: reviews.data ?? [],
      };
    },
  });

  const completion = data?.customer ? computeCompletion(data.customer) : 0;
  const name = (data?.customer?.full_name as string) ?? (user?.user_metadata?.full_name as string) ?? "there";

  return (
    <div className="space-y-8">
      {/* Welcome */}
      <section className="relative overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-brand-violet/15 via-secondary/10 to-background p-6 md:p-10">
        <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-brand-violet/20 blur-3xl" />
        <span className="inline-flex items-center gap-1.5 rounded-full bg-white/60 dark:bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-widest text-brand-violet">
          <Sparkles className="h-3 w-3" /> Customer workspace
        </span>
        <h1 className="mt-3 font-display text-3xl md:text-4xl font-semibold tracking-tight">Welcome back, {name.split(" ")[0]}</h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">Plan your event, book venues and vendors, and manage everything from one place.</p>

        <div className="mt-6 flex flex-wrap items-center gap-4">
          <div className="min-w-[240px] flex-1 max-w-md">
            <div className="mb-2 flex items-center justify-between text-xs font-medium">
              <span>Profile completion</span><span className="text-brand-violet">{completion}%</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full bg-gradient-brand transition-all" style={{ width: `${completion}%` }} />
            </div>
            {completion < 100 && (
              <Link to="/customer/profile" className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-brand-violet">
                Complete profile <ArrowUpRight className="h-3 w-3" />
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* Quick actions */}
      <section>
        <SectionHeading title="Quick actions" />
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <QuickAction to="/marketplace" icon={Building2} label="Book Hall" desc="Browse verified venues" />
          <QuickAction to="/marketplace" icon={Store} label="Find Vendor" desc="Decor, catering, photo" />
          <QuickAction to="/customer/events" icon={Plus} label="Create Event" desc="Start planning" />
          <QuickAction to="/customer/bookings" icon={ReceiptText} label="My Bookings" desc="Track status" />
          <QuickAction to="/customer/wishlist" icon={Heart} label="Wishlist" desc="Saved favourites" />
          <QuickAction to="/customer/payments" icon={Wallet} label="Payments" desc="Invoices & history" />
          <QuickAction to="/customer/profile" icon={User} label="Profile" desc="Personal details" />
          <QuickAction to="/contact" icon={LifeBuoy} label="Support" desc="We're here to help" />
        </div>
      </section>

      {/* Grid */}
      <section className="grid gap-6 lg:grid-cols-2">
        <Panel title="Upcoming events" icon={CalendarDays} to="/customer/events" empty="No events planned yet.">
          {data?.events.length ? (
            <ul className="divide-y divide-border">
              {data.events.map((e) => (
                <li key={e.id} className="flex items-center justify-between py-3">
                  <div className="min-w-0">
                    <div className="truncate font-semibold text-sm">{e.name}</div>
                    <div className="text-xs text-muted-foreground">{e.event_date ?? "Date TBD"} · {e.venue ?? "Venue TBD"}</div>
                  </div>
                  <StatusPill label={e.status} />
                </li>
              ))}
            </ul>
          ) : null}
        </Panel>

        <Panel title="Recent bookings" icon={ReceiptText} to="/customer/bookings" empty="No bookings yet.">
          {data?.bookings.length ? (
            <ul className="divide-y divide-border">
              {data.bookings.map((b) => (
                <li key={b.id} className="flex items-center justify-between py-3">
                  <div className="min-w-0">
                    <div className="truncate font-semibold text-sm">{b.target_name}</div>
                    <div className="text-xs text-muted-foreground">{b.kind} · ₹{Number(b.amount).toLocaleString("en-IN")}</div>
                  </div>
                  <StatusPill label={b.status} />
                </li>
              ))}
            </ul>
          ) : null}
        </Panel>

        <Panel title="Wishlist" icon={Heart} to="/customer/wishlist" empty="Save venues and vendors you love.">
          {data?.wishlist.length ? (
            <div className="grid grid-cols-2 gap-3">
              {data.wishlist.map((w) => (
                <div key={w.id} className="rounded-xl border border-border p-3">
                  <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">{w.kind}</div>
                  <div className="mt-1 truncate text-sm font-semibold">{w.target_name}</div>
                </div>
              ))}
            </div>
          ) : null}
        </Panel>

        <Panel title="Notifications" icon={Bell} to="/customer/notifications" empty="You're all caught up.">
          {data?.notifications.length ? (
            <ul className="divide-y divide-border">
              {data.notifications.map((n) => (
                <li key={n.id} className="py-3">
                  <div className="flex items-center gap-2">
                    <span className={`h-1.5 w-1.5 rounded-full ${n.read_at ? "bg-muted" : "bg-brand-violet"}`} />
                    <div className="text-sm font-semibold">{n.title}</div>
                  </div>
                  {n.body && <div className="mt-0.5 text-xs text-muted-foreground">{n.body}</div>}
                </li>
              ))}
            </ul>
          ) : null}
        </Panel>

        <Panel title="Recent payments" icon={Wallet} to="/customer/payments" empty="No payments yet.">
          {data?.payments.length ? (
            <ul className="divide-y divide-border">
              {data.payments.map((p) => (
                <li key={p.id} className="flex items-center justify-between py-3">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold">{p.description}</div>
                    <div className="text-xs text-muted-foreground">{p.invoice_number ?? "—"}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-semibold">₹{Number(p.amount).toLocaleString("en-IN")}</div>
                    <StatusPill label={p.status} />
                  </div>
                </li>
              ))}
            </ul>
          ) : null}
        </Panel>

        <Panel title="Recent reviews" icon={Star} to="/customer/reviews" empty="Share your experience with vendors and venues.">
          {data?.reviews.length ? (
            <ul className="space-y-3">
              {data.reviews.map((r) => (
                <li key={r.id} className="rounded-xl border border-border p-3">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-semibold">{r.target_name}</div>
                    <div className="text-xs text-amber-500">{"★".repeat(r.rating)}<span className="text-muted-foreground">{"★".repeat(5 - r.rating)}</span></div>
                  </div>
                  {r.comment && <div className="mt-1 text-xs text-muted-foreground line-clamp-2">{r.comment}</div>}
                </li>
              ))}
            </ul>
          ) : null}
        </Panel>
      </section>
    </div>
  );
}

function SectionHeading({ title }: { title: string }) {
  return <h2 className="font-display text-lg font-semibold tracking-tight">{title}</h2>;
}

function QuickAction({ to, icon: Icon, label, desc }: { to: string; icon: React.ComponentType<{ className?: string }>; label: string; desc: string }) {
  return (
    <Link to={to as never} className="group rounded-2xl border border-border bg-card p-4 transition hover:-translate-y-0.5 hover:border-brand-violet/40 hover:shadow-soft">
      <div className="grid h-10 w-10 place-items-center rounded-xl bg-brand-violet/10 text-brand-violet"><Icon className="h-5 w-5" /></div>
      <div className="mt-3 text-sm font-semibold">{label}</div>
      <div className="text-xs text-muted-foreground">{desc}</div>
    </Link>
  );
}

function Panel({ title, icon: Icon, to, children, empty }: {
  title: string; icon: React.ComponentType<{ className?: string }>; to?: string; children?: React.ReactNode; empty: string;
}) {
  const hasChildren = !!children;
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2"><Icon className="h-4 w-4 text-brand-violet" /><h3 className="font-display text-base font-semibold">{title}</h3></div>
        {to && <Link to={to as never} className="text-xs font-semibold text-brand-violet inline-flex items-center gap-1">View all <ArrowUpRight className="h-3 w-3" /></Link>}
      </div>
      <div className="mt-3">
        {hasChildren ? children : <div className="rounded-xl border border-dashed border-border py-8 text-center text-sm text-muted-foreground">{empty}</div>}
      </div>
    </div>
  );
}

function StatusPill({ label }: { label: string }) {
  const l = String(label ?? "").toLowerCase();
  const tone = /paid|confirmed|completed/.test(l) ? "bg-emerald-500/10 text-emerald-600"
    : /pending|planning/.test(l) ? "bg-amber-500/10 text-amber-600"
    : /cancel|failed/.test(l) ? "bg-rose-500/10 text-rose-600"
    : "bg-brand-violet/10 text-brand-violet";
  return <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize ${tone}`}>{label}</span>;
}
