import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { UserCheck, Check, X, Loader2, Mail, Phone } from "lucide-react";
import { fetchPendingAccounts, approveAccount, rejectAccount, type AccountRow } from "@/lib/admin";

export const Route = createFileRoute("/_authenticated/admin/accounts")({
  head: () => ({ meta: [{ title: "Account Approvals — EventOrbit AI" }, { name: "robots", content: "noindex" }] }),
  component: AccountApprovalsPage,
});

function AccountApprovalsPage() {
  const qc = useQueryClient();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState<AccountRow | null>(null);
  const [reason, setReason] = useState("");

  const { data, isLoading } = useQuery({ queryKey: ["admin-pending-accounts"], queryFn: fetchPendingAccounts });

  async function handleApprove(row: AccountRow) {
    setBusyId(row.id);
    try {
      await approveAccount(row.id);
      toast.success(`${row.full_name || row.email} approved`);
      qc.invalidateQueries({ queryKey: ["admin-pending-accounts"] });
      qc.invalidateQueries({ queryKey: ["admin-pending-account-count"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusyId(null);
    }
  }

  async function submitReject() {
    if (!rejecting) return;
    if (!reason.trim()) { toast.error("A reason is required."); return; }
    setBusyId(rejecting.id);
    try {
      await rejectAccount(rejecting.id, reason.trim());
      toast.success("Account rejected");
      qc.invalidateQueries({ queryKey: ["admin-pending-accounts"] });
      qc.invalidateQueries({ queryKey: ["admin-pending-account-count"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusyId(null);
      setRejecting(null);
      setReason("");
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl md:text-3xl font-bold tracking-tight">
          <UserCheck className="h-7 w-7 text-brand-violet" /> Account Approvals
        </h1>
        <p className="mt-1 text-muted-foreground">
          Step 1 of 2 for every non-customer signup: approve the account itself before they can access their dashboard.
          Full profile verification (Step 2) happens afterwards in the Verification Center.
        </p>
      </div>

      {isLoading ? (
        <div className="rounded-2xl border border-border bg-card p-10 text-center text-sm text-muted-foreground">
          <Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin" /> Loading…
        </div>
      ) : !data || data.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card/40 p-10 text-center text-sm text-muted-foreground">
          No accounts waiting for approval.
        </div>
      ) : (
        <div className="space-y-4">
          {data.map((row) => (
            <div key={row.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card p-6">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-display text-lg font-semibold">{row.full_name || "Unnamed"}</h3>
                  <span className="rounded-full bg-muted px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground capitalize">
                    {(row.primary_role ?? "unknown").replace("_", " ")}
                  </span>
                </div>
                <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                  {row.email && <span className="flex items-center gap-1"><Mail className="h-3.5 w-3.5" /> {row.email}</span>}
                  {row.phone && <span className="flex items-center gap-1"><Phone className="h-3.5 w-3.5" /> {row.phone}</span>}
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  disabled={busyId === row.id}
                  onClick={() => handleApprove(row)}
                  className="flex items-center gap-1.5 rounded-full bg-emerald-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                >
                  {busyId === row.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />} Approve account
                </button>
                <button
                  disabled={busyId === row.id}
                  onClick={() => { setRejecting(row); setReason(""); }}
                  className="flex items-center gap-1.5 rounded-full bg-rose-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-rose-700 disabled:opacity-50"
                >
                  <X className="h-3.5 w-3.5" /> Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {rejecting && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6">
            <h3 className="font-display text-lg font-semibold">Reject — {rejecting.full_name || rejecting.email}</h3>
            <p className="mt-1 text-sm text-muted-foreground">This reason is shown to the applicant.</p>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={4}
              placeholder="Reason…"
              className="mt-3 w-full rounded-xl border border-input bg-background p-3 text-sm outline-none focus:border-brand-violet"
            />
            <div className="mt-4 flex justify-end gap-2">
              <button onClick={() => setRejecting(null)} className="rounded-full border border-input px-4 py-2 text-sm font-semibold hover:bg-accent">Cancel</button>
              <button onClick={submitReject} className="rounded-full bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700">Confirm reject</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
