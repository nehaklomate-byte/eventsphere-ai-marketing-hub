// Path: supabase/functions/create-profile-payment-order/index.ts
// (REPLACE the existing function's code with this)
//
// Creates a Razorpay order for either:
//  - feature_type = 'profile_activation' — one-time anchor fee, only
//    allowed once verification_status = 'approved' (2-step verification).
//    Individual freelance workers are fully exempt (₹0) and are
//    activated immediately here with no payment step at all.
//  - feature_type = 'subscription_monthly' | 'subscription_annual' —
//    recurring visibility subscription for venue/vendor, only
//    purchasable once the free 180-day trial has actually started
//    (i.e. the profile has been activated at least once).
// All prices are looked up from platform_settings server-side — the
// client never supplies (or is trusted for) an amount.
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RAZORPAY_KEY_ID = Deno.env.get("RAZORPAY_KEY_ID")!;
const RAZORPAY_KEY_SECRET = Deno.env.get("RAZORPAY_KEY_SECRET")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return new Response(JSON.stringify({ error: "Not authenticated" }), { status: 401, headers: corsHeaders });

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { global: { headers: { Authorization: authHeader } } });
    const { data: userData, error: userErr } = await supabase.auth.getUser();
    if (userErr || !userData.user) {
      return new Response(JSON.stringify({ error: "Not authenticated" }), { status: 401, headers: corsHeaders });
    }

    const { role, entity_id, entity_variant, feature_type } = await req.json();
    if (!role || !entity_id || !["venue", "vendor", "worker"].includes(role)) {
      return new Response(JSON.stringify({ error: "role and entity_id are required" }), { status: 400, headers: corsHeaders });
    }
    const feature = feature_type || "profile_activation";
    if (!["profile_activation", "subscription_monthly", "subscription_annual"].includes(feature)) {
      return new Response(JSON.stringify({ error: "Invalid feature_type" }), { status: 400, headers: corsHeaders });
    }
    if (feature !== "profile_activation" && role === "worker") {
      return new Response(JSON.stringify({ error: "Subscriptions apply to venues and vendors only" }), { status: 400, headers: corsHeaders });
    }

    const table = role === "venue" ? "halls" : role === "vendor" ? "vendors" : "workers";
    const { data: entity, error: entityErr } = await supabase
      .from(table)
      .select("id, owner_id, public_profile_active, verification_status" + (role === "worker" ? ", worker_type" : ""))
      .eq("id", entity_id).maybeSingle();
    if (entityErr || !entity || entity.owner_id !== userData.user.id) {
      return new Response(JSON.stringify({ error: "Profile not found or not yours" }), { status: 404, headers: corsHeaders });
    }

    const { data: settings } = await supabase
      .from("platform_settings")
      .select("profile_anchor_fee_venue, profile_anchor_fee_vendor, profile_anchor_fee_agency_worker, subscription_monthly_price, subscription_annual_price, trial_period_days")
      .limit(1).maybeSingle();

    if (feature === "profile_activation") {
      if (entity.public_profile_active) {
        return new Response(JSON.stringify({ error: "Already activated" }), { status: 400, headers: corsHeaders });
      }
      // 2-step document verification must be approved before the anchor fee can even be offered.
      if (entity.verification_status !== "approved") {
        return new Response(JSON.stringify({ error: "Your profile must complete verification before activating a public link." }), { status: 400, headers: corsHeaders });
      }

      // Individual freelance workers are fully exempt — activate immediately, no payment at all.
      if (role === "worker" && entity.worker_type !== "agency") {
        const prefix = "worker";
        const slug = `${prefix}-${(entity_id as string).slice(0, 8)}-${Math.random().toString(36).slice(2, 6)}`;
        await supabase.from("workers").update({ public_profile_active: true, public_profile_activated_at: new Date().toISOString(), slug }).eq("id", entity_id);
        return new Response(JSON.stringify({ free: true, slug }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      const amount = role === "venue" ? (settings?.profile_anchor_fee_venue ?? 400)
        : role === "vendor" ? (settings?.profile_anchor_fee_vendor ?? 350)
        : (settings?.profile_anchor_fee_agency_worker ?? 300); // agency worker

      return await createOrder(supabase, userData.user.id, role, entity_id, entity_variant ?? null, feature, amount);
    }

    // ---- Subscription purchase (venue/vendor only) ----
    if (!entity.public_profile_active) {
      return new Response(JSON.stringify({ error: "Activate your public profile first." }), { status: 400, headers: corsHeaders });
    }
    const amount = feature === "subscription_monthly" ? (settings?.subscription_monthly_price ?? 499) : (settings?.subscription_annual_price ?? 4999);
    return await createOrder(supabase, userData.user.id, role, entity_id, entity_variant ?? null, feature, amount);
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), { status: 500, headers: corsHeaders });
  }
});

async function createOrder(
  supabase: ReturnType<typeof createClient>, ownerId: string, role: string, entityId: string, variant: string | null, featureType: string, amount: number
) {
  if (amount <= 0) return new Response(JSON.stringify({ error: "Invalid pricing" }), { status: 400, headers: corsHeaders });

  const auth = btoa(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`);
  const orderRes = await fetch("https://api.razorpay.com/v1/orders", {
    method: "POST",
    headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      amount: Math.round(amount * 100),
      currency: "INR",
      receipt: `${featureType}_${role}_${entityId}`.slice(0, 40),
      notes: { role, entity_id: entityId, feature: featureType },
    }),
  });
  const order = await orderRes.json();
  if (!orderRes.ok) {
    return new Response(JSON.stringify({ error: order?.error?.description || "Razorpay order creation failed" }), { status: 500, headers: corsHeaders });
  }

  const { data: paymentRow, error: insertErr } = await supabase
    .from("public_profile_payments")
    .insert({ owner_id: ownerId, role, entity_id: entityId, entity_variant: variant, amount, razorpay_order_id: order.id, status: "created", feature_type: featureType })
    .select("id").single();
  if (insertErr) {
    return new Response(JSON.stringify({ error: insertErr.message }), { status: 500, headers: corsHeaders });
  }

  return new Response(
    JSON.stringify({ order_id: order.id, amount: order.amount, currency: order.currency, key_id: RAZORPAY_KEY_ID, payment_id: paymentRow.id }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}
