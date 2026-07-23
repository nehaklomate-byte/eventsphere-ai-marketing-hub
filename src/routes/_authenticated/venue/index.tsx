import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Building2, Inbox, CalendarCheck, ShieldCheck, ShieldAlert, Clock, Plus } from "lucide-react";
import { fetchMyHalls, fetchEnquiries, fetchHallBookings } from "@/lib/venue";

export const Route = createFileRoute("/_authenticated/venue/")({
  head: () => ({ meta: [{ title: "Venue Dashboard — EventOrbit AI" }, { name: "robots", content: "noindex" }] }),
  component: VenueDashboardHome,
});

const VERIFICATION_BADGE: Record<string, { label: string; className: string; icon: typeof ShieldCheck }> = {
  pending: { label: "Verification pending", className: "bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300", icon: Clock },
  approved: { label: "Verified", className: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300", icon: ShieldCheck },
  rejected: { label: "Verification rejected", className: "bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300", icon: ShieldAlert },
  suspended: { label: "Suspended", className: "bg-orange-100 text-orange-800 dark:bg-orange-950/40 dark:text-orange-300", icon: ShieldAlert },
  blacklisted: { label: "Blacklisted", className: "bg-zinc-800 text-white", icon: ShieldAlert },
};

function VenueDashboardHome() {
  const { data: halls, isLoading: hallsLoading } = useQuery({ queryKey: ["venue-halls"], queryFn: fetchMyHalls });
  const hallIds = (halls ?? []).map((h) => h.id);

  const { data: enquiries } = useQuery({
    queryKey: ["venue-enquiries", hallIds],
    queryFn: () => fetchEnquiries(hallIds),
    enabled: hallIds.length > 0,
  });
  const { data: bookings } = useQuery({
    queryKey: ["venue-bookings", hallIds],
    queryFn: () => fetchHallBookings(hallIds),
    enabled: hallIds.length > 0,
  });

  const newEnquiries = (enquiries ?? []).filter((e) => e.status === "new").length;
  const pendingBookings = (bookings ?? []).filter((b) => b.status === "pending").length;
  const primaryHall = halls?.[0];

  return (
    <div className="space-y-8">
      <div className="rounded-3xl border border-border bg-gradient-to-br from-brand-violet/10 via-secondary/5 to-background p-8 md:p-10">
        <span className="inline-flex rounded-full bg-white/60 dark:bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-widest text-brand-violet">
          Venue owner
        </span>
        <h1 className="mt-4 font-display text-3xl md:text-4xl font-semibold tracking-tight">
          {primaryHall ? primaryHall.name : "Your venue"}
        </h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          Manage enquiries, confirm bookings, and keep your venue profile up to date.
        </p>
      </div>

      {!hallsLoading && (halls?.length ?? 0) === 0 && (
        <Link
          to="/venue/profile"
          className="flex items-center justify-between rounded-2xl border border-dashed border-brand-violet/40 bg-brand-violet/5 px-6 py-5 text-sm font-semibold text-brand-violet hover:border-brand-violet transition"
        >
          <span className="flex items-center gap-2"><Plus className="h-4 w-4" /> Add your venue details to start receiving bookings</span>
        </Link>
      )}

      {primaryHall && (
        <div className={`flex items-center gap-2 rounded-2xl px-5 py-3 text-sm font-semibold ${VERIFICATION_BADGE[primaryHall.verification_status]?.className}`}>
          {(() => { const Icon = VERIFICATION_BADGE[primaryHall.verification_status]?.icon ?? Clock; return <Icon className="h-4 w-4" />; })()}
          {VERIFICATION_BADGE[primaryHall.verification_status]?.label}
          {primaryHall.verification_status === "rejected" && primaryHall.rejection_reason && (
            <span className="font-normal">— {primaryHall.rejection_reason}</span>
          )}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        <Link to="/venue/enquiries" className="group rounded-2xl border border-border bg-card p-6 transition hover:border-brand-violet/40 hover:shadow-soft">
          <div className="flex items-center justify-between">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-brand-violet/10 text-brand-violet"><Inbox className="h-5 w-5" /></div>
            {newEnquiries > 0 && <span className="rounded-full bg-brand-violet px-2 py-0.5 text-[11px] font-semibold text-white">{newEnquiries} new</span>}
          </div>
          <h3 className="mt-4 font-display text-lg font-semibold">Enquiries</h3>
          <p className="mt-1 text-sm text-muted-foreground">{enquiries?.length ?? 0} total enquiries received.</p>
        </Link>

        <Link to="/venue/bookings" className="group rounded-2xl border border-border bg-card p-6 transition hover:border-brand-violet/40 hover:shadow-soft">
          <div className="flex items-center justify-between">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-brand-violet/10 text-brand-violet"><CalendarCheck className="h-5 w-5" /></div>
            {pendingBookings > 0 && <span className="rounded-full bg-amber-500 px-2 py-0.5 text-[11px] font-semibold text-white">{pendingBookings} pending</span>}
          </div>
          <h3 className="mt-4 font-display text-lg font-semibold">Bookings</h3>
          <p className="mt-1 text-sm text-muted-foreground">{bookings?.length ?? 0} total bookings on your venue.</p>
        </Link>

        <Link to="/venue/profile" className="group rounded-2xl border border-border bg-card p-6 transition hover:border-brand-violet/40 hover:shadow-soft">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-brand-violet/10 text-brand-violet"><Building2 className="h-5 w-5" /></div>
          <h3 className="mt-4 font-display text-lg font-semibold">Venue Profile</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {primaryHall?.status === "published" ? "Live on the marketplace." : "Not published yet — complete your profile."}
          </p>
        </Link>
      </div>
    </div>
  );
}
