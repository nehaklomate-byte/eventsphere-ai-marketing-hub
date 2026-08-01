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
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    const { worker_task_id } = await req.json();
    if (!worker_task_id) {
      return new Response(JSON.stringify({ error: "worker_task_id is required" }), { status: 400, headers: corsHeaders });
    }

    const { data: task, error: taskErr } = await supabase
      .from("worker_tasks")
      .select("id, payment_amount, payment_status, status, task_name")
      .eq("id", worker_task_id)
      .maybeSingle();

    if (taskErr || !task) {
      return new Response(JSON.stringify({ error: "Task not found or you don't have access to it" }), { status: 404, headers: corsHeaders });
    }
    if (task.status !== "accepted") {
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
      .from("worker_tasks")
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
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), { status: 500, headers: corsHeaders });
  }
});
