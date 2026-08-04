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
  unread_count: number;
  last_message_preview: string | null;
};

export type Message = {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string;
  created_at: string;
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
  const otherByConv = new Map(((others as unknown as { conversation_id: string; user_id: string; role_label: string | null }[]) ?? []).map((o) => [o.conversation_id, o]));

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
  return (data as unknown as Message[]) ?? [];
}

export async function sendMessage(conversationId: string, senderId: string, body: string): Promise<Message> {
  const { data, error } = await supabase
    .from("messages" as never)
    .insert({ conversation_id: conversationId, sender_id: senderId, body } as never)
    .select().single();
  if (error) throw error;
  return data as unknown as Message;
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
      (payload: { new: Message }) => onMessage(payload.new),
    )
    .subscribe();
  return () => { supabase.removeChannel(channel); };
}

export async function totalUnreadCount(userId: string): Promise<number> {
  const conversations = await fetchMyConversations(userId);
  return conversations.reduce((sum, c) => sum + c.unread_count, 0);
}
