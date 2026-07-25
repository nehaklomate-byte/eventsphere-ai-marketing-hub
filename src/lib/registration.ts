import { supabase } from "@/integrations/supabase/client";

/**
 * Shared between register.tsx and auth.callback.tsx.
 *
 * Why this lives here instead of inline in register.tsx: when email
 * confirmation is required, the role-specific row (halls/vendors/workers/
 * organizations) can't be created at the moment of signUp() — there's no
 * authenticated session yet, so the RLS check `owner_id = auth.uid()`
 * has nothing to compare against and the insert is rejected. register.tsx
 * detects that case, saves the submitted form data to sessionStorage, and
 * shows a "check your email" screen; auth.callback.tsx then calls this same
 * function once the user has confirmed and a real session exists. Keeping
 * the field-mapping logic in one shared place means both call sites always
 * stay in sync.
 */
export type Role = "organization" | "hall_owner" | "vendor" | "worker" | "customer";

function numOrNull(v: string | undefined) { return v && v !== "" ? Number(v) : null; }
function splitList(v: string | undefined): string[] { return (v ?? "").split(",").map((s) => s.trim()).filter(Boolean); }

export async function insertRoleRow(role: Role, userId: string, data: Record<string, string>): Promise<string | null> {
  try {
    if (role === "organization") {
      const { error } = await supabase.from("organizations").insert({
        owner_id: userId, name: data.name, org_type: data.org_type, industry: data.industry ?? null,
        owner_full_name: data.owner_full_name, email: data.email, phone: data.phone, alt_phone: data.alt_phone ?? null,
        state: data.state ?? null, city: data.city ?? null, address: data.address ?? null, pincode: data.pincode ?? null,
        website: data.website ?? null, gst_number: data.gst_number ?? null, business_reg_number: data.business_reg_number ?? null,
      });
      if (error) throw error;
    } else if (role === "hall_owner") {
      const { error } = await supabase.from("halls").insert({
        owner_id: userId, name: data.name, owner_full_name: data.owner_full_name,
        email: data.email, phone: data.phone, alt_phone: data.alt_phone ?? null, category: data.category,
        min_guests: Number(data.min_guests), max_guests: Number(data.max_guests),
        indoor_capacity: numOrNull(data.indoor_capacity), outdoor_capacity: numOrNull(data.outdoor_capacity),
        dining_capacity: numOrNull(data.dining_capacity), parking_slots: numOrNull(data.parking_slots),
        num_rooms: numOrNull(data.num_rooms), changing_rooms: numOrNull(data.changing_rooms),
        price_per_day: numOrNull(data.price_per_day), price_per_hour: numOrNull(data.price_per_hour),
        advance_amount: numOrNull(data.advance_amount),
        working_hours: data.working_hours ?? null, cancellation_policy: data.cancellation_policy ?? null,
        facilities: {
          ac: !!data.ac, generator: !!data.generator, lift: !!data.lift, wheelchair: !!data.wheelchair,
          wifi: !!data.wifi, decoration_allowed: !!data.decoration_allowed, outside_catering: !!data.outside_catering,
        },
        address: data.address ?? null, city: data.city, state: data.state, pincode: data.pincode,
        google_maps_url: data.google_maps_url, website: data.website ?? null, status: "draft",
      });
      if (error) throw error;
    } else if (role === "vendor") {
      const { error } = await supabase.from("vendors").insert({
        owner_id: userId, business_name: data.name, owner_full_name: data.owner_full_name,
        category: data.category, years_experience: numOrNull(data.years_experience),
        gst_number: data.gst_number ?? null, pan_number: data.pan_number ?? null,
        email: data.email, phone: data.phone,
        address: data.address ?? null, city: data.city, state: data.state, pincode: data.pincode,
        instagram: data.instagram ?? null, facebook: data.facebook ?? null, website: data.website ?? null,
        service_areas: splitList(data.service_areas), available_days: splitList(data.available_days),
        status: "draft",
      });
      if (error) throw error;
    } else if (role === "worker") {
      const { error } = await supabase.from("workers").insert({
        owner_id: userId, full_name: data.full_name, category: data.category,
        skills: splitList(data.skills), years_experience: numOrNull(data.years_experience),
        languages: splitList(data.languages),
        phone: data.phone, email: data.email,
        address: data.address ?? null, city: data.city, state: data.state, pincode: data.pincode,
        daily_charges: numOrNull(data.daily_charges), hourly_charges: numOrNull(data.hourly_charges),
        available_days: splitList(data.available_days),
        emergency_contact: data.emergency_contact ?? null,
        status: "draft",
      });
      if (error) throw error;
    }
    return null;
  } catch (e) {
    return (e as Error).message ?? "Could not save your details. Please try again.";
  }
}
