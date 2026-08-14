import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Printer, CheckCircle2, Loader2 } from "lucide-react";
import { Logo } from "@/components/Logo";

export const Route = createFileRoute("/_authenticated/receipt/$type/$id")({
  head: () => ({ meta: [{ title: "Payment Receipt — EventOrbit Nova" }, { name: "robots", content: "noindex" }] }),
  component: ReceiptPage,
});

type ReceiptType = "hall" | "worker" | "vendor" | "profile";

type ReceiptData = {
  receiptNo: string;
  itemLabel: string;      // what was paid for — "Venue booking", task name, etc.
  counterpartyLabel: string; // who was paid — hall name, worker name, vendor business name
  eventName: string | null;
  eventDate: string | null;
  amount: number;
  commission: number;
  paidAt: string | null;
  razorpayPaymentId: string | null;
  razorpayOrderId: string | null;
};

async function fetchReceipt(type: ReceiptType, id: string): Promise<ReceiptData | null> {
  if (type === "profile") {
    const { data, error } = await supabase.from("public_profile_payments" as never)
      .select("id,role,entity_id,feature_type,amount,status,razorpay_payment_id,razorpay_order_id,created_at")
      .eq("id" as never, id as never).maybeSingle();
    if (error) throw error;
    if (!data) return null;
    const d = data as unknown as Record<string, unknown>;
    if (d.status !== "paid") {
      return {
        receiptNo: `PP-${id.slice(0, 8).toUpperCase()}`, itemLabel: "", counterpartyLabel: "",
        eventName: null, eventDate: null, amount: 0, commission: 0, paidAt: null, razorpayPaymentId: null, razorpayOrderId: null,
      };
    }

    const role = d.role as "venue" | "vendor" | "worker";
    const table = role === "venue" ? "halls" : role === "vendor" ? "vendors" : "workers";
    const nameCol = role === "venue" ? "name" : role === "vendor" ? "business_name" : "full_name";
    const { data: entity } = await supabase.from(table as never).select(nameCol as never).eq("id" as never, d.entity_id as never).maybeSingle();
    const counterparty = (entity as unknown as Record<string, unknown> | null)?.[nameCol] as string | undefined;

    const featureLabels: Record<string, string> = {
      profile_activation: "Public Booking Profile — one-time activation",
      subscription_monthly: "Top-tier visibility subscription — monthly",
      subscription_annual: "Top-tier visibility subscription — annual",
    };

    return {
      receiptNo: `PP-${id.slice(0, 8).toUpperCase()}`,
      itemLabel: featureLabels[d.feature_type as string] ?? "Public Booking Profile",
      counterpartyLabel: counterparty ?? "EventOrbit Nova",
      eventName: null,
      eventDate: null,
      amount: Number(d.amount ?? 0),
      commission: 0,
      paidAt: d.created_at as string | null,
      razorpayPaymentId: d.razorpay_payment_id as string | null,
      razorpayOrderId: d.razorpay_order_id as string | null,
    };
  }

  if (type === "hall") {
    const { data, error } = await supabase.from("customer_bookings" as never)
      .select("id,target_name,event_date,amount,commission_amount,paid_at,razorpay_payment_id,razorpay_order_id,details")
      .eq("id" as never, id as never).maybeSingle();
    if (error) throw error;
    if (!data) return null;
    const d = data as unknown as Record<string, unknown>;
    const details = (d.details as Record<string, unknown>) ?? {};
    return {
      receiptNo: `HB-${id.slice(0, 8).toUpperCase()}`,
      itemLabel: "Venue booking",
      counterpartyLabel: d.target_name as string,
      eventName: (details.event_name as string) ?? null,
      eventDate: d.event_date as string | null,
      amount: Number(d.amount ?? 0),
      commission: Number(d.commission_amount ?? 0),
      paidAt: d.paid_at as string | null,
      razorpayPaymentId: d.razorpay_payment_id as string | null,
      razorpayOrderId: d.razorpay_order_id as string | null,
    };
  }

  if (type === "worker") {
    const { data, error } = await supabase.from("worker_tasks" as never)
      .select("id,task_name,event_name,event_date,payment_amount,commission_amount,paid_at,razorpay_payment_id,razorpay_order_id,worker:workers(full_name)")
      .eq("id" as never, id as never).maybeSingle();
    if (error) throw error;
    if (!data) return null;
    const d = data as unknown as Record<string, unknown>;
    const worker = d.worker as { full_name: string } | null;
    return {
      receiptNo: `WT-${id.slice(0, 8).toUpperCase()}`,
      itemLabel: d.task_name as string,
      counterpartyLabel: worker?.full_name ?? "Worker",
      eventName: d.event_name as string | null,
      eventDate: d.event_date as string | null,
      amount: Number(d.payment_amount ?? 0),
      commission: Number(d.commission_amount ?? 0),
      paidAt: d.paid_at as string | null,
      razorpayPaymentId: d.razorpay_payment_id as string | null,
      razorpayOrderId: d.razorpay_order_id as string | null,
    };
  }

  const { data, error } = await supabase.from("vendor_tasks" as never)
    .select("id,task_name,event_name,event_date,payment_amount,commission_amount,paid_at,razorpay_payment_id,razorpay_order_id,vendor:vendors(business_name)")
    .eq("id" as never, id as never).maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const d = data as unknown as Record<string, unknown>;
  const vendor = d.vendor as { business_name: string } | null;
  return {
    receiptNo: `VT-${id.slice(0, 8).toUpperCase()}`,
    itemLabel: d.task_name as string,
    counterpartyLabel: vendor?.business_name ?? "Vendor",
    eventName: d.event_name as string | null,
    eventDate: d.event_date as string | null,
    amount: Number(d.payment_amount ?? 0),
    commission: Number(d.commission_amount ?? 0),
    paidAt: d.paid_at as string | null,
    razorpayPaymentId: d.razorpay_payment_id as string | null,
    razorpayOrderId: d.razorpay_order_id as string | null,
  };
}

function ReceiptPage() {
  const { type, id } = Route.useParams();
  const receiptType = (type === "worker" || type === "vendor" || type === "profile" ? type : "hall") as ReceiptType;

  const { data, isLoading, error } = useQuery({
    queryKey: ["receipt", receiptType, id],
    queryFn: () => fetchReceipt(receiptType, id),
  });

  if (isLoading) return <div className="grid min-h-[60vh] place-items-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  if (error || !data) return <div className="mx-auto max-w-lg py-16 text-center text-sm text-muted-foreground">Receipt not found — it may not be paid yet, or you don't have access to it.</div>;
  if (!data.paidAt) return <div className="mx-auto max-w-lg py-16 text-center text-sm text-muted-foreground">This hasn't been paid yet — no receipt is available.</div>;

  const netPayout = data.amount - data.commission;

  return (
    <div className="mx-auto max-w-2xl py-6">
      <div className="mb-4 flex justify-end print:hidden">
        <button onClick={() => window.print()}
          className="inline-flex items-center gap-2 rounded-full btn-brand btn-brand-hover px-5 py-2.5 text-sm font-semibold text-white">
          <Printer className="h-4 w-4" /> Download / Print Receipt
        </button>
      </div>

      <div id="receipt-print-area" className="rounded-2xl border border-border bg-card p-8 print:border-0 print:shadow-none">
        <div className="flex items-start justify-between border-b border-border pb-6">
          <Logo className="h-8" />
          <div className="text-right">
            <div className="text-lg font-bold">Payment Receipt</div>
            <div className="text-xs text-muted-foreground">#{data.receiptNo}</div>
          </div>
        </div>

        <div className="mt-6 flex items-center gap-2 text-sm font-semibold text-emerald-700">
          <CheckCircle2 className="h-4 w-4" /> Paid on {new Date(data.paidAt).toLocaleString("en-IN", { dateStyle: "long", timeStyle: "short" })}
        </div>

        <dl className="mt-6 grid grid-cols-2 gap-y-3 text-sm">
          <dt className="text-muted-foreground">For</dt>
          <dd className="text-right font-medium">{data.itemLabel}</dd>

          <dt className="text-muted-foreground">Paid to</dt>
          <dd className="text-right font-medium">{data.counterpartyLabel}</dd>

          {data.eventName && (<><dt className="text-muted-foreground">Event</dt><dd className="text-right font-medium">{data.eventName}</dd></>)}
          {data.eventDate && (<><dt className="text-muted-foreground">Event date</dt><dd className="text-right font-medium">{new Date(data.eventDate).toLocaleDateString("en-IN", { dateStyle: "long" })}</dd></>)}

          <dt className="text-muted-foreground">Razorpay order ID</dt>
          <dd className="text-right font-mono text-xs">{data.razorpayOrderId ?? "—"}</dd>

          <dt className="text-muted-foreground">Razorpay payment ID</dt>
          <dd className="text-right font-mono text-xs">{data.razorpayPaymentId ?? "—"}</dd>
        </dl>

        <div className="mt-6 space-y-2 border-t border-border pt-4 text-sm">
          <div className="flex justify-between"><span className="text-muted-foreground">Amount paid</span><span className="font-semibold">₹{data.amount.toLocaleString("en-IN")}</span></div>
          {data.commission > 0 && (
            <>
              <div className="flex justify-between text-muted-foreground"><span>Platform fee</span><span>− ₹{data.commission.toLocaleString("en-IN")}</span></div>
              <div className="flex justify-between font-semibold"><span>Net to {data.counterpartyLabel}</span><span>₹{netPayout.toLocaleString("en-IN")}</span></div>
            </>
          )}
        </div>

        <p className="mt-8 text-center text-[11px] text-muted-foreground">This is a system-generated receipt from EventOrbit Nova and does not require a signature.</p>
      </div>

      <style>{`
        @media print {
          body * { visibility: hidden; }
          #receipt-print-area, #receipt-print-area * { visibility: visible; }
          #receipt-print-area { position: absolute; left: 0; top: 0; width: 100%; }
        }
      `}</style>
    </div>
  );
}
