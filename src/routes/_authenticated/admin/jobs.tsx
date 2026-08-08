import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Briefcase, Search, Loader2, MapPin, Calendar, Wallet, Users, ChevronDown, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/admin/jobs")({
  head: () => ({ meta: [{ title: "Job Board — EventOrbit Nova" }, { name: "robots", content: "noindex" }] }),
  component: AdminJobsPage,
});

type Posting = {
  id: string; org_id: string | null; vendor_id: string | null; hall_id: string | null;
  title: string; category: string; venue: string | null; event_date: string;
  slots_needed: number; slots_filled: number; pay_amount: number | null; pay_type: string;
  status: "open" | "closed" | "cancelled"; created_at: string; posted_by: string;
};
type Application = {
  id: string; posting_id: string; status: string; applied_at: string;
  worker?: { full_name: string; category: string | null; city: string | null };
};

async function fetchAllPostings(): Promise<Posting[]> {
  const { data, error } = await supabase.from("worker_job_postings" as never).select("*").order("created_at" as never, { ascending: false });
  if (error) throw error;
  const postings = (data as unknown as Posting[]) ?? [];
  if (postings.length === 0) return postings;

  const orgIds = Array.from(new Set(postings.map((p) => p.org_id).filter(Boolean))) as string[];
  const hallIds = Array.from(new Set(postings.map((p) => p.hall_id).filter(Boolean))) as string[];
  const vendorIds = Array.from(new Set(postings.map((p) => p.vendor_id).filter(Boolean))) as string[];
  const posterIds = Array.from(new Set(postings.map((p) => p.posted_by)));
  const [orgs, halls, vendors, posters] = await Promise.all([
    orgIds.length ? supabase.from("organizations").select("id, name") : Promise.resolve({ data: [] }),
    hallIds.length ? supabase.from("halls").select("id, name") : Promise.resolve({ data: [] }),
    vendorIds.length ? supabase.from("vendors").select("id, business_name") : Promise.resolve({ data: [] }),
    posterIds.length ? supabase.from("profiles").select("id, full_name, email") : Promise.resolve({ data: [] }),
  ]);
  const orgById = new Map((orgs.data ?? []).map((o: { id: string; name: string }) => [o.id, o.name]));
  const hallById = new Map((halls.data ?? []).map((h: { id: string; name: string }) => [h.id, h.name]));
  const vendorById = new Map((vendors.data ?? []).map((v: { id: string; business_name: string }) => [v.id, v.business_name]));
  const posterById = new Map((posters.data ?? []).map((p: { id: string; full_name: string | null; email: string | null }) => [p.id, p.full_name ?? p.email ?? "Unknown"]));

  return postings.map((p) => ({
    ...p,
    posterType: p.org_id ? "Organization" : p.hall_id ? "Venue Owner" : p.vendor_id ? "Vendor" : "—",
    posterName: p.org_id ? orgById.get(p.org_id) : p.hall_id ? hallById.get(p.hall_id) : p.vendor_id ? vendorById.get(p.vendor_id) : undefined,
    postedByName: posterById.get(p.posted_by) ?? "Unknown",
  })) as (Posting & { posterType: string; posterName?: string; postedByName: string })[];
}

async function fetchApplicationsFor(postingId: string): Promise<Application[]> {
  const { data: apps, error } = await supabase.from("worker_job_applications" as never).select("*").eq("posting_id" as never, postingId as never).order("applied_at" as never, { ascending: true });
  if (error) throw error;
  const list = (apps as unknown as Application[]) ?? [];
  if (list.length === 0) return list;
  const { data: workers } = await supabase.from("workers").select("id, full_name, category, city").in("id", list.map((a: never) => (a as unknown as { worker_id: string }).worker_id));
  const byId = new Map((workers ?? []).map((w) => [w.id, w]));
  return list.map((a) => ({ ...a, worker: byId.get((a as unknown as { worker_id: string }).worker_id) }));
}

async function adminClosePosting(id: string): Promise<void> {
  const { error } = await supabase.from("worker_job_postings" as never).update({ status: "cancelled" } as never).eq("id" as never, id as never);
  if (error) throw error;
}

const STATUS_BADGE: Record<string, string> = {
  open: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300",
  closed: "bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300",
  cancelled: "bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300",
};
const POSTER_TONE: Record<string, string> = {
  Organization: "bg-violet-100 text-violet-800 dark:bg-violet-950/40 dark:text-violet-300",
  "Venue Owner": "bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300",
  Vendor: "bg-sky-100 text-sky-800 dark:bg-sky-950/40 dark:text-sky-300",
};

function AdminJobsPage() {
  const qc = useQueryClient();
  const { data: postings = [], isLoading } = useQuery({ queryKey: ["admin-all-postings"], queryFn: fetchAllPostings });
  const [q, setQ] = useState("");
  const [posterFilter, setPosterFilter] = useState<"all" | "Organization" | "Venue Owner" | "Vendor">("all");
  const [expanded, setExpanded] = useState<string | null>(null);

  const filtered = useMemo(() => postings.filter((p) => {
    if (posterFilter !== "all" && p.posterType !== posterFilter) return false;
    if (!q) return true;
    const hay = `${p.title} ${p.category} ${p.posterName ?? ""} ${p.postedByName}`.toLowerCase();
    return hay.includes(q.toLowerCase());
  }), [postings, q, posterFilter]);

  async function handleClose(id: string) {
    if (!window.confirm("Cancel this posting as admin? Workers will no longer be able to apply.")) return;
    try {
      await adminClosePosting(id);
      await qc.invalidateQueries({ queryKey: ["admin-all-postings"] });
      toast.success("Posting cancelled.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to cancel posting");
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-2"><Briefcase className="h-6 w-6" /> Job Board — All Postings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Every job posted by Organizations, Venue Owners and Vendors, platform-wide — who posted it, how many have
          applied, and the option to cancel any posting. Postings go live immediately when created; nothing here
          requires your approval before publishing (see note below).
        </p>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search title, category, poster…"
            className="w-full rounded-full border border-input bg-background pl-9 pr-4 py-2.5 text-sm" />
        </div>
        <div className="flex gap-2">
          {(["all", "Organization", "Venue Owner", "Vendor"] as const).map((f) => (
            <button key={f} onClick={() => setPosterFilter(f)}
              className={`rounded-full px-3.5 py-1.5 text-xs font-semibold border transition-colors ${posterFilter === f ? "bg-brand-violet text-white border-brand-violet" : "border-border text-muted-foreground hover:bg-accent"}`}>
              {f === "all" ? "All" : f}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="grid place-items-center py-20"><Loader2 className="h-6 w-6 animate-spin text-brand-violet" /></div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-10 text-center text-sm text-muted-foreground">No postings match your filters.</div>
      ) : (
        <div className="space-y-3">
          {filtered.map((p) => (
            <div key={p.id} className="rounded-2xl border border-border bg-card overflow-hidden">
              <button onClick={() => setExpanded(expanded === p.id ? null : p.id)} className="flex w-full items-center justify-between gap-4 p-5 text-left">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-medium truncate">{p.title}</h3>
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${POSTER_TONE[p.posterType] ?? "bg-muted text-muted-foreground"}`}>{p.posterType}: {p.posterName ?? "—"}</span>
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize ${STATUS_BADGE[p.status]}`}>{p.status}</span>
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    <span>Posted by {p.postedByName}</span>
                    <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" /> {p.event_date}</span>
                    {p.venue && <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {p.venue}</span>}
                    <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" /> {p.slots_filled}/{p.slots_needed} filled</span>
                    {p.pay_amount != null && <span className="flex items-center gap-1"><Wallet className="h-3.5 w-3.5" /> ₹{Number(p.pay_amount).toLocaleString("en-IN")}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {p.status === "open" && (
                    <span onClick={(e) => { e.stopPropagation(); handleClose(p.id); }}
                      className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 cursor-pointer">
                      <X className="h-3.5 w-3.5" /> Cancel
                    </span>
                  )}
                  <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${expanded === p.id ? "rotate-180" : ""}`} />
                </div>
              </button>
              {expanded === p.id && <AdminApplicantsPanel postingId={p.id} />}
            </div>
          ))}
        </div>
      )}

      <div className="rounded-2xl border border-dashed border-border bg-muted/30 p-4 text-xs text-muted-foreground">
        <strong>Why postings aren't approval-gated:</strong> during closed beta, everyone posting is someone you
        already know, so a pre-publish approval step only adds delay without adding safety. You have full
        visibility here and can cancel anything, any time — that's usually enough while trust is still local.
        If/when this opens to the public, a "pending review until admin approves" step is a small, contained
        addition to make at that point — ask and it can be built then.
      </div>
    </div>
  );
}

function AdminApplicantsPanel({ postingId }: { postingId: string }) {
  const { data: apps, isLoading } = useQuery({ queryKey: ["admin-posting-applications", postingId], queryFn: () => fetchApplicationsFor(postingId) });
  return (
    <div className="border-t border-border bg-muted/30 p-5 space-y-2">
      {isLoading && <p className="text-sm text-muted-foreground">Loading applicants…</p>}
      {!isLoading && (apps?.length ?? 0) === 0 && <p className="text-sm text-muted-foreground">No applications yet.</p>}
      {(apps ?? []).map((a) => (
        <div key={a.id} className="flex items-center justify-between rounded-xl border border-border bg-card p-3 text-sm">
          <span>{a.worker?.full_name ?? "Worker"} <span className="text-xs text-muted-foreground">· {a.worker?.category ?? "—"} · {a.worker?.city ?? "—"}</span></span>
          <span className="rounded-full border px-2 py-0.5 text-[10px] font-semibold capitalize">{a.status}</span>
        </div>
      ))}
    </div>
  );
}
