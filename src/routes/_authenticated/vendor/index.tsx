import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Store, ShieldCheck, ArrowUpRight, Loader2 } from "lucide-react";
import { useSession } from "@/lib/session";
import { fetchMyVendor, computeVendorCompletion } from "@/lib/vendor";

export const Route = createFileRoute("/_authenticated/vendor/")({
  head: () => ({ meta: [{ title: "Vendor Dashboard — EventOrbit AI" }, { name: "robots", content: "noindex" }] }),
  component: VendorDashboardHome,
});

function VendorDashboardHome() {
  const { user } = useSession();
  const { data: vendor, isLoading } = useQuery({ queryKey: ["me-vendor", user?.id], queryFn: () => fetchMyVendor(user!.id), enabled: !!user?.id });

  if (isLoading) return <div className="grid place-items-center py-20"><Loader2 className="h-6 w-6 animate-spin text-brand-violet" /></div>;

  const completion = computeVendorCompletion(vendor ?? {});
  const isLive = vendor?.verification_status === "approved" && vendor?.status === "published";

  return (
    <div className="space-y-8">
      <div className="rounded-3xl border border-border bg-gradient-to-br from-brand-violet/10 via-secondary/5 to-background p-8 md:p-10">
        <span className="inline-flex rounded-full bg-white/60 dark:bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-widest text-brand-violet">
          Vendor workspace
        </span>
        <h1 className="mt-4 font-display text-3xl md:text-4xl font-semibold tracking-tight">{vendor?.business_name ?? "Welcome"}</h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          Complete your profile, get verified, then publish it to appear in customer and venue-owner searches.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Link to="/vendor/profile" className="group rounded-2xl border border-border bg-card p-6 transition hover:border-brand-violet/40 hover:shadow-soft">
          <div className="flex items-center justify-between">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-brand-violet/10 text-brand-violet"><Store className="h-5 w-5" /></div>
            <ArrowUpRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground" />
          </div>
          <h3 className="mt-4 font-display text-lg font-semibold">{completion}% profile complete</h3>
          <p className="mt-1 text-sm text-muted-foreground">Fill in every section to get verified faster.</p>
        </Link>

        <Link to="/vendor/profile" className="group rounded-2xl border border-border bg-card p-6 transition hover:border-brand-violet/40 hover:shadow-soft">
          <div className="flex items-center justify-between">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-brand-violet/10 text-brand-violet"><ShieldCheck className="h-5 w-5" /></div>
            <ArrowUpRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground" />
          </div>
          <h3 className="mt-4 font-display text-lg font-semibold">{isLive ? "Live on marketplace" : vendor?.verification_status === "approved" ? "Verified — not published yet" : "Verification pending"}</h3>
          <p className="mt-1 text-sm text-muted-foreground">{isLive ? "Customers and venue owners can find you right now." : "Head to your profile's Review tab to continue."}</p>
        </Link>
      </div>
    </div>
  );
}
