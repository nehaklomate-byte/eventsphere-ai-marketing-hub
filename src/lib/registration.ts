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

function orNull(v: string | undefined) { return v && v.trim() !== "" ? v.trim() : null; }

/**
 * Stage 1 only. Registration collects the bare minimum needed to create an
 * account; every other business detail (GST, PAN, pricing, capacity,
 * portfolio, documents, bank details…) is captured later in the role's
 * Complete Profile page (Stage 3) before submitting for verification.
 */
export async function insertRoleRow(role: Role, userId: string, data: Record<string, string>): Promise<string | null> {
  try {
    if (role === "organization") {
      const { error } = await supabase.from("organizations").insert({
        owner_id: userId, name: data.name, org_type: data.org_type,
        email: data.email, phone: data.phone,
        city: orNull(data.city), state: orNull(data.state),
      });
      if (error) throw error;
    } else if (role === "hall_owner") {
      const { error } = await supabase.from("halls").insert({
        owner_id: userId, name: data.name, owner_full_name: data.owner_full_name,
        email: data.email, phone: data.phone, category: data.category,
        city: orNull(data.city), state: orNull(data.state),
        status: "draft",
      });
      if (error) throw error;
    } else if (role === "vendor") {
      const { error } = await supabase.from("vendors").insert({
        owner_id: userId, business_name: data.name, owner_full_name: data.owner_full_name,
        category: data.category, email: data.email, phone: data.phone,
        city: orNull(data.city), state: orNull(data.state),
        status: "draft",
      });
      if (error) throw error;
    } else if (role === "worker") {
      const { error } = await supabase.from("workers").insert({
        owner_id: userId, full_name: data.full_name, category: data.category,
        phone: data.phone, email: data.email,
        city: orNull(data.city), state: orNull(data.state),
        status: "draft",
      });
      if (error) throw error;
    } else if (role === "customer") {
      const { error } = await supabase.from("customers").upsert({
        user_id: userId, full_name: data.full_name, phone: data.phone,
        city: orNull(data.city), state: orNull(data.state),
      }, { onConflict: "user_id" });
      if (error) throw error;
      await supabase.from("customer_preferences")
        .upsert({ user_id: userId }, { onConflict: "user_id", ignoreDuplicates: true });
    }
    return null;
  } catch (e) {
    return (e as Error).message ?? "Could not save your details. Please try again.";
  }
}
