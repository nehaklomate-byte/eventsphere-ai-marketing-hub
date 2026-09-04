import { supabase } from "@/integrations/supabase/client";

export type WorkerRow = {
  id: string;
  owner_id: string;
  full_name: string;
  worker_type: "individual" | "agency";
  category: string | null;
  photo_url: string | null;
  verification_status: "unsubmitted" | "pending" | "approved" | "rejected";
  profile_completion: number;
  marketplace_visible: boolean;
  city: string | null;
  state: string | null;
  gender: string | null;
  date_of_birth: string | null;
  nationality: string | null;
  bio: string | null;
  skills: unknown;
  years_experience: number | null;
  languages: unknown;
  agency_name: string | null;
  agency_team_size: number | null;
  agency_years: number | null;
  hourly_charges: number | null;
  daily_charges: number | null;
  per_event_charges: number | null;
  min_booking_price: number | null;
  payment_type: string | null;
  pricing_options: { id: string; name: string; price: number; per_guest: boolean }[];
  pincode: string | null;
  address: string | null;
  district: string | null;
  country: string | null;
  max_travel_km: number | null;
  willing_to_travel: boolean;
  working_hours_start: string | null;
  working_hours_end: string | null;
  id_proof_type: string | null;
  id_proof_number: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  emergency_contact_relation: string | null;
  work_images: unknown;
  certificates: unknown;
  payout_upi_id: string | null;
};

export type WorkerTask = {
  id: string;
  worker_id: string;
  worker_user_id: string;
  payment_status?: "unpaid" | "paid" | "refunded";
  assigned_by: string;
  organization_name: string | null;
  event_name: string;
  task_name: string;
  description: string | null;
  customer_requirements: string | null; // free text the customer typed at booking time (migration 20260823110000) — distinct from `description`, which is an auto-generated selection summary
  venue: string | null;
  venue_address: string | null;
  event_date: string;
  start_time: string | null;
  end_time: string | null;
  priority: "low" | "normal" | "high" | "urgent";
  status: "pending" | "accepted" | "in_progress" | "paused" | "completed" | "rejected" | "cancelled" | "countered";
  payment_amount: number | null;
  // Service this fulfils from the customer's original booking (spec Part 7/20) —
  // matches a category/name in customer_bookings.details.requested_services.
  service_category: string | null;
  service_name: string | null;
  quantity: number;
  pricing_unit: "per_worker" | "per_day" | "per_shift" | "per_job";
  // Negotiation (migration 20260824090000). proposed_fee is what the venue
  // owner first offered; final_fee locks the moment either side accepts and
  // is immutable after that — see tg_partner_task_negotiate.
  proposed_fee: number | null;
  final_fee: number | null;
  counter_offer_amount: number | null;
  counter_offer_note: string | null;
  counter_offer_by: string | null;
  counter_offered_at: string | null;
  fee_locked_at: string | null;
  // Reference files the venue owner forwarded from the customer's booking
  // (need-to-know subset — spec Part 9), same {url,name,type,size} shape
  // as other attachments columns (migration 20260823110000).
  attachments: { url: string; name: string; type: string; size: number }[];
  accepted_at: string | null;
  started_at: string | null;
  paused_at: string | null;
  resumed_at: string | null;
  completed_at: string | null;
  created_at: string;
  // Attendance + photo-proof (check-in on starting work, check-out + work-proof on completing)
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

export type WorkerNotification = {
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

export const WORKER_CATEGORIES = [
  "Waiter", "Chef", "Cleaner", "Decorator", "Electrician", "Carpenter",
  "Sound Technician", "Lighting Technician", "Photographer Assistant",
  "Videographer Assistant", "Security Guard", "Driver", "Helper",
  "Event Coordinator", "Volunteer", "Other",
];

export const AGENCY_SERVICES = [
  "Decoration", "Catering", "Photography", "Videography", "Security",
  "Sound", "Lighting", "Transportation", "Staffing", "Cleaning",
];


export async function fetchMyWorker(userId: string) {
  const { data, error } = await supabase
    .from("workers")
    .select("*")
    .eq("owner_id", userId)
    .maybeSingle();
  if (error) throw error;
  return data as unknown as WorkerRow | null;
}

/**
 * Shared file upload for the worker module — used by Profile (portfolio,
 * documents) and Jobs (check-in/check-out/work-proof photos). Same
 * bucket + path convention everywhere so nothing is duplicated.
 */
/** Attendance/completion proof can be a photo or a video — this tells the two apart from the URL/filename so the right tag (<img> vs <video>) gets used wherever proof is shown (worker's own page, venue owner's proof viewer). */
export function isVideoUrl(url: string): boolean {
  return /\.(mp4|mov|webm|avi|mkv|m4v)(\?|$)/i.test(url);
}

export async function uploadWorkerFile(userId: string, bucket: string, keyPrefix: string, file: File): Promise<string> {
  const path = `${userId}/${Date.now()}_${file.name}`;
  const { error } = await supabase.storage.from(bucket).upload(path, file, { upsert: true });
  if (error) throw error;
  const { data } = await supabase.storage.from(bucket).createSignedUrl(path, 60 * 60 * 24 * 365);
  if (!data?.signedUrl) throw new Error("Could not generate a URL for the uploaded file.");
  return data.signedUrl;
}

/**
 * Best-effort GPS for attendance — resolves to `null` (never rejects) if
 * the browser denies permission or geolocation is unavailable, so a
 * missing location never blocks check-in/check-out.
 */
export function getBestEffortLocation(): Promise<{ lat: number; lng: number } | null> {
  return new Promise((resolve) => {
    if (!("geolocation" in navigator)) { resolve(null); return; }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => resolve(null),
      { timeout: 5000, maximumAge: 60000 },
    );
  });
}

export function computeCompletion(w: Partial<WorkerRow> | null): number {
  if (!w) return 0;
  const checks = [
    !!w.photo_url,
    !!w.gender,
    !!w.date_of_birth,
    !!w.category,
    !!w.years_experience,
    !!(w.skills && (w.skills as unknown[]).length > 0),
    !!w.bio,
    !!w.city,
    !!w.pincode,
    !!(w.hourly_charges || w.daily_charges || w.per_event_charges),
    !!w.id_proof_type,
    !!w.emergency_contact_phone,
    !!(w.work_images && (w.work_images as unknown[]).length > 0),
  ];
  const done = checks.filter(Boolean).length;
  return Math.round((done / checks.length) * 100);
}

export function statusTone(status: WorkerTask["status"]) {
  const m: Record<WorkerTask["status"], string> = {
    pending: "bg-amber-500/10 text-amber-700 border-amber-500/20",
    countered: "bg-purple-500/10 text-purple-700 border-purple-500/20",
    accepted: "bg-blue-500/10 text-blue-700 border-blue-500/20",
    in_progress: "bg-indigo-500/10 text-indigo-700 border-indigo-500/20",
    paused: "bg-slate-500/10 text-slate-700 border-slate-500/20",
    completed: "bg-emerald-500/10 text-emerald-700 border-emerald-500/20",
    rejected: "bg-rose-500/10 text-rose-700 border-rose-500/20",
    cancelled: "bg-zinc-500/10 text-zinc-700 border-zinc-500/20",
  };
  return m[status];
}

// ---- Fee negotiation (migration 20260824090000) ----
// Worker/agency side: accept the proposed_fee as-is, counter with a
// different amount, or reject outright. The DB trigger
// (tg_partner_task_negotiate) enforces who's allowed to make each move
// and freezes final_fee the instant either side accepts — these
// helpers just perform the matching, single-field-focused update so
// the UI never has to construct the transition by hand.
/** Worker/agency reviews a requirement-only public-marketplace request
 * (no price attached — see worker.$id.tsx's hire form, which
 * deliberately sends selected_items: [] and payment_amount: null) and
 * sets the real, final price in one step — mirrors
 * confirmBookingWithPricing in lib/venue.ts / confirmVendorTaskWithPricing
 * in lib/vendor.ts. Because selected_items is (and stays) empty on
 * this task, tg_recompute_worker_task_amount has nothing to compute
 * and leaves this payment_amount alone, now and on any future update.
 * Not for use on tasks that already carry a proposed_fee (the internal
 * venue/organization → worker hire flow) — those go through
 * acceptWorkerTask/counterOfferWorkerTask instead. */
export async function confirmWorkerTaskWithPricing(taskId: string, amount: number): Promise<void> {
  if (!(amount > 0)) throw new Error("Enter a price before sending it to the customer.");
  const { data, error } = await supabase.from("worker_tasks" as never)
    .update({
      status: "accepted",
      accepted_at: new Date().toISOString(),
      payment_amount: amount,
    } as never)
    .eq("id" as never, taskId as never)
    .eq("status" as never, "pending" as never) // guard: only a still-pending request can be priced
    .select()
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("Could not send this price — please refresh and try again.");
}

export async function acceptWorkerTask(taskId: string): Promise<void> {
  const { error } = await supabase.from("worker_tasks" as never)
    .update({ status: "accepted", accepted_at: new Date().toISOString() } as never)
    .eq("id" as never, taskId as never);
  if (error) throw error;
}

export async function counterOfferWorkerTask(taskId: string, amount: number, note: string): Promise<void> {
  const { error } = await supabase.from("worker_tasks" as never)
    .update({ status: "countered", counter_offer_amount: amount, counter_offer_note: note || null } as never)
    .eq("id" as never, taskId as never);
  if (error) throw error;
}

export async function rejectWorkerTask(taskId: string, reason: string): Promise<void> {
  const { error } = await supabase.from("worker_tasks" as never)
    .update({ status: "rejected", rejected_at: new Date().toISOString(), rejection_reason: reason || null } as never)
    .eq("id" as never, taskId as never);
  if (error) throw error;
}

// Venue-owner side: respond to a worker's counter-offer.
export async function acceptWorkerCounter(taskId: string): Promise<void> {
  const { error } = await supabase.from("worker_tasks" as never)
    .update({ status: "accepted", accepted_at: new Date().toISOString() } as never)
    .eq("id" as never, taskId as never);
  if (error) throw error;
}

export async function rejectWorkerCounter(taskId: string, reason: string): Promise<void> {
  const { error } = await supabase.from("worker_tasks" as never)
    .update({ status: "rejected", rejected_at: new Date().toISOString(), rejection_reason: reason || null } as never)
    .eq("id" as never, taskId as never);
  if (error) throw error;
}

export function priorityTone(p: WorkerTask["priority"]) {
  const m: Record<WorkerTask["priority"], string> = {
    low: "bg-slate-500/10 text-slate-700",
    normal: "bg-blue-500/10 text-blue-700",
    high: "bg-orange-500/10 text-orange-700",
    urgent: "bg-red-500/10 text-red-700",
  };
  return m[p];
}

// ---- Job Marketplace (browse open postings, apply, track applications) ----
// New tables, not yet in generated Supabase types — cast `as never`, same
// pattern already used for other freshly-added tables in this codebase.

export type OpenPosting = {
  id: string;
  org_id: string | null;
  vendor_id: string | null;
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
  // Reference photos / documents the poster attached (migration
  // 20260823110000_attachments_support.sql) — was missing from this
  // type even though the column and the runtime data have always had
  // it (fetchOpenPostings selects "*"), which is why worker/board.tsx
  // referencing p.attachments failed typecheck.
  attachments: { url: string; name: string; type: string; size: number }[];
};

export type MyApplication = {
  id: string;
  posting_id: string;
  worker_id: string;
  worker_user_id: string;
  cover_note: string | null;
  status: "applied" | "shortlisted" | "accepted" | "rejected" | "withdrawn";
  applied_at: string;
  responded_at: string | null;
  posting?: OpenPosting;
};

/** Open postings, newest first, optionally narrowed to the worker's own category. */
export async function fetchOpenPostings(category?: string): Promise<OpenPosting[]> {
  let query = supabase.from("worker_job_postings" as never).select("*").eq("status" as never, "open" as never).order("created_at" as never, { ascending: false });
  if (category) query = query.eq("category" as never, category as never);
  const { data, error } = await query;
  if (error) throw error;
  const postings = (data as unknown as OpenPosting[]) ?? [];
  if (postings.length === 0) return postings;

  const orgIds = Array.from(new Set(postings.map((p) => p.org_id).filter(Boolean))) as string[];
  const hallIds = Array.from(new Set(postings.map((p) => p.hall_id).filter(Boolean))) as string[];
  const vendorIds = Array.from(new Set(postings.map((p) => p.vendor_id).filter(Boolean))) as string[];
  const [orgsRes, hallsRes, vendorsRes] = await Promise.all([
    orgIds.length ? supabase.from("organizations").select("id, name").in("id", orgIds) : Promise.resolve({ data: [] as { id: string; name: string }[] }),
    hallIds.length ? supabase.from("halls").select("id, name").in("id", hallIds) : Promise.resolve({ data: [] as { id: string; name: string }[] }),
    vendorIds.length ? supabase.from("vendors").select("id, business_name").in("id", vendorIds) : Promise.resolve({ data: [] as { id: string; business_name: string }[] }),
  ]);
  const orgNameById = new Map((orgsRes.data ?? []).map((o) => [o.id, o.name]));
  const hallNameById = new Map((hallsRes.data ?? []).map((h) => [h.id, h.name]));
  const vendorNameById = new Map((vendorsRes.data ?? []).map((v) => [v.id, v.business_name]));
  return postings.map((p) => ({
    ...p,
    poster_name: p.org_id ? orgNameById.get(p.org_id) : p.hall_id ? hallNameById.get(p.hall_id) : p.vendor_id ? vendorNameById.get(p.vendor_id) : undefined,
  }));
}

export async function fetchMyApplications(userId: string): Promise<MyApplication[]> {
  const { data: apps, error } = await supabase
    .from("worker_job_applications" as never)
    .select("*")
    .eq("worker_user_id" as never, userId as never)
    .order("applied_at" as never, { ascending: false });
  if (error) throw error;
  const list = (apps as unknown as MyApplication[]) ?? [];
  if (list.length === 0) return list;

  const { data: postings } = await supabase.from("worker_job_postings" as never).select("*").in("id" as never, list.map((a) => a.posting_id) as never);
  const byId = new Map(((postings as unknown as OpenPosting[]) ?? []).map((p) => [p.id, p]));
  return list.map((a) => ({ ...a, posting: byId.get(a.posting_id) }));
}

export async function applyToPosting(postingId: string, workerId: string, workerUserId: string, coverNote: string): Promise<void> {
  const { error } = await supabase.from("worker_job_applications" as never).insert({
    posting_id: postingId, worker_id: workerId, worker_user_id: workerUserId, cover_note: coverNote || null,
  } as never);
  if (error) throw error;
}

export async function withdrawApplication(id: string): Promise<void> {
  const { data, error } = await supabase.from("worker_job_applications" as never).update({ status: "withdrawn" } as never).eq("id" as never, id as never).select().maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("Update was blocked — please refresh and try again.");
}
