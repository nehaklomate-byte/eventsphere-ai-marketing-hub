import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Inbox, Phone, Mail, Calendar, Users, Loader2 } from "lucide-react";
import { fetchMyHalls, fetchEnquiries, updateEnquiryStatus, type Enquiry } from "@/lib/venue";

export const Route = createFileRoute("/_authenticated/venue/enquiries")({
  head: () => ({ meta: [{ title: "Enquiries — EventOrbit AI" }, { name: "robots", content: "noindex" }] }),
  component: EnquiriesPage,
});

const STATUS_OPTIONS: Enquiry["status"][] = ["new", "contacted", "quoted", "booked", "declined", "closed"];
const STATUS_STYLE: Record<Enquiry["status"], string> = {
  new: "bg-brand-violet/10 text-brand-violet",
  contacted: "bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300",
  quoted: "bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300",
  booked: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300",
  declined: "bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300",
  closed: "bg-muted text-muted-foreground",
};

function EnquiriesPage() {
  const qc = useQueryClient();
  const [busyId, setBusyId] = useState<string | null>(null);
  const { data: halls } = useQuery({ queryKey: ["venue-halls"], queryFn: fetchMyHalls });
  const hallIds = (halls ?? []).map((h) => h.id);

  const { data: enquiries, isLoading } = useQuery({
    queryKey: ["venue-enquiries", hallIds],
    queryFn: () => fetchEnquiries(hallIds),
    enabled: hallIds.length > 0,
  });

  async function changeStatus(id: string, status: Enquiry["status"]) {
    setBusyId(id);
    try {
      await updateEnquiryStatus(id, status);
      toast.success("Updated");
      qc.invalidateQueries({ queryKey: ["venue-enquiries"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to update");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl md:text-3xl font-bold tracking-tight">
          <Inbox className="h-7 w-7 text-brand-violet" /> Enquiries
        </h1>
        <p className="mt-1 text-muted-foreground">Every enquiry a customer sent from your venue's public page.</p>
      </div>

      {isLoading ? (
        <div className="rounded-2xl border border-border bg-card p-10 text-center text-sm text-muted-foreground">
          <Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin" /> Loading…
        </div>
      ) : !enquiries || enquiries.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card/40 p-10 text-center text-sm text-muted-foreground">
          No enquiries yet. Once your venue is published, enquiries from the marketplace will show up here.
        </div>
      ) : (
        <div className="space-y-4">
          {enquiries.map((e) => (
            <div key={e.id} className="rounded-2xl border border-border bg-card p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-display text-lg font-semibold">{e.contact_name}</h3>
                    <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${STATUS_STYLE[e.status]}`}>{e.status}</span>
                  </div>
                  <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1"><Mail className="h-3.5 w-3.5" /> {e.contact_email}</span>
                    {e.contact_phone && <span className="flex items-center gap-1"><Phone className="h-3.5 w-3.5" /> {e.contact_phone}</span>}
                    {e.event_date && <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" /> {new Date(e.event_date).toLocaleDateString()}</span>}
                    {e.guest_count && <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" /> {e.guest_count} guests</span>}
                  </div>
                  {e.message && <p className="mt-2 text-sm text-foreground/80">{e.message}</p>}
                </div>

                <select
                  value={e.status}
                  disabled={busyId === e.id}
                  onChange={(ev) => changeStatus(e.id, ev.target.value as Enquiry["status"])}
                  className="rounded-full border border-input bg-background px-3 py-1.5 text-xs font-semibold capitalize outline-none focus:border-brand-violet disabled:opacity-50"
                >
                  {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
