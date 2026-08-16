import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AlertTriangle, Loader2 } from "lucide-react";
import { fetchComplaints, updateComplaintStatus, type ComplaintRow } from "@/lib/admin";

export const Route = createFileRoute("/_authenticated/admin/complaints")({
  head: () => ({ meta: [{ title: "Complaints — EventOrbit Nova" }, { name: "robots", content: "noindex" }] }),
  component: ComplaintsPage,
});

const STATUS_STYLE: Record<string, string> = {
  open: "bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300",
  in_progress: "bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300",
  resolved: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300",
  closed: "bg-muted text-muted-foreground",
};
const STATUS_TABS = ["all", "open", "in_progress", "resolved", "closed"] as const;

function ComplaintsPage() {
  const qc = useQueryClient();
  const [statusTab, setStatusTab] = useState<(typeof STATUS_TABS)[number]>("all");
  const [open, setOpen] = useState<ComplaintRow | null>(null);

  const { data, isLoading } = useQuery({ queryKey: ["admin-complaints"], queryFn: fetchComplaints });
  const rows = useMemo(() => (data ?? []).filter((c) => statusTab === "all" || c.status === statusTab), [data, statusTab]);
  const openCount = (data ?? []).filter((c) => c.status === "open").length;

  function refresh() { qc.invalidateQueries({ queryKey: ["admin-complaints"] }); }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl md:text-3xl font-bold tracking-tight">
          <AlertTriangle className="h-7 w-7 text-brand-violet" /> Complaints
        </h1>
        <p className="mt-1 text-muted-foreground">Issues raised by any role — {openCount} open right now.</p>
      </div>

      <div className="flex flex-wrap gap-1.5 rounded-full border border-border bg-card p-1 text-sm w-fit">
        {STATUS_TABS.map((t) => (
          <button key={t} onClick={() => setStatusTab(t)}
            className={`rounded-full px-3.5 py-1.5 font-semibold capitalize transition ${statusTab === t ? "bg-brand-violet text-white" : "text-muted-foreground hover:bg-accent"}`}>
            {t.replace("_", " ")}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="rounded-2xl border border-border bg-card p-10 text-center text-sm text-muted-foreground"><Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin" /> Loading…</div>
      ) : rows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card/40 p-10 text-center text-sm text-muted-foreground">No complaints in this category.</div>
      ) : (
        <div className="space-y-3">
          {rows.map((c) => (
            <button key={c.id} onClick={() => setOpen(c)} className="block w-full rounded-2xl border border-border bg-card p-5 text-left hover:bg-accent/40">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="font-semibold">{c.subject}</div>
                <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold capitalize ${STATUS_STYLE[c.status]}`}>{c.status.replace("_", " ")}</span>
              </div>
              <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{c.description}</p>
              <div className="mt-2 text-xs text-muted-foreground">
                {c.raised_by_name}{c.raised_by_role ? ` · ${c.raised_by_role}` : ""} · {new Date(c.created_at).toLocaleString("en-IN")}
              </div>
            </button>
          ))}
        </div>
      )}

      {open && <ComplaintDialog row={open} onClose={() => setOpen(null)} onDone={() => { setOpen(null); refresh(); }} />}
    </div>
  );
}

function ComplaintDialog({ row, onClose, onDone }: { row: ComplaintRow; onClose: () => void; onDone: () => void }) {
  const [notes, setNotes] = useState(row.admin_notes ?? "");
  const [busy, setBusy] = useState(false);

  async function setStatus(status: ComplaintRow["status"]) {
    setBusy(true);
    try {
      await updateComplaintStatus(row.id, status, notes);
      toast.success("Updated");
      onDone();
    } catch (e) { toast.error(e instanceof Error ? e.message : "Could not update"); }
    finally { setBusy(false); }
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" onClick={onClose}>
      <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <h3 className="font-semibold">{row.subject}</h3>
        <div className="mt-1 text-xs text-muted-foreground">{row.raised_by_name}{row.raised_by_role ? ` · ${row.raised_by_role}` : ""} · {new Date(row.created_at).toLocaleString("en-IN")}</div>
        <p className="mt-3 whitespace-pre-wrap text-sm">{row.description}</p>
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Admin notes / resolution"
          className="mt-3 w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm outline-none focus:border-brand-violet min-h-[90px]" />
        <div className="mt-4 flex flex-wrap justify-end gap-2">
          <button onClick={onClose} className="rounded-full border border-input px-4 py-2 text-sm font-semibold hover:bg-accent">Close</button>
          {row.status !== "in_progress" && (
            <button onClick={() => setStatus("in_progress")} disabled={busy} className="rounded-full border border-input px-4 py-2 text-sm font-semibold hover:bg-accent disabled:opacity-70">Mark in progress</button>
          )}
          {row.status !== "resolved" && (
            <button onClick={() => setStatus("resolved")} disabled={busy} className="inline-flex items-center gap-1.5 rounded-full btn-brand btn-brand-hover px-4 py-2 text-sm font-semibold disabled:opacity-70">
              {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Mark resolved
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
