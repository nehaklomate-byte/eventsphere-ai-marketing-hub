import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Briefcase, MapPin, Calendar, Clock, Wallet, Send, X, Loader2, Layers, ClipboardList,
} from "lucide-react";
import { useSession } from "@/lib/session";
import {
  fetchMyWorker, fetchOpenPostings, fetchMyApplications, applyToPosting, withdrawApplication,
  WORKER_CATEGORIES, statusTone, type OpenPosting, type MyApplication, type WorkerRow,
} from "@/lib/worker";
import { EmptyState } from "./index";
import { AttachmentGallery } from "@/components/AttachmentUpload";

export const Route = createFileRoute("/_authenticated/worker/board")({
  head: () => ({ meta: [{ title: "Job Board — EventOrbit Nova" }, { name: "robots", content: "noindex" }] }),
  component: BoardPage,
});

const APP_STATUS_TONE: Record<MyApplication["status"], string> = {
  applied: "bg-amber-500/10 text-amber-700 border-amber-500/20",
  shortlisted: "bg-blue-500/10 text-blue-700 border-blue-500/20",
  accepted: "bg-emerald-500/10 text-emerald-700 border-emerald-500/20",
  rejected: "bg-rose-500/10 text-rose-700 border-rose-500/20",
  withdrawn: "bg-zinc-500/10 text-zinc-700 border-zinc-500/20",
};

function BoardPage() {
  const { user } = useSession();
  const qc = useQueryClient();
  const [tab, setTab] = useState<"browse" | "applications">("browse");
  const [category, setCategory] = useState<string>("");
  const [applyTo, setApplyTo] = useState<OpenPosting | null>(null);

  const { data: worker } = useQuery({ queryKey: ["me-worker", user?.id], queryFn: () => fetchMyWorker(user!.id), enabled: !!user?.id });
  const { data: postings = [], isLoading: loadingPostings } = useQuery({
    queryKey: ["open-postings", category], queryFn: () => fetchOpenPostings(category || undefined),
  });
  const { data: applications = [], isLoading: loadingApps } = useQuery({
    queryKey: ["my-applications", user?.id], queryFn: () => fetchMyApplications(user!.id), enabled: !!user?.id,
  });

  const appliedPostingIds = new Set(applications.filter((a) => a.status !== "withdrawn").map((a) => a.posting_id));

  const withdraw = useMutation({
    mutationFn: (id: string) => withdrawApplication(id),
    onSuccess: () => { toast.success("Application withdrawn"); qc.invalidateQueries({ queryKey: ["my-applications", user?.id] }); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed to withdraw"),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Job Board</h1>
        <p className="mt-1 text-sm text-muted-foreground">Browse open jobs from organizations and apply directly — accepted applications appear in Assigned Jobs.</p>
      </div>

      <div className="inline-flex rounded-full border border-border bg-card p-1 text-sm">
        <button onClick={() => setTab("browse")} className={`inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 font-semibold transition ${tab === "browse" ? "bg-gradient-brand text-white" : "text-muted-foreground"}`}>
          <Layers className="h-3.5 w-3.5" /> Browse ({postings.length})
        </button>
        <button onClick={() => setTab("applications")} className={`inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 font-semibold transition ${tab === "applications" ? "bg-gradient-brand text-white" : "text-muted-foreground"}`}>
          <ClipboardList className="h-3.5 w-3.5" /> My Applications ({applications.filter((a) => a.status !== "withdrawn").length})
        </button>
      </div>

      {tab === "browse" ? (
        <>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => setCategory("")} className={`rounded-full px-3.5 py-1.5 text-xs font-semibold border transition-colors ${category === "" ? "bg-brand-violet text-white border-brand-violet" : "border-border text-muted-foreground hover:bg-accent"}`}>All categories</button>
            {WORKER_CATEGORIES.map((c) => (
              <button key={c} onClick={() => setCategory(c)} className={`rounded-full px-3.5 py-1.5 text-xs font-semibold border transition-colors ${category === c ? "bg-brand-violet text-white border-brand-violet" : "border-border text-muted-foreground hover:bg-accent"}`}>{c}</button>
            ))}
          </div>

          {loadingPostings ? (
            <div className="grid gap-4 md:grid-cols-2">{[0, 1, 2, 3].map((i) => <div key={i} className="h-44 rounded-2xl bg-card animate-pulse border border-border" />)}</div>
          ) : postings.length === 0 ? (
            <div className="rounded-2xl border border-border bg-card p-8">
              <EmptyState icon={Briefcase} title="No open jobs right now" body="Check back soon, or widen your category filter." />
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {postings.map((p) => {
                const applied = appliedPostingIds.has(p.id);
                const full = p.slots_filled >= p.slots_needed;
                return (
                  <article key={p.id} className="rounded-2xl border border-border bg-card p-5 shadow-soft flex flex-col">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="font-semibold text-lg truncate">{p.title}</h3>
                        <div className="text-sm text-muted-foreground truncate">{p.poster_name ?? "Hiring partner"} · {p.category}</div>
                      </div>
                      <span className="shrink-0 rounded-full bg-accent px-2.5 py-1 text-[10px] font-semibold">{p.slots_filled}/{p.slots_needed} filled</span>
                    </div>
                    <div className="mt-4 space-y-1.5 text-xs text-muted-foreground">
                      <div className="flex items-center gap-2"><MapPin className="h-3.5 w-3.5" /> {p.venue ?? "Venue TBD"}{p.venue_address ? ` · ${p.venue_address}` : ""}</div>
                      <div className="flex items-center gap-2"><Calendar className="h-3.5 w-3.5" /> {new Date(p.event_date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</div>
                      <div className="flex items-center gap-2"><Clock className="h-3.5 w-3.5" /> {p.start_time ?? "—"} – {p.end_time ?? "—"}</div>
                      {p.pay_amount != null && <div className="flex items-center gap-2 pt-1 text-sm font-semibold text-foreground"><Wallet className="h-3.5 w-3.5" /> ₹{Number(p.pay_amount).toLocaleString("en-IN")} <span className="font-normal text-muted-foreground text-xs">({p.pay_type.replace("_", " ")})</span></div>}
                    </div>
                    {p.description && <p className="mt-3 text-xs text-muted-foreground border-t border-border pt-3 line-clamp-3">{p.description}</p>}
                    {p.attachments?.length > 0 && <AttachmentGallery attachments={p.attachments} />}
                    <div className="mt-4 pt-3 border-t border-border">
                      {applied ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1.5 text-xs font-semibold text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">Already applied</span>
                      ) : full ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1.5 text-xs font-semibold text-muted-foreground">All slots filled</span>
                      ) : (
                        <button onClick={() => setApplyTo(p)} disabled={!worker}
                          className="inline-flex items-center gap-1.5 rounded-full btn-brand btn-brand-hover px-3.5 py-1.5 text-xs font-semibold text-white disabled:opacity-50">
                          <Send className="h-3.5 w-3.5" /> Apply
                        </button>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </>
      ) : (
        <div>
          {loadingApps ? (
            <div className="grid gap-4 md:grid-cols-2">{[0, 1].map((i) => <div key={i} className="h-32 rounded-2xl bg-card animate-pulse border border-border" />)}</div>
          ) : applications.length === 0 ? (
            <div className="rounded-2xl border border-border bg-card p-8">
              <EmptyState icon={ClipboardList} title="No applications yet" body="Apply to a job from the Browse tab to see it here." />
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {applications.map((a) => (
                <article key={a.id} className="rounded-2xl border border-border bg-card p-5 shadow-soft">
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="font-semibold truncate">{a.posting?.title ?? "Job posting"}</h3>
                    <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${APP_STATUS_TONE[a.status]}`}>{a.status}</span>
                  </div>
                  {a.posting && (
                    <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                      <div className="flex items-center gap-2"><Calendar className="h-3.5 w-3.5" /> {new Date(a.posting.event_date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</div>
                      {a.posting.pay_amount != null && <div className="flex items-center gap-2"><Wallet className="h-3.5 w-3.5" /> ₹{Number(a.posting.pay_amount).toLocaleString("en-IN")}</div>}
                    </div>
                  )}
                  {a.cover_note && <p className="mt-2 text-xs text-muted-foreground border-t border-border pt-2">"{a.cover_note}"</p>}
                  {a.status === "accepted" && <p className="mt-2 text-xs font-medium text-emerald-700 dark:text-emerald-400">Accepted! Find it under Assigned Jobs.</p>}
                  {(a.status === "applied" || a.status === "shortlisted") && (
                    <button onClick={() => withdraw.mutate(a.id)} disabled={withdraw.isPending}
                      className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-500/10">
                      {withdraw.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <X className="h-3.5 w-3.5" />} Withdraw
                    </button>
                  )}
                </article>
              ))}
            </div>
          )}
        </div>
      )}

      {applyTo && worker && (
        <ApplyPanel posting={applyTo} worker={worker} userId={user!.id}
          onClose={() => setApplyTo(null)}
          onDone={() => { setApplyTo(null); qc.invalidateQueries({ queryKey: ["my-applications", user?.id] }); qc.invalidateQueries({ queryKey: ["open-postings"] }); }}
        />
      )}
    </div>
  );
}

function ApplyPanel({ posting, worker, userId, onClose, onDone }: {
  posting: OpenPosting; worker: WorkerRow; userId: string; onClose: () => void; onDone: () => void;
}) {
  const [note, setNote] = useState("");
  const [expectedPay, setExpectedPay] = useState("");
  const [available, setAvailable] = useState(false);
  const [busy, setBusy] = useState(false);
  const [touched, setTouched] = useState(false);

  const noteValid = note.trim().length >= 15;
  const canSubmit = available && noteValid;

  async function submit() {
    setTouched(true);
    if (!canSubmit) return;
    setBusy(true);
    try {
      const parts = [`Availability confirmed for ${new Date(posting.event_date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}.`];
      if (posting.pay_amount == null && expectedPay.trim()) parts.push(`Expected pay: ₹${expectedPay.trim()}.`);
      parts.push("", note.trim());
      await applyToPosting(posting.id, worker.id, userId, parts.join("\n"));
      toast.success("Application sent!");
      onDone();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to apply");
    } finally { setBusy(false); }
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4 overflow-y-auto" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl bg-card p-6 shadow-elegant my-8" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Apply to "{posting.title}"</h3>
          <button onClick={onClose} className="rounded-lg p-1.5 hover:bg-accent"><X className="h-4 w-4" /></button>
        </div>

        <div className="mt-4 rounded-xl border border-border bg-muted/40 p-3 text-xs">
          <p className="font-semibold uppercase tracking-widest text-muted-foreground">Applying as</p>
          <p className="mt-1 font-medium text-sm">{worker.full_name}</p>
          <p className="text-muted-foreground">
            {worker.category ?? "—"} · {worker.years_experience ?? 0} yrs experience · {worker.city ?? "—"}
          </p>
          <p className="mt-1 text-muted-foreground">This is what the poster will see alongside your application.</p>
        </div>

        <label className="mt-4 flex items-start gap-2 text-sm">
          <input type="checkbox" checked={available} onChange={(e) => setAvailable(e.target.checked)} className="mt-0.5" />
          <span>I confirm I'm available on {new Date(posting.event_date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
            {posting.start_time ? ` from ${posting.start_time}${posting.end_time ? ` to ${posting.end_time}` : ""}` : ""}.</span>
        </label>
        {touched && !available && <p className="mt-1 text-xs text-rose-600">Please confirm your availability.</p>}

        {posting.pay_amount == null && (
          <label className="mt-3 block">
            <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Your expected pay (₹, optional)</span>
            <input type="number" value={expectedPay} onChange={(e) => setExpectedPay(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm" placeholder="e.g. 1500" />
          </label>
        )}

        <label className="mt-3 block">
          <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Why should they hire you? *</span>
          <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={4}
            className="mt-1.5 w-full rounded-xl border border-input bg-background p-3 text-sm" placeholder="Mention relevant experience, similar events you've worked, or anything that makes you a good fit." />
        </label>
        {touched && !noteValid && <p className="mt-1 text-xs text-rose-600">Add a few lines (at least 15 characters) so the poster knows why to pick you.</p>}

        <button onClick={submit} disabled={busy}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-full btn-brand btn-brand-hover px-4 py-2.5 text-sm font-semibold disabled:opacity-70">
          {busy && <Loader2 className="h-4 w-4 animate-spin" />} Send application
        </button>
      </div>
    </div>
  );
}
