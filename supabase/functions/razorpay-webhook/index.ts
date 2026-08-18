// ============================================================
// Path: supabase/functions/razorpay-webhook/index.ts
//
// Razorpay Dashboard → Settings → Webhooks मध्ये या function ची
// full URL टाकून "payment.captured" event साठी लाव. तिथून मिळणारा
// वेगळा Webhook Secret RAZORPAY_WEBHOOK_SECRET म्हणून set कर
// (हा RAZORPAY_KEY_SECRET पेक्षा वेगळा आहे).
// ============================================================
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RAZORPAY_WEBHOOK_SECRET = Deno.env.get("RAZORPAY_WEBHOOK_SECRET")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

async function hmacHex(key: string, message: string): Promise<string> {
  const enc = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey("raw", enc.encode(key), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", cryptoKey, enc.encode(message));
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

serve(async (req) => {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get("x-razorpay-signature") ?? "";

    const expected = await hmacHex(RAZORPAY_WEBHOOK_SECRET, rawBody);
    if (expected !== signature) {
      return new Response(JSON.stringify({ error: "Invalid webhook signature" }), { status: 400 });
    }

    const payload = JSON.parse(rawBody);
    if (payload.event !== "payment.captured") {
      return new Response(JSON.stringify({ ignored: true }), { status: 200 });
    }

    const payment = payload.payload?.payment?.entity;
    const orderId = payment?.order_id;
    const paymentId = payment?.id;
    if (!orderId || !paymentId) {
      return new Response(JSON.stringify({ error: "Malformed payload" }), { status: 400 });
    }

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data: task } = await admin
      .from("worker_tasks")
      .select("id, payment_status")
      .eq("razorpay_order_id", orderId)
      .maybeSingle();

    if (task && task.payment_status !== "paid") {
      await admin
        .from("worker_tasks")
        .update({ payment_status: "paid", razorpay_payment_id: paymentId, paid_at: new Date().toISOString() })
        .eq("id", task.id);
    }

    return new Response(JSON.stringify({ received: true }), { status: 200 });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), { status: 500 });
  }
});
