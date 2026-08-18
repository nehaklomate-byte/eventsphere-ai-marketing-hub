// Path: supabase/functions/verify-profile-payment/index.ts
// (REPLACE the existing function's code with this)
//
// Verifies the Razorpay signature server-side, and ONLY on success:
//  - feature_type = 'profile_activation': marks the payment 'paid',
//    generates a slug if needed, flips public_profile_active = true,
//    and — for venue/vendor only — starts the 180-day free top-tier
//    visibility trial (trial_ends_at = now() + trial_period_days).
//  - feature_type = 'subscription_monthly' | 'subscription_annual':
//    marks the payment 'paid' and extends subscription_expires_at
//    (stacks on top of any remaining time, so renewing early doesn't
//    lose days), sets subscription_active = true.
// The client can never set any of these flags directly.
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

function slugify(base: string): string {
  return (base || "profile").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 40);
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { payment_id, role, entity_id, name, razorpay_order_id, razorpay_payment_id, razorpay_signature } = await req.json();
    if (!payment_id || !role || !entity_id || !razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return new Response(JSON.stringify({ error: "Missing fields" }), { status: 400, headers: corsHeaders });
    }

    const expected = await hmacHex(RAZORPAY_KEY_SECRET, `${razorpay_order_id}|${razorpay_payment_id}`);
    if (expected !== razorpay_signature) {
      return new Response(JSON.stringify({ error: "Signature verification failed — payment not trusted." }), { status: 400, headers: corsHeaders });
    }

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { data: paymentRow, error: fetchErr } = await admin
      .from("public_profile_payments")
      .select("id, role, entity_id, razorpay_order_id, status, feature_type")
      .eq("id", payment_id)
      .maybeSingle();
    if (fetchErr || !paymentRow) {
      return new Response(JSON.stringify({ error: "Payment record not found" }), { status: 404, headers: corsHeaders });
    }
    if (paymentRow.razorpay_order_id !== razorpay_order_id || paymentRow.role !== role || paymentRow.entity_id !== entity_id) {
      return new Response(JSON.stringify({ error: "Order mismatch" }), { status: 400, headers: corsHeaders });
    }

    const table = role === "venue" ? "halls" : role === "vendor" ? "vendors" : "workers";
    const featureType = paymentRow.feature_type || "profile_activation";

    if (paymentRow.status === "paid") {
      const { data: entity } = await admin.from(table).select("slug").eq("id", entity_id).maybeSingle();
      return new Response(JSON.stringify({ success: true, already_paid: true, slug: entity?.slug }), { status: 200, headers: corsHeaders });
    }

    if (featureType === "profile_activation") {
      const { data: entity, error: entityErr } = await admin.from(table).select("id, slug").eq("id", entity_id).maybeSingle();
      if (entityErr || !entity) {
        return new Response(JSON.stringify({ error: "Profile not found" }), { status: 404, headers: corsHeaders });
      }

      let slug = entity.slug as string | null;
      if (!slug) {
        const prefix = role === "venue" ? "venue" : role === "vendor" ? "vendor" : "worker";
        slug = `${prefix}-${slugify(name || "profile")}-${Math.random().toString(36).slice(2, 7)}`;
      }

      const { data: settings } = await admin.from("platform_settings").select("trial_period_days").limit(1).maybeSingle();
      const trialDays = settings?.trial_period_days ?? 180;

      const update: Record<string, unknown> = { public_profile_active: true, public_profile_activated_at: new Date().toISOString(), slug };
      if (role === "venue" || role === "vendor") {
        update.trial_ends_at = new Date(Date.now() + trialDays * 24 * 60 * 60 * 1000).toISOString();
      }

      const { error: updateEntityErr } = await admin.from(table).update(update).eq("id", entity_id);
      if (updateEntityErr) {
        return new Response(JSON.stringify({ error: updateEntityErr.message }), { status: 500, headers: corsHeaders });
      }

      await admin.from("public_profile_payments").update({ status: "paid", razorpay_payment_id }).eq("id", payment_id);
      return new Response(JSON.stringify({ success: true, slug }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ---- Subscription renewal (venue/vendor) ----
    const { data: entity, error: entityErr } = await admin.from(table).select("id, slug, subscription_expires_at").eq("id", entity_id).maybeSingle();
    if (entityErr || !entity) {
      return new Response(JSON.stringify({ error: "Profile not found" }), { status: 404, headers: corsHeaders });
    }
    const extendMs = featureType === "subscription_monthly" ? 30 * 24 * 60 * 60 * 1000 : 365 * 24 * 60 * 60 * 1000;
    const currentExpiry = entity.subscription_expires_at ? new Date(entity.subscription_expires_at).getTime() : Date.now();
    const base = Math.max(currentExpiry, Date.now());
    const newExpiry = new Date(base + extendMs).toISOString();

    const { error: updateEntityErr } = await admin.from(table).update({ subscription_active: true, subscription_expires_at: newExpiry }).eq("id", entity_id);
    if (updateEntityErr) {
      return new Response(JSON.stringify({ error: updateEntityErr.message }), { status: 500, headers: corsHeaders });
    }
    await admin.from("public_profile_payments").update({ status: "paid", razorpay_payment_id }).eq("id", payment_id);
    return new Response(JSON.stringify({ success: true, slug: entity.slug, subscription_expires_at: newExpiry }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), { status: 500, headers: corsHeaders });
  }
});
