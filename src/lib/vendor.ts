import { supabase } from "@/integrations/supabase/client";

/**
 * Vendor dashboard — data access layer. Mirrors src/lib/worker.ts in
 * structure and conventions (same upload helper pattern, same
 * .select().maybeSingle() hardening against silent RLS no-ops).
 * Table: public.vendors (owner_id = auth.uid()).
 */

export const VENDOR_CATEGORIES = [
  "Decorator", "Caterer", "Photographer", "Videographer", "Sound & Lighting",
  "DJ", "Anchor / MC", "Florist", "Bartender", "Rentals", "Transport", "Others",
] as const;

export type VendorRow = {
  id: string;
  owner_id: string;
  business_name: string;
  owner_full_name: string | null;
  category: string | null;
  years_experience: number | null;
  gst_number: string | null;
  pan_number: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  pincode: string | null;
  portfolio: string[];
  price_catalogue_url: string | null;
  logo_url: string | null;
  instagram: string | null;
  facebook: string | null;
  website: string | null;
  service_areas: string[];
  available_days: string[];
  status: "draft" | "published";
  verified: boolean;
  rating: number;
  review_count: number;
  verification_status: "pending" | "approved" | "rejected" | "suspended" | "blacklisted";
  rejection_reason: string | null;
  documents: string[];
  created_at: string;
  updated_at: string;
};

export async function fetchMyVendor(userId: string): Promise<VendorRow | null> {
  const { data, error } = await supabase.from("vendors").select("*").eq("owner_id", userId).maybeSingle();
  if (error) throw error;
  return data as unknown as VendorRow | null;
}

/** Same upload pattern already used in worker/profile.tsx — kept local
 * here (rather than a shared cross-module helper) so each module stays
 * self-contained, matching how worker.ts and venue.ts are structured. */
export async function uploadVendorFile(userId: string, key: string, file: File): Promise<string | null> {
  try {
    const path = `${userId}/${Date.now()}_${file.name}`;
    const { error } = await supabase.storage.from("vendor-media").upload(path, file, { upsert: true });
    if (error) throw error;
    const { data } = await supabase.storage.from("vendor-media").createSignedUrl(path, 60 * 60 * 24 * 365);
    return data?.signedUrl ?? null;
  } catch {
    return null;
  }
}

/** Simple completion percentage — same idea as computeCompletion() in
 * lib/worker.ts, adapted to the vendor field set. */
export function computeVendorCompletion(form: Partial<VendorRow>): number {
  const fields: (keyof VendorRow)[] = [
    "business_name", "owner_full_name", "category", "years_experience",
    "phone", "email", "city", "state", "pincode", "address",
    "logo_url", "service_areas",
  ];
  const filled = fields.filter((f) => {
    const v = form[f];
    if (Array.isArray(v)) return v.length > 0;
    return v !== null && v !== undefined && v !== "";
  }).length;
  return Math.round((filled / fields.length) * 100);
}
