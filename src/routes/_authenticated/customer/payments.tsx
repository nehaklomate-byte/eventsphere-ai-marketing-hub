import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Wallet, Download } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/session";
import { PageShell, EmptyState, LoadingRows } from "./-ui";

export const Route = createFileRoute("/_authenticated/customer/payments")({ component: PaymentsPage });

function PaymentsPage() {
  const { user } = useSession();
  const { data, isLoading } = useQuery({
    queryKey: ["c-payments", user?.id],
    enabled: !!user?.id,
    queryFn: async () => (await supabase.from("customer_payments").select("*").eq("user_id", user!.id).order("created_at", { ascending: false })).data ?? [],
  });

  const paid = (data ?? []).filter((p) => p.status === "paid").reduce((s, p) => s + Number(p.amount), 0);
  const pending = (data ?? []).filter((p) => p.status === "pending").reduce((s, p) => s + Number(p.amount), 0);
  const refunded = (data ?? []).filter((p) => p.status === "refunded").reduce((s, p) => s + Number(p.amount), 0);

  return (
    <PageShell title="Payments" subtitle="Invoices, transactions and refund status.">
      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Total paid" value={paid} tone="text-emerald-600" />
        <Stat label="Pending" value={pending} tone="text-amber-600" />
        <Stat label="Refunded" value={refunded} tone="text-brand-violet" />
      </div>

      {isLoading ? <LoadingRows /> : (data?.length ?? 0) === 0 ? (
        <EmptyState title="No payments yet" description="Once you make a booking, your invoices and receipts will appear here." icon={Wallet} />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border bg-card">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs uppercase tracking-widest text-muted-foreground">
              <tr>
                <th className="px-4 py-3 text-left">Invoice</th>
                <th className="px-4 py-3 text-left">Description</th>
                <th className="px-4 py-3 text-right">Amount</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Method</th>
                <th className="px-4 py-3 text-right">Receipt</th>
              </tr>
            </thead>
            <tbody>
              {data!.map((p) => (
                <tr key={p.id} className="border-t border-border">
                  <td className="px-4 py-3 font-mono text-xs">{p.invoice_number ?? "—"}</td>
                  <td className="px-4 py-3">{p.description}</td>
                  <td className="px-4 py-3 text-right font-semibold">₹{Number(p.amount).toLocaleString("en-IN")}</td>
                  <td className="px-4 py-3 capitalize">{p.status}</td>
                  <td className="px-4 py-3">{p.method ?? "—"}</td>
                  <td className="px-4 py-3 text-right">
                    {p.receipt_url ? (
                      <a href={p.receipt_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs font-semibold text-brand-violet"><Download className="h-3.5 w-3.5" /> Download</a>
                    ) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </PageShell>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className={`mt-2 font-display text-2xl font-semibold ${tone}`}>₹{value.toLocaleString("en-IN")}</div>
    </div>
  );
}
