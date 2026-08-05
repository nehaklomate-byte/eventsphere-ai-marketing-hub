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

export const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function vendorStatusTone(status: VendorTask["status"]) {
  const m: Record<VendorTask["status"], string> = {
    pending: "bg-amber-500/10 text-amber-700 border-amber-500/20",
    accepted: "bg-blue-500/10 text-blue-700 border-blue-500/20",
    in_progress: "bg-indigo-500/10 text-indigo-700 border-indigo-500/20",
    paused: "bg-slate-500/10 text-slate-700 border-slate-500/20",
    completed: "bg-emerald-500/10 text-emerald-700 border-emerald-500/20",
    rejected: "bg-rose-500/10 text-rose-700 border-rose-500/20",
    cancelled: "bg-zinc-500/10 text-zinc-700 border-zinc-500/20",
  };
  return m[status];
}

export function vendorPriorityTone(p: VendorTask["priority"]) {
  const m: Record<VendorTask["priority"], string> = {
    low: "bg-slate-500/10 text-slate-700",
    normal: "bg-blue-500/10 text-blue-700",
    high: "bg-orange-500/10 text-orange-700",
    urgent: "bg-red-500/10 text-red-700",
  };
  return m[p];
}

/** Every vendor task for the signed-in vendor — shared by dashboard, calendar and earnings. */
export async function fetchMyVendorTasks(userId: string): Promise<VendorTask[]> {
  const { data, error } = await supabase
    .from("vendor_tasks")
    .select("*")
    .eq("vendor_user_id", userId)
    .order("event_date", { ascending: true });
  if (error) throw error;
  return (data ?? []) as unknown as VendorTask[];
}

// ---- Vendor job marketplace (browse open postings, apply, track applications) ----

export type VendorPosting = {
  id: string;
  org_id: string | null;
  hall_id: string | null;
  title: string;
  category: string;
  description: string | null;
  venue: string | null;
  venue_address: string | null;
  event_date: string;
  start_time: string | null;
  end_time: string | null;
  slots_needed: number;
  slots_filled: number;
  pay_amount: number | null;
  pay_type: "hourly" | "daily" | "per_event";
  status: "open" | "closed" | "cancelled";
  created_at: string;
  poster_name?: string;
};

export type VendorApplication = {
  id: string;
  posting_id: string;
  vendor_id: string;
  vendor_user_id: string;
  cover_note: string | null;
  status: "applied" | "shortlisted" | "accepted" | "rejected" | "withdrawn";
  applied_at: string;
  responded_at: string | null;
  posting?: VendorPosting;
};

export async function fetchOpenVendorPostings(category?: string): Promise<VendorPosting[]> {
  let query = supabase.from("vendor_job_postings").select("*").eq("status", "open").order("created_at", { ascending: false });
  if (category) query = query.eq("category", category);
  const { data, error } = await query;
  if (error) throw error;
  const postings = (data ?? []) as unknown as VendorPosting[];
  const orgIds = Array.from(new Set(postings.map((p) => p.org_id).filter(Boolean))) as string[];
  if (orgIds.length === 0) return postings;
  const { data: orgs } = await supabase.from("organizations").select("id, name").in("id", orgIds);
  const nameById = new Map((orgs ?? []).map((o) => [o.id, o.name]));
  return postings.map((p) => ({ ...p, poster_name: p.org_id ? nameById.get(p.org_id) : undefined }));
}

export async function fetchMyVendorApplications(userId: string): Promise<VendorApplication[]> {
  const { data, error } = await supabase
    .from("vendor_job_applications")
    .select("*")
    .eq("vendor_user_id", userId)
    .order("applied_at", { ascending: false });
  if (error) throw error;
  const list = (data ?? []) as unknown as VendorApplication[];
  if (list.length === 0) return list;
  const { data: postings } = await supabase.from("vendor_job_postings").select("*").in("id", list.map((a) => a.posting_id));
  const byId = new Map(((postings ?? []) as unknown as VendorPosting[]).map((p) => [p.id, p]));
  return list.map((a) => ({ ...a, posting: byId.get(a.posting_id) }));
}

export async function applyToVendorPosting(postingId: string, vendorId: string, vendorUserId: string, coverNote: string): Promise<void> {
  const { error } = await supabase.from("vendor_job_applications").insert({
    posting_id: postingId, vendor_id: vendorId, vendor_user_id: vendorUserId, cover_note: coverNote || null,
  });
  if (error) throw error;
}

export async function withdrawVendorApplication(id: string): Promise<void> {
  const { data, error } = await supabase.from("vendor_job_applications").update({ status: "withdrawn" }).eq("id", id).select().maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("Update was blocked — please refresh and try again.");
}

// =============================================================
// Vendor packages (Basic / Premium / Luxury tiers) — see migration
// 20260805100000_packages_and_quantity.sql. New table, not yet in
// generated Supabase types, so `as never` casts throughout (same
// pattern as worker_job_postings above).
// =============================================================

export type VendorPackage = {
  id: string;
  vendor_id: string;
  name: string;
  price: number;
  description: string | null;
  sort_order: number;
};

export async function fetchVendorPackages(vendorId: string): Promise<VendorPackage[]> {
  const { data, error } = await supabase
    .from("vendor_packages" as never)
    .select("*")
    .eq("vendor_id" as never, vendorId as never)
    .order("sort_order" as never, { ascending: true });
  if (error) throw error;
  return (data as unknown as VendorPackage[]) ?? [];
}

export async function saveVendorPackage(pkg: Partial<VendorPackage> & { vendor_id: string }): Promise<void> {
  if (pkg.id) {
    const { error } = await supabase.from("vendor_packages" as never).update({ name: pkg.name, price: pkg.price, description: pkg.description ?? null, sort_order: pkg.sort_order ?? 0 } as never).eq("id" as never, pkg.id as never);
    if (error) throw error;
  } else {
    const { error } = await supabase.from("vendor_packages" as never).insert({ vendor_id: pkg.vendor_id, name: pkg.name, price: pkg.price, description: pkg.description ?? null, sort_order: pkg.sort_order ?? 0 } as never);
    if (error) throw error;
  }
}

export async function deleteVendorPackage(id: string): Promise<void> {
  const { error } = await supabase.from("vendor_packages" as never).delete().eq("id" as never, id as never);
  if (error) throw error;
}
