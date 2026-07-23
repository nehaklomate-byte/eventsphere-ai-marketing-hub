import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ShieldCheck, FileText, MapPin, Mail, Phone, Check, X, Ban, ShieldAlert, RotateCcw, Loader2,
} from "lucide-react";
import {
  fetchQueue, approve, reject, suspend, blacklist, restore,
  ROLE_LABEL, type QueueRow, type VerificationRole, type VerificationStatus,
} from "@/lib/admin";

export const Route = createFileRoute("/_authenticated/admin/verification")({
  head: () => ({ meta: [{ title: "Verification Center — EventOrbit AI" }, { name: "robots", content: "noindex" }] }),
  validateSearch: (s: Record<string, unknown>) => ({
    role: (s.role as VerificationRole | undefined) ?? undefined,
  }),
  component: VerificationCenter,
});

const ROLE_TABS: (VerificationRole | "all")[] = ["all", "organization", "venue", "vendor", "worker"];
const STATUS_TABS: VerificationStatus[] = ["pending", "approved", "rejected", "suspended", "blacklisted"];

const STATUS_STYLE: Record<VerificationStatus, string> = {
  pending: "bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300",
  approved: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300",
  rejected: "bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300",
  suspended: "bg-orange-100 text-orange-800 dark:bg-orange-950/40 dark:text-orange-300",
  blacklisted: "bg-zinc-800 text-white dark:bg-zinc-200 dark:text-zinc-900",
};

function VerificationCenter() {
  const search = Route.useSearch();
  const qc = useQueryClient();
  const [roleTab, setRoleTab] = useState<VerificationRole | "all">(search.role ?? "all");
  const [statusTab, setStatusTab] = useState<VerificationStatus>("pending");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [reasonFor, setReasonFor] = useState<{ row: QueueRow; action: "reject" | "suspend" | "blacklist" } | null>(null);
  const [reasonText, setReasonText] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["admin-verification-queue", roleTab, statusTab],
    queryFn: () => fetchQueue({ role: roleTab === "all" ? undefined : roleTab, status: statusTab }),
  });

  const rows = data ?? [];

  async function run(action: () => Promise<void>, id: string) {
    setBusyId(id);
    try {
      await action();
      toast.success("Done");
      qc.invalidateQueries({ queryKey: ["admin-verification-queue"] });
      qc.invalidateQueries({ queryKey: ["admin-pending-counts"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setBusyId(null);
      setReasonFor(null);
      setReasonText("");
    }
  }

  function openReasonDialog(row: QueueRow, action: "reject" | "suspend" | "blacklist") {
    setReasonFor({ row, action });
    setReasonText("");
  }

  async function submitReason() {
    if (!reasonFor) return;
    const { row, action } = reasonFor;
    if (action === "reject" && !reasonText.trim()) {
      toast.error("A reason is required to reject an application.");
      return;
    }
    const fn = action === "reject" ? reject : action === "suspend" ? suspend : blacklist;
    await run(() => fn(row.role, row.id, row.user_id, reasonText.trim()), row.id);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl md:text-3xl font-bold tracking-tight">
          <ShieldCheck className="h-7 w-7 text-brand-violet" /> Verification Center
        </h1>
        <p className="mt-1 text-muted-foreground">
          Review documents and approve, reject, suspend or blacklist Organization, Venue Owner, Vendor and Worker applications.
        </p>
      </div>

      {/* Role tabs */}
      <div className="flex flex-wrap gap-2">
        {ROLE_TABS.map((r) => (
          <button
            key={r}
            onClick={() => setRoleTab(r)}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
              roleTab === r ? "bg-brand-violet text-white" : "border border-border bg-card text-muted-foreground hover:bg-accent"
            }`}
          >
            {r === "all" ? "All roles" : `${ROLE_LABEL[r]}s`}
          </button>
        ))}
      </div>

      {/* Status tabs */}
      <div className="flex flex-wrap gap-2 border-b border-border pb-3">
        {STATUS_TABS.map((s) => (
          <button
            key={s}
            onClick={() => setStatusTab(s)}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold uppercase tracking-wide transition ${
              statusTab === s ? "bg-foreground text-background" : "text-muted-foreground hover:bg-accent"
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="rounded-2xl border border-border bg-card p-10 text-center text-sm text-muted-foreground">
          <Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin" /> Loading applications…
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card/40 p-10 text-center text-sm text-muted-foreground">
          No {statusTab} applications{roleTab !== "all" ? ` for ${ROLE_LABEL[roleTab]}s` : ""} right now.
        </div>
      ) : (
        <div className="space-y-4">
          {rows.map((row) => (
            <ApplicationCard
              key={`${row.role}-${row.id}`}
              row={row}
              busy={busyId === row.id}
              onApprove={() => run(() => approve(row.role, row.id, row.user_id), row.id)}
              onReject={() => openReasonDialog(row, "reject")}
              onSuspend={() => openReasonDialog(row, "suspend")}
              onBlacklist={() => openReasonDialog(row, "blacklist")}
              onRestore={() => run(() => restore(row.role, row.id, row.user_id), row.id)}
            />
          ))}
        </div>
      )}

      {reasonFor && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6">
            <h3 className="font-display text-lg font-semibold capitalize">{reasonFor.action} — {reasonFor.row.title}</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {reasonFor.action === "reject" ? "A reason is required — it will be shown to the applicant." : "Optional reason, shown to the applicant."}
            </p>
            <textarea
              value={reasonText}
              onChange={(e) => setReasonText(e.target.value)}
              rows={4}
              placeholder="Reason…"
              className="mt-3 w-full rounded-xl border border-input bg-background p-3 text-sm outline-none focus:border-brand-violet"
            />
            <div className="mt-4 flex justify-end gap-2">
              <button onClick={() => setReasonFor(null)} className="rounded-full border border-input px-4 py-2 text-sm font-semibold hover:bg-accent">
                Cancel
              </button>
              <button onClick={submitReason} className="rounded-full bg-foreground px-4 py-2 text-sm font-semibold text-background hover:opacity-90">
                Confirm {reasonFor.action}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ApplicationCard({
  row, busy, onApprove, onReject, onSuspend, onBlacklist, onRestore,
}: {
  row: QueueRow;
  busy: boolean;
  onApprove: () => void;
  onReject: () => void;
  onSuspend: () => void;
  onBlacklist: () => void;
  onRestore: () => void;
}) {
  const isActionable = row.verification_status === "pending";
  const isSuspendedOrBlacklisted = row.verification_status === "suspended" || row.verification_status === "blacklisted";

  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-muted px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              {ROLE_LABEL[row.role]}
            </span>
            <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${STATUS_STYLE[row.verification_status]}`}>
              {row.verification_status}
            </span>
          </div>
          <h3 className="mt-2 font-display text-lg font-semibold">{row.title}</h3>
          <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
            {row.city && <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {row.city}{row.state ? `, ${row.state}` : ""}</span>}
            {row.email && <span className="flex items-center gap-1"><Mail className="h-3.5 w-3.5" /> {row.email}</span>}
            {row.phone && <span className="flex items-center gap-1"><Phone className="h-3.5 w-3.5" /> {row.phone}</span>}
          </div>
          {row.rejection_reason && (
            <p className="mt-2 rounded-lg bg-rose-50 dark:bg-rose-950/20 px-3 py-1.5 text-xs text-rose-700 dark:text-rose-300">
              Reason on file: {row.rejection_reason}
            </p>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          {isActionable && (
            <>
              <ActionButton busy={busy} onClick={onApprove} icon={Check} label="Approve" tone="success" />
              <ActionButton busy={busy} onClick={onReject} icon={X} label="Reject" tone="danger" />
            </>
          )}
          {row.verification_status === "approved" && (
            <ActionButton busy={busy} onClick={onSuspend} icon={ShieldAlert} label="Suspend" tone="warning" />
          )}
          {isSuspendedOrBlacklisted && (
            <ActionButton busy={busy} onClick={onRestore} icon={RotateCcw} label="Restore" tone="success" />
          )}
          {row.verification_status !== "blacklisted" && (
            <ActionButton busy={busy} onClick={onBlacklist} icon={Ban} label="Blacklist" tone="dark" />
          )}
        </div>
      </div>

      {row.documents?.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2 border-t border-border pt-4">
          {row.documents.map((d, i) => (
            <a
              key={i}
              href={d.url}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium hover:bg-accent"
            >
              <FileText className="h-3.5 w-3.5" /> {d.name || `Document ${i + 1}`}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

function ActionButton({
  busy, onClick, icon: Icon, label, tone,
}: {
  busy: boolean;
  onClick: () => void;
  icon: typeof Check;
  label: string;
  tone: "success" | "danger" | "warning" | "dark";
}) {
  const toneClass = {
    success: "bg-emerald-600 hover:bg-emerald-700 text-white",
    danger: "bg-rose-600 hover:bg-rose-700 text-white",
    warning: "bg-amber-500 hover:bg-amber-600 text-white",
    dark: "bg-zinc-800 hover:bg-zinc-900 text-white dark:bg-zinc-200 dark:text-zinc-900",
  }[tone];

  return (
    <button
      disabled={busy}
      onClick={onClick}
      className={`flex items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-semibold transition disabled:opacity-50 ${toneClass}`}
    >
      {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Icon className="h-3.5 w-3.5" />} {label}
    </button>
  );
}
