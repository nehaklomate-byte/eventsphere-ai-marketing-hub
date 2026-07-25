import { supabase } from "@/integrations/supabase/client";

/**
 * Admin Verification Center — data access layer.
 *
 * Backed by the migration `20260722120000_admin_verification_center.sql`:
 *  - organizations / halls / vendors / workers each gained:
 *      verification_status ('pending'|'approved'|'rejected'|'suspended'|'blacklisted')
 *      rejection_reason, verified_at, verified_by, documents (jsonb[])
 *  - a unified `admin_verification_queue` view (one row per application, any role)
 *  - `audit_logs` (every admin action) and `platform_notifications`
 *    (used to notify the applicant of the outcome).
 *
 * These tables/view are not yet in the generated Supabase types.ts, so table
 * names/columns are cast `as never` — the same pattern already used in
 * src/routes/_authenticated/worker/*.tsx for worker_tasks/worker_notifications.
 */

export type VerificationRole = "organization" | "venue" | "vendor" | "worker";
export type VerificationStatus = "pending" | "approved" | "rejected" | "suspended" | "blacklisted";

export const ROLE_TABLE: Record<VerificationRole, string> = {
  organization: "organizations",
  venue: "halls",
  vendor: "vendors",
  worker: "workers",
};

export const ROLE_LABEL: Record<VerificationRole, string> = {
  organization: "Organization",
  venue: "Venue Owner",
  vendor: "Vendor",
  worker: "Worker",
};

export type QueueRow = {
  role: VerificationRole;
  id: string;
  title: string;
  city: string | null;
  state: string | null;
  email: string | null;
  phone: string | null;
  verification_status: VerificationStatus;
  rejection_reason: string | null;
  documents: { name: string; url: string; uploaded_at?: string }[];
  created_at: string;
  user_id: string;
};

export async function fetchQueue(opts?: { role?: VerificationRole; status?: VerificationStatus }): Promise<QueueRow[]> {
  let q = supabase.from("admin_verification_queue" as never).select("*");
  if (opts?.role) q = q.eq("role" as never, opts.role as never);
  if (opts?.status) q = q.eq("verification_status" as never, opts.status as never);
  const { data, error } = await q.order("created_at" as never, { ascending: false });
  if (error) throw error;
  return (data as unknown as QueueRow[]) ?? [];
}

/**
 * The queue view only carries a handful of summary columns (title, city,
 * email…) — enough for the list, not enough to actually verify someone.
 * This fetches the FULL row from the real table (halls/vendors/workers/
 * organizations) so the admin can review every field the applicant submitted.
 */
export async function fetchFullRecord(role: VerificationRole, id: string): Promise<Record<string, unknown>> {
  const table = ROLE_TABLE[role];
  const { data, error } = await supabase.from(table as never).select("*").eq("id" as never, id as never).single();
  if (error) throw error;
  return data as unknown as Record<string, unknown>;
}

/** Pending-count per role, for the Admin dashboard home cards. */
export async function fetchPendingCounts(): Promise<Record<VerificationRole, number>> {
  const { data, error } = await supabase
    .from("admin_verification_queue" as never)
    .select("role" as never)
    .eq("verification_status" as never, "pending" as never);
  if (error) throw error;
  const rows = (data as unknown as { role: VerificationRole }[]) ?? [];
  const out: Record<VerificationRole, number> = { organization: 0, venue: 0, vendor: 0, worker: 0 };
  for (const r of rows) out[r.role] = (out[r.role] ?? 0) + 1;
  return out;
}

async function writeAudit(action: string, table: string, id: string, oldValue: unknown, newValue: unknown) {
  try {
    const { data: userData } = await supabase.auth.getUser();
    const { error } = await supabase.from("audit_logs" as never).insert({
      actor_id: userData.user?.id ?? null,
      actor_email: userData.user?.email ?? null,
      action,
      target_table: table,
      target_id: id,
      old_value: oldValue as never,
      new_value: newValue as never,
    } as never);
    if (error) console.error("[audit log failed — core action still applied]", error);
  } catch (e) {
    console.error("[audit log failed — core action still applied]", e);
  }
}

async function notify(userId: string, title: string, body: string, type: "info" | "success" | "warning" | "error") {
  try {
    const { error } = await supabase.from("platform_notifications" as never).insert({
      user_id: userId,
      title,
      body,
      type,
    } as never);
    if (error) console.error("[notification failed — core action still applied]", error);
  } catch (e) {
    console.error("[notification failed — core action still applied]", e);
  }
  // Real email sending (Resend) comes later — deliberately not wired in
  // today so a missing/unconfigured edge function can't interfere with
  // getting the core Venue module working first.
}

async function setStatus(
  role: VerificationRole,
  id: string,
  ownerId: string,
  status: VerificationStatus,
  action: string,
  reason?: string,
) {
  const table = ROLE_TABLE[role];
  const patch: Record<string, unknown> = { verification_status: status };
  if (reason !== undefined) patch.rejection_reason = reason || null;

  const { data, error } = await supabase.from(table as never).update(patch as never).eq("id" as never, id as never).select("id");
  if (error) throw error;
  if (!data || data.length === 0) {
    throw new Error("Update blocked — no row was changed. This usually means the admin RLS policy on this table isn't applied correctly.");
  }

  await writeAudit(action, table, id, null, patch);

  const messages: Record<VerificationStatus, { title: string; body: string; type: "success" | "warning" | "error" | "info" }> = {
    approved: { title: "You're verified! 🎉", body: `Your ${ROLE_LABEL[role]} profile has been approved. Your dashboard is now fully active.`, type: "success" },
    rejected: { title: "Verification not approved", body: reason ? `Reason: ${reason}` : "Please review and resubmit your details.", type: "error" },
    suspended: { title: "Account suspended", body: reason ? `Reason: ${reason}` : "Your account has been temporarily suspended.", type: "warning" },
    blacklisted: { title: "Account blacklisted", body: reason ? `Reason: ${reason}` : "Your account has been blacklisted.", type: "error" },
    pending: { title: "Verification pending", body: "Your application is under review again.", type: "info" },
  };
  const m = messages[status];
  await notify(ownerId, m.title, m.body, m.type);
}

export const approve = (role: VerificationRole, id: string, ownerId: string) =>
  setStatus(role, id, ownerId, "approved", "approve");

export const reject = (role: VerificationRole, id: string, ownerId: string, reason: string) =>
  setStatus(role, id, ownerId, "rejected", "reject", reason);

export const suspend = (role: VerificationRole, id: string, ownerId: string, reason?: string) =>
  setStatus(role, id, ownerId, "suspended", "suspend", reason);

export const blacklist = (role: VerificationRole, id: string, ownerId: string, reason?: string) =>
  setStatus(role, id, ownerId, "blacklisted", "blacklist", reason);

export const restore = (role: VerificationRole, id: string, ownerId: string) =>
  setStatus(role, id, ownerId, "approved", "restore");

/* ============================================================
 * Step 1 — Account approval (profiles.account_status).
 * Separate from everything above: this gates whether a newly registered
 * Organization/Venue Owner/Vendor/Worker can even open their dashboard or
 * profile form at all, before they've submitted anything for review.
 * ========================================================== */

export type AccountRow = {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  primary_role: string | null;
  account_status: "pending_approval" | "approved" | "rejected";
  account_rejection_reason: string | null;
  created_at: string;
};

export async function fetchPendingAccounts(): Promise<AccountRow[]> {
  return fetchAccountsByStatus("pending_approval");
}

export async function fetchAccountsByStatus(status: "pending_approval" | "approved" | "rejected" | "all"): Promise<AccountRow[]> {
  let q = supabase
    .from("profiles" as never)
    .select("id, full_name, email, phone, primary_role, account_status, account_rejection_reason, created_at" as never)
    .neq("primary_role" as never, "customer" as never)
    .neq("primary_role" as never, "admin" as never);
  if (status !== "all") q = q.eq("account_status" as never, status as never);
  const { data, error } = await q.order("created_at" as never, { ascending: false });
  if (error) throw error;
  return (data as unknown as AccountRow[]) ?? [];
}

/** The role-specific row (halls/vendors/workers/organizations) linked to a
 * given profile — lets an admin review the full registration submission
 * during Step 1, before the applicant has even reached Step 2. */
export async function fetchRoleRecordByOwner(role: string, ownerId: string): Promise<Record<string, unknown> | null> {
  const table = ROLE_TABLE[role as VerificationRole];
  if (!table) return null;
  const { data, error } = await supabase.from(table as never).select("*").eq("owner_id" as never, ownerId as never).maybeSingle();
  if (error) throw error;
  return (data as unknown as Record<string, unknown>) ?? null;
}

export function roleFromPrimaryRole(primaryRole: string | null): VerificationRole | null {
  if (primaryRole === "hall_owner") return "venue";
  if (primaryRole === "vendor" || primaryRole === "worker" || primaryRole === "organization") return primaryRole as VerificationRole;
  return null;
}

export async function fetchPendingAccountCount(): Promise<number> {
  const { count, error } = await supabase
    .from("profiles" as never)
    .select("id" as never, { count: "exact", head: true })
    .eq("account_status" as never, "pending_approval" as never);
  if (error) throw error;
  return count ?? 0;
}

export async function approveAccount(userId: string): Promise<void> {
 const { data, error } = await supabase.from("profiles" as never).update({ account_status: "approved" } as never).eq("id" as never, userId as never).select("id");
  if (error) throw error;
  if (!data || data.length === 0) throw new Error("Update blocked by RLS — check the 'Admin updates all profiles' policy on profiles.");
  await writeAudit("approve_account", "profiles", userId, null, { account_status: "approved" });
  await notify(userId, "Account approved ✅", "Your account has been approved. Now complete your profile in full and submit it for verification.", "success");
}

export async function rejectAccount(userId: string, reason: string): Promise<void> {
  const { data, error } = await supabase
    .from("profiles" as never)
    .update({ account_status: "rejected", account_rejection_reason: reason } as never)
    .eq("id" as never, userId as never)
    .select("id");
  if (error) throw error;
  if (!data || data.length === 0) {
    throw new Error("Update blocked by RLS — check the 'Admin updates all profiles' policy on profiles.");
  }
  await writeAudit("reject_account", "profiles", userId, null, { account_status: "rejected", reason });
  await notify(userId, "Account not approved", reason ? `Reason: ${reason}` : "Please contact support for details.", "error");
}

/** Generic CSV export — used by both Account Approvals and the
 * Verification Center "Download CSV" buttons. Flattens objects/arrays to
 * single cells so it opens cleanly in Excel/Sheets. */
export function downloadCsv(filename: string, rows: Record<string, unknown>[]) {
  if (rows.length === 0) return;
  const headers = Array.from(rows.reduce((set, r) => { Object.keys(r).forEach((k) => set.add(k)); return set; }, new Set<string>()));
  const escape = (v: unknown) => {
    const s = v === null || v === undefined ? "" : typeof v === "object" ? JSON.stringify(v) : String(v);
    return `"${s.replace(/"/g, '""')}"`;
  };
  const csv = [headers.join(","), ...rows.map((r) => headers.map((h) => escape(r[h])).join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
