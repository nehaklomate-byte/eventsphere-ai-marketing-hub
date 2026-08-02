import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useSession } from "@/lib/session";
import { Loader2, Search, MapPin, Calendar, Wallet, Send } from "lucide-react";
import {
  fetchMyVendor, fetchOpenVendorPostings, fetchMyVendorApplications,
  applyToVendorPosting, withdrawVendorApplication, VENDOR_CATEGORIES,
} from "@/lib/vendor";

export const Route = createFileRoute("/_authenticated/vendor/board")({
  head: () => ({ meta: [{ title: "Job Board — EventOrbit AI" }, { name: "robots", content: "noindex" }] }),
  component: VendorBoardPage,
});

function VendorBoardPage() {
  const { user } = useSession();
  const qc = useQueryClient();
  const [tab, setTab] = useState<"browse" | "applications">("browse");
  const [q, setQ] = useState("");
  const [category, setCategory] = useState("");
  const [applyingTo, setApplyingTo] = useState<string | null>(null);
  const [note, setNote] = useState("");

  const { data: vendor } = useQuery({ queryKey: ["me-vendor", user?.id], queryFn: () => fetchMyVendor(user!.id), enabled: !!user?.id });
  const { data: postings = [], isLoading } = useQuery({ queryKey: ["vendor-postings", category], queryFn: () => fetchOpenVendorPostings(category || undefined) });
  const { data: applications = [] } = useQuery({ queryKey: ["vendor-applications", user?.id], queryFn: () => fetchMyVendorApplications(user!.id), enabled: !!user?.id });

  const appliedIds = new Set(applications.filter((a) => a.status !== "withdrawn").map((a) => a.posting_id));
  const filtered = postings.filter((p) => !q || `${p.title} ${p.venue ?? ""} ${p.category}`.toLowerCase().includes(q.toLowerCase()));

  const apply = useMutation({
    mutationFn: async (postingId: string) => {
      if (!vendor?.id || !user?.id) throw new Error("Complete your vendor profile before applying.");
      await applyToVendorPosting(postingId, vendor.id, user.id, note);
    },
    onSuccess: () => { setApplyingTo(null); setNote(""); qc.invalidateQueries({ queryKey: ["vendor-applications", user?.id] }); },
  });

  const withdraw = useMutation({
    mutationFn: withdrawVendorApplication,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["vendor-applications", user?.id] }),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Job board</h1>
        <p className="mt-1 text-sm text-muted-foreground">Open work posted by organizations and venues. Apply to the ones that fit your services.</p>
      </div>

      <div className="flex gap-2 border-b border-border">
        {(["browse", "applications"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px transition ${tab === t ? "border-brand-violet text-brand-violet" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
            {t === "browse" ? "Browse jobs" : `My applications (${applications.length})`}
          </button>
        ))}
      </div>

      {tab === "browse" ? (
        <>
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search jobs, venues…" className="w-full rounded-full border border-input bg-background pl-9 pr-4 py-2.5 text-sm" />
            </div>
            <select value={category} onChange={(e) => setCategory(e.target.value)} className="rounded-full border border-input bg-background px-4 py-2.5 text-sm">
              <option value="">All categories</option>
              {VENDOR_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          {isLoading ? (
            <div className="grid place-items-center py-20"><Loader2 className="h-6 w-6 animate-spin text-brand-violet" /></div>
          ) : filtered.length === 0 ? (
            <div className="rounded-2xl border border-border bg-card p-10 text-center text-sm text-muted-foreground">No open jobs match your filters right now. Check back soon.</div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {filtered.map((p) => (
                <div key={p.id} className="rounded-2xl border border-border bg-card p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="font-semibold truncate">{p.title}</h3>
                      <div className="text-xs text-muted-foreground">{p.poster_name ?? "Client"} · {p.category}</div>
                    </div>
                    <span className="rounded-full bg-brand-violet/10 px-2.5 py-1 text-[11px] font-semibold text-brand-violet">{p.slots_needed - p.slots_filled} open</span>
                  </div>
                  {p.description && <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">{p.description}</p>}
                  <div className="mt-3 grid gap-1.5 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5" />{new Date(`${p.event_date}T00:00:00`).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}{p.start_time ? ` · ${p.start_time}` : ""}</span>
                    {p.venue && <span className="inline-flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" />{p.venue}</span>}
                    {p.pay_amount != null && <span className="inline-flex items-center gap-1.5"><Wallet className="h-3.5 w-3.5" />₹{Number(p.pay_amount).toLocaleString("en-IN")} {p.pay_type.replace("_", " ")}</span>}
                  </div>

                  {appliedIds.has(p.id) ? (
                    <div className="mt-4 rounded-full bg-emerald-500/10 px-4 py-2 text-center text-xs font-semibold text-emerald-700">Application sent</div>
                  ) : applyingTo === p.id ? (
                    <div className="mt-4 space-y-2">
                      <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} placeholder="Briefly describe why you're a good fit (optional)"
                        className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm" />
                      <div className="flex gap-2">
                        <button onClick={() => apply.mutate(p.id)} disabled={apply.isPending}
                          className="inline-flex items-center gap-2 rounded-full btn-brand btn-brand-hover px-4 py-2 text-xs font-semibold text-white disabled:opacity-60">
                          {apply.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />} Send application
                        </button>
                        <button onClick={() => { setApplyingTo(null); setNote(""); }} className="rounded-full border border-input px-4 py-2 text-xs font-semibold hover:bg-accent">Cancel</button>
                      </div>
                      {apply.isError && <div className="text-xs text-destructive">{(apply.error as Error).message}</div>}
                    </div>
                  ) : (
                    <button onClick={() => setApplyingTo(p.id)} className="mt-4 w-full rounded-full btn-brand btn-brand-hover px-4 py-2 text-xs font-semibold text-white">Apply</button>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      ) : applications.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-10 text-center text-sm text-muted-foreground">You haven't applied to any jobs yet.</div>
      ) : (
        <div className="space-y-3">
          {applications.map((a) => (
            <div key={a.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card p-5">
              <div className="min-w-0">
                <div className="font-semibold truncate">{a.posting?.title ?? "Job posting"}</div>
                <div className="text-xs text-muted-foreground">
                  Applied {new Date(a.applied_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                  {a.posting?.venue ? ` · ${a.posting.venue}` : ""}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="rounded-full border border-border px-3 py-1 text-[11px] font-semibold capitalize">{a.status}</span>
                {a.status === "applied" && (
                  <button onClick={() => withdraw.mutate(a.id)} disabled={withdraw.isPending}
                    className="rounded-full border border-input px-3 py-1.5 text-[11px] font-semibold hover:bg-accent disabled:opacity-60">Withdraw</button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
