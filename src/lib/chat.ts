import { supabase } from "@/integrations/supabase/client";

/**
 * Generic cross-role messaging — works for any conversation created by
 * the DB triggers in 20260805090000_messaging_system.sql (enquiries,
 * worker_tasks, vendor_tasks, customer_bookings). One data layer, one
 * <ChatPanel/> component, reused everywhere a "Message" button appears.
 */

export type ConversationContextType = "hall_enquiry" | "vendor_enquiry" | "worker_enquiry" | "worker_task" | "vendor_task" | "customer_booking";

export type ConversationSummary = {
  id: string;
  context_type: ConversationContextType;
  context_id: string;
  subject: string | null;
  last_message_at: string;
  created_at: string;
  other_participant_id: string | null;
  other_role_label: string | null;
  // The person on the other end's actual name — `subject` alone can't
  // serve this: it's a fixed string set once when the conversation is
  // created (usually the venue/task name), so a venue owner with ten
  // customers all booking the same hall would see the SAME subject
  // ("Vishwaraj lawns") on every single row and have no way to tell
  // who any of them actually are. This is resolved per-viewer instead.
  other_participant_name: string;
  // For customer_booking conversations, the event this booking is
  // for (from customer_bookings.details.event_name) — subject alone
  // (the venue name) doesn't say WHICH event/booking a thread is
  // about when the same venue has several.
  event_name: string | null;
  unread_count: number;
  last_message_preview: string | null;
};

export type Message = {
  id: string;
  conversation_id: string;
  sender_id: string;
  sender_name: string;
  body: string;
  created_at: string;
  attachments: { url: string; name: string; type: string; size: number }[];
};

/** Finds (or lazily creates, if the DB trigger hasn't fired yet for some
 * older row) the conversation for a given booking/task/enquiry. */
export async function getOrCreateConversation(
  contextType: ConversationContextType, contextId: string, subject: string,
  userA: string, roleA: string, userB: string, roleB: string,
): Promise<string> {
  const { data, error } = await supabase.rpc("get_or_create_conversation" as never, {
    p_context_type: contextType, p_context_id: contextId, p_subject: subject,
    p_user_a: userA, p_role_a: roleA, p_user_b: userB, p_role_b: roleB,
  } as never);
  if (error) throw error;
  return data as unknown as string;
}

export async function fetchMyConversations(userId: string): Promise<ConversationSummary[]> {
  const { data: rows, error } = await supabase
    .from("conversation_participants" as never)
    .select("conversation_id, last_read_at, conversations:conversation_id(id, context_type, context_id, subject, last_message_at, created_at)")
    .eq("user_id" as never, userId as never)
    .order("conversation_id" as never);
  if (error) throw error;

  const list = (rows as unknown as { conversation_id: string; last_read_at: string | null; conversations: ConversationSummary }[]) ?? [];
  if (list.length === 0) return [];

  const conversationIds = list.map((r) => r.conversation_id);

  const { data: others } = await supabase
    .from("conversation_participants" as never)
    .select("conversation_id, user_id, role_label")
    .in("conversation_id" as never, conversationIds as never)
    .neq("user_id" as never, userId as never);
  const otherRows = ((others as unknown as { conversation_id: string; user_id: string; role_label: string | null }[]) ?? []);
  const otherByConv = new Map(otherRows.map((o) => [o.conversation_id, o]));

  // Resolve the other participant's actual name via profile_directory
  // (migration 20260823150000) — profiles itself only allows reading
  // your OWN row, so a customer/venue owner/vendor/worker could never
  // see who they're actually talking to; this view is the fix.
  const otherUserIds = Array.from(new Set(otherRows.map((o) => o.user_id)));
  const nameById = new Map<string, string>();
  if (otherUserIds.length) {
    const { data: profs } = await supabase.from("profile_directory" as never).select("id, full_name, business_name" as never).in("id" as never, otherUserIds as never);
    ((profs as unknown as { id: string; full_name: string | null; business_name?: string | null }[]) ?? []).forEach((p) => {
      if (p.full_name || p.business_name) nameById.set(p.id, p.full_name || p.business_name!);
    });
  }

  // For hall bookings, look up the event name too — the venue owner
  // needs to know WHICH event a thread is about, not just the venue's
  // own name (which is all `subject` currently carries for these).
  const bookingConvContextIds = list.filter((r) => r.conversations.context_type === "customer_booking").map((r) => r.conversations.context_id);
  const eventNameByContextId = new Map<string, string>();
  if (bookingConvContextIds.length) {
    const { data: bookings } = await supabase.from("customer_bookings").select("id, details").in("id", bookingConvContextIds);
    ((bookings as unknown as { id: string; details: { event_name?: string } | null }[]) ?? []).forEach((b) => {
      if (b.details?.event_name) eventNameByContextId.set(b.id, b.details.event_name);
    });
  }

  const { data: lastMsgs } = await supabase
    .from("messages" as never)
    .select("conversation_id, body, created_at")
    .in("conversation_id" as never, conversationIds as never)
    .order("created_at" as never, { ascending: false });
  const previewByConv = new Map<string, string>();
  ((lastMsgs as unknown as { conversation_id: string; body: string }[]) ?? []).forEach((m) => {
    if (!previewByConv.has(m.conversation_id)) previewByConv.set(m.conversation_id, m.body);
  });

  const { data: unreadCounts } = await supabase
    .from("messages" as never)
    .select("conversation_id, created_at")
    .in("conversation_id" as never, conversationIds as never);
  const unreadByConv = new Map<string, number>();
  const readAtByConv = new Map(list.map((r) => [r.conversation_id, r.last_read_at]));
  ((unreadCounts as unknown as { conversation_id: string; created_at: string }[]) ?? []).forEach((m) => {
    const readAt = readAtByConv.get(m.conversation_id);
    if (!readAt || new Date(m.created_at) > new Date(readAt)) {
      unreadByConv.set(m.conversation_id, (unreadByConv.get(m.conversation_id) ?? 0) + 1);
    }
  });

  return list
    .map((r) => {
      const other = otherByConv.get(r.conversation_id);
      return {
        ...r.conversations,
        other_participant_id: other?.user_id ?? null,
        other_role_label: other?.role_label ?? null,
        other_participant_name: (other?.user_id && nameById.get(other.user_id)) || "Someone",
        event_name: eventNameByContextId.get(r.conversations.context_id) ?? null,
        unread_count: unreadByConv.get(r.conversation_id) ?? 0,
        last_message_preview: previewByConv.get(r.conversation_id) ?? null,
      };
    })
    .sort((a, b) => new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime());
}

export async function fetchMessages(conversationId: string): Promise<Message[]> {
  const { data, error } = await supabase
    .from("messages" as never).select("*")
    .eq("conversation_id" as never, conversationId as never)
    .order("created_at" as never, { ascending: true });
  if (error) throw error;
  const rows = (data as unknown as Omit<Message, "sender_name">[]) ?? [];
  return attachSenderNames(rows);
}

/** WhatsApp-style sender labels — batch-fetches profiles for whoever
 * sent messages in this list so the bubble can show who said it. */
async function attachSenderNames<T extends { sender_id: string }>(rows: T[]): Promise<(T & { sender_name: string })[]> {
  if (rows.length === 0) return [];
  const senderIds = Array.from(new Set(rows.map((r) => r.sender_id)));
  // profile_directory (migration 20260823150000), NOT profiles directly —
  // profiles' RLS only allows reading your OWN row, so a straight query
  // against it silently returns nothing for whoever you're chatting
  // with and every bubble falls back to "Someone".
  const { data: profs } = await supabase.from("profile_directory" as never).select("id, full_name, business_name" as never).in("id" as never, senderIds as never);
  const nameById = new Map(((profs as unknown as { id: string; full_name: string | null; business_name?: string | null }[]) ?? []).map((p) => [p.id, p.full_name || p.business_name || "Someone"]));
  return rows.map((r) => ({ ...r, sender_name: nameById.get(r.sender_id) ?? "Someone" }));
}

/** Each conversation participant's last_read_at — used to show a
 * WhatsApp-style "Seen" mark on messages I sent once the other person
 * has read past them. */
export async function fetchConversationReadState(conversationId: string): Promise<{ user_id: string; last_read_at: string | null }[]> {
  const { data, error } = await supabase
    .from("conversation_participants" as never)
    .select("user_id, last_read_at" as never)
    .eq("conversation_id" as never, conversationId as never);
  if (error) throw error;
  return (data as unknown as { user_id: string; last_read_at: string | null }[]) ?? [];
}

export async function sendMessage(conversationId: string, senderId: string, body: string, attachments: Message["attachments"] = []): Promise<Message> {
  const { data, error } = await supabase
    .from("messages" as never)
    .insert({ conversation_id: conversationId, sender_id: senderId, body, attachments } as never)
    .select().single();
  if (error) throw error;

  // Push notification for whoever else is in this conversation — fire
  // and forget, never blocks sending. The in-app notification (bell,
  // badge, toast) is handled separately by a DB trigger on this insert.
  notifyOtherParticipants(conversationId, senderId, body).catch(() => {});

  const [withName] = await attachSenderNames([data as unknown as Omit<Message, "sender_name">]);
  return withName;
}

async function notifyOtherParticipants(conversationId: string, senderId: string, body: string): Promise<void> {
  const { data: participants } = await supabase
    .from("conversation_participants" as never)
    .select("user_id")
    .eq("conversation_id" as never, conversationId as never);
  const otherIds = ((participants as unknown as { user_id: string }[]) ?? [])
    .map((p) => p.user_id)
    .filter((id) => id !== senderId);
  if (otherIds.length === 0) return;

  const { data: sender } = await supabase.from("profiles" as never).select("full_name, business_name").eq("id" as never, senderId as never).maybeSingle();
  const senderRow = sender as unknown as { full_name?: string; business_name?: string } | null;
  const senderName = senderRow?.full_name || senderRow?.business_name || "Someone";

  await supabase.functions.invoke("send-push", {
    body: { user_ids: otherIds, title: `New message from ${senderName}`, body: body.slice(0, 120), url: "/" },
  });
}

export async function markConversationRead(conversationId: string, userId: string): Promise<void> {
  await supabase
    .from("conversation_participants" as never)
    .update({ last_read_at: new Date().toISOString() } as never)
    .eq("conversation_id" as never, conversationId as never)
    .eq("user_id" as never, userId as never);
}

/** Subscribes to new messages in a conversation. Call the returned
 * function to unsubscribe (e.g. in a useEffect cleanup). */
export function subscribeToMessages(conversationId: string, onMessage: (m: Message) => void): () => void {
  const channel = supabase
    .channel(`messages:${conversationId}`)
    .on(
      "postgres_changes" as never,
      { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${conversationId}` } as never,
      (payload: { new: Omit<Message, "sender_name"> }) => {
        attachSenderNames([payload.new]).then(([m]) => onMessage(m));
      },
    )
    .subscribe();
  return () => { supabase.removeChannel(channel); };
}

export async function totalUnreadCount(userId: string): Promise<number> {
  const conversations = await fetchMyConversations(userId);
  return conversations.reduce((sum, c) => sum + c.unread_count, 0);
}

/** Live-updates "Seen" ticks: fires whenever any participant's
 * last_read_at changes in this conversation (i.e. the other person
 * opened/scrolled the chat). */
export function subscribeToReadReceipts(conversationId: string, onChange: (row: { user_id: string; last_read_at: string | null }) => void): () => void {
  const channel = supabase
    .channel(`read-receipts:${conversationId}`)
    .on(
      "postgres_changes" as never,
      { event: "UPDATE", schema: "public", table: "conversation_participants", filter: `conversation_id=eq.${conversationId}` } as never,
      (payload: { new: { user_id: string; last_read_at: string | null } }) => onChange(payload.new),
    )
    .subscribe();
  return () => { supabase.removeChannel(channel); };
}
