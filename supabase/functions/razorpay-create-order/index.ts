// ============================================================
// Path: supabase/functions/razorpay-create-order/index.ts
// (create this as a NEW Edge Function)
//
// Deploy secrets (NEVER commit these anywhere, NEVER put in frontend):
//   supabase secrets set RAZORPAY_KEY_ID=rzp_test_xxxxx
//   supabase secrets set RAZORPAY_KEY_SECRET=xxxxxxxxxxxx
// ============================================================
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RAZORPAY_KEY_ID = Deno.env.get("RAZORPAY_KEY_ID")!;
const RAZORPAY_KEY_SECRET = Deno.env.get("RAZORPAY_KEY_SECRET")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    // Client-scoped supabase client — RLS makes sure the caller can only
    // touch rows they themselves own (worker/vendor task, or their own
    // customer_bookings row).
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    const { worker_task_id, entity_type, payment_stage } = await req.json();
    if (!worker_task_id) {
      return new Response(JSON.stringify({ error: "worker_task_id is required" }), { status: 400, headers: corsHeaders });
    }

    // "worker" (default, backward compatible), "vendor", or "hall" — same
    // flow, different table. "hall" was previously never handled here at
    // all, so a venue-booking payment silently fell through to the
    // worker_tasks branch, found no matching row, and errored out — the
    // platform never actually collected a booking payment or commission
    // through Razorpay for hall bookings.
    const table = entity_type === "vendor" ? "vendor_tasks" : entity_type === "hall" ? "customer_bookings" : "worker_tasks";

    if (entity_type === "hall") {
      // Two-stage payment (migration 20260819150000): the venue owner
      // sets the advance amount at confirm time and the final whole
      // price later — this endpoint now needs to know WHICH of the two
      // it's collecting right now. Defaults to "advance" for anyone
      // calling without the new param, so nothing existing breaks.
      const stage = payment_stage === "balance" ? "balance" : "advance";

      const { data: booking, error: bookingErr } = await supabase
        .from("customer_bookings")
        .select("id, amount, advance_amount, advance_paid_amount, payment_status, status, target_name, kind")
        .eq("id", worker_task_id)
        .maybeSingle();

      if (bookingErr || !booking || booking.kind !== "hall") {
        return new Response(JSON.stringify({ error: "Booking not found or you don't have access to it" }), { status: 404, headers: corsHeaders });
      }
      if (!["confirmed", "in_progress", "completed"].includes(booking.status)) {
        return new Response(JSON.stringify({ error: "This booking hasn't been confirmed by the venue yet — you can only pay after confirmation." }), { status: 400, headers: corsHeaders });
      }
      if (booking.payment_status === "paid") {
        return new Response(JSON.stringify({ error: "This booking is already paid." }), { status: 400, headers: corsHeaders });
      }

      let payableAmount: number;
      if (stage === "advance") {
        if (booking.payment_status !== "pending") {
          return new Response(JSON.stringify({ error: "The advance has already been paid for this booking." }), { status: 400, headers: corsHeaders });
        }
        if (!booking.advance_amount || booking.advance_amount <= 0) {
          return new Response(JSON.stringify({ error: "The venue hasn't set an advance amount for this booking yet." }), { status: 400, headers: corsHeaders });
        }
        payableAmount = booking.advance_amount;
      } else {
        if (booking.payment_status !== "partial") {
          return new Response(JSON.stringify({ error: "Pay the advance first before paying the remaining balance." }), { status: 400, headers: corsHeaders });
        }
        if (booking.amount == null) {
          return new Response(JSON.stringify({ error: "The venue hasn't set the final price for this booking yet." }), { status: 400, headers: corsHeaders });
        }
        payableAmount = Math.round((booking.amount - (booking.advance_paid_amount ?? 0)) * 100) / 100;
        if (payableAmount <= 0) {
          return new Response(JSON.stringify({ error: "There's nothing left to pay on this booking." }), { status: 400, headers: corsHeaders });
        }
      }

      const amountPaise = Math.round(payableAmount * 100);

      const orderRes = await fetch("https://api.razorpay.com/v1/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Basic " + btoa(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`),
        },
        body: JSON.stringify({
          amount: amountPaise,
          currency: "INR",
          receipt: worker_task_id,
          notes: { customer_booking_id: worker_task_id, target_name: booking.target_name, payment_stage: stage },
        }),
      });

      if (!orderRes.ok) {
        const err = await orderRes.text();
        return new Response(JSON.stringify({ error: `Razorpay error: ${err}` }), { status: 502, headers: corsHeaders });
      }
      const order = await orderRes.json();

      const { error: updateErr } = await supabase
        .from("customer_bookings")
        .update({ razorpay_order_id: order.id })
        .eq("id", worker_task_id);
      if (updateErr) {
        return new Response(JSON.stringify({ error: updateErr.message }), { status: 500, headers: corsHeaders });
      }

      return new Response(JSON.stringify({
        order_id: order.id,
        amount: amountPaise,
        currency: "INR",
        key_id: RAZORPAY_KEY_ID,
      }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data: task, error: taskErr } = await supabase
      .from(table)
      .select("id, payment_amount, payment_status, status, task_name")
      .eq("id", worker_task_id)
      .maybeSingle();

    if (taskErr || !task) {
      return new Response(JSON.stringify({ error: "Task not found or you don't have access to it" }), { status: 404, headers: corsHeaders });
    }
    if (task.status !== "accepted" && task.status !== "completed") {
      return new Response(JSON.stringify({ error: "Worker hasn't accepted this task yet — you can only pay after acceptance." }), { status: 400, headers: corsHeaders });
    }
    if (task.payment_status === "paid") {
      return new Response(JSON.stringify({ error: "This task is already paid." }), { status: 400, headers: corsHeaders });
    }
    if (!task.payment_amount || task.payment_amount <= 0) {
      return new Response(JSON.stringify({ error: "No pay amount was set for this task." }), { status: 400, headers: corsHeaders });
    }

    const amountPaise = Math.round(task.payment_amount * 100);

    const orderRes = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Basic " + btoa(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`),
      },
      body: JSON.stringify({
        amount: amountPaise,
        currency: "INR",
        receipt: worker_task_id,
        notes: { worker_task_id, task_name: task.task_name },
      }),
    });

    if (!orderRes.ok) {
      const err = await orderRes.text();
      return new Response(JSON.stringify({ error: `Razorpay error: ${err}` }), { status: 502, headers: corsHeaders });
    }
    const order = await orderRes.json();

    const { error: updateErr } = await supabase
      .from(table)
      .update({ razorpay_order_id: order.id })
      .eq("id", worker_task_id);
    if (updateErr) {
      return new Response(JSON.stringify({ error: updateErr.message }), { status: 500, headers: corsHeaders });
    }

    return new Response(JSON.stringify({
      order_id: order.id,
      amount: amountPaise,
      currency: "INR",
      key_id: RAZORPAY_KEY_ID, // public, safe to send to the client
    }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), { status: 500, headers: corsHeaders });
  }
});
