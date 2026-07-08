import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ReceiptText, Store } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/session";
import { PageShell, EmptyState, LoadingRows } from "./-ui";

export const Route = createFileRoute("/_authenticated/customer/bookings")({
  component: BookingsPage,
});

function BookingsPage() {
  const { user } = useSession();
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["c-bookings", user?.id],
    enabled: !!user?.id,
    queryFn: async () => (await supabase.from("customer_bookings").select("*").eq("user_id", user!.id).order("created_at", { ascending: false })).data ?? [],
  });

  async function cancel(id: string) {
    if (!confirm("Cancel this booking? This cannot be undone.")) return;
    const { error } = await supabase.from("customer_bookings").update({ status: "cancelled" }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Booking cancelled");
    qc.invalidateQueries({ queryKey: ["c-bookings"] });
  }
  async function reschedule(id: string) {
    const { error } = await supabase.from("customer_bookings").update({ status: "reschedule_requested" }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Reschedule requested");
    qc.invalidateQueries({ queryKey: ["c-bookings"] });
  }

  return (
    <PageShell title="Bookings" subtitle="All your hall, vendor and worker bookings in one place.">
      {isLoading ? <LoadingRows /> : (data?.length ?? 0) === 0 ? (
        <EmptyState
          title="No bookings yet" description="Explore the marketplace to book verified halls and vendors."
          icon={ReceiptText} action={<Link to="/marketplace" className="inline-flex items-center gap-1.5 rounded-full btn-brand btn-brand-hover px-4 py-2 text-sm font-semibold text-white"><Store className="h-4 w-4" /> Browse marketplace</Link>}
        />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border bg-card">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs uppercase tracking-widest text-muted-foreground">
              <tr>
                <th className="px-4 py-3 text-left">Booking</th>
                <th className="px-4 py-3 text-left">Type</th>
                <th className="px-4 py-3 text-left">Date</th>
                <th className="px-4 py-3 text-right">Amount</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Payment</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {data!.map((b) => (
                <tr key={b.id} className="border-t border-border">
                  <td className="px-4 py-3 font-semibold">{b.target_name}</td>
                  <td className="px-4 py-3 capitalize">{b.kind}</td>
                  <td className="px-4 py-3">{b.event_date ?? "—"}</td>
                  <td className="px-4 py-3 text-right">₹{Number(b.amount).toLocaleString("en-IN")}</td>
                  <td className="px-4 py-3 capitalize">{b.status}</td>
                  <td className="px-4 py-3 capitalize">{b.payment_status}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      {b.status !== "cancelled" && b.status !== "completed" && (
                        <>
                          <button onClick={() => reschedule(b.id)} className="rounded-lg border border-input px-2.5 py-1 text-xs hover:bg-accent">Reschedule</button>
                          <button onClick={() => cancel(b.id)} className="rounded-lg border border-rose-500/50 px-2.5 py-1 text-xs text-rose-600 hover:bg-rose-500/10">Cancel</button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </PageShell>
  );
}
