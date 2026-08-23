import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Printer, CheckCircle2, Loader2 } from "lucide-react";
import { Logo } from "@/components/Logo";
import { useSession } from "@/lib/session";

export const Route = createFileRoute("/_authenticated/receipt/$type/$id")({
  head: () => ({ meta: [{ title: "Payment Receipt — EventOrbit Nova" }, { name: "robots", content: "noindex" }] }),
  component: ReceiptPage,
});

type ReceiptType = "hall" | "worker" | "vendor" | "profile" | "venue-payout";

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
  lineItems: { name: string; amount: number }[] | null; // itemized breakdown of what makes up `amount`, when the booking had selectable add-ons
  advancePaid: number | null; // hall bookings only — the two-stage advance→balance model (migration 20260819150000)
  advanceRazorpayPaymentId: string | null;
  balanceRazorpayPaymentId: string | null;
  // venue-payout receipts only (migration 20260823090000): this is a
  // receipt for what the PLATFORM sent the venue owner for one payment
  // event (advance or balance) of one booking — not for what the
  // customer paid overall. payoutReference is the admin's own UPI
  // transfer reference, not a Razorpay id.
  payoutStage: "advance" | "balance" | "full" | null;
  payoutReference: string | null;
  recipientUpiId: string | null;
  // Whoever booked/hired this (customer_bookings.user_id /
  // worker_tasks|vendor_tasks.assigned_by) — used to hide the platform
  // fee / net-payout breakdown from the customer's own view of a
  // receipt they share a URL with the venue owner/vendor/worker for.
  // null for receipt types that are never viewed by a customer
  // (profile activation, venue payout).
  customerUserId: string | null;
};

const PAYOUT_STAGE_LABEL: Record<"advance" | "balance" | "full", string> = { advance: "Advance", balance: "Balance", full: "Full settlement" };

async function fetchReceipt(type: ReceiptType, id: string): Promise<ReceiptData | null> {
  if (type === "venue-payout") {
    // `id` here is the venue_payouts row id, NOT the booking id — each
    // payment event (advance / balance) for a booking is its own
    // payout row with its own gross/commission/net, so this receipt is
    // scoped to exactly one of those events and never mixes in the
    // other stage or another booking.
    const { data, error } = await supabase.from("venue_payouts" as never)
      .select("id,booking_id,amount,gross_amount,commission_amount,status,payout_reference,paid_at,stage,hall_owner_id,customer_bookings:booking_id(target_name,event_date,details)" as never)
      .eq("id" as never, id as never).maybeSingle();
    if (error) throw error;
    if (!data) return null;
    const d = data as unknown as Record<string, unknown>;
    const booking = d.customer_bookings as { target_name: string; event_date: string | null; details: { event_name?: string } | null } | null;
    const { data: owner } = await supabase.from("profiles" as never).select("full_name, payout_upi_id" as never).eq("id" as never, d.hall_owner_id as never).maybeSingle();
    const ownerRow = owner as unknown as { full_name: string | null; payout_upi_id: string | null } | null;
    const stage = (d.stage as "advance" | "balance" | "full") ?? "full";

    return {
      receiptNo: `VP-${id.slice(0, 8).toUpperCase()}`,
      itemLabel: `${booking?.target_name ?? "Hall booking"} — ${PAYOUT_STAGE_LABEL[stage]} payout`,
      counterpartyLabel: ownerRow?.full_name ?? "Venue owner",
      eventName: booking?.details?.event_name ?? null,
      eventDate: booking?.event_date ?? null,
      amount: Number(d.gross_amount ?? 0),
      commission: Number(d.commission_amount ?? 0),
      paidAt: d.status === "paid" ? (d.paid_at as string | null) : null,
      razorpayPaymentId: null,
      razorpayOrderId: null,
      lineItems: null,
      advancePaid: null, advanceRazorpayPaymentId: null, balanceRazorpayPaymentId: null,
      payoutStage: stage, payoutReference: d.payout_reference as string | null, recipientUpiId: ownerRow?.payout_upi_id ?? null,
      customerUserId: null,
    };
  }

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
        eventName: null, eventDate: null, amount: 0, commission: 0, paidAt: null, razorpayPaymentId: null, razorpayOrderId: null, lineItems: null,
        advancePaid: null, advanceRazorpayPaymentId: null, balanceRazorpayPaymentId: null, payoutStage: null, payoutReference: null, recipientUpiId: null,
        customerUserId: null,
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
      lineItems: null,
      advancePaid: null, advanceRazorpayPaymentId: null, balanceRazorpayPaymentId: null, payoutStage: null, payoutReference: null, recipientUpiId: null,
      customerUserId: null,
    };
  }

  if (type === "hall") {
    const { data, error } = await supabase.from("customer_bookings" as never)
      .select("id,user_id,target_name,event_date,amount,commission_amount,paid_at,razorpay_payment_id,razorpay_order_id,advance_amount,advance_paid_amount,advance_razorpay_payment_id,details")
      .eq("id" as never, id as never).maybeSingle();
    if (error) throw error;
    if (!data) return null;
    const d = data as unknown as Record<string, unknown>;
    const details = (d.details as Record<string, unknown>) ?? {};
    // Customer only REQUESTS these (informational — a wishlist for the
    // owner to price into the whole final amount), they were never
    // individually priced/selected by the customer since the advance→
    // balance redesign (migration 20260819150000), so there's no
    // itemized line-item breakdown to show anymore — just the whole
    // final amount the owner set. `requested_services` replaces the old
    // `selected_services` shape ({category,name} vs {name,line_amount}).
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
      lineItems: null,
      advancePaid: Number(d.advance_paid_amount ?? 0) > 0 ? Number(d.advance_paid_amount) : null,
      advanceRazorpayPaymentId: d.advance_razorpay_payment_id as string | null,
      balanceRazorpayPaymentId: d.razorpay_payment_id as string | null,
      payoutStage: null, payoutReference: null, recipientUpiId: null,
      customerUserId: d.user_id as string,
    };
  }

  if (type === "worker") {
    const { data, error } = await supabase.from("worker_tasks" as never)
      .select("id,assigned_by,task_name,event_name,event_date,payment_amount,commission_amount,paid_at,razorpay_payment_id,razorpay_order_id,selected_items,worker:workers(full_name)")
      .eq("id" as never, id as never).maybeSingle();
    if (error) throw error;
    if (!data) return null;
    const d = data as unknown as Record<string, unknown>;
    const worker = d.worker as { full_name: string } | null;
    const items = (d.selected_items as { name: string; amount: number }[]) ?? [];
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
      lineItems: items.length > 0 ? items : null,
      advancePaid: null, advanceRazorpayPaymentId: null, balanceRazorpayPaymentId: null, payoutStage: null, payoutReference: null, recipientUpiId: null,
      customerUserId: d.assigned_by as string,
    };
  }

  const { data, error } = await supabase.from("vendor_tasks" as never)
    .select("id,assigned_by,task_name,event_name,event_date,payment_amount,commission_amount,paid_at,razorpay_payment_id,razorpay_order_id,selected_items,vendor:vendors(business_name)")
    .eq("id" as never, id as never).maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const d = data as unknown as Record<string, unknown>;
  const vendor = d.vendor as { business_name: string } | null;
  const items = (d.selected_items as { name: string; amount: number }[]) ?? [];
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
    lineItems: items.length > 0 ? items : null,
    advancePaid: null, advanceRazorpayPaymentId: null, balanceRazorpayPaymentId: null, payoutStage: null, payoutReference: null, recipientUpiId: null,
    customerUserId: d.assigned_by as string,
  };
}

function ReceiptPage() {
  const { type, id } = Route.useParams();
  const receiptType = (type === "worker" || type === "vendor" || type === "profile" || type === "venue-payout" ? type : "hall") as ReceiptType;
  const { user } = useSession();

  const { data, isLoading, error } = useQuery({
    queryKey: ["receipt", receiptType, id],
    queryFn: () => fetchReceipt(receiptType, id),
  });

  if (isLoading) return <div className="grid min-h-[60vh] place-items-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  if (error || !data) return <div className="mx-auto max-w-lg py-16 text-center text-sm text-muted-foreground">Receipt not found — it may not be paid yet, or you don't have access to it.</div>;
  if (!data.paidAt) return <div className="mx-auto max-w-lg py-16 text-center text-sm text-muted-foreground">This hasn't been paid yet — no receipt is available.</div>;

  const netPayout = data.amount - data.commission;
  // The venue owner / vendor / worker on the other side of this booking
  // opens the exact same receipt URL to see what the platform kept and
  // what's owed to them — but the customer who paid shouldn't see that
  // internal split, only what they themselves paid.
  const isCustomerViewer = !!data.customerUserId && data.customerUserId === user?.id;
  const showCommissionBreakdown = !isCustomerViewer && (data.commission > 0 || data.payoutStage === "balance");

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

          {data.payoutStage ? (
            <>
              <dt className="text-muted-foreground">Payment stage</dt>
              <dd className="text-right font-medium">{data.payoutStage === "advance" ? "Advance" : data.payoutStage === "balance" ? "Balance" : "Full settlement"}</dd>

              <dt className="text-muted-foreground">Pay via UPI</dt>
              <dd className="text-right font-mono text-xs">{data.recipientUpiId ?? "—"}</dd>

              <dt className="text-muted-foreground">Payout reference</dt>
              <dd className="text-right font-mono text-xs">{data.payoutReference ?? "—"}</dd>
            </>
          ) : (
            <>
              <dt className="text-muted-foreground">Razorpay order ID</dt>
              <dd className="text-right font-mono text-xs">{data.razorpayOrderId ?? "—"}</dd>

              <dt className="text-muted-foreground">Razorpay payment ID</dt>
              <dd className="text-right font-mono text-xs">{data.balanceRazorpayPaymentId ?? data.razorpayPaymentId ?? "—"}</dd>
              {data.advancePaid != null && (
                <>
                  <dt className="text-muted-foreground">Advance payment ID</dt>
                  <dd className="text-right font-mono text-xs">{data.advanceRazorpayPaymentId ?? "—"}</dd>
                </>
              )}
            </>
          )}
        </dl>

        <div className="mt-6 space-y-2 border-t border-border pt-4 text-sm">
          {data.lineItems && data.lineItems.length > 0 && (
            <div className="mb-3 space-y-1.5 border-b border-dashed border-border pb-3">
              <div className="text-xs font-semibold text-muted-foreground">Breakdown</div>
              {data.lineItems.map((li, i) => (
                <div key={i} className="flex justify-between text-muted-foreground"><span>{li.name}</span><span>₹{li.amount.toLocaleString("en-IN")}</span></div>
              ))}
            </div>
          )}
          {data.advancePaid != null && (
            <div className="mb-1.5 space-y-1 border-b border-dashed border-border pb-3">
              <div className="flex justify-between text-muted-foreground"><span>Advance paid earlier</span><span>₹{data.advancePaid.toLocaleString("en-IN")}</span></div>
              <div className="flex justify-between text-muted-foreground"><span>Balance paid now</span><span>₹{(data.amount - data.advancePaid).toLocaleString("en-IN")}</span></div>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-muted-foreground">{data.payoutStage ? "Collected from customer (this stage)" : `Amount paid${data.advancePaid != null ? " (total)" : ""}`}</span>
            <span className="font-semibold">₹{data.amount.toLocaleString("en-IN")}</span>
          </div>
          {showCommissionBreakdown ? (
            data.commission > 0 ? (
              <>
                <div className="flex justify-between text-muted-foreground"><span>Platform fee</span><span>− ₹{data.commission.toLocaleString("en-IN")}</span></div>
                <div className="flex justify-between font-semibold"><span>Net to {data.counterpartyLabel}</span><span>₹{netPayout.toLocaleString("en-IN")}</span></div>
              </>
            ) : (
              <div className="flex justify-between text-muted-foreground"><span>Platform fee</span><span>₹0 — already collected on the advance</span></div>
            )
          ) : null}
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
