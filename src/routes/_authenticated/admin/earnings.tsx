import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { IndianRupee, Loader2, Wallet, ArrowDownCircle, ArrowUpCircle, CheckCircle2, Download } from "lucide-react";
import { useSession } from "@/lib/session";
import {
  fetchIncomingPayments, fetchPayouts, markPayoutPaid, downloadCsv,
  type IncomingPayment, type PayoutRow, type PayoutSource,
} from "@/lib/admin";

export const Route = createFileRoute("/_authenticated/admin/earnings")({
  head: () => ({ meta: [{ title: "Earnings — EventOrbit Nova" }, { name: "robots", content: "noindex" }] }),
  component: EarningsPage,
});

const SOURCE_LABEL: Record<string, string> = { hall: "Hall booking", worker: "Worker task", vendor: "Vendor task", venue: "Hall booking", profile: "Public profile" };
const SOURCE_STYLE: Record<string, string> = {
  hall: "bg-purple-100 text-purple-800 dark:bg-purple-950/40 dark:text-purple-300",
  worker: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300",
  vendor: "bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300",
  venue: "bg-purple-100 text-purple-800 dark:bg-purple-950/40 dark:text-purple-300",
  profile: "bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300",
};

function money(n: number) { return `₹${Number(n || 0).toLocaleString("en-IN")}`; }

function EarningsPage() {
  const { user } = useSession();
  const qc = useQueryClient();
  const [tab, setTab] = useState<"incoming" | "payouts">("incoming");

  const incoming = useQuery({ queryKey: ["admin-incoming-payments"], queryFn: fetchIncomingPayments });
  const payouts = useQuery({ queryKey: ["admin-payouts"], queryFn: fetchPayouts });

  const totalIncoming = (incoming.data ?? []).reduce((s, p) => s + Number(p.amount || 0), 0);
  const totalCommission = (incoming.data ?? []).reduce((s, p) => s + Number(p.commission_amount || 0), 0);
  const pendingPayouts = (payouts.data ?? []).filter((p) => p.status === "pending");
  const totalPendingPayoutAmount = pendingPayouts.reduce((s, p) => s + Number(p.amount || 0), 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl md:text-3xl font-bold tracking-tight">
          <IndianRupee className="h-7 w-7 text-brand-violet" /> Earnings
        </h1>
        <p className="mt-1 text-muted-foreground">Every payment that's actually cleared through Razorpay, and what the platform still owes out to workers, vendors and venue owners.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard icon={ArrowDownCircle} label="Total collected" value={money(totalIncoming)} tone="text-emerald-600" />
        <StatCard icon={IndianRupee} label="Platform commission" value={money(totalCommission)} tone="text-brand-violet" />
        <StatCard icon={ArrowUpCircle} label="Pending payouts" value={money(totalPendingPayoutAmount)} sub={`${pendingPayouts.length} unpaid`} tone="text-amber-600" />
      </div>

      <div className="flex gap-1.5 rounded-full border border-border bg-card p-1 text-sm w-fit">
        {(["incoming", "payouts"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`rounded-full px-4 py-1.5 font-semibold transition ${tab === t ? "bg-brand-violet text-white" : "text-muted-foreground hover:bg-accent"}`}>
            {t === "incoming" ? "Incoming payments" : "Payouts owed"}
          </button>
        ))}
      </div>

      {tab === "incoming" ? (
        <IncomingTable rows={incoming.data ?? []} isLoading={incoming.isLoading} />
      ) : (
        <PayoutsTable rows={payouts.data ?? []} isLoading={payouts.isLoading} adminUserId={user?.id ?? ""}
          onPaid={() => qc.invalidateQueries({ queryKey: ["admin-payouts"] })} />
      )}
    </div>
  );
}

function StatCard({ icon: Icon, label, value, sub, tone }: { icon: React.ElementType; label: string; value: string; sub?: string; tone: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="flex items-center gap-2 text-sm text-muted-foreground"><Icon className={`h-4 w-4 ${tone}`} /> {label}</div>
      <div className="mt-1.5 text-2xl font-bold">{value}</div>
      {sub && <div className="mt-0.5 text-xs text-muted-foreground">{sub}</div>}
    </div>
  );
}

function IncomingTable({ rows, isLoading }: { rows: IncomingPayment[]; isLoading: boolean }) {
  if (isLoading) return <LoadingBlock />;
  if (rows.length === 0) return <EmptyBlock text="No payments have cleared yet." />;
  return (
    <div className="overflow-x-auto rounded-2xl border border-border bg-card">
      <div className="flex justify-end p-3">
        <button onClick={() => downloadCsv("incoming-payments.csv", rows as never)} className="text-xs font-semibold text-brand-violet hover:underline">Download CSV</button>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <th className="px-5 py-3">Source</th>
            <th className="px-5 py-3">Details</th>
            <th className="px-5 py-3">Amount</th>
            <th className="px-5 py-3">Commission</th>
            <th className="px-5 py-3">Razorpay ID</th>
            <th className="px-5 py-3">Paid at</th>
            <th className="px-5 py-3">Receipt</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={`${r.source}-${r.id}`} className="border-b border-border last:border-0">
              <td className="px-5 py-3"><span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${SOURCE_STYLE[r.source]}`}>{SOURCE_LABEL[r.source]}</span></td>
              <td className="px-5 py-3 font-medium">{r.title}</td>
              <td className="px-5 py-3 font-semibold">{money(r.amount)}</td>
              <td className="px-5 py-3 text-muted-foreground">{r.commission_amount > 0 ? money(r.commission_amount) : "—"}</td>
              <td className="px-5 py-3 text-muted-foreground font-mono text-xs">{r.razorpay_payment_id || "—"}</td>
              <td className="px-5 py-3 text-muted-foreground">{r.paid_at ? new Date(r.paid_at).toLocaleString("en-IN") : "—"}</td>
              <td className="px-5 py-3">
                <Link to="/receipt/$type/$id" params={{ type: r.source, id: r.id }} target="_blank"
                  className="inline-flex items-center gap-1 text-xs font-semibold text-brand-violet hover:underline">
                  <Download className="h-3.5 w-3.5" /> View
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function PayoutsTable({ rows, isLoading, adminUserId, onPaid }: { rows: PayoutRow[]; isLoading: boolean; adminUserId: string; onPaid: () => void }) {
  const [marking, setMarking] = useState<PayoutRow | null>(null);
  const [reference, setReference] = useState("");
  const [busy, setBusy] = useState(false);

  async function confirmMark() {
    if (!marking) return;
    setBusy(true);
    try {
      await markPayoutPaid(marking.source as PayoutSource, marking.id, reference, adminUserId);
      toast.success("Marked as paid");
      setMarking(null); setReference("");
      onPaid();
    } catch (e) { toast.error((e as Error).message); }
    finally { setBusy(false); }
  }

  if (isLoading) return <LoadingBlock />;
  if (rows.length === 0) return <EmptyBlock text="No payouts yet." />;

  return (
    <>
      <div className="overflow-x-auto rounded-2xl border border-border bg-card">
        <div className="flex justify-end p-3">
          <button onClick={() => downloadCsv("payouts.csv", rows as never)} className="text-xs font-semibold text-brand-violet hover:underline">Download CSV</button>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <th className="px-5 py-3">Owed to</th>
              <th className="px-5 py-3">Details</th>
              <th className="px-5 py-3">Amount</th>
              <th className="px-5 py-3">Status</th>
              <th className="px-5 py-3">Reference</th>
              <th className="px-5 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={`${r.source}-${r.id}`} className="border-b border-border last:border-0">
                <td className="px-5 py-3"><span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold capitalize ${SOURCE_STYLE[r.source]}`}>{r.source}</span></td>
                <td className="px-5 py-3 font-medium">{r.title}</td>
                <td className="px-5 py-3 font-semibold">{money(r.amount)}</td>
                <td className="px-5 py-3">
                  {r.status === "paid" ? (
                    <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-400 text-xs font-semibold"><CheckCircle2 className="h-3.5 w-3.5" /> Paid</span>
                  ) : (
                    <span className="rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 px-2.5 py-0.5 text-[11px] font-semibold">Pending</span>
                  )}
                </td>
                <td className="px-5 py-3 text-muted-foreground text-xs">{r.payout_reference || "—"}</td>
                <td className="px-5 py-3">
                  {r.status === "pending" && (
                    <button onClick={() => { setMarking(r); setReference(""); }} className="rounded-full border border-input px-3 py-1.5 text-xs font-semibold hover:bg-accent">
                      Mark as paid
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {marking && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" onClick={() => setMarking(null)}>
          <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="flex items-center gap-2 font-semibold"><Wallet className="h-4 w-4 text-brand-violet" /> Mark payout as paid</h3>
            <p className="mt-1.5 text-sm text-muted-foreground">{marking.title} — {money(marking.amount)}</p>
            <p className="mt-2 text-xs text-muted-foreground">Confirm you've sent this via UPI outside the platform, then record the reference (transaction ID) here.</p>
            <input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="UPI transaction reference (optional)"
              className="mt-3 w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm outline-none focus:border-brand-violet" />
            <div className="mt-4 flex justify-end gap-2">
              <button onClick={() => setMarking(null)} className="rounded-full border border-input px-4 py-2 text-sm font-semibold hover:bg-accent">Cancel</button>
              <button onClick={confirmMark} disabled={busy} className="inline-flex items-center gap-1.5 rounded-full btn-brand btn-brand-hover px-4 py-2 text-sm font-semibold disabled:opacity-70">
                {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Confirm paid
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function LoadingBlock() {
  return <div className="rounded-2xl border border-border bg-card p-10 text-center text-sm text-muted-foreground"><Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin" /> Loading…</div>;
}
function EmptyBlock({ text }: { text: string }) {
  return <div className="rounded-2xl border border-dashed border-border bg-card/40 p-10 text-center text-sm text-muted-foreground">{text}</div>;
}
