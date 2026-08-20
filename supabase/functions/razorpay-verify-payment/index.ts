// ============================================================
// Path: supabase/functions/razorpay-verify-payment/index.ts
// (create this as a NEW Edge Function)
//
// Called from the frontend right after Razorpay Checkout's success
// handler fires. This is the client-side confirmation path; the
// razorpay-webhook function below is the server-side safety net in
// case the browser tab closes before this call completes.
// ============================================================
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RAZORPAY_KEY_SECRET = Deno.env.get("RAZORPAY_KEY_SECRET")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function hmacHex(key: string, message: string): Promise<string> {
  const enc = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey("raw", enc.encode(key), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", cryptoKey, enc.encode(message));
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { worker_task_id, entity_type, razorpay_order_id, razorpay_payment_id, razorpay_signature, payment_stage } = await req.json();
    if (!worker_task_id || !razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return new Response(JSON.stringify({ error: "Missing fields" }), { status: 400, headers: corsHeaders });
    }
    // "hall" was previously never handled here either — booking payment
    // verification silently looked in worker_tasks and failed, so
    // customer_bookings.payment_status never actually flipped to 'paid'
    // through this path, and the commission-calculating trigger on
    // customer_bookings never fired for a real Razorpay payment.
    const table = entity_type === "vendor" ? "vendor_tasks" : entity_type === "hall" ? "customer_bookings" : "worker_tasks";

    const expected = await hmacHex(RAZORPAY_KEY_SECRET, `${razorpay_order_id}|${razorpay_payment_id}`);
    if (expected !== razorpay_signature) {
      return new Response(JSON.stringify({ error: "Signature verification failed — payment not trusted." }), { status: 400, headers: corsHeaders });
    }

    // Service role — this function is the trusted source of truth once
    // the signature checks out, RLS shouldn't block the write.
    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Hall bookings go through the two-stage advance→balance flow
    // (migration 20260819150000) instead of always jumping straight to
    // "paid" — an advance payment only moves payment_status to
    // 'partial', the booking isn't fully paid until the balance clears.
    if (entity_type === "hall") {
      const stage = payment_stage === "balance" ? "balance" : "advance";

      const { data: booking, error: fetchErr } = await admin
        .from("customer_bookings")
        .select("id, razorpay_order_id, payment_status, advance_amount, advance_paid_amount")
        .eq("id", worker_task_id)
        .maybeSingle();
      if (fetchErr || !booking) {
        return new Response(JSON.stringify({ error: "Booking not found" }), { status: 404, headers: corsHeaders });
      }
      if (booking.razorpay_order_id !== razorpay_order_id) {
        return new Response(JSON.stringify({ error: "Order mismatch" }), { status: 400, headers: corsHeaders });
      }
      if (booking.payment_status === "paid") {
        return new Response(JSON.stringify({ success: true, already_paid: true }), { status: 200, headers: corsHeaders });
      }

      if (stage === "advance") {
        const { error: updateErr } = await admin
          .from("customer_bookings")
          .update({
            payment_status: "partial",
            advance_paid_amount: booking.advance_amount ?? 0,
            advance_razorpay_payment_id: razorpay_payment_id,
          })
          .eq("id", worker_task_id);
        if (updateErr) {
          return new Response(JSON.stringify({ error: updateErr.message }), { status: 500, headers: corsHeaders });
        }
      } else {
        const { error: updateErr } = await admin
          .from("customer_bookings")
          .update({ payment_status: "paid", razorpay_payment_id, paid_at: new Date().toISOString() })
          .eq("id", worker_task_id);
        if (updateErr) {
          return new Response(JSON.stringify({ error: updateErr.message }), { status: 500, headers: corsHeaders });
        }
      }

      return new Response(JSON.stringify({ success: true, stage }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data: task, error: fetchErr } = await admin
      .from(table)
      .select("id, razorpay_order_id, payment_status")
      .eq("id", worker_task_id)
      .maybeSingle();
    if (fetchErr || !task) {
      return new Response(JSON.stringify({ error: "Task not found" }), { status: 404, headers: corsHeaders });
    }
    if (task.razorpay_order_id !== razorpay_order_id) {
      return new Response(JSON.stringify({ error: "Order mismatch" }), { status: 400, headers: corsHeaders });
    }
    if (task.payment_status === "paid") {
      return new Response(JSON.stringify({ success: true, already_paid: true }), { status: 200, headers: corsHeaders });
    }

    const { error: updateErr } = await admin
      .from(table)
      .update({ payment_status: "paid", razorpay_payment_id, paid_at: new Date().toISOString() })
      .eq("id", worker_task_id);
    if (updateErr) {
      return new Response(JSON.stringify({ error: updateErr.message }), { status: 500, headers: corsHeaders });
    }

    return new Response(JSON.stringify({ success: true }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), { status: 500, headers: corsHeaders });
  }
});
