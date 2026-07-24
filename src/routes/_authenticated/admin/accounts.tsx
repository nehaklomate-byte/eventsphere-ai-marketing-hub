import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { UserCheck, Check, X, Loader2, Mail, Phone, Eye, Download } from "lucide-react";
import {
  fetchAccountsByStatus, approveAccount, rejectAccount, fetchRoleRecordByOwner, roleFromPrimaryRole, downloadCsv,
  type AccountRow,
} from "@/lib/admin";

export const Route = createFileRoute("/_authenticated/admin/accounts")({
  head: () => ({ meta: [{ title: "Account Approvals — EventOrbit AI" }, { name: "robots", content: "noindex" }] }),
  component: AccountApprovalsPage,
});

const STATUS_TABS = ["pending_approval", "approved", "rejected", "all"] as const;
const STATUS_LABEL: Record<(typeof STATUS_TABS)[number], string> = {
  pending_approval: "Pending",
  approved: "Approved",
  rejected: "Rejected",
  all: "All",
};
const STATUS_STYLE: Record<string, string> = {
  pending_approval: "bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300",
  approved: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300",
  rejected: "bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300",
};

function AccountApprovalsPage() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<(typeof STATUS_TABS)[number]>("pending_approval");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState<AccountRow | null>(null);
  const [reason, setReason] = useState("");
  const [detailsFor, setDetailsFor] = useState<AccountRow | null>(null);

  const { data, isLoading } = useQuery({ queryKey: ["admin-accounts", tab], queryFn: () => fetchAccountsByStatus(tab) });

  async function handleApprove(row: AccountRow) {
    setBusyId(row.id);
    try {
      await approveAccount(row.id);
      toast.success(`${row.full_name || row.email} approved`);
      qc.invalidateQueries({ queryKey: ["admin-accounts"] });
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
      qc.invalidateQueries({ queryKey: ["admin-accounts"] });
      qc.invalidateQueries({ queryKey: ["admin-pending-account-count"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusyId(null);
      setRejecting(null);
      setReason("");
    }
  }

  function exportCsv() {
    if (!data || data.length === 0) return;
    downloadCsv(`account-approvals-${tab}-${new Date().toISOString().slice(0, 10)}.csv`, data);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl md:text-3xl font-bold tracking-tight">
            <UserCheck className="h-7 w-7 text-brand-violet" /> Account Approvals
          </h1>
          <p className="mt-1 text-muted-foreground">
            Step 1 of 2 for every non-customer signup. Step 2 (profile verification) happens in the Verification Center.
          </p>
        </div>
        <button
          onClick={exportCsv}
          disabled={!data || data.length === 0}
          className="flex items-center gap-1.5 rounded-full border border-input px-4 py-2 text-sm font-semibold hover:bg-accent disabled:opacity-40"
        >
          <Download className="h-4 w-4" /> Download CSV
        </button>
      </div>

      <div className="flex flex-wrap gap-2 border-b border-border pb-3">
        {STATUS_TABS.map((s) => (
          <button
            key={s}
            onClick={() => setTab(s)}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold uppercase tracking-wide transition ${
              tab === s ? "bg-foreground text-background" : "text-muted-foreground hover:bg-accent"
            }`}
          >
            {STATUS_LABEL[s]}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="rounded-2xl border border-border bg-card p-10 text-center text-sm text-muted-foreground">
          <Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin" /> Loading…
        </div>
      ) : !data || data.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card/40 p-10 text-center text-sm text-muted-foreground">
          No accounts in "{STATUS_LABEL[tab]}".
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
                  <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${STATUS_STYLE[row.account_status]}`}>
                    {STATUS_LABEL[row.account_status as keyof typeof STATUS_LABEL] ?? row.account_status}
                  </span>
                </div>
                <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                  {row.email && <span className="flex items-center gap-1"><Mail className="h-3.5 w-3.5" /> {row.email}</span>}
                  {row.phone && <span className="flex items-center gap-1"><Phone className="h-3.5 w-3.5" /> {row.phone}</span>}
                </div>
                {row.account_rejection_reason && (
                  <p className="mt-2 rounded-lg bg-rose-50 dark:bg-rose-950/20 px-3 py-1.5 text-xs text-rose-700 dark:text-rose-300">
                    Reason on file: {row.account_rejection_reason}
                  </p>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setDetailsFor(row)}
                  className="flex items-center gap-1.5 rounded-full border border-input px-3.5 py-2 text-xs font-semibold hover:bg-accent"
                >
                  <Eye className="h-3.5 w-3.5" /> View full details
                </button>
                {row.account_status === "pending_approval" && (
                  <>
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
                  </>
                )}
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

      {detailsFor && <AccountDetailsModal row={detailsFor} onClose={() => setDetailsFor(null)} />}
    </div>
  );
}

/** Full registration submission (the linked halls/vendors/workers/
 * organizations row) for a Step-1 applicant — so the admin can review
 * everything they submitted before approving the account itself. */
function AccountDetailsModal({ row, onClose }: { row: AccountRow; onClose: () => void }) {
  const role = roleFromPrimaryRole(row.primary_role);
  const { data, isLoading, error } = useQuery({
    queryKey: ["admin-account-full-record", row.id],
    queryFn: () => (role ? fetchRoleRecordByOwner(role, row.id) : Promise.resolve(null)),
    enabled: !!role,
  });

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4" onClick={onClose}>
      <div className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-border bg-card p-6" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-display text-lg font-semibold">{row.full_name || row.email} — full submission</h3>
          <button onClick={onClose} className="rounded-full p-1.5 hover:bg-accent"><X className="h-4 w-4" /></button>
        </div>

        {!role ? (
          <p className="text-sm text-muted-foreground">Unrecognised role — nothing to show.</p>
        ) : isLoading ? (
          <div className="py-10 text-center"><Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : error ? (
          <p className="text-sm text-rose-500">Couldn't load details: {error instanceof Error ? error.message : "unknown error"}</p>
        ) : !data ? (
          <p className="text-sm text-muted-foreground">
            No {role} record found yet for this account — they haven't submitted their profile form.
          </p>
        ) : (
          <dl className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
            {Object.entries(data)
              .filter(([key]) => !["id", "owner_id", "documents"].includes(key))
              .map(([key, value]) => (
                <div key={key} className="border-b border-border/60 pb-2">
                  <dt className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{key.replace(/_/g, " ")}</dt>
                  <dd className="mt-0.5 break-words text-sm text-foreground">
                    {value === null || value === "" ? <span className="text-muted-foreground/60">— empty —</span>
                      : typeof value === "boolean" ? (value ? "Yes" : "No")
                      : typeof value === "object" ? JSON.stringify(value)
                      : String(value)}
                  </dd>
                </div>
              ))}
          </dl>
        )}
      </div>
    </div>
  );
}
