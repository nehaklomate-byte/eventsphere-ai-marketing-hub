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
  address: string | null;
  city: string | null;
  state: string | null;
  pincode: string | null;
  country: string | null;
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
};

export type Enquiry = {
  id: string;
  hall_id: string;
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
  amount: number;
  status: "pending" | "confirmed" | "in_progress" | "completed" | "cancelled" | "reschedule_requested";
  payment_status: "pending" | "paid" | "failed" | "refunded" | "partial";
  notes: string | null;
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
