import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/session";
import {
  Briefcase, MapPin, Calendar, Clock, Play, Pause, CheckCircle2, XCircle, Loader2,
  Camera, X, MapPinned, ImagePlus, MessageSquareWarning, Paperclip,
} from "lucide-react";
import { toast } from "sonner";
import { statusTone, priorityTone, uploadWorkerFile, isVideoUrl, getBestEffortLocation, type WorkerTask } from "@/lib/worker";
import { EmptyState } from "./index";

export const Route = createFileRoute("/_authenticated/worker/jobs")({
  component: JobsPage,
});

type Filter = "all" | "pending" | "accepted" | "in_progress" | "completed";

async function fetchTasks(userId: string): Promise<WorkerTask[]> {
  const { data, error } = await supabase.from("worker_tasks" as never)
    .select("*").eq("worker_user_id" as never, userId as never)
    .order("event_date" as never, { ascending: true });
  if (error) throw error;
  return (data ?? []) as unknown as WorkerTask[];
}

function JobsPage() {
  const { user } = useSession();
  const qc = useQueryClient();
  const [filter, setFilter] = useState<Filter>("all");
  const [checkInTask, setCheckInTask] = useState<WorkerTask | null>(null);
  const [completeTask, setCompleteTask] = useState<WorkerTask | null>(null);
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [counterTask, setCounterTask] = useState<WorkerTask | null>(null);

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ["worker-tasks", user?.id],
    queryFn: () => fetchTasks(user!.id),
    enabled: !!user?.id,
  });

  // IMPORTANT: chain .select().maybeSingle() after every update. Supabase/
  // PostgREST does NOT raise an error when RLS (or, here, our new
  // check-in/check-out trigger) blocks a change — it can silently return
  // zero rows changed. Without checking `data`, a rejected update looks
  // identical to a successful one.
  const update = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Record<string, unknown> }) => {
      const { data, error } = await supabase.from("worker_tasks" as never)
        .update(patch as never).eq("id" as never, id as never).select().maybeSingle();
      if (error) throw error;
      if (!data) throw new Error("This update was blocked — please refresh and try again.");
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["worker-tasks", user?.id] }),
    onError: (e) => toast.error(e instanceof Error ? e.message : "Something went wrong"),
  });

  const simpleUpdate = (id: string, patch: Record<string, unknown>) => update.mutate({ id, patch });

  const filtered = tasks.filter((t) => filter === "all" ? true : t.status === filter);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Assigned jobs</h1>
        <p className="mt-1 text-sm text-muted-foreground">Only jobs assigned specifically to you appear here. Starting and completing work requires a quick photo — that's your proof of attendance and work done.</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {(["all", "pending", "accepted", "in_progress", "completed"] as Filter[]).map((f) => (
          <button key={f} onClick={() => setFilter(f)}
            className={`rounded-full px-3.5 py-1.5 text-xs font-semibold border transition-colors ${filter === f ? "bg-brand-violet text-white border-brand-violet" : "border-border text-muted-foreground hover:bg-accent"}`}>
            {f.replace("_", " ")}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2">
          {[0, 1, 2, 3].map((i) => <div key={i} className="h-40 rounded-2xl bg-card animate-pulse border border-border" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-8">
          <EmptyState icon={Briefcase} title="No jobs here yet" body="When organizations or vendors assign work to you, it will appear here." />
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {filtered.map((t) => (
            <article key={t.id} className="rounded-2xl border border-border bg-card p-5 shadow-soft flex flex-col">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-xs font-mono text-muted-foreground">#{t.id.slice(0, 8)}</div>
                  <h3 className="mt-1 font-semibold text-lg truncate">{t.task_name}</h3>
                  <div className="text-sm text-muted-foreground truncate">{t.event_name}{t.service_category ? ` · ${t.service_category}` : ""}{t.quantity > 1 ? ` · × ${t.quantity}` : ""}</div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${priorityTone(t.priority)}`}>{t.priority.toUpperCase()}</span>
                  <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${statusTone(t.status)}`}>{t.status.replace("_", " ")}</span>
                </div>
              </div>

              <div className="mt-4 space-y-1.5 text-xs text-muted-foreground">
                {t.organization_name && <div className="flex items-center gap-2"><Briefcase className="h-3.5 w-3.5" /> {t.organization_name}</div>}
                <div className="flex items-center gap-2"><MapPin className="h-3.5 w-3.5" /> {t.venue ?? "Venue TBD"}{t.venue_address ? ` · ${t.venue_address}` : ""}</div>
                <div className="flex items-center gap-2"><Calendar className="h-3.5 w-3.5" /> {new Date(t.event_date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</div>
                <div className="flex items-center gap-2"><Clock className="h-3.5 w-3.5" /> {t.start_time ?? "—"} – {t.end_time ?? "—"}</div>
                {(t.final_fee ?? t.proposed_fee ?? t.payment_amount) != null && (
                  <div className="pt-1 flex items-center gap-2 text-sm font-semibold text-foreground">
                    ₹{Number(t.final_fee ?? t.proposed_fee ?? t.payment_amount).toLocaleString("en-IN")}
                    <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">{t.final_fee != null ? "Agreed fee" : "Proposed fee"}</span>
                    {t.payment_status === "paid" && (
                      <>
                        <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">Paid</span>
                        <Link to="/receipt/$type/$id" params={{ type: "worker", id: t.id }} target="_blank"
                          className="rounded-full border border-input px-2 py-0.5 text-[10px] font-semibold hover:bg-accent">Receipt</Link>
                      </>
                    )}
                  </div>
                )}
              </div>

              {t.customer_requirements && (
                <p className="mt-3 rounded-lg border border-brand-violet/20 bg-brand-violet/5 px-3 py-2 text-xs">
                  <span className="font-semibold text-foreground">Customer asked for: </span>
                  <span className="text-muted-foreground">{t.customer_requirements}</span>
                </p>
              )}
              {t.attachments && t.attachments.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {t.attachments.map((a) => (
                    <a key={a.url} href={a.url} target="_blank" rel="noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-full border border-border px-2.5 py-1 text-[11px] font-medium hover:bg-accent">
                      <Paperclip className="h-3 w-3" /> {a.name}
                    </a>
                  ))}
                </div>
              )}
              {t.description && <p className="mt-3 text-xs text-muted-foreground border-t border-border pt-3">{t.description}</p>}

              {t.status === "countered" && (
                <div className="mt-3 rounded-lg border border-purple-300/60 bg-purple-50 dark:bg-purple-950/20 px-3 py-2 text-xs">
                  <span className="inline-flex items-center gap-1.5 font-semibold text-purple-800 dark:text-purple-300"><MessageSquareWarning className="h-3.5 w-3.5" /> Your counter of ₹{Number(t.counter_offer_amount).toLocaleString("en-IN")} is with the venue owner.</span>
                </div>
              )}

              {(t.check_in_photo_url || t.check_out_photo_url || (t.completion_photo_urls && t.completion_photo_urls.length > 0)) && (
                <div className="mt-3 border-t border-border pt-3">
                  <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Attendance &amp; proof</div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {t.check_in_photo_url && <PhotoThumb url={t.check_in_photo_url} label="Check-in" />}
                    {t.completion_photo_urls?.map((url, i) => <PhotoThumb key={i} url={url} label={`Proof ${i + 1}`} />)}
                    {t.check_out_photo_url && <PhotoThumb url={t.check_out_photo_url} label="Check-out" />}
                  </div>
                </div>
              )}

              <div className="mt-4 pt-3 border-t border-border flex flex-wrap gap-2">
                {t.status === "pending" && (
                  <>
                    <button onClick={() => simpleUpdate(t.id, { status: "accepted", accepted_at: new Date().toISOString() })}
                      className="inline-flex items-center gap-1.5 rounded-full bg-emerald-600 text-white px-3 py-1.5 text-xs font-semibold hover:bg-emerald-700">
                      <CheckCircle2 className="h-3.5 w-3.5" /> Accept ₹{Number(t.proposed_fee ?? t.payment_amount ?? 0).toLocaleString("en-IN")}
                    </button>
                    <button onClick={() => setCounterTask(t)}
                      className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-semibold hover:bg-accent">
                      <MessageSquareWarning className="h-3.5 w-3.5" /> Counter Offer
                    </button>
                    <button onClick={() => { setRejectId(t.id); setRejectReason(""); }}
                      className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-500/10">
                      <XCircle className="h-3.5 w-3.5" /> Reject
                    </button>
                  </>
                )}
                {t.status === "accepted" && (
                  <button onClick={() => setCheckInTask(t)}
                    className="inline-flex items-center gap-1.5 rounded-full btn-brand btn-brand-hover px-3 py-1.5 text-xs font-semibold text-white">
                    <Camera className="h-3.5 w-3.5" /> Check in &amp; start work
                  </button>
                )}
                {t.status === "in_progress" && (
                  <>
                    <button onClick={() => simpleUpdate(t.id, { status: "paused", paused_at: new Date().toISOString() })}
                      className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-semibold hover:bg-accent">
                      <Pause className="h-3.5 w-3.5" /> Pause
                    </button>
                    <button onClick={() => setCompleteTask(t)}
                      className="inline-flex items-center gap-1.5 rounded-full bg-emerald-600 text-white px-3 py-1.5 text-xs font-semibold hover:bg-emerald-700">
                      <CheckCircle2 className="h-3.5 w-3.5" /> Check out &amp; complete
                    </button>
                  </>
                )}
                {t.status === "paused" && (
                  <button onClick={() => simpleUpdate(t.id, { status: "in_progress", resumed_at: new Date().toISOString() })}
                    className="inline-flex items-center gap-1.5 rounded-full btn-brand btn-brand-hover px-3 py-1.5 text-xs font-semibold text-white">
                    <Play className="h-3.5 w-3.5" /> Resume
                  </button>
                )}
              </div>
            </article>
          ))}
        </div>
      )}

      {checkInTask && (
        <CheckInPanel task={checkInTask} userId={user!.id} busy={update.isPending}
          onCancel={() => setCheckInTask(null)}
          onConfirm={(patch) => update.mutate({ id: checkInTask.id, patch }, { onSuccess: () => setCheckInTask(null) })}
        />
      )}

      {completeTask && (
        <CompletePanel task={completeTask} userId={user!.id} busy={update.isPending}
          onCancel={() => setCompleteTask(null)}
          onConfirm={(patch) => update.mutate({ id: completeTask.id, patch }, { onSuccess: () => setCompleteTask(null) })}
        />
      )}

      {counterTask && (
        <CounterOfferPanel task={counterTask} busy={update.isPending}
          onCancel={() => setCounterTask(null)}
          onConfirm={(amount, note) => update.mutate(
            { id: counterTask.id, patch: { status: "countered", counter_offer_amount: amount, counter_offer_note: note || null } },
            { onSuccess: () => setCounterTask(null) },
          )}
        />
      )}

      {rejectId && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4" onClick={() => setRejectId(null)}>
          <div className="w-full max-w-md rounded-2xl bg-card p-6 shadow-elegant" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold">Reject task</h3>
            <p className="mt-1 text-sm text-muted-foreground">Let the assigner know why you can't take this job.</p>
            <textarea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} rows={4}
              className="mt-3 w-full rounded-xl border border-input bg-background p-3 text-sm" placeholder="Reason (optional)" />
            <div className="mt-4 flex justify-end gap-2">
              <button onClick={() => setRejectId(null)} className="rounded-full border border-border px-4 py-2 text-sm font-medium">Cancel</button>
              <button disabled={update.isPending}
                onClick={() => simpleUpdate(rejectId, { status: "rejected", rejected_at: new Date().toISOString(), rejection_reason: rejectReason || null })}
                className="inline-flex items-center gap-2 rounded-full bg-rose-600 text-white px-4 py-2 text-sm font-semibold hover:bg-rose-700">
                {update.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Reject task
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------------- Counter-offer panel (spec Part 23/24) ---------------- */
function CounterOfferPanel({ task, busy, onCancel, onConfirm }: {
  task: WorkerTask; busy: boolean; onCancel: () => void; onConfirm: (amount: number, note: string) => void;
}) {
  const [amount, setAmount] = useState(String(task.proposed_fee ?? task.payment_amount ?? ""));
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  function submit() {
    const n = Number(amount);
    if (!n || n <= 0) { setError("Enter a valid amount"); return; }
    onConfirm(n, note.trim());
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4" onClick={onCancel}>
      <div className="w-full max-w-md rounded-2xl bg-card p-6 shadow-elegant" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Counter offer</h3>
          <button onClick={onCancel} className="rounded-lg p-1.5 hover:bg-accent"><X className="h-4 w-4" /></button>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">Proposed fee was ₹{Number(task.proposed_fee ?? task.payment_amount ?? 0).toLocaleString("en-IN")}{task.quantity > 1 ? ` for ${task.quantity}` : ""} — suggest a different total for "{task.task_name}".</p>
        <div className="mt-4">
          <label className="block text-xs font-semibold uppercase tracking-widest text-muted-foreground">Your counter amount (₹, total)</label>
          <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)}
            className="mt-1.5 w-full rounded-xl border border-input bg-background p-3 text-sm outline-none focus:border-brand-violet" />
        </div>
        <div className="mt-3">
          <label className="block text-xs font-semibold uppercase tracking-widest text-muted-foreground">Reason (optional)</label>
          <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3}
            className="mt-1.5 w-full rounded-xl border border-input bg-background p-3 text-sm" placeholder="e.g. Longer shift than usual…" />
        </div>
        {error && <p className="mt-2 text-xs text-destructive">{error}</p>}
        <div className="mt-4 flex justify-end gap-2">
          <button onClick={onCancel} className="rounded-full border border-border px-4 py-2 text-sm font-medium">Cancel</button>
          <button disabled={busy} onClick={submit}
            className="inline-flex items-center gap-2 rounded-full btn-brand btn-brand-hover px-4 py-2 text-sm font-semibold text-white disabled:opacity-70">
            {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Send counter offer
          </button>
        </div>
      </div>
    </div>
  );
}

function PhotoThumb({ url, label }: { url: string; label: string }) {
  return (
    <a href={url} target="_blank" rel="noreferrer" className="block">
      {isVideoUrl(url) ? (
        <video src={url} muted className="h-14 w-14 rounded-lg object-cover border border-border" />
      ) : (
        <img src={url} alt={label} className="h-14 w-14 rounded-lg object-cover border border-border" />
      )}
      <div className="mt-0.5 text-center text-[9px] text-muted-foreground">{label}</div>
    </a>
  );
}

/* ---------------- Check-in panel (required photo, best-effort GPS) ---------------- */
function CheckInPanel({ task, userId, busy, onCancel, onConfirm }: {
  task: WorkerTask; userId: string; busy: boolean; onCancel: () => void; onConfirm: (patch: Record<string, unknown>) => void;
}) {
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    setUploading(true);
    try {
      const url = await uploadWorkerFile(userId, "worker-media", "checkin", file);
      setPhotoUrl(url);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally { setUploading(false); }
  }

  async function confirm() {
    if (!photoUrl) { toast.error("A check-in photo is required."); return; }
    const loc = await getBestEffortLocation();
    onConfirm({
      status: "in_progress",
      started_at: new Date().toISOString(),
      check_in_photo_url: photoUrl,
      check_in_lat: loc?.lat ?? null,
      check_in_lng: loc?.lng ?? null,
    });
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4" onClick={onCancel}>
      <div className="w-full max-w-md rounded-2xl bg-card p-6 shadow-elegant" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Check in to start work</h3>
          <button onClick={onCancel} className="rounded-lg p-1.5 hover:bg-accent"><X className="h-4 w-4" /></button>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">Take a quick photo at the venue — this is your attendance record for "{task.task_name}".</p>

        <input ref={inputRef} type="file" accept="image/*,video/*" capture="environment" className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />

        {photoUrl ? (
          <div className="mt-4 relative inline-block">
            {isVideoUrl(photoUrl) ? (
              <video src={photoUrl} controls className="h-40 w-40 rounded-xl object-cover border border-border" />
            ) : (
              <img src={photoUrl} alt="Check-in" className="h-40 w-40 rounded-xl object-cover border border-border" />
            )}
            <button onClick={() => setPhotoUrl(null)} className="absolute -top-2 -right-2 rounded-full bg-background border border-border p-1 shadow"><X className="h-3.5 w-3.5" /></button>
          </div>
        ) : (
          <button onClick={() => inputRef.current?.click()} disabled={uploading}
            className="mt-4 flex h-40 w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border text-muted-foreground hover:bg-accent">
            {uploading ? <Loader2 className="h-6 w-6 animate-spin" /> : <Camera className="h-6 w-6" />}
            <span className="text-xs font-medium">{uploading ? "Uploading…" : "Tap to take a photo or video"}</span>
          </button>
        )}

        <div className="mt-2 flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <MapPinned className="h-3 w-3" /> Location is captured automatically if you allow it — it's optional.
        </div>

        <button onClick={confirm} disabled={!photoUrl || busy || uploading}
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-full btn-brand btn-brand-hover px-4 py-2.5 text-sm font-semibold disabled:opacity-50">
          {busy && <Loader2 className="h-4 w-4 animate-spin" />} Check in &amp; start work
        </button>
      </div>
    </div>
  );
}

/* ---------------- Complete panel (check-out photo + work-proof photos, required) ---------------- */
function CompletePanel({ task, userId, busy, onCancel, onConfirm }: {
  task: WorkerTask; userId: string; busy: boolean; onCancel: () => void; onConfirm: (patch: Record<string, unknown>) => void;
}) {
  const [checkOutUrl, setCheckOutUrl] = useState<string | null>(null);
  const [proofUrls, setProofUrls] = useState<string[]>([]);
  const [notes, setNotes] = useState("");
  const [uploading, setUploading] = useState<"checkout" | "proof" | null>(null);
  const checkOutRef = useRef<HTMLInputElement>(null);
  const proofRef = useRef<HTMLInputElement>(null);

  async function handleCheckOut(file: File) {
    setUploading("checkout");
    try { setCheckOutUrl(await uploadWorkerFile(userId, "worker-media", "checkout", file)); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Upload failed"); }
    finally { setUploading(null); }
  }

  async function handleProof(file: File) {
    setUploading("proof");
    try {
      const url = await uploadWorkerFile(userId, "worker-media", "proof", file);
      setProofUrls((u) => [...u, url]);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally { setUploading(null); }
  }

  async function confirm() {
    if (!checkOutUrl) { toast.error("A check-out photo is required."); return; }
    if (proofUrls.length === 0) { toast.error("At least one work-proof photo is required."); return; }
    const loc = await getBestEffortLocation();
    onConfirm({
      status: "completed",
      completed_at: new Date().toISOString(),
      check_out_photo_url: checkOutUrl,
      check_out_lat: loc?.lat ?? null,
      check_out_lng: loc?.lng ?? null,
      completion_photo_urls: proofUrls,
      completion_notes: notes || null,
    });
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4 overflow-y-auto" onClick={onCancel}>
      <div className="w-full max-w-md rounded-2xl bg-card p-6 shadow-elegant my-8" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Check out &amp; complete task</h3>
          <button onClick={onCancel} className="rounded-lg p-1.5 hover:bg-accent"><X className="h-4 w-4" /></button>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">Proof photos are required — this confirms your work on "{task.task_name}" to the organization and admin.</p>

        <div className="mt-4">
          <label className="block text-xs font-semibold uppercase tracking-widest text-muted-foreground">Work-proof photo/video <span className="text-destructive">*</span></label>
          <input ref={proofRef} type="file" accept="image/*,video/*" capture="environment" className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleProof(f); if (proofRef.current) proofRef.current.value = ""; }} />
          <div className="mt-2 flex flex-wrap gap-2">
            {proofUrls.map((u, i) => (
              <div key={i} className="relative">
                {isVideoUrl(u) ? (
                  <video src={u} muted className="h-16 w-16 rounded-lg object-cover border border-border" />
                ) : (
                  <img src={u} alt={`Proof ${i + 1}`} className="h-16 w-16 rounded-lg object-cover border border-border" />
                )}
                <button onClick={() => setProofUrls((arr) => arr.filter((_, idx) => idx !== i))} className="absolute -top-1.5 -right-1.5 rounded-full bg-background border border-border p-0.5"><X className="h-3 w-3" /></button>
              </div>
            ))}
            <button onClick={() => proofRef.current?.click()} disabled={uploading === "proof"}
              className="flex h-16 w-16 flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-border text-muted-foreground hover:bg-accent">
              {uploading === "proof" ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <div className="mt-4">
          <label className="block text-xs font-semibold uppercase tracking-widest text-muted-foreground">Check-out photo/video <span className="text-destructive">*</span></label>
          <input ref={checkOutRef} type="file" accept="image/*,video/*" capture="environment" className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleCheckOut(f); }} />
          {checkOutUrl ? (
            <div className="mt-2 relative inline-block">
              {isVideoUrl(checkOutUrl) ? (
                <video src={checkOutUrl} controls className="h-20 w-20 rounded-lg object-cover border border-border" />
              ) : (
                <img src={checkOutUrl} alt="Check-out" className="h-20 w-20 rounded-lg object-cover border border-border" />
              )}
              <button onClick={() => setCheckOutUrl(null)} className="absolute -top-1.5 -right-1.5 rounded-full bg-background border border-border p-0.5"><X className="h-3 w-3" /></button>
            </div>
          ) : (
            <button onClick={() => checkOutRef.current?.click()} disabled={uploading === "checkout"}
              className="mt-2 flex h-20 w-20 flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-border text-muted-foreground hover:bg-accent">
              {uploading === "checkout" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
            </button>
          )}
        </div>

        <div className="mt-4">
          <label className="block text-xs font-semibold uppercase tracking-widest text-muted-foreground">Notes (optional)</label>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3}
            className="mt-1.5 w-full rounded-xl border border-input bg-background p-3 text-sm" placeholder="Anything the organization should know?" />
        </div>

        <button onClick={confirm} disabled={busy || uploading !== null}
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-full bg-emerald-600 text-white px-4 py-2.5 text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50">
          {busy && <Loader2 className="h-4 w-4 animate-spin" />} Confirm completion
        </button>
      </div>
    </div>
  );
}
