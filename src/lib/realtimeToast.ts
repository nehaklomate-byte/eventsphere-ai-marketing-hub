import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

type NotifRow = { title?: string; body?: string | null };

/**
 * Every role already has a Supabase Realtime channel that silently bumps an
 * unread badge count when a notifications row is inserted — nothing ever
 * actually surfaced the notification itself, so nothing "popped up" the way
 * a real app does. This subscribes to INSERTs on `table` for the given user
 * and fires a toast popup for each new row, on top of whatever else the
 * caller's own postgres_changes handler already does (badge refresh etc).
 *
 * Returns an unsubscribe function — call it from the effect's cleanup.
 */
export function subscribeNotificationToasts(
  channelName: string,
  table: string,
  userId: string,
): () => void {
  const ch = supabase
    .channel(channelName)
    .on(
      "postgres_changes" as never,
      { event: "INSERT", schema: "public", table, filter: `user_id=eq.${userId}` } as never,
      (payload: { new: NotifRow }) => {
        const row = payload.new ?? {};
        toast(row.title || "New notification", { description: row.body ?? undefined });
      },
    )
    .subscribe();
  return () => { supabase.removeChannel(ch); };
}
