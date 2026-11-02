// Path: src/lib/publicProfile.ts
import { supabase } from "@/integrations/supabase/client";

export type ProfileRole = "venue" | "vendor" | "worker";
export type ProfileVariant = "individual" | "agency" | null;
export type FeatureType = "profile_activation" | "subscription_first" | "subscription_monthly" | "subscription_6month" | "subscription_annual";
export type SubscriptionPlan = "monthly" | "6month" | "annual";

type PricingSettings = {
  profile_anchor_fee_venue: number;
  profile_anchor_fee_vendor: number;
  profile_anchor_fee_agency_worker: number;
  profile_anchor_fee_individual_worker: number;
  subscription_venue_monthly: number;
  subscription_venue_6month: number;
  subscription_venue_annual: number;
  subscription_vendor_monthly: number;
  subscription_vendor_6month: number;
  subscription_vendor_annual: number;
  subscription_worker_monthly: number;
  subscription_worker_6month: number;
  subscription_worker_annual: number;
};

const FALLBACK_PRICING: PricingSettings = {
  profile_anchor_fee_venue: 499,
  profile_anchor_fee_vendor: 399,
  profile_anchor_fee_agency_worker: 299,
  profile_anchor_fee_individual_worker: 99,
  subscription_venue_monthly: 400,
  subscription_venue_6month: 2200,
  subscription_venue_annual: 4500,
  subscription_vendor_monthly: 299,
  subscription_vendor_6month: 1600,
  subscription_vendor_annual: 3000,
  subscription_worker_monthly: 199,
  subscription_worker_6month: 1000,
  subscription_worker_annual: 2000,
};

let cachedPricing: PricingSettings | null = null;

/** Reads current pricing from platform_settings (admin-configurable) —
 * for DISPLAY only. The actual charge is always computed again,
 * server-side, in the create-profile-payment-order Edge Function. */
export async function fetchPricing(): Promise<PricingSettings> {
  if (cachedPricing) return cachedPricing;
  const { data } = await supabase
    .from("platform_settings" as never)
    .select(Object.keys(FALLBACK_PRICING).join(", "))
    .limit(1).maybeSingle();
  const row = (data as unknown as Partial<Record<keyof PricingSettings, number | string | null>>) ?? {};
  const merged = { ...FALLBACK_PRICING };
  (Object.keys(FALLBACK_PRICING) as (keyof PricingSettings)[]).forEach((k) => {
    if (row[k] !== null && row[k] !== undefined) merged[k] = Number(row[k]);
  });
  cachedPricing = merged;
  return cachedPricing;
}

/** One-time public profile link fee (venue / vendor / agency worker /
 * individual worker), purely for display — the server is the source of
 * truth and re-checks all of this itself. */
export function priceForActivation(role: ProfileRole, variant: ProfileVariant, pricing: PricingSettings = FALLBACK_PRICING): number {
  if (role === "venue") return pricing.profile_anchor_fee_venue;
  if (role === "vendor") return pricing.profile_anchor_fee_vendor;
  if (role === "worker") return variant === "agency" ? pricing.profile_anchor_fee_agency_worker : pricing.profile_anchor_fee_individual_worker;
  return 0;
}

/** Marketplace visibility subscription price for a role and plan (display only). */
export function priceForSubscription(role: ProfileRole, plan: SubscriptionPlan, pricing: PricingSettings = FALLBACK_PRICING): number {
  return pricing[`subscription_${role}_${plan}` as keyof PricingSettings];
}

/** True while the marketplace visibility subscription is running. */
export function isSubscriptionLive(item: { subscription_active?: boolean | null; subscription_expires_at?: string | null }): boolean {
  return !!item.subscription_active && !!item.subscription_expires_at && new Date(item.subscription_expires_at).getTime() > Date.now();
}

/** Has this profile ever paid for a subscription? If not, the next
 * purchase is the starter plan (monthly price, 2 months). */
export async function hasPaidSubscription(role: ProfileRole, entityId: string): Promise<boolean> {
  const { count } = await supabase
    .from("public_profile_payments" as never)
    .select("id", { count: "exact", head: true })
    .eq("role" as never, role as never)
    .eq("entity_id" as never, entityId as never)
    .eq("status" as never, "paid" as never)
    .in("feature_type" as never, ["subscription_first", "subscription_monthly", "subscription_6month", "subscription_annual"] as never);
  return (count ?? 0) > 0;
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
}): Promise<{ slug: string; subscription_expires_at?: string; payment_id: string | null }> {
  const { data: fnResp, error: fnErr } = await supabase.functions.invoke("create-profile-payment-order", {
    body: { role: opts.role, entity_id: opts.entityId, entity_variant: opts.variant ?? null, feature_type: opts.featureType },
  });
  if (fnErr) throw new Error(fnErr.message || "Could not start the payment.");
  if (fnResp?.error) throw new Error(fnResp.error);

  // Activation fee set to ₹0 by admin — server activated it for free, no checkout, no payment record.
  if (fnResp?.free) return { slug: fnResp.slug as string, payment_id: null };

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
      description: opts.featureType === "profile_activation" ? "Shareable Public Booking Profile — one-time activation" : "Marketplace visibility subscription",
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
        resolve({ slug: verifyResp.slug as string, subscription_expires_at: verifyResp.subscription_expires_at, payment_id });
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
}): Promise<{ slug: string; paymentId: string | null }> {
  const result = await payAndVerify({ ...opts, featureType: "profile_activation" });
  return { slug: result.slug, paymentId: result.payment_id };
}

/** Buys/renews the marketplace visibility subscription (venue, vendor or
 * worker). The first ever purchase must be "monthly" — the server records
 * it as the starter plan (2 months: 1 free + 1 paid). */
export async function purchaseSubscription(opts: {
  role: ProfileRole; entityId: string; name: string; plan: SubscriptionPlan; payerEmail?: string; payerPhone?: string;
}): Promise<{ subscription_expires_at?: string; paymentId: string | null }> {
  const featureType: FeatureType = opts.plan === "6month" ? "subscription_6month" : opts.plan === "annual" ? "subscription_annual" : "subscription_monthly";
  const result = await payAndVerify({ ...opts, featureType });
  return { subscription_expires_at: result.subscription_expires_at, paymentId: result.payment_id };
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

export const FEATURE_LABEL: Record<FeatureType, string> = {
  profile_activation: "Public profile activation",
  subscription_first: "Subscription — starter (2 months)",
  subscription_monthly: "Subscription — monthly",
  subscription_6month: "Subscription — 6 months",
  subscription_annual: "Subscription — annual",
};

/** Every successful link-activation / subscription payment for this
 * entity, most recent first — each with a receipt the owner can
 * download. Without this, the "View receipt" link only ever appeared
 * for a few seconds right after paying and then vanished for good. */
export async function fetchProfilePaymentHistory(role: ProfileRole, entityId: string): Promise<{ id: string; label: string; amount: number; created_at: string }[]> {
  const { data, error } = await supabase
    .from("public_profile_payments" as never)
    .select("id, feature_type, amount, created_at")
    .eq("role" as never, role as never)
    .eq("entity_id" as never, entityId as never)
    .eq("status" as never, "paid" as never)
    .order("created_at" as never, { ascending: false });
  if (error) throw error;
  return ((data as unknown as { id: string; feature_type: FeatureType; amount: number; created_at: string }[]) ?? [])
    .map((r) => ({ id: r.id, label: FEATURE_LABEL[r.feature_type] ?? "Public profile payment", amount: Number(r.amount), created_at: r.created_at }));
}
