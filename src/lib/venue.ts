import { supabase } from "@/integrations/supabase/client";

/**
 * Venue Owner dashboard — data access layer.
 * Table: public.halls (owner_id = auth.uid() scoped via existing RLS).
 * Bookings/enquiries against a hall are read via the "Target owner reads…"
 * policies added in 20260705055546_...sql (enquiries) and
 * 20260723090000_venue_owner_support.sql (customer_bookings).
 */

export type Hall = {
  id: string;
  owner_id: string;
  slug: string | null;
  name: string;
  owner_full_name: string | null;
  email: string | null;
  phone: string | null;
  alt_phone: string | null;
  category: string | null;
  min_guests: number | null;
  max_guests: number | null;
  indoor_capacity: number | null;
  outdoor_capacity: number | null;
  dining_capacity: number | null;
  parking_slots: number | null;
  num_rooms: number | null;
  changing_rooms: number | null;
  facilities: Record<string, boolean>;
  // Per vendor-category (Caterer, Decorator, DJ, ...): does this venue
  // provide it in-house, at what base price, and optionally a list of
  // pickable options (menu items, decoration packages) so a customer
  // can build their own combination instead of one fixed price. A
  // category left out or set to in_house:false means the customer has
  // to book that separately from the vendor marketplace — see
  // hall.$id.tsx "Not included".
  service_offerings: Record<string, {
    in_house: boolean;
    price: number | null;                 // flat add-on price, used when there are no options below
    options: { id: string; name: string; price: number; per_guest: boolean }[];
  }>;
  address: string | null;
  city: string | null;
  state: string | null;
  pincode: string | null;
  country: string | null;
  latitude: number | null;
  longitude: number | null;
  logo_url: string | null;
  cover_url: string | null;
  gallery: string[];
  stage_photos: string[];
  dining_photos: string[];
  parking_photos: string[];
  room_photos: string[];
  washroom_photos: string[];
  drone_photos: string[];
  videos: string[];
  price_per_day: number | null;
  price_per_hour: number | null;
  // Guest-count based pricing (migration 20260819120000) — when set,
  // the customer's guest_count picks the matching tier's price instead
  // of always charging the flat price_per_day. Empty = old flat-price
  // behavior, unchanged.
  guest_pricing_tiers: { max_guests: number; price: number }[];
  advance_amount: number | null;
  cancellation_policy: string | null;
  working_hours: string | null;
  website: string | null;
  status: "draft" | "published" | "archived";
  verification_status: "pending" | "approved" | "rejected" | "suspended" | "blacklisted";
  verified: boolean;
  rejection_reason: string | null;
  rating: number;
  review_count: number;
  created_at: string;
  additional_info: Record<string, unknown>;
  documents: { name: string; url: string; uploaded_at?: string }[];
  public_profile_active: boolean;
  trial_ends_at: string | null;
  subscription_active: boolean;
  subscription_expires_at: string | null;
};

export type Enquiry = {
  id: string;
  hall_id: string;
  requester_id: string | null;
  contact_name: string;
  contact_email: string;
  contact_phone: string | null;
  event_date: string | null;
  guest_count: number | null;
  message: string | null;
  status: "new" | "contacted" | "quoted" | "booked" | "declined" | "closed";
  created_at: string;
};

export type HallBooking = {
  id: string;
  user_id: string;
  kind: "hall";
  target_id: string;
  target_name: string;
  event_date: string | null;
  event_end_date: string | null;
  amount: number | null; // null until the venue owner sets the final price (migration 20260819150000)
  advance_amount: number | null; // set by the venue owner at confirm time
  advance_paid_amount: number;
  status: "pending" | "confirmed" | "in_progress" | "completed" | "cancelled" | "reschedule_requested";
  payment_status: "pending" | "paid" | "failed" | "refunded" | "partial";
  notes: string | null;
  details: Record<string, unknown>;
  created_at: string;
};

export async function fetchMyHalls(): Promise<Hall[]> {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return [];
  const { data, error } = await supabase
    .from("halls")
    .select("*")
    .eq("owner_id", userData.user.id)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data as unknown as Hall[]) ?? [];
}

export async function fetchHall(id: string): Promise<Hall | null> {
  const { data, error } = await supabase.from("halls").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return (data as unknown as Hall) ?? null;
}

export async function createHall(ownerId: string, name: string): Promise<Hall> {
  const { data, error } = await supabase
    .from("halls")
    .insert({ owner_id: ownerId, name, status: "draft" } as never)
    .select("*")
    .single();
  if (error) throw error;
  return data as unknown as Hall;
}

export async function updateHall(id: string, patch: Partial<Hall>): Promise<void> {
  const { error } = await supabase.from("halls").update(patch as never).eq("id", id);
  if (error) throw error;
}

export async function fetchEnquiries(hallIds: string[]): Promise<Enquiry[]> {
  if (hallIds.length === 0) return [];
  const { data, error } = await supabase
    .from("enquiries")
    .select("*")
    .in("hall_id", hallIds)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data as unknown as Enquiry[]) ?? [];
}

export async function updateEnquiryStatus(id: string, status: Enquiry["status"]): Promise<void> {
  const { error } = await supabase.from("enquiries").update({ status } as never).eq("id", id);
  if (error) throw error;
}

export async function fetchHallBookings(hallIds: string[]): Promise<HallBooking[]> {
  if (hallIds.length === 0) return [];
  const { data, error } = await supabase
    .from("customer_bookings" as never)
    .select("*")
    .eq("kind" as never, "hall" as never)
    .in("target_id" as never, hallIds as never)
    .order("created_at" as never, { ascending: false });
  if (error) throw error;
  return (data as unknown as HallBooking[]) ?? [];
}

export async function updateBookingStatus(id: string, status: HallBooking["status"]): Promise<void> {
  const { error } = await supabase.from("customer_bookings" as never).update({ status } as never).eq("id" as never, id as never);
  if (error) throw error;
}

/** Owner confirms a request and sets the advance to collect. Doing
 * both in one call keeps a booking from ever landing in "confirmed"
 * with no advance amount set (which would leave the customer with no
 * way to pay). See migration 20260819150000. */
export async function confirmBookingWithAdvance(id: string, advanceAmount: number): Promise<void> {
  const { error } = await supabase.from("customer_bookings" as never)
    .update({ status: "confirmed", advance_amount: advanceAmount } as never)
    .eq("id" as never, id as never);
  if (error) throw error;
}

/** Owner sets (or updates) the whole final price for a confirmed
 * booking, once everything's been finalised with the customer outside
 * the app. The customer's remaining balance (amount - advance_paid_amount)
 * becomes payable the moment this is set. */
export async function setBookingFinalPrice(id: string, amount: number): Promise<void> {
  const { error } = await supabase.from("customer_bookings" as never)
    .update({ amount, final_price_set_at: new Date().toISOString() } as never)
    .eq("id" as never, id as never);
  if (error) throw error;
}

// ============================================================
// Venue Worker Job Board — Venue Owners post staffing needs the same
// way Organizations do (see src/lib/organization.ts for the
// Organization-side twin of these functions). Both write to the same
// public.worker_job_postings / worker_job_applications tables — a hall
// posting is just a row with hall_id set instead of org_id. Shortlist/
// reject/accept are intentionally NOT duplicated here — they don't care
// who posted the job, so reuse shortlistApplication/rejectApplication/
// acceptApplication from src/lib/organization.ts as-is.
// Requires migration 20260807090000_venue_job_postings.sql.
// ============================================================

import type { JobPosting, JobApplication } from "./organization";
export type { JobPosting, JobApplication };

export async function fetchHallPostings(hallId: string): Promise<JobPosting[]> {
  const { data, error } = await supabase
    .from("worker_job_postings" as never)
    .select("*")
    .eq("hall_id" as never, hallId as never)
    .order("created_at" as never, { ascending: false });
  if (error) throw error;
  return (data as unknown as JobPosting[]) ?? [];
}

export async function createHallJobPosting(
  hallId: string,
  patch: Omit<JobPosting, "id" | "org_id" | "vendor_id" | "hall_id" | "posted_by" | "slots_filled" | "status" | "created_at">
): Promise<JobPosting> {
  const { data: userData } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from("worker_job_postings" as never)
    .insert({ hall_id: hallId, org_id: null, posted_by: userData.user?.id, ...patch } as never)
    .select("*")
    .single();
  if (error) throw error;
  return data as unknown as JobPosting;
}

/** Shared with organization.ts's closePosting — same table, same column, no hall-specific logic needed. */
export async function closeHallPosting(id: string): Promise<void> {
  const { data, error } = await supabase
    .from("worker_job_postings" as never)
    .update({ status: "cancelled" } as never)
    .eq("id" as never, id as never)
    .select()
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("Update was blocked — you may not have permission to manage this posting.");
}

export async function fetchApplicationsForHallPosting(postingId: string): Promise<JobApplication[]> {
  const { data: apps, error } = await supabase
    .from("worker_job_applications" as never)
    .select("*")
    .eq("posting_id" as never, postingId as never)
    .order("applied_at" as never, { ascending: true });
  if (error) throw error;
  const list = (apps as unknown as JobApplication[]) ?? [];
  if (list.length === 0) return list;

  const { data: workers } = await supabase
    .from("workers")
    .select("id, full_name, category, years_experience, city, photo_url")
    .in("id", list.map((a) => a.worker_id));
  const byId = new Map((workers ?? []).map((w) => [w.id, w]));
  return list.map((a) => ({ ...a, worker: byId.get(a.worker_id) as JobApplication["worker"] }));
}

/** Client-side mirror of the DB function public.resolve_hall_base_price
 * (migration 20260819120000) — same tier-selection logic, so the quote
 * shown to the customer while filling the form matches what the server
 * would compute. Empty tiers = old flat price_per_day behavior. */
export function resolveHallBasePrice(pricePerDay: number | null, tiers: { max_guests: number; price: number }[] | null | undefined, guestCount: number): number {
  const base = pricePerDay ?? 0;
  if (!tiers || tiers.length === 0 || !guestCount) return base;
  const sorted = [...tiers].sort((a, b) => a.max_guests - b.max_guests);
  const match = sorted.find((t) => guestCount <= t.max_guests);
  if (match) return match.price;
  return sorted[sorted.length - 1].price; // above every tier — use the highest one, not the (lower) base
}
