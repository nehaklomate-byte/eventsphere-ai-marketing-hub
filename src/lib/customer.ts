import { supabase } from "@/integrations/supabase/client";

export type Customer = {
  id: string;
  user_id: string;
  full_name: string | null;
  phone: string | null;
  gender: string | null;
  date_of_birth: string | null;
  avatar_url: string | null;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  state: string | null;
  pincode: string | null;
  status: string;
  profile_completion: number;
};

const PROFILE_FIELDS: (keyof Customer)[] = [
  "full_name", "phone", "gender", "date_of_birth", "avatar_url",
  "address_line1", "city", "state", "pincode",
];

export function computeCompletion(c: Partial<Customer>): number {
  const filled = PROFILE_FIELDS.filter((k) => {
    const v = c[k];
    return typeof v === "string" && v.trim().length > 0;
  }).length;
  return Math.round((filled / PROFILE_FIELDS.length) * 100);
}

/**
 * Ensures a customer row + default preferences exist for the current user.
 * Idempotent — safe to call on every dashboard mount.
 */
export async function ensureCustomerBootstrapped(userId: string, meta?: {
  full_name?: string | null; phone?: string | null; email?: string | null;
}): Promise<Customer | null> {
  // Customer row
  const { data: existing } = await supabase
    .from("customers")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  let row = existing as Customer | null;
  if (!row) {
    const insertPayload = {
      user_id: userId,
      full_name: meta?.full_name ?? null,
      phone: meta?.phone ?? null,
    };
    const { data: inserted } = await supabase
      .from("customers")
      .insert(insertPayload)
      .select("*")
      .maybeSingle();
    row = inserted as Customer | null;
  }

  // Preferences row
  await supabase
    .from("customer_preferences")
    .upsert({ user_id: userId }, { onConflict: "user_id", ignoreDuplicates: true });

  return row;
}
