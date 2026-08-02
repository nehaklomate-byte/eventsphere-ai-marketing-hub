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
  payout_upi_id: string | null;
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

export type VendorTask = {
  id: string;
  vendor_id: string;
  vendor_user_id: string;
  assigned_by: string;
  organization_name: string | null;
  event_name: string;
  task_name: string;
  description: string | null;
  venue: string | null;
  venue_address: string | null;
  event_date: string;
  start_time: string | null;
  end_time: string | null;
  priority: "low" | "normal" | "high" | "urgent";
  status: "pending" | "accepted" | "in_progress" | "paused" | "completed" | "rejected" | "cancelled";
  payment_amount: number | null;
  payment_status: "unpaid" | "paid" | "refunded";
  rejection_reason: string | null;
  vendor_notes: string | null;
  accepted_at: string | null;
  started_at: string | null;
  paused_at: string | null;
  resumed_at: string | null;
  completed_at: string | null;
  created_at: string;
  check_in_at: string | null;
  check_in_photo_url: string | null;
  check_in_lat: number | null;
  check_in_lng: number | null;
  check_out_at: string | null;
  check_out_photo_url: string | null;
  check_out_lat: number | null;
  check_out_lng: number | null;
  completion_photo_urls: string[];
  completion_notes: string | null;
};

export type VendorNotification = {
  id: string;
  user_id: string;
  category: string;
  title: string;
  body: string | null;
  action_url: string | null;
  task_id: string | null;
  read_at: string | null;
  created_at: string;
};

/** Profile completion % — same approach as lib/worker.ts, adapted to the vendor field set. */
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
