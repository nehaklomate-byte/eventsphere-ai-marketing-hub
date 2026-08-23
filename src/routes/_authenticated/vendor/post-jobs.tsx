import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Plus, Briefcase, Users, MapPin, Calendar, Wallet, X, Loader2, ChevronDown } from "lucide-react";
import { useSession } from "@/lib/session";
import { fetchMyVendor } from "@/lib/vendor";
import {
  fetchMyPostedJobs, createWorkerJobPosting, closeWorkerJobPosting, fetchApplicationsForWorkerJobPosting,
  type WorkerJobPosting as JobPosting, type WorkerJobApplication as JobApplication,
} from "@/lib/vendor";
import { shortlistApplication, rejectApplication, acceptApplication } from "@/lib/organization";
import { WORKER_CATEGORIES } from "@/lib/worker";
import { AttachmentUpload, AttachmentGallery, type Attachment } from "@/components/AttachmentUpload";
import { EmojiPicker } from "@/components/EmojiPicker";
import { AttachmentUpload, AttachmentGallery, type Attachment } from "@/components/AttachmentUpload";
import { EmojiPicker } from "@/components/EmojiPicker";

export const Route = createFileRoute("/_authenticated/vendor/post-jobs")({
  head: () => ({ meta: [{ title: "Job Board — EventOrbit Nova" }, { name: "robots", content: "noindex" }] }),
  component: VendorJobsPage,
});

const STATUS_BADGE: Record<JobPosting["status"], string> = {
  open: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300",
  closed: "bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300",
  cancelled: "bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300",
};

function VendorJobsPage() {
  const { user } = useSession();
  const qc = useQueryClient();
  const { data: vendor } = useQuery({ queryKey: ["me-vendor", user?.id], queryFn: () => fetchMyVendor(user!.id), enabled: !!user?.id });
  const activeVendorId = vendor?.id ?? "";

  const { data: postings, isLoading } = useQuery({
    queryKey: ["vendor-posted-jobs", activeVendorId],
    queryFn: () => fetchMyPostedJobs(activeVendorId),
    enabled: !!activeVendorId,
  });

  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  async function handleClose(id: string) {
    if (!window.confirm("Close this posting? Workers will no longer be able to apply.")) return;
    try {
      await closeWorkerJobPosting(id);
      await qc.invalidateQueries({ queryKey: ["vendor-posted-jobs", activeVendorId] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to close posting");
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold">Job Board</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Need extra hands for a big booking — servers, helpers, setup crew? Post it here and workers on
            EventOrbit apply directly. Accepting an applicant creates their task automatically.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setOpen(true)}
            disabled={!activeVendorId}
            className="flex items-center gap-2 rounded-full bg-brand-violet px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-violet/90 disabled:opacity-50"
          >
            <Plus className="h-4 w-4" /> Post a job
          </button>
        </div>
      </div>

      {!activeVendorId && (
        <div className="rounded-2xl border border-dashed border-border bg-card/40 p-8 text-center text-sm text-muted-foreground">
          Complete your vendor profile first — job postings are linked to your vendor account.
        </div>
      )}

      <div className="space-y-3">
        {isLoading && <p className="text-sm text-muted-foreground">Loading postings…</p>}
        {!isLoading && activeVendorId && (postings?.length ?? 0) === 0 && (
          <div className="rounded-2xl border border-dashed border-border bg-card/40 p-8 text-center">
            <Briefcase className="mx-auto h-8 w-8 text-muted-foreground" />
            <p className="mt-3 text-sm text-muted-foreground">No job postings yet — post your first staffing need above.</p>
          </div>
        )}
        {(postings ?? []).map((p) => (
          <div key={p.id} className="rounded-2xl border border-border bg-card overflow-hidden">
            <button
              onClick={() => setExpanded(expanded === p.id ? null : p.id)}
              className="flex w-full items-center justify-between gap-4 p-5 text-left"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-medium truncate">{p.title}</h3>
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize ${STATUS_BADGE[p.status]}`}>{p.status}</span>
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" /> {p.event_date}</span>
                  {p.venue && <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {p.venue}</span>}
                  <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" /> {p.slots_filled}/{p.slots_needed} filled</span>
                  {p.pay_amount != null && (
                    <span className="flex items-center gap-1"><Wallet className="h-3.5 w-3.5" /> ₹{Number(p.pay_amount).toLocaleString("en-IN")} ({p.pay_type.replace("_", " ")})</span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {p.status === "open" && (
                  <span
                    onClick={(e) => { e.stopPropagation(); handleClose(p.id); }}
                    className="rounded-lg px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 cursor-pointer"
                  >
                    Close
                  </span>
                )}
                <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${expanded === p.id ? "rotate-180" : ""}`} />
              </div>
            </button>
            {expanded === p.id && (
              <div className="border-t border-border bg-muted/20 px-5 py-3">
                {p.description && <p className="text-sm text-muted-foreground whitespace-pre-wrap">{p.description}</p>}
                <AttachmentGallery attachments={p.attachments ?? []} />
              </div>
            )}
            {expanded === p.id && <ApplicationsPanel postingId={p.id} vendorId={activeVendorId} />}
          </div>
        ))}
      </div>

      {open && activeVendorId && (
        <NewPostingModal
          vendorId={activeVendorId}
          onClose={() => setOpen(false)}
          onDone={() => { setOpen(false); qc.invalidateQueries({ queryKey: ["vendor-posted-jobs", activeVendorId] }); }}
        />
      )}
    </div>
  );
}

function ApplicationsPanel({ postingId, vendorId }: { postingId: string; vendorId: string }) {
  const qc = useQueryClient();
  const { data: apps, isLoading } = useQuery({
    queryKey: ["vendor-posted-job-applications", postingId],
    queryFn: () => fetchApplicationsForWorkerJobPosting(postingId),
  });

  async function act(action: "shortlist" | "reject" | "accept", app: JobApplication) {
    try {
      if (action === "shortlist") await shortlistApplication(app.id);
      else if (action === "reject") await rejectApplication(app.id);
      else await acceptApplication(app.id);
      await qc.invalidateQueries({ queryKey: ["vendor-posted-job-applications", postingId] });
      await qc.invalidateQueries({ queryKey: ["vendor-posted-jobs", vendorId] });
      if (action === "accept") toast.success("Applicant hired — task created on their dashboard.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Action failed");
    }
  }

  const APP_TONE: Record<JobApplication["status"], string> = {
    applied: "bg-amber-500/10 text-amber-700 border-amber-500/20",
    shortlisted: "bg-blue-500/10 text-blue-700 border-blue-500/20",
    accepted: "bg-emerald-500/10 text-emerald-700 border-emerald-500/20",
    rejected: "bg-rose-500/10 text-rose-700 border-rose-500/20",
    withdrawn: "bg-zinc-500/10 text-zinc-700 border-zinc-500/20",
  };

  return (
    <div className="border-t border-border bg-muted/30 p-5 space-y-3">
      {isLoading && <p className="text-sm text-muted-foreground">Loading applicants…</p>}
      {!isLoading && (apps?.length ?? 0) === 0 && (
        <p className="text-sm text-muted-foreground">No applications yet.</p>
      )}
      {(apps ?? []).map((a) => (
        <div key={a.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-4">
          <div>
            <div className="flex items-center gap-2">
              <p className="font-medium text-sm">{a.worker?.full_name ?? "Worker"}</p>
              <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold capitalize ${APP_TONE[a.status]}`}>{a.status}</span>
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {a.worker?.category ?? "—"} · {a.worker?.years_experience ?? 0} yrs · {a.worker?.city ?? "—"}
            </p>
            {a.cover_note && <p className="mt-1 text-xs text-muted-foreground">"{a.cover_note}"</p>}
          </div>
          {a.status === "applied" || a.status === "shortlisted" ? (
            <div className="flex gap-2">
              {a.status === "applied" && (
                <button onClick={() => act("shortlist", a)} className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold hover:bg-accent">Shortlist</button>
              )}
              <button onClick={() => act("accept", a)} className="rounded-lg bg-brand-violet px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-violet/90">Hire</button>
              <button onClick={() => act("reject", a)} className="rounded-lg px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50">Reject</button>
            </div>
          ) : null}
        </div>
      ))}
    </div>
  );
}

function NewPostingModal({ vendorId, onClose, onDone }: { vendorId: string; onClose: () => void; onDone: () => void }) {
  const [form, setForm] = useState({
    title: "", category: WORKER_CATEGORIES[0], description: "", venue: "", venue_address: "",
    event_date: "", start_time: "", end_time: "", slots_needed: "1", pay_amount: "", pay_type: "per_event" as const,
  });
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cls = "mt-1.5 w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm";

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim() || !form.event_date) { setError("Title and event date are required."); return; }
    setBusy(true); setError(null);
    try {
      await createWorkerJobPosting(vendorId, {
        event_id: null,
        title: form.title.trim(),
        category: form.category,
        description: form.description.trim() || null,
        venue: form.venue.trim() || null,
        venue_address: form.venue_address.trim() || null,
        event_date: form.event_date,
        start_time: form.start_time || null,
        end_time: form.end_time || null,
        slots_needed: Number(form.slots_needed) || 1,
        pay_amount: form.pay_amount ? Number(form.pay_amount) : null,
        pay_type: form.pay_type,
        attachments,
      });
      toast.success("Job posted — visible to workers now.");
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to post job");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4 overflow-y-auto" onClick={onClose}>
      <div className="w-full max-w-lg rounded-2xl border border-border bg-background p-6 shadow-xl my-8" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold">Post a job</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 hover:bg-accent"><X className="h-4 w-4" /></button>
        </div>
        <form onSubmit={submit} className="mt-4 space-y-3">
          <Field label="Title *">
            <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="e.g. 3 servers for a 200-guest catering event" className={cls} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Category">
              <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className={cls}>
                {WORKER_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </Field>
            <Field label="Slots needed">
              <input type="number" min={1} value={form.slots_needed} onChange={(e) => setForm({ ...form, slots_needed: e.target.value })} className={cls} />
            </Field>
          </div>
          <Field label="Description">
            <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} className={cls} />
          </Field>
          <div className="flex items-center gap-2">
            <EmojiPicker compact onSelect={(e) => setForm((f) => ({ ...f, description: f.description + e }))} />
          </div>
          <Field label="Reference photos / documents (optional)">
            <AttachmentUpload pathPrefix={`jobs/vendor-${vendorId}`} value={attachments} onChange={setAttachments} maxFiles={5} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Venue"><input value={form.venue} onChange={(e) => setForm({ ...form, venue: e.target.value })} className={cls} /></Field>
            <Field label="Event date *"><input type="date" value={form.event_date} onChange={(e) => setForm({ ...form, event_date: e.target.value })} className={cls} /></Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Start time"><input type="time" value={form.start_time} onChange={(e) => setForm({ ...form, start_time: e.target.value })} className={cls} /></Field>
            <Field label="End time"><input type="time" value={form.end_time} onChange={(e) => setForm({ ...form, end_time: e.target.value })} className={cls} /></Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Pay amount (₹)"><input type="number" value={form.pay_amount} onChange={(e) => setForm({ ...form, pay_amount: e.target.value })} className={cls} /></Field>
            <Field label="Pay type">
              <select value={form.pay_type} onChange={(e) => setForm({ ...form, pay_type: e.target.value as never })} className={cls}>
                <option value="per_event">Per event</option>
                <option value="daily">Daily</option>
                <option value="hourly">Hourly</option>
              </select>
            </Field>
          </div>
          {error && <p className="text-sm text-rose-600">{error}</p>}
          <button disabled={busy} className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-violet px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-violet/90 disabled:opacity-50">
            {busy && <Loader2 className="h-4 w-4 animate-spin" />} Post job
          </button>
        </form>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold">{label}</span>
      {children}
    </label>
  );
}
