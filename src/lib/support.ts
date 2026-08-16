// Path: src/lib/support.ts
import { supabase } from "@/integrations/supabase/client";

export type RefundSourceType = "booking" | "worker_task" | "vendor_task" | "profile_payment";

/** Any authenticated user requesting a refund on their own booking/task
 * payment. Lands as status='requested' — admin reviews it from
 * /admin/refunds and approves/rejects/processes from there. */
export async function requestRefund(opts: {
  sourceType: RefundSourceType; sourceId: string; entityName: string; amount: number; reason: string; userId: string;
}): Promise<void> {
  const { error } = await supabase.from("refunds" as never).insert({
    source_type: opts.sourceType, source_id: opts.sourceId, entity_name: opts.entityName,
    amount: opts.amount, reason: opts.reason, requested_by: opts.userId, status: "requested",
  } as never);
  if (error) throw error;
}

/** Any authenticated user raising a complaint — optionally pointed at
 * a specific booking/task so admin has context. Shows up for admin at
 * /admin/complaints. */
export async function submitComplaint(opts: {
  userId: string; role: string; subject: string; description: string;
  relatedSourceType?: RefundSourceType; relatedSourceId?: string;
}): Promise<void> {
  const { error } = await supabase.from("complaints" as never).insert({
    raised_by: opts.userId, raised_by_role: opts.role, subject: opts.subject, description: opts.description,
    related_source_type: opts.relatedSourceType || null, related_source_id: opts.relatedSourceId || null,
    status: "open",
  } as never);
  if (error) throw error;
}

// =============================================================
// Broadcast messages — the "seen once, ever" popup shown on first
// dashboard view. See migration 20260816090000_broadcast_messages.sql.
// =============================================================

export type ActiveBroadcast = {
  id: string;
  title: string;
  body: string | null;
  type: "info" | "success" | "warning" | "error";
  deadline: string | null;
  created_at: string;
};

/** The single most recent broadcast that (a) matches this user's role
 * or is for everyone, (b) hasn't passed its deadline, and (c) this
 * user hasn't already marked read — or null if there's nothing new. */
export async function fetchUnreadBroadcast(userId: string): Promise<ActiveBroadcast | null> {
  const nowIso = new Date().toISOString();
  const { data: reads } = await supabase.from("broadcast_message_reads" as never).select("message_id" as never).eq("user_id" as never, userId as never);
  const readIds = ((reads as unknown as { message_id: string }[]) ?? []).map((r) => r.message_id);

  let query = supabase
    .from("broadcast_messages" as never)
    .select("id,title,body,type,deadline,created_at" as never)
    .or(`deadline.is.null,deadline.gt.${nowIso}`)
    .order("created_at" as never, { ascending: false })
    .limit(1);
  if (readIds.length) query = query.not("id" as never, "in" as never, `(${readIds.join(",")})` as never);
  const { data, error } = await query.maybeSingle();
  if (error) throw error;
  return (data as unknown as ActiveBroadcast) ?? null;
}

/** Marks a broadcast as seen for this user — after this it will never
 * show again for them, on any device. */
export async function markBroadcastRead(messageId: string, userId: string): Promise<void> {
  const { error } = await supabase.from("broadcast_message_reads" as never).insert({ message_id: messageId, user_id: userId } as never);
  if (error) throw error;
}
