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
  pincode: string | null;
  address: string | null;
  district: string | null;
  country: string | null;
  max_travel_km: number | null;
  willing_to_travel: boolean;
  working_hours_start: string | null;
  working_hours_end: string | null;
  available_days: unknown;
  id_proof_type: string | null;
  id_proof_number: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  emergency_contact_relation: string | null;
  work_images: unknown;
  certificates: unknown;
};

export type WorkerTask = {
  id: string;
  worker_id: string;
  worker_user_id: string;
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
  accepted_at: string | null;
  started_at: string | null;
  paused_at: string | null;
  resumed_at: string | null;
  completed_at: string | null;
  created_at: string;
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

export const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export async function fetchMyWorker(userId: string) {
  const { data, error } = await supabase
    .from("workers")
    .select("*")
    .eq("owner_id", userId)
    .maybeSingle();
  if (error) throw error;
  return data as unknown as WorkerRow | null;
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
    !!(w.available_days && (w.available_days as unknown[]).length > 0),
  ];
  const done = checks.filter(Boolean).length;
  return Math.round((done / checks.length) * 100);
}

export function statusTone(status: WorkerTask["status"]) {
  const m: Record<WorkerTask["status"], string> = {
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

export function priorityTone(p: WorkerTask["priority"]) {
  const m: Record<WorkerTask["priority"], string> = {
    low: "bg-slate-500/10 text-slate-700",
    normal: "bg-blue-500/10 text-blue-700",
    high: "bg-orange-500/10 text-orange-700",
    urgent: "bg-red-500/10 text-red-700",
  };
  return m[p];
}
