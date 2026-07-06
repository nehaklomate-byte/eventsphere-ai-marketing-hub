import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/session";
import { Briefcase, MapPin, Calendar, Clock, Play, Pause, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { statusTone, priorityTone, type WorkerTask } from "@/lib/worker";
import { EmptyState } from "./index";

export const Route = createFileRoute("/_authenticated/worker/jobs")({
  component: JobsPage,
});

type Filter = "all" | "pending" | "accepted" | "in_progress" | "completed";

function JobsPage() {
  const { user } = useSession();
  const qc = useQueryClient();
  const [filter, setFilter] = useState<Filter>("all");
  const [confirmComplete, setConfirmComplete] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState<string>("");
  const [rejectId, setRejectId] = useState<string | null>(null);

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ["worker-tasks", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("worker_tasks" as never)
        .select("*").eq("worker_user_id" as never, user!.id as never)
        .order("event_date" as never, { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as WorkerTask[];
    },
    enabled: !!user?.id,
  });

  const update = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Record<string, unknown> }) => {
      const { error } = await supabase.from("worker_tasks" as never)
        .update(patch as never).eq("id" as never, id as never);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["worker-tasks", user?.id] }),
  });

  const filtered = tasks.filter((t) => filter === "all" ? true : t.status === filter);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Assigned jobs</h1>
        <p className="mt-1 text-sm text-muted-foreground">Only jobs assigned specifically to you appear here.</p>
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
                  <div className="text-sm text-muted-foreground truncate">{t.event_name}</div>
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
                {t.payment_amount != null && <div className="pt-1 text-sm font-semibold text-foreground">₹{Number(t.payment_amount).toLocaleString("en-IN")}</div>}
              </div>

              {t.description && <p className="mt-3 text-xs text-muted-foreground border-t border-border pt-3">{t.description}</p>}

              <div className="mt-4 pt-3 border-t border-border flex flex-wrap gap-2">
                {t.status === "pending" && (
                  <>
                    <button onClick={() => update.mutate({ id: t.id, patch: { status: "accepted", accepted_at: new Date().toISOString() } })}
                      className="inline-flex items-center gap-1.5 rounded-full bg-emerald-600 text-white px-3 py-1.5 text-xs font-semibold hover:bg-emerald-700">
                      <CheckCircle2 className="h-3.5 w-3.5" /> Accept
                    </button>
                    <button onClick={() => { setRejectId(t.id); setRejectReason(""); }}
                      className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-500/10">
                      <XCircle className="h-3.5 w-3.5" /> Reject
                    </button>
                  </>
                )}
                {t.status === "accepted" && (
                  <button onClick={() => update.mutate({ id: t.id, patch: { status: "in_progress", started_at: new Date().toISOString() } })}
                    className="inline-flex items-center gap-1.5 rounded-full btn-brand btn-brand-hover px-3 py-1.5 text-xs font-semibold text-white">
                    <Play className="h-3.5 w-3.5" /> Start work
                  </button>
                )}
                {t.status === "in_progress" && (
                  <>
                    <button onClick={() => update.mutate({ id: t.id, patch: { status: "paused", paused_at: new Date().toISOString() } })}
                      className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-semibold hover:bg-accent">
                      <Pause className="h-3.5 w-3.5" /> Pause
                    </button>
                    <button onClick={() => setConfirmComplete(t.id)}
                      className="inline-flex items-center gap-1.5 rounded-full bg-emerald-600 text-white px-3 py-1.5 text-xs font-semibold hover:bg-emerald-700">
                      <CheckCircle2 className="h-3.5 w-3.5" /> Complete
                    </button>
                  </>
                )}
                {t.status === "paused" && (
                  <button onClick={() => update.mutate({ id: t.id, patch: { status: "in_progress", resumed_at: new Date().toISOString() } })}
                    className="inline-flex items-center gap-1.5 rounded-full btn-brand btn-brand-hover px-3 py-1.5 text-xs font-semibold text-white">
                    <Play className="h-3.5 w-3.5" /> Resume
                  </button>
                )}
              </div>
            </article>
          ))}
        </div>
      )}

      {confirmComplete && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4" onClick={() => setConfirmComplete(null)}>
          <div className="w-full max-w-md rounded-2xl bg-card p-6 shadow-elegant" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold">Complete task?</h3>
            <p className="mt-1 text-sm text-muted-foreground">Are you sure you have completed this task? The organization and admin will be notified.</p>
            <div className="mt-6 flex justify-end gap-2">
              <button onClick={() => setConfirmComplete(null)} className="rounded-full border border-border px-4 py-2 text-sm font-medium">Cancel</button>
              <button disabled={update.isPending}
                onClick={() => update.mutate({ id: confirmComplete, patch: { status: "completed", completed_at: new Date().toISOString() } }, { onSuccess: () => setConfirmComplete(null) })}
                className="inline-flex items-center gap-2 rounded-full bg-emerald-600 text-white px-4 py-2 text-sm font-semibold hover:bg-emerald-700">
                {update.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Confirm
              </button>
            </div>
          </div>
        </div>
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
                onClick={() => update.mutate({ id: rejectId, patch: { status: "rejected", rejected_at: new Date().toISOString(), rejection_reason: rejectReason || null } }, { onSuccess: () => setRejectId(null) })}
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
