import { supabase } from "@/integrations/supabase/client";

/**
 * Universal Account Settings — one shared data layer + UI section used
 * by every role's Settings page (Customer/Vendor/Worker/Venue Owner/
 * Organization/Admin). Role-specific settings (business hours, service
 * radius, etc.) stay in each role's own lib file; this file only covers
 * what's identical across all roles: profile basics, security, privacy,
 * notifications, appearance, language.
 *
 * Table: public.profiles (extended by
 * 20260803090000_universal_account_settings.sql) + a small
 * account_deletion_requests table for the "Delete Account" flow.
 */

export type NotificationChannel = "push" | "email" | "sms";
export type NotificationEvent =
  | "new_booking" | "new_hire_request" | "booking_confirmed" | "booking_cancelled"
  | "payment_received" | "new_message" | "task_assigned" | "task_completed"
  | "review_received" | "event_reminder" | "admin";

export type Preferences = {
  theme: "light" | "dark" | "system";
  font_size: "small" | "normal" | "large";
  compact_view: boolean;
  privacy: {
    public_profile: boolean;
    show_mobile: boolean;
    show_email: boolean;
    allow_direct_chat: boolean;
    allow_direct_calls: boolean;
    search_visible: boolean;
    hide_last_active: boolean;
  };
  notify: Record<NotificationChannel, Record<NotificationEvent, boolean>>;
};

export const DEFAULT_PREFERENCES: Preferences = {
  theme: "system",
  font_size: "normal",
  compact_view: false,
  privacy: {
    public_profile: true, show_mobile: false, show_email: false,
    allow_direct_chat: true, allow_direct_calls: false, search_visible: true, hide_last_active: false,
  },
  notify: {
    push:  { new_booking: true, new_hire_request: true, booking_confirmed: true, booking_cancelled: true, payment_received: true, new_message: true, task_assigned: true, task_completed: true, review_received: true, event_reminder: true, admin: true },
    email: { new_booking: true, new_hire_request: true, booking_confirmed: true, booking_cancelled: true, payment_received: true, new_message: false, task_assigned: true, task_completed: false, review_received: true, event_reminder: true, admin: true },
    sms:   { new_booking: false, new_hire_request: false, booking_confirmed: true, booking_cancelled: true, payment_received: true, new_message: false, task_assigned: false, task_completed: false, review_received: false, event_reminder: true, admin: false },
  },
};

export const NOTIFICATION_EVENT_LABEL: Record<NotificationEvent, string> = {
  new_booking: "New booking", new_hire_request: "New hire request", booking_confirmed: "Booking confirmed",
  booking_cancelled: "Booking cancelled", payment_received: "Payment received", new_message: "New message",
  task_assigned: "Task assigned", task_completed: "Task completed", review_received: "Review received",
  event_reminder: "Event reminder", admin: "Admin notifications",
};

export type AccountProfile = {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  alt_phone: string | null;
  avatar_url: string | null;
  username: string | null;
  date_of_birth: string | null;
  gender: string | null;
  language_preference: string;
  timezone: string;
  preferences: Preferences;
};

export async function fetchMyAccountProfile(userId: string): Promise<AccountProfile | null> {
  const { data, error } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const row = data as unknown as AccountProfile;
  // Merge with defaults so older rows (or partial jsonb) never crash the UI on a missing key.
  row.preferences = deepMerge(DEFAULT_PREFERENCES, row.preferences ?? {});
  return row;
}

function deepMerge<T>(base: T, override: Partial<T>): T {
  if (typeof base !== "object" || base === null) return (override as T) ?? base;
  const out: Record<string, unknown> = { ...(base as Record<string, unknown>) };
  for (const key of Object.keys(override ?? {})) {
    const overrideVal = (override as Record<string, unknown>)[key];
    const baseVal = out[key];
    out[key] = typeof baseVal === "object" && baseVal !== null && !Array.isArray(baseVal)
      ? deepMerge(baseVal, (overrideVal ?? {}) as Partial<unknown>)
      : overrideVal ?? baseVal;
  }
  return out as T;
}

/** Generic profile-field save (name/photo/phone/username/dob/gender/language/timezone). */
export async function updateAccountBasics(userId: string, patch: Partial<AccountProfile>): Promise<void> {
  const { data, error } = await supabase.from("profiles").update(patch as never).eq("id", userId).select().maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("Save was blocked — please refresh and try again.");
}

/** Deep-merges a partial preferences patch into the stored jsonb and saves it. */
export async function updatePreferences(userId: string, current: Preferences, patch: Partial<Preferences>): Promise<Preferences> {
  const merged = deepMerge(current, patch);
  const { data, error } = await supabase.from("profiles").update({ preferences: merged } as never).eq("id", userId).select().maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("Save was blocked — please refresh and try again.");
  return merged;
}

export async function setNotificationPref(userId: string, current: Preferences, channel: NotificationChannel, event: NotificationEvent, value: boolean): Promise<Preferences> {
  return updatePreferences(userId, current, { notify: { ...current.notify, [channel]: { ...current.notify[channel], [event]: value } } } as Partial<Preferences>);
}

export async function changePassword(newPassword: string): Promise<void> {
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw error;
}

/** Real, working "logout from all devices" — Supabase's global sign-out
 * scope revokes every refresh token for this user, not just this tab. */
export async function logoutAllDevices(): Promise<void> {
  const { error } = await supabase.auth.signOut({ scope: "global" });
  if (error) throw error;
}

export async function requestAccountDeletion(userId: string, reason: string): Promise<void> {
  const { error } = await supabase.from("account_deletion_requests" as never).insert({ user_id: userId, reason: reason || null } as never);
  if (error) throw error;
}

export async function cancelAccountDeletion(userId: string): Promise<void> {
  const { error } = await supabase.from("account_deletion_requests" as never)
    .update({ status: "cancelled", resolved_at: new Date().toISOString() } as never)
    .eq("user_id" as never, userId as never).eq("status" as never, "pending" as never);
  if (error) throw error;
}

export async function fetchPendingDeletionRequest(userId: string): Promise<{ id: string; reason: string | null; requested_at: string } | null> {
  const { data, error } = await supabase.from("account_deletion_requests" as never)
    .select("id, reason, requested_at").eq("user_id" as never, userId as never).eq("status" as never, "pending" as never).maybeSingle();
  if (error) throw error;
  return data as unknown as { id: string; reason: string | null; requested_at: string } | null;
}

// ---- Theme (real, working — toggles the `.dark` class Tailwind already styles) ----

export type ThemeChoice = "light" | "dark" | "system";
const THEME_STORAGE_KEY = "eventorbit-theme";

export function applyTheme(theme: ThemeChoice) {
  const root = document.documentElement;
  const resolved = theme === "system"
    ? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light")
    : theme;
  root.classList.toggle("dark", resolved === "dark");
  localStorage.setItem(THEME_STORAGE_KEY, theme);
}

export function getStoredTheme(): ThemeChoice {
  if (typeof localStorage === "undefined") return "system";
  return (localStorage.getItem(THEME_STORAGE_KEY) as ThemeChoice | null) ?? "system";
}

export const TIMEZONES = [
  "Asia/Kolkata", "Asia/Dubai", "Asia/Singapore", "Asia/Kathmandu",
  "Europe/London", "America/New_York", "America/Los_Angeles", "UTC",
];

export const LANGUAGES: { code: string; label: string }[] = [
  { code: "en", label: "English" },
  { code: "mr", label: "मराठी (Marathi)" },
  { code: "hi", label: "हिंदी (Hindi)" },
];
