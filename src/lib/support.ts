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
