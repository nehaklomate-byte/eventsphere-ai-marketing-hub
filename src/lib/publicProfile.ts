// Path: src/lib/publicProfile.ts
import { supabase } from "@/integrations/supabase/client";

export type ProfileRole = "venue" | "vendor" | "worker";
export type ProfileVariant = "individual" | "agency" | null;
export type FeatureType = "profile_activation" | "subscription_monthly" | "subscription_annual";

type PricingSettings = {
  profile_anchor_fee_venue: number;
  profile_anchor_fee_vendor: number;
  profile_anchor_fee_agency_worker: number;
  subscription_monthly_price: number;
  subscription_annual_price: number;
  trial_period_days: number;
};

const FALLBACK_PRICING: PricingSettings = {
  profile_anchor_fee_venue: 400,
  profile_anchor_fee_vendor: 350,
  profile_anchor_fee_agency_worker: 300,
  subscription_monthly_price: 499,
  subscription_annual_price: 4999,
  trial_period_days: 180,
};

let cachedPricing: PricingSettings | null = null;

/** Reads current pricing from platform_settings (admin-configurable) —
 * for DISPLAY only. The actual charge is always computed again,
 * server-side, in the create-profile-payment-order Edge Function. */
export async function fetchPricing(): Promise<PricingSettings> {
  if (cachedPricing) return cachedPricing;
  const { data } = await supabase
    .from("platform_settings" as never)
    .select("profile_anchor_fee_venue, profile_anchor_fee_vendor, profile_anchor_fee_agency_worker, subscription_monthly_price, subscription_annual_price, trial_period_days")
    .limit(1).maybeSingle();
  cachedPricing = (data as unknown as PricingSettings) ?? FALLBACK_PRICING;
  return cachedPricing;
}

/** Individual freelance workers are fully exempt (₹0). Everyone else
 * pays the one-time anchor fee shown here, purely for display — the
 * server is the source of truth and re-checks all of this itself. */
export function priceForActivation(role: ProfileRole, variant: ProfileVariant, pricing: PricingSettings = FALLBACK_PRICING): number {
  if (role === "venue") return pricing.profile_anchor_fee_venue;
  if (role === "vendor") return pricing.profile_anchor_fee_vendor;
  if (role === "worker") return variant === "agency" ? pricing.profile_anchor_fee_agency_worker : 0;
  return 0;
}

declare global {
  interface Window { Razorpay?: new (options: Record<string, unknown>) => { open: () => void }; }
}
let scriptPromise: Promise<void> | null = null;
function loadRazorpayScript(): Promise<void> {
  if (window.Razorpay) return Promise.resolve();
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Could not load Razorpay checkout — check your internet connection."));
    document.body.appendChild(script);
  });
  return scriptPromise;
}

async function payAndVerify(opts: {
  role: ProfileRole; entityId: string; variant?: ProfileVariant; name: string; featureType: FeatureType;
  payerEmail?: string; payerPhone?: string;
}): Promise<{ slug: string; subscription_expires_at?: string }> {
  const { data: fnResp, error: fnErr } = await supabase.functions.invoke("create-profile-payment-order", {
    body: { role: opts.role, entity_id: opts.entityId, entity_variant: opts.variant ?? null, feature_type: opts.featureType },
  });
  if (fnErr) throw new Error(fnErr.message || "Could not start the payment.");
  if (fnResp?.error) throw new Error(fnResp.error);

  // Individual freelance worker — server activated it for free, no checkout needed.
  if (fnResp?.free) return { slug: fnResp.slug as string };

  const { order_id, amount, currency, key_id, payment_id } = fnResp as {
    order_id: string; amount: number; currency: string; key_id: string; payment_id: string;
  };

  await loadRazorpayScript();

  return new Promise((resolve, reject) => {
    const rzp = new window.Razorpay!({
      key: key_id,
      amount,
      currency,
      order_id,
      name: "EventOrbit Nova",
      description: opts.featureType === "profile_activation" ? "Shareable Public Booking Profile — one-time activation" : "Top-tier visibility subscription",
      prefill: { email: opts.payerEmail, contact: opts.payerPhone },
      theme: { color: "#7c3aed" },
      handler: async (response: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) => {
        const { data: verifyResp, error: verifyErr } = await supabase.functions.invoke("verify-profile-payment", {
          body: {
            payment_id, role: opts.role, entity_id: opts.entityId, name: opts.name,
            razorpay_order_id: response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature: response.razorpay_signature,
          },
        });
        if (verifyErr || verifyResp?.error) {
          reject(new Error(verifyResp?.error || verifyErr?.message || "Payment could not be verified."));
          return;
        }
        resolve({ slug: verifyResp.slug as string, subscription_expires_at: verifyResp.subscription_expires_at });
      },
      modal: { ondismiss: () => reject(new Error("Payment cancelled.")) },
    });
    rzp.open();
  });
}

/** Activates the paid public profile (or, for individual workers,
 * activates it for free with no payment step). */
export async function activatePublicProfile(opts: {
  role: ProfileRole; entityId: string; variant?: ProfileVariant; name: string; payerEmail?: string; payerPhone?: string;
}): Promise<string> {
  const result = await payAndVerify({ ...opts, featureType: "profile_activation" });
  return result.slug;
}

/** Buys/renews the top-tier visibility subscription for a venue or
 * vendor whose free 180-day trial has ended (or is ending soon). */
export async function purchaseSubscription(opts: {
  role: "venue" | "vendor"; entityId: string; name: string; plan: "monthly" | "annual"; payerEmail?: string; payerPhone?: string;
}): Promise<{ subscription_expires_at?: string }> {
  const featureType: FeatureType = opts.plan === "monthly" ? "subscription_monthly" : "subscription_annual";
  return payAndVerify({ ...opts, featureType });
}

function tableFor(role: ProfileRole) {
  return role === "venue" ? "halls" : role === "vendor" ? "vendors" : "workers";
}

export async function fetchPublicProfileBySlug(slug: string) {
  const prefix = slug.split("-")[0];
  const role: ProfileRole = prefix === "venue" ? "venue" : prefix === "vendor" ? "vendor" : "worker";
  const table = tableFor(role);
  const { data, error } = await supabase.from(table as never).select("*").eq("slug" as never, slug as never).eq("public_profile_active" as never, true as never).maybeSingle();
  if (error) throw error;
  return data ? { role, entity: data as Record<string, unknown> } : null;
}
