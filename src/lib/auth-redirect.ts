import { supabase } from "@/integrations/supabase/client";

export type PrimaryRole = "organization" | "hall_owner" | "vendor" | "worker" | "customer" | "admin";

export const DASHBOARD_PATH: Record<PrimaryRole, string> = {
  organization: "/organization",
  hall_owner: "/venue",
  vendor: "/vendor",
  worker: "/worker",
  customer: "/customer",
  admin: "/admin",
};

export const ALL_ROLES: PrimaryRole[] = [
  "organization",
  "hall_owner",
  "vendor",
  "worker",
  "customer",
];

/**
 * Resolves the correct post-auth landing route for a given user.
 * - Reads `profiles.primary_role`.
 * - If missing (typical for first-time OAuth users), returns `/onboarding`.
 */
export async function resolveDashboardPath(userId: string): Promise<string> {
  const { data } = await supabase
    .from("profiles")
    .select("primary_role")
    .eq("id", userId)
    .maybeSingle();
  const role = (data?.primary_role as PrimaryRole | null) ?? null;
  if (!role) return "/onboarding";
  return DASHBOARD_PATH[role] ?? "/onboarding";
}

/** Human-readable auth error mapping. */
export function humanizeAuthError(error: { message?: string; code?: string; status?: number } | null | undefined): string {
  if (!error) return "Something went wrong. Please try again.";
  const code = (error as { code?: string }).code ?? "";
  const msg = error.message ?? "";
  if (code === "email_not_confirmed" || /confirm/i.test(msg)) {
    return "Please confirm your email address, then try signing in again.";
  }
  if (code === "invalid_credentials" || /invalid login|invalid_grant|invalid credentials/i.test(msg)) {
    return "Wrong email or password. Please try again.";
  }
  if (code === "user_banned" || /banned|disabled/i.test(msg)) {
    return "This account has been disabled. Please contact support.";
  }
  if (code === "user_not_found") {
    return "No account found with that email. Please register first.";
  }
  if ((error.status ?? 0) === 429 || /rate|too many/i.test(msg)) {
    return "Too many attempts. Please wait a minute and try again.";
  }
  return msg || "Sign-in failed. Please try again.";
}
