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

async function writeAudit(action: string, table: string, id: string | null, oldValue: unknown, newValue: unknown) {
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

  // Approving in the Verification Center used to only flip
  // verification_status — the listing still needed a SEPARATE manual
  // "Publish" toggle from the owner's own profile page before it would
  // ever appear on the marketplace (which filters on `status='published'`
  // for venues/vendors, or `marketplace_visible=true` for workers, not
  // verification_status). That gap meant "verified" and "visible on
  // marketplace" could silently disagree for days. Approval now flips
  // publish state too, so verified = live immediately. Losing approval
  // (rejected/suspended/blacklisted) takes the listing back down.
  if (role !== "organization") {
    if (status === "approved") {
      if (role === "worker") patch.marketplace_visible = true;
      else patch.status = "published";
    } else if (status === "rejected" || status === "suspended" || status === "blacklisted") {
      if (role === "worker") patch.marketplace_visible = false;
      else patch.status = "draft";
    }
  }

  const { data, error } = await supabase.from(table as never).update(patch as never).eq("id" as never, id as never).select("id");
  if (error) throw error;
  if (!data || data.length === 0) {
    throw new Error("Update blocked — no row was changed. This usually means the admin RLS policy on this table isn't applied correctly.");
  }

  await writeAudit(action, table, id, null, patch);

  const messages: Record<VerificationStatus, { title: string; body: string; type: "success" | "warning" | "error" | "info" }> = {
    approved: { title: "You're verified! 🎉", body: `Your ${ROLE_LABEL[role]} profile has been approved and is now live on the marketplace.`, type: "success" },
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

// =============================================================
// Earnings / Payments — admin visibility into money moving on the
// platform. Depends on migration 20260805110000_admin_payment_visibility.sql:
// before that migration, admin had no read access to customer_bookings,
// worker_payouts, or vendor_payouts at all, so this data was invisible
// no matter what UI existed on top of it.
// =============================================================

export type IncomingPaymentSource = "hall" | "worker" | "vendor";

export type IncomingPayment = {
  id: string;
  source: IncomingPaymentSource;
  title: string;
  amount: number;
  commission_amount: number;
  razorpay_payment_id: string | null;
  paid_at: string | null;
  created_at: string;
};

/** Every payment that has actually cleared through Razorpay, across
 * hall bookings, worker tasks, and vendor tasks — money that has
 * landed in the platform's account, whether or not it's been paid
 * out to the worker/vendor/venue owner yet.
 *
 * Reads from platform_commission_ledger (migration
 * 20260819110000) instead of three separately hand-computed queries —
 * one server-side view is the single source of truth for gross/
 * commission/net everywhere in the app, so this screen, the Event
 * Financials screen, and any future report can never quietly disagree
 * with each other again. */
export async function fetchIncomingPayments(): Promise<IncomingPayment[]> {
  const { data, error } = await supabase
    .from("platform_commission_ledger" as never)
    .select("source_id, source_type, counterparty_label, gross_amount, commission_amount, razorpay_payment_id, paid_at, created_at" as never)
    .eq("payment_status" as never, "paid" as never)
    .order("paid_at" as never, { ascending: false, nullsFirst: false });
  if (error) throw error;

  type LedgerRow = { source_id: string; source_type: IncomingPaymentSource; counterparty_label: string; gross_amount: number; commission_amount: number; razorpay_payment_id: string | null; paid_at: string | null; created_at: string };
  return ((data as unknown as LedgerRow[]) ?? []).map((r) => ({
    id: r.source_id, source: r.source_type, title: r.counterparty_label, amount: r.gross_amount ?? 0,
    commission_amount: r.commission_amount ?? 0, razorpay_payment_id: r.razorpay_payment_id, paid_at: r.paid_at, created_at: r.created_at,
  }));
}

export type PayoutSource = "worker" | "vendor" | "venue";

export type PayoutRow = {
  id: string;
  source: PayoutSource;
  title: string;
  amount: number;
  status: "pending" | "paid" | "cancelled" | "clawback_required";
  payout_reference: string | null;
  paid_at: string | null;
  created_at: string;
  recipientName: string;
  recipientUpiId: string | null; // null = they haven't set it yet, admin has nowhere to send this
  notes: string | null; // set by the refund-sync trigger when auto-cancelled/clawback_required
};

/** What the platform owes out to workers, vendors, and venue owners —
 * the other half of the money story. Manual-payout model: admin reads
 * the payout_upi_id on the recipient's row, transfers outside the
 * platform, then marks it paid here.
 *
 * Previously this only pulled the booking/task title — the recipient's
 * name and payout_upi_id (added by migration 20260801090000) were never
 * fetched at all, so this screen had no way to tell admin who to pay or
 * where to send it. Admin had to go hunt the person's profile down
 * separately before a payout could actually be made. */
export async function fetchPayouts(): Promise<PayoutRow[]> {
  const [workers, vendors, venues] = await Promise.all([
    supabase.from("worker_payouts" as never)
      .select("id, amount, status, payout_reference, paid_at, created_at, notes, worker_task_id, worker_tasks:worker_task_id(event_name, task_name), workers:worker_id(full_name, payout_upi_id)" as never)
      .order("created_at" as never, { ascending: false }),
    supabase.from("vendor_payouts" as never)
      .select("id, amount, status, payout_reference, paid_at, created_at, notes, vendor_task_id, vendor_tasks:vendor_task_id(event_name, task_name), vendors:vendor_id(business_name, payout_upi_id)" as never)
      .order("created_at" as never, { ascending: false }),
    supabase.from("venue_payouts" as never)
      .select("id, amount, status, payout_reference, paid_at, created_at, notes, booking_id, customer_bookings:booking_id(target_name), profiles:hall_owner_id(full_name, payout_upi_id)" as never)
      .order("created_at" as never, { ascending: false }),
  ]);
  if (workers.error) throw workers.error;
  if (vendors.error) throw vendors.error;
  if (venues.error) throw venues.error;

  type Base = { id: string; amount: number; status: "pending" | "paid" | "cancelled" | "clawback_required"; payout_reference: string | null; paid_at: string | null; created_at: string; notes: string | null };
  type WorkerRow = Base & { worker_tasks: { event_name: string; task_name: string } | null; workers: { full_name: string; payout_upi_id: string | null } | null };
  type VendorRow = Base & { vendor_tasks: { event_name: string; task_name: string } | null; vendors: { business_name: string; payout_upi_id: string | null } | null };
  type VenueRow = Base & { customer_bookings: { target_name: string } | null; profiles: { full_name: string; payout_upi_id: string | null } | null };

  const out: PayoutRow[] = [];
  for (const r of (workers.data as unknown as WorkerRow[]) ?? []) {
    out.push({ id: r.id, source: "worker", title: r.worker_tasks ? `${r.worker_tasks.event_name} — ${r.worker_tasks.task_name}` : "Worker task", amount: r.amount, status: r.status, payout_reference: r.payout_reference, paid_at: r.paid_at, created_at: r.created_at, recipientName: r.workers?.full_name ?? "Worker", recipientUpiId: r.workers?.payout_upi_id ?? null, notes: r.notes });
  }
  for (const r of (vendors.data as unknown as VendorRow[]) ?? []) {
    out.push({ id: r.id, source: "vendor", title: r.vendor_tasks ? `${r.vendor_tasks.event_name} — ${r.vendor_tasks.task_name}` : "Vendor task", amount: r.amount, status: r.status, payout_reference: r.payout_reference, paid_at: r.paid_at, created_at: r.created_at, recipientName: r.vendors?.business_name ?? "Vendor", recipientUpiId: r.vendors?.payout_upi_id ?? null, notes: r.notes });
  }
  for (const r of (venues.data as unknown as VenueRow[]) ?? []) {
    out.push({ id: r.id, source: "venue", title: r.customer_bookings ? r.customer_bookings.target_name : "Hall booking", amount: r.amount, status: r.status, payout_reference: r.payout_reference, paid_at: r.paid_at, created_at: r.created_at, recipientName: r.profiles?.full_name ?? "Venue owner", recipientUpiId: r.profiles?.payout_upi_id ?? null, notes: r.notes });
  }
  return out.sort((a, b) => b.created_at.localeCompare(a.created_at));
}

const PAYOUT_TABLE: Record<PayoutSource, string> = { worker: "worker_payouts", vendor: "vendor_payouts", venue: "venue_payouts" };

/** Marks a payout as paid — the manual half of the flow (admin has
 * already sent the money via UPI outside the platform, using the
 * recipient's payout_upi_id, and is recording that here). */
export async function markPayoutPaid(source: PayoutSource, id: string, payoutReference: string, adminUserId: string): Promise<void> {
  const { error } = await supabase.from(PAYOUT_TABLE[source] as never)
    .update({ status: "paid", payout_reference: payoutReference || null, paid_by: adminUserId, paid_at: new Date().toISOString() } as never)
    .eq("id" as never, id as never);
  if (error) throw error;
}

// =============================================================
// Per-event financial breakdown — "kontya event sathi kon kon hot,
// konta venue/vendor/worker booking, commission cut, and net payout
// per role, with receipt". fetchIncomingPayments/fetchPayouts above
// are flat lists (all hall/worker/vendor rows mixed together) — this
// groups the SAME underlying rows by customer_event_id so admin sees
// one event = venue + vendor(s) + worker(s) + who owes what, in one
// place, instead of piecing it together across two flat tables.
//
// If a venue owner provides everything himself (no separate vendor/
// worker hired for that event), vendors/workers below are simply
// empty arrays — the venue's own amount already covers everything,
// so 100% of the payout math still flows through the existing
// venue_payouts row, nothing extra needed for that case.
// =============================================================

export type EventPartyRow = {
  id: string;                 // booking id (customer_bookings.id / vendor_tasks.id / worker_tasks.id)
  role: "venue" | "vendor" | "worker";
  name: string;                // booking name — hall name, or "Vendor business — task"
  amount: number;               // what the customer was charged for this booking
  commission: number;           // platform's cut
  payout: number;                // amount - commission — what's owed to that role
  paymentStatus: string;         // customer_bookings/worker_tasks/vendor_tasks payment_status
  payoutStatus: "pending" | "paid" | "n/a"; // has the platform actually paid this role out yet
  razorpayPaymentId: string | null;
};

export type EventFinancialRow = {
  id: string;
  name: string;
  event_type: string | null;
  event_date: string | null;
  customer_name: string | null;
  venue: EventPartyRow[];
  vendors: EventPartyRow[];
  workers: EventPartyRow[];
  totalCollected: number;   // sum of amount across all paid parties for this event
  totalCommission: number;  // sum of commission across all paid parties
  totalOwed: number;        // sum of payout across all paid parties (pending + paid)
  totalPaidOut: number;     // of totalOwed, how much has actually been sent already
};

export async function fetchEventFinancials(): Promise<EventFinancialRow[]> {
  const [events, halls, vendors, workers, venuePayouts, vendorPayouts, workerPayouts] = await Promise.all([
    supabase.from("customer_events" as never)
      .select("id, name, event_type, event_date, user_id, created_at" as never)
      .order("created_at" as never, { ascending: false }),
    // No `.not(customer_event_id, is, null)` filter here anymore — a
    // booking made without going through "My Events" first (customer
    // booked a venue/vendor/worker directly) still needs to show up
    // somewhere, so those become their own standalone card below
    // instead of silently disappearing from this page.
    supabase.from("customer_bookings" as never)
      .select("id, customer_event_id, target_name, amount, commission_amount, payment_status, razorpay_payment_id, event_date, details" as never)
      .eq("kind" as never, "hall" as never),
    supabase.from("vendor_tasks" as never)
      .select("id, customer_event_id, task_name, event_name, event_date, payment_amount, commission_amount, payment_status, razorpay_payment_id, vendor:vendors(business_name)" as never),
    supabase.from("worker_tasks" as never)
      .select("id, customer_event_id, task_name, event_name, event_date, payment_amount, commission_amount, payment_status, razorpay_payment_id, worker:workers(full_name)" as never),
    supabase.from("venue_payouts" as never).select("booking_id, status" as never),
    supabase.from("vendor_payouts" as never).select("vendor_task_id, status" as never),
    supabase.from("worker_payouts" as never).select("worker_task_id, status" as never),
  ]);
  if (events.error) throw events.error;
  if (halls.error) throw halls.error;
  if (vendors.error) throw vendors.error;
  if (workers.error) throw workers.error;

  type EventRow = { id: string; name: string; event_type: string | null; event_date: string | null; user_id: string };
  type HallRow = { id: string; customer_event_id: string | null; target_name: string; amount: number; commission_amount: number; payment_status: string; razorpay_payment_id: string | null; event_date: string | null; details: { event_name?: string } | null };
  type TaskRow = { id: string; customer_event_id: string | null; task_name: string; event_name: string | null; event_date: string | null; payment_amount: number | null; commission_amount: number | null; payment_status: string; razorpay_payment_id: string | null };
  type VendorTaskRow = TaskRow & { vendor: { business_name: string } | null };
  type WorkerTaskRow = TaskRow & { worker: { full_name: string } | null };

  const venuePayoutStatus = new Map<string, string>();
  for (const p of ((venuePayouts.data as unknown as { booking_id: string; status: string }[]) ?? [])) venuePayoutStatus.set(p.booking_id, p.status);
  const vendorPayoutStatus = new Map<string, string>();
  for (const p of ((vendorPayouts.data as unknown as { vendor_task_id: string; status: string }[]) ?? [])) vendorPayoutStatus.set(p.vendor_task_id, p.status);
  const workerPayoutStatus = new Map<string, string>();
  for (const p of ((workerPayouts.data as unknown as { worker_task_id: string; status: string }[]) ?? [])) workerPayoutStatus.set(p.worker_task_id, p.status);

  const evRows = (events.data as unknown as EventRow[]) ?? [];
  const userIds = [...new Set(evRows.map((e) => e.user_id))];
  const { data: profs } = userIds.length ? await supabase.from("profiles").select("id,full_name").in("id", userIds) : { data: [] as { id: string; full_name: string | null }[] };
  const nameById = new Map((profs ?? []).map((p) => [p.id, p.full_name] as const));

  function toParty(role: EventPartyRow["role"], id: string, name: string, amount: number, commission: number, paymentStatus: string, payoutStatus: string | undefined, razorpayPaymentId: string | null): EventPartyRow {
    return {
      id, role, name, amount: amount || 0, commission: commission || 0, payout: Math.max((amount || 0) - (commission || 0), 0),
      paymentStatus, payoutStatus: paymentStatus !== "paid" ? "n/a" : (payoutStatus === "paid" ? "paid" : "pending"), razorpayPaymentId,
    };
  }

  const hallByEvent = new Map<string, EventPartyRow[]>();
  const standaloneVenue: { key: string; party: EventPartyRow; eventDate: string | null; eventName: string | null }[] = [];
  for (const r of (halls.data as unknown as HallRow[]) ?? []) {
    const party = toParty("venue", r.id, r.target_name, r.amount, r.commission_amount, r.payment_status, venuePayoutStatus.get(r.id), r.razorpay_payment_id);
    if (r.customer_event_id) {
      const arr = hallByEvent.get(r.customer_event_id) ?? [];
      arr.push(party);
      hallByEvent.set(r.customer_event_id, arr);
    } else {
      standaloneVenue.push({ key: `standalone-venue-${r.id}`, party, eventDate: r.event_date, eventName: r.details?.event_name ?? null });
    }
  }
  const vendorByEvent = new Map<string, EventPartyRow[]>();
  const standaloneVendor: { key: string; party: EventPartyRow; eventDate: string | null; eventName: string | null }[] = [];
  for (const r of (vendors.data as unknown as VendorTaskRow[]) ?? []) {
    const party = toParty("vendor", r.id, `${r.vendor?.business_name ?? "Vendor"} — ${r.task_name}`, r.payment_amount ?? 0, r.commission_amount ?? 0, r.payment_status, vendorPayoutStatus.get(r.id), r.razorpay_payment_id);
    if (r.customer_event_id) {
      const arr = vendorByEvent.get(r.customer_event_id) ?? [];
      arr.push(party);
      vendorByEvent.set(r.customer_event_id, arr);
    } else {
      standaloneVendor.push({ key: `standalone-vendor-${r.id}`, party, eventDate: r.event_date, eventName: r.event_name });
    }
  }
  const workerByEvent = new Map<string, EventPartyRow[]>();
  const standaloneWorker: { key: string; party: EventPartyRow; eventDate: string | null; eventName: string | null }[] = [];
  for (const r of (workers.data as unknown as WorkerTaskRow[]) ?? []) {
    const party = toParty("worker", r.id, `${r.worker?.full_name ?? "Worker"} — ${r.task_name}`, r.payment_amount ?? 0, r.commission_amount ?? 0, r.payment_status, workerPayoutStatus.get(r.id), r.razorpay_payment_id);
    if (r.customer_event_id) {
      const arr = workerByEvent.get(r.customer_event_id) ?? [];
      arr.push(party);
      workerByEvent.set(r.customer_event_id, arr);
    } else {
      standaloneWorker.push({ key: `standalone-worker-${r.id}`, party, eventDate: r.event_date, eventName: r.event_name });
    }
  }

  function summarize(id: string, name: string, event_type: string | null, event_date: string | null, customer_name: string | null, venue: EventPartyRow[], vendorsList: EventPartyRow[], workersList: EventPartyRow[]): EventFinancialRow {
    const all = [...venue, ...vendorsList, ...workersList].filter((p) => p.paymentStatus === "paid");
    return {
      id, name, event_type, event_date, customer_name,
      venue, vendors: vendorsList, workers: workersList,
      totalCollected: all.reduce((s, p) => s + p.amount, 0),
      totalCommission: all.reduce((s, p) => s + p.commission, 0),
      totalOwed: all.reduce((s, p) => s + p.payout, 0),
      totalPaidOut: all.filter((p) => p.payoutStatus === "paid").reduce((s, p) => s + p.payout, 0),
    };
  }

  const out: EventFinancialRow[] = evRows
    .map((e) => summarize(e.id, e.name, e.event_type, e.event_date, nameById.get(e.user_id) ?? null, hallByEvent.get(e.id) ?? [], vendorByEvent.get(e.id) ?? [], workerByEvent.get(e.id) ?? []))
    .filter((e) => e.venue.length + e.vendors.length + e.workers.length > 0); // only events with at least one booking

  // Standalone bookings — no customer_event_id, so each one becomes
  // its own single-party card, clearly labeled, instead of being
  // hidden because it never belonged to an "Event".
  for (const s of standaloneVenue) out.push(summarize(s.key, s.eventName ?? "Direct venue booking (no event)", null, s.eventDate, null, [s.party], [], []));
  for (const s of standaloneVendor) out.push(summarize(s.key, s.eventName ?? "Direct vendor booking (no event)", null, s.eventDate, null, [], [s.party], []));
  for (const s of standaloneWorker) out.push(summarize(s.key, s.eventName ?? "Direct worker booking (no event)", null, s.eventDate, null, [], [], [s.party]));

  return out;
}

// =============================================================
// Broadcast Center — admin announcements with a real deadline and
// per-user "seen it" tracking (see migration
// 20260816090000_broadcast_messages.sql). Separate from
// platform_notifications, which stays as-is for per-user things like
// approval/rejection notices.
// =============================================================

export type BroadcastAudience = "all" | "customer" | "hall_owner" | "vendor" | "worker" | "organization";

export type BroadcastMessage = {
  id: string;
  title: string;
  body: string | null;
  type: "info" | "success" | "warning" | "error";
  audience: BroadcastAudience;
  deadline: string | null;
  created_by: string | null;
  created_by_name: string;
  created_at: string;
  read_count: number;
};

export async function createBroadcastMessage(opts: {
  title: string; body: string; type: BroadcastMessage["type"]; audience: BroadcastAudience; deadline: string | null; adminUserId: string;
}): Promise<void> {
  const { error } = await supabase.from("broadcast_messages" as never).insert({
    title: opts.title, body: opts.body || null, type: opts.type, audience: opts.audience,
    deadline: opts.deadline, created_by: opts.adminUserId,
  } as never);
  if (error) throw error;
  await writeAudit("send_broadcast", "broadcast_messages", null, null, { audience: opts.audience, title: opts.title, deadline: opts.deadline });
}

/** Every broadcast ever sent, newest first — with who sent it and how
 * many recipients have actually seen it (a real count now, not a
 * guess from grouping notification rows). */
export async function fetchAllBroadcastMessages(): Promise<BroadcastMessage[]> {
  const { data, error } = await supabase
    .from("broadcast_messages" as never)
    .select("id,title,body,type,audience,deadline,created_by,created_at" as never)
    .order("created_at" as never, { ascending: false })
    .limit(200);
  if (error) throw error;
  type Raw = Omit<BroadcastMessage, "created_by_name" | "read_count">;
  const rows = (data as unknown as Raw[]) ?? [];
  if (rows.length === 0) return [];

  const ids = Array.from(new Set(rows.map((r) => r.created_by).filter(Boolean))) as string[];
  const names: Record<string, string> = {};
  if (ids.length) {
    const { data: profs } = await supabase.from("profiles").select("id,full_name").in("id", ids);
    (profs ?? []).forEach((p: { id: string; full_name: string | null }) => { names[p.id] = p.full_name ?? "Admin"; });
  }

  const messageIds = rows.map((r) => r.id);
  const { data: reads } = await supabase.from("broadcast_message_reads" as never).select("message_id" as never).in("message_id" as never, messageIds as never);
  const readCounts = new Map<string, number>();
  ((reads as unknown as { message_id: string }[]) ?? []).forEach((r) => readCounts.set(r.message_id, (readCounts.get(r.message_id) ?? 0) + 1));

  return rows.map((r) => ({ ...r, created_by_name: r.created_by ? names[r.created_by] ?? "Admin" : "Admin", read_count: readCounts.get(r.id) ?? 0 }));
}

// ============================================================
// Platform-wide analytics for the admin dashboard home page.
// Everything here reads tables admin already has RLS access to
// (see 20260722120000_admin_verification_center.sql,
// 20260805110000_admin_payment_visibility.sql, and
// 20260807120000_admin_events_visibility.sql for customer_events).
// ============================================================
export type PlatformAnalytics = {
  usersByRole: { customer: number; organization: number; hall_owner: number; vendor: number; worker: number; admin: number };
  totalUsers: number;
  totalEvents: number;
  totalBookings: number;      // hall bookings + vendor tasks + worker tasks, any status
  totalRevenue: number;       // sum of everything actually paid
  totalCommission: number;    // platform's cut of totalRevenue
  activeJobPostings: number;
};

export async function fetchPlatformAnalytics(): Promise<PlatformAnalytics> {
  const [
    profilesRes, eventsRes, bookingsRes, workerTasksRes, vendorTasksRes, postingsRes,
  ] = await Promise.all([
    supabase.from("profiles").select("primary_role"),
    supabase.from("customer_events").select("id", { count: "exact", head: true }),
    supabase.from("customer_bookings").select("amount, commission_amount, payment_status"),
    supabase.from("worker_tasks" as never).select("payment_amount, commission_amount, payment_status" as never),
    supabase.from("vendor_tasks" as never).select("payment_amount, commission_amount, payment_status" as never),
    supabase.from("worker_job_postings" as never).select("id", { count: "exact", head: true } as never).eq("status" as never, "open" as never),
  ]);

  const usersByRole = { customer: 0, organization: 0, hall_owner: 0, vendor: 0, worker: 0, admin: 0 };
  for (const p of (profilesRes.data ?? []) as { primary_role: string | null }[]) {
    if (p.primary_role && p.primary_role in usersByRole) {
      usersByRole[p.primary_role as keyof typeof usersByRole] += 1;
    }
  }
  const totalUsers = Object.values(usersByRole).reduce((a, b) => a + b, 0);

  type Paid = { amount?: number | null; payment_amount?: number | null; commission_amount?: number | null; payment_status: string };
  const bookings = (bookingsRes.data ?? []) as unknown as Paid[];
  const workerTasks = (workerTasksRes.data ?? []) as unknown as Paid[];
  const vendorTasks = (vendorTasksRes.data ?? []) as unknown as Paid[];

  let totalRevenue = 0;
  let totalCommission = 0;
  for (const b of bookings) {
    if (b.payment_status === "paid") { totalRevenue += Number(b.amount ?? 0); totalCommission += Number(b.commission_amount ?? 0); }
  }
  for (const t of [...workerTasks, ...vendorTasks]) {
    if (t.payment_status === "paid") { totalRevenue += Number(t.payment_amount ?? 0); totalCommission += Number(t.commission_amount ?? 0); }
  }

  return {
    usersByRole,
    totalUsers,
    totalEvents: eventsRes.count ?? 0,
    totalBookings: bookings.length + workerTasks.length + vendorTasks.length,
    totalRevenue,
    totalCommission,
    activeJobPostings: postingsRes.count ?? 0,
  };
}

// =============================================================
// Profile-activation & subscription revenue — the OTHER half of
// platform money, separate from booking commission. Every row here
// is 100% platform revenue (no payout owed to anyone), unlike the
// commission split on bookings above.
// =============================================================

export type ProfileRevenueRow = {
  id: string;
  role: "venue" | "vendor" | "worker";
  entity_id: string;
  entity_name: string;
  feature_type: "profile_activation" | "subscription_monthly" | "subscription_annual";
  amount: number;
  status: "created" | "paid" | "failed";
  razorpay_payment_id: string | null;
  created_at: string;
};

const ENTITY_TABLE_FOR_ROLE: Record<"venue" | "vendor" | "worker", { table: string; nameCol: string }> = {
  venue: { table: "halls", nameCol: "name" },
  vendor: { table: "vendors", nameCol: "business_name" },
  worker: { table: "workers", nameCol: "full_name" },
};

export async function fetchProfileRevenue(): Promise<ProfileRevenueRow[]> {
  const { data, error } = await supabase
    .from("public_profile_payments" as never)
    .select("id,role,entity_id,feature_type,amount,status,razorpay_payment_id,created_at" as never)
    .order("created_at" as never, { ascending: false })
    .limit(500);
  if (error) throw error;
  type Raw = { id: string; role: "venue" | "vendor" | "worker"; entity_id: string; feature_type: ProfileRevenueRow["feature_type"]; amount: number; status: ProfileRevenueRow["status"]; razorpay_payment_id: string | null; created_at: string };
  const rows = (data as unknown as Raw[]) ?? [];

  const byRole = new Map<"venue" | "vendor" | "worker", Set<string>>();
  for (const r of rows) { if (!byRole.has(r.role)) byRole.set(r.role, new Set()); byRole.get(r.role)!.add(r.entity_id); }
  const names: Record<string, string> = {};
  await Promise.all(Array.from(byRole.entries()).map(async ([role, ids]) => {
    const { table, nameCol } = ENTITY_TABLE_FOR_ROLE[role];
    const { data: ents } = await supabase.from(table as never).select(`id,${nameCol}` as never).in("id" as never, Array.from(ids) as never);
    (ents as unknown as Record<string, string>[] ?? []).forEach((e) => { names[`${role}:${e.id}`] = (e[nameCol] as unknown as string) || "Untitled"; });
  }));

  return rows.map((r) => ({ ...r, entity_name: names[`${r.role}:${r.entity_id}`] ?? "Untitled" }));
}

// =============================================================
// Refunds — requested by any role (against a booking/task/profile
// payment), visible to admin, actioned (approve/reject/mark
// processed) by admin. See migration 20260815090000_refunds_and_complaints.sql.
// =============================================================

export type RefundRow = {
  id: string;
  source_type: "booking" | "worker_task" | "vendor_task" | "profile_payment";
  source_id: string;
  entity_name: string | null;
  amount: number;
  reason: string | null;
  requested_by: string | null;
  requested_by_name: string;
  status: "requested" | "approved" | "rejected" | "processed";
  admin_notes: string | null;
  razorpay_refund_id: string | null;
  processed_at: string | null;
  created_at: string;
};

export async function fetchRefunds(): Promise<RefundRow[]> {
  const { data, error } = await supabase
    .from("refunds" as never)
    .select("id,source_type,source_id,entity_name,amount,reason,requested_by,status,admin_notes,razorpay_refund_id,processed_at,created_at" as never)
    .order("created_at" as never, { ascending: false })
    .limit(500);
  if (error) throw error;
  type Raw = Omit<RefundRow, "requested_by_name">;
  const rows = (data as unknown as Raw[]) ?? [];
  const ids = Array.from(new Set(rows.map((r) => r.requested_by).filter(Boolean))) as string[];
  const names: Record<string, string> = {};
  if (ids.length) {
    const { data: profs } = await supabase.from("profiles").select("id,full_name").in("id", ids);
    (profs ?? []).forEach((p: { id: string; full_name: string | null }) => { names[p.id] = p.full_name ?? "Someone"; });
  }
  return rows.map((r) => ({ ...r, requested_by_name: r.requested_by ? names[r.requested_by] ?? "Someone" : "Admin" }));
}

/** Admin approves/rejects a refund request, or logs one directly. */
export async function updateRefundStatus(id: string, status: "approved" | "rejected" | "processed", opts: { adminNotes?: string; razorpayRefundId?: string; adminUserId: string }): Promise<void> {
  const patch: Record<string, unknown> = { status, admin_notes: opts.adminNotes || null, processed_by: opts.adminUserId };
  if (status === "processed") { patch.processed_at = new Date().toISOString(); patch.razorpay_refund_id = opts.razorpayRefundId || null; }
  const { error } = await supabase.from("refunds" as never).update(patch as never).eq("id" as never, id as never);
  if (error) throw error;
}

/** Admin logs a refund that wasn't requested through the app (e.g. a
 * goodwill refund decided over a call) — goes straight to 'processed'. */
export async function logManualRefund(opts: {
  sourceType: RefundRow["source_type"]; sourceId: string; entityName: string; amount: number; reason: string;
  razorpayRefundId?: string; adminUserId: string;
}): Promise<void> {
  const { error } = await supabase.from("refunds" as never).insert({
    source_type: opts.sourceType, source_id: opts.sourceId, entity_name: opts.entityName, amount: opts.amount,
    reason: opts.reason, requested_by: opts.adminUserId, status: "processed",
    razorpay_refund_id: opts.razorpayRefundId || null, processed_by: opts.adminUserId, processed_at: new Date().toISOString(),
  } as never);
  if (error) throw error;
}

// =============================================================
// Complaints — a simple support-ticket table any role can raise.
// =============================================================

export type ComplaintRow = {
  id: string;
  raised_by: string;
  raised_by_name: string;
  raised_by_role: string | null;
  subject: string;
  description: string;
  related_source_type: string | null;
  related_source_id: string | null;
  status: "open" | "in_progress" | "resolved" | "closed";
  admin_notes: string | null;
  created_at: string;
  resolved_at: string | null;
};

export async function fetchComplaints(): Promise<ComplaintRow[]> {
  const { data, error } = await supabase
    .from("complaints" as never)
    .select("id,raised_by,raised_by_role,subject,description,related_source_type,related_source_id,status,admin_notes,created_at,resolved_at" as never)
    .order("created_at" as never, { ascending: false })
    .limit(500);
  if (error) throw error;
  type Raw = Omit<ComplaintRow, "raised_by_name">;
  const rows = (data as unknown as Raw[]) ?? [];
  const ids = Array.from(new Set(rows.map((r) => r.raised_by).filter(Boolean)));
  const names: Record<string, string> = {};
  if (ids.length) {
    const { data: profs } = await supabase.from("profiles").select("id,full_name").in("id", ids);
    (profs ?? []).forEach((p: { id: string; full_name: string | null }) => { names[p.id] = p.full_name ?? "Someone"; });
  }
  return rows.map((r) => ({ ...r, raised_by_name: names[r.raised_by] ?? "Someone" }));
}

export async function updateComplaintStatus(id: string, status: ComplaintRow["status"], adminNotes?: string): Promise<void> {
  const patch: Record<string, unknown> = { status, admin_notes: adminNotes || null };
  if (status === "resolved" || status === "closed") patch.resolved_at = new Date().toISOString();
  const { error } = await supabase.from("complaints" as never).update(patch as never).eq("id" as never, id as never);
  if (error) throw error;
}
