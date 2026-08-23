import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { RotateCcw, Loader2, CheckCircle2, XCircle, Plus } from "lucide-react";
import { useSession } from "@/lib/session";
import { fetchRefunds, updateRefundStatus, logManualRefund, type RefundRow } from "@/lib/admin";

export const Route = createFileRoute("/_authenticated/admin/refunds")({
  head: () => ({ meta: [{ title: "Refunds — EventOrbit Nova" }, { name: "robots", content: "noindex" }] }),
  component: RefundsPage,
});

const SOURCE_LABEL: Record<string, string> = { booking: "Hall booking", worker_task: "Worker task", vendor_task: "Vendor task", profile_payment: "Profile/Pro-plan" };
const STATUS_STYLE: Record<string, string> = {
  requested: "bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300",
  approved: "bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300",
  rejected: "bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300",
  processed: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300",
};
const STATUS_TABS = ["all", "requested", "approved", "processed", "rejected"] as const;

function money(n: number) { return `₹${Number(n || 0).toLocaleString("en-IN")}`; }

function RefundsPage() {
  const { user } = useSession();
  const qc = useQueryClient();
  const [statusTab, setStatusTab] = useState<(typeof STATUS_TABS)[number]>("all");
  const [acting, setActing] = useState<RefundRow | null>(null);
  const [showLogForm, setShowLogForm] = useState(false);

  const { data, isLoading } = useQuery({ queryKey: ["admin-refunds"], queryFn: fetchRefunds });
  const rows = useMemo(() => (data ?? []).filter((r) => statusTab === "all" || r.status === statusTab), [data, statusTab]);
  const totalProcessed = (data ?? []).filter((r) => r.status === "processed").reduce((s, r) => s + Number(r.amount || 0), 0);
  const pendingCount = (data ?? []).filter((r) => r.status === "requested").length;

  function refresh() { qc.invalidateQueries({ queryKey: ["admin-refunds"] }); }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl md:text-3xl font-bold tracking-tight">
            <RotateCcw className="h-7 w-7 text-brand-violet" /> Refunds
          </h1>
          <p className="mt-1 text-muted-foreground">Every refund requested or issued — against bookings, tasks, or profile/Pro-plan payments.</p>
        </div>
        <button onClick={() => setShowLogForm(true)} className="inline-flex items-center gap-1.5 rounded-full border border-input px-4 py-2 text-sm font-semibold hover:bg-accent">
          <Plus className="h-4 w-4" /> Log a refund
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="text-sm text-muted-foreground">Total refunded</div>
          <div className="mt-1.5 text-2xl font-bold">{money(totalProcessed)}</div>
        </div>
        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="text-sm text-muted-foreground">Awaiting review</div>
          <div className="mt-1.5 text-2xl font-bold">{pendingCount}</div>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5 rounded-full border border-border bg-card p-1 text-sm w-fit">
        {STATUS_TABS.map((t) => (
          <button key={t} onClick={() => setStatusTab(t)}
            className={`rounded-full px-3.5 py-1.5 font-semibold capitalize transition ${statusTab === t ? "bg-brand-violet text-white" : "text-muted-foreground hover:bg-accent"}`}>
            {t}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="rounded-2xl border border-border bg-card p-10 text-center text-sm text-muted-foreground"><Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin" /> Loading…</div>
      ) : rows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card/40 p-10 text-center text-sm text-muted-foreground">No refunds in this category.</div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border bg-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <th className="px-5 py-3">Source</th>
                <th className="px-5 py-3">Item</th>
                <th className="px-5 py-3">Amount</th>
                <th className="px-5 py-3">Reason</th>
                <th className="px-5 py-3">Requested by</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Date</th>
                <th className="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b border-border last:border-0 align-top">
                  <td className="px-5 py-3"><span className="rounded-full bg-accent px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">{SOURCE_LABEL[r.source_type]}</span></td>
                  <td className="px-5 py-3 font-medium">{r.entity_name ?? "—"}</td>
                  <td className="px-5 py-3 font-semibold">{money(r.amount)}</td>
                  <td className="px-5 py-3 text-muted-foreground max-w-xs">{r.reason ?? "—"}</td>
                  <td className="px-5 py-3 text-muted-foreground">{r.requested_by_name}</td>
                  <td className="px-5 py-3"><span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold capitalize ${STATUS_STYLE[r.status]}`}>{r.status}</span></td>
                  <td className="px-5 py-3 text-muted-foreground">{new Date(r.created_at).toLocaleDateString("en-IN")}</td>
                  <td className="px-5 py-3">
                    {r.status === "requested" && (
                      <div className="flex gap-1.5">
                        <button onClick={() => setActing(r)} className="rounded-full border border-input px-3 py-1.5 text-xs font-semibold hover:bg-accent">Review</button>
                      </div>
                    )}
                    {r.status === "approved" && (
                      <button onClick={() => setActing(r)} className="rounded-full border border-input px-3 py-1.5 text-xs font-semibold hover:bg-accent">Mark processed</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {acting && <ReviewDialog row={acting} adminUserId={user?.id ?? ""} onClose={() => setActing(null)} onDone={() => { setActing(null); refresh(); }} />}
      {showLogForm && <LogRefundDialog adminUserId={user?.id ?? ""} onClose={() => setShowLogForm(false)} onDone={() => { setShowLogForm(false); refresh(); }} />}
    </div>
  );
}

function ReviewDialog({ row, adminUserId, onClose, onDone }: { row: RefundRow; adminUserId: string; onClose: () => void; onDone: () => void }) {
  const [notes, setNotes] = useState("");
  const [refundId, setRefundId] = useState("");
  const [busy, setBusy] = useState(false);

  async function act(status: "approved" | "rejected" | "processed") {
    setBusy(true);
    try {
      await updateRefundStatus(row.id, status, { adminNotes: notes, razorpayRefundId: refundId, adminUserId, requestedBy: row.requested_by, entityName: row.entity_name, amount: row.amount });
      toast.success(status === "rejected" ? "Refund rejected" : status === "processed" ? "Marked as processed" : "Refund approved");
      onDone();
    } catch (e) { toast.error(e instanceof Error ? e.message : "Could not update"); }
    finally { setBusy(false); }
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" onClick={onClose}>
      <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <h3 className="font-semibold">{row.entity_name ?? SOURCE_LABEL[row.source_type]}</h3>
        <p className="mt-1 text-sm text-muted-foreground">{money(row.amount)} · requested by {row.requested_by_name}</p>
        {row.reason && <p className="mt-2 text-xs text-muted-foreground">"{row.reason}"</p>}
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Admin notes (optional)"
          className="mt-3 w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm outline-none focus:border-brand-violet min-h-[70px]" />
        {row.status === "approved" && (
          <input value={refundId} onChange={(e) => setRefundId(e.target.value)} placeholder="Razorpay refund ID (optional)"
            className="mt-2 w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm outline-none focus:border-brand-violet" />
        )}
        <div className="mt-4 flex flex-wrap justify-end gap-2">
          <button onClick={onClose} className="rounded-full border border-input px-4 py-2 text-sm font-semibold hover:bg-accent">Cancel</button>
          {row.status === "requested" && (
            <>
              <button onClick={() => act("rejected")} disabled={busy} className="inline-flex items-center gap-1.5 rounded-full border border-rose-500/50 px-4 py-2 text-sm font-semibold text-rose-600 hover:bg-rose-500/10 disabled:opacity-70">
                <XCircle className="h-4 w-4" /> Reject
              </button>
              <button onClick={() => act("approved")} disabled={busy} className="inline-flex items-center gap-1.5 rounded-full btn-brand btn-brand-hover px-4 py-2 text-sm font-semibold disabled:opacity-70">
                {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Approve
              </button>
            </>
          )}
          {row.status === "approved" && (
            <button onClick={() => act("processed")} disabled={busy} className="inline-flex items-center gap-1.5 rounded-full btn-brand btn-brand-hover px-4 py-2 text-sm font-semibold disabled:opacity-70">
              {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />} Mark processed
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function LogRefundDialog({ adminUserId, onClose, onDone }: { adminUserId: string; onClose: () => void; onDone: () => void }) {
  const [entityName, setEntityName] = useState("");
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [sourceType, setSourceType] = useState<RefundRow["source_type"]>("booking");
  const [refundId, setRefundId] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!entityName.trim() || !amount || Number(amount) <= 0) return toast.error("Name and a valid amount are required");
    setBusy(true);
    try {
      await logManualRefund({ sourceType, sourceId: crypto.randomUUID(), entityName: entityName.trim(), amount: Number(amount), reason: reason.trim(), razorpayRefundId: refundId.trim(), adminUserId });
      toast.success("Refund logged");
      onDone();
    } catch (e) { toast.error(e instanceof Error ? e.message : "Could not log refund"); }
    finally { setBusy(false); }
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" onClick={onClose}>
      <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <h3 className="font-semibold">Log a refund</h3>
        <p className="mt-1 text-xs text-muted-foreground">For refunds decided outside the app (e.g. over a call) — goes straight to "processed".</p>
        <select value={sourceType} onChange={(e) => setSourceType(e.target.value as RefundRow["source_type"])} className="mt-3 w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm">
          <option value="booking">Hall booking</option>
          <option value="worker_task">Worker task</option>
          <option value="vendor_task">Vendor task</option>
          <option value="profile_payment">Profile/Pro-plan</option>
        </select>
        <input value={entityName} onChange={(e) => setEntityName(e.target.value)} placeholder="Name (who/what this refund is for)"
          className="mt-2 w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm" />
        <input value={amount} onChange={(e) => setAmount(e.target.value)} type="number" placeholder="Amount (₹)"
          className="mt-2 w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm" />
        <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason"
          className="mt-2 w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm" />
        <input value={refundId} onChange={(e) => setRefundId(e.target.value)} placeholder="Razorpay refund ID (optional)"
          className="mt-2 w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm" />
        <div className="mt-4 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-full border border-input px-4 py-2 text-sm font-semibold hover:bg-accent">Cancel</button>
          <button onClick={submit} disabled={busy} className="inline-flex items-center gap-1.5 rounded-full btn-brand btn-brand-hover px-4 py-2 text-sm font-semibold disabled:opacity-70">
            {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Save
          </button>
        </div>
      </div>
    </div>
  );
}
