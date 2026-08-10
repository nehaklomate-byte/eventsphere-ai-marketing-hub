import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { CalendarDays, Store } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/session";
import { PageShell, EmptyState, LoadingRows } from "./-ui";

// Event creation is switched off for now — customers book venues/vendors/
// workers straight from the Marketplace, and everything they've hired
// (venue + vendors + workers together) is tracked on the Bookings page.
// This page still shows any event bundles that already exist (grouped
// venue/vendor/worker hires with a "team" view), it just no longer lets
// someone start a new, disconnected one.
export const Route = createFileRoute("/_authenticated/customer/events")({
  component: EventsPage,
});

function EventsPage() {
  const { user } = useSession();
  const [tab, setTab] = useState<"upcoming" | "past" | "cancelled">("upcoming");

  const { data, isLoading } = useQuery({
    queryKey: ["c-events", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data } = await supabase.from("customer_events").select("*").eq("user_id", user!.id).order("event_date", { ascending: false });
      return data ?? [];
    },
  });

  const now = new Date().toISOString().slice(0, 10);
  const filtered = (data ?? []).filter((e) => {
    if (tab === "cancelled") return e.status === "cancelled";
    const upcoming = !e.event_date || e.event_date >= now;
    if (tab === "upcoming") return e.status !== "cancelled" && upcoming;
    return e.status !== "cancelled" && !upcoming;
  });

  return (
    <PageShell title="My Events" subtitle="Every venue, vendor and worker you've hired, grouped by event."
      action={<Link to="/customer/bookings" className="inline-flex items-center gap-1.5 rounded-full btn-brand btn-brand-hover px-4 py-2 text-sm font-semibold text-white"><Store className="h-4 w-4" /> View all bookings</Link>}>

      <div className="flex gap-1 rounded-xl border border-border bg-card p-1 w-fit">
        {(["upcoming", "past", "cancelled"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`rounded-lg px-3 py-1.5 text-xs font-semibold capitalize ${tab === t ? "bg-brand-violet text-white" : "text-muted-foreground hover:text-foreground"}`}>{t}</button>
        ))}
      </div>

      {isLoading ? <LoadingRows /> : filtered.length === 0 ? (
        <EmptyState
          title="Nothing here yet"
          description="Book a venue, vendor or worker from the Marketplace — everything you hire shows up together on your Bookings page."
          icon={CalendarDays}
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((e) => (
            <Link key={e.id} to="/customer/events/$eventId" params={{ eventId: e.id }} className="block rounded-2xl border border-border bg-card p-5 hover:border-brand-violet/50 transition-colors">
              <div className="flex items-center justify-between">
                <div className="text-xs font-semibold uppercase tracking-widest text-brand-violet">{e.event_type ?? "Event"}</div>
                <span className="rounded-full bg-brand-violet/10 px-2 py-0.5 text-[10px] font-semibold capitalize text-brand-violet">{e.status}</span>
              </div>
              <h3 className="mt-2 font-display text-lg font-semibold">{e.name}</h3>
              <dl className="mt-3 space-y-1 text-xs text-muted-foreground">
                <div className="flex justify-between"><dt>Date</dt><dd>{e.event_date ?? "TBD"}</dd></div>
                <div className="flex justify-between"><dt>Venue</dt><dd>{e.venue ?? "TBD"}</dd></div>
                <div className="flex justify-between"><dt>Guests</dt><dd>{e.guests ?? "—"}</dd></div>
                <div className="flex justify-between"><dt>Budget</dt><dd>{e.budget ? `₹${Number(e.budget).toLocaleString("en-IN")}` : "—"}</dd></div>
              </dl>
              <div className="mt-3 text-xs font-semibold text-brand-violet">View team & hires →</div>
            </Link>
          ))}
        </div>
      )}
    </PageShell>
  );
}
