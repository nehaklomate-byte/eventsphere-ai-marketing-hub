import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Send, Loader2, MessageCircle, X } from "lucide-react";
import { toast } from "sonner";
import {
  fetchMessages, sendMessage, markConversationRead, subscribeToMessages, type Message,
} from "@/lib/chat";

/**
 * Drop this in wherever a booking/task/enquiry has a "Message" button.
 * Fully self-contained: fetches history, subscribes to realtime updates,
 * marks read on open, and sends new messages.
 */
export function ChatPanel({ conversationId, userId, otherLabel, onClose }: {
  conversationId: string; userId: string; otherLabel?: string; onClose: () => void;
}) {
  const qc = useQueryClient();
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const { data: messages = [], isLoading } = useQuery({
    queryKey: ["messages", conversationId],
    queryFn: () => fetchMessages(conversationId),
  });

  useEffect(() => {
    markConversationRead(conversationId, userId).catch(() => {});
    const unsubscribe = subscribeToMessages(conversationId, (m) => {
      qc.setQueryData<Message[]>(["messages", conversationId], (prev) => (prev ?? []).some((x) => x.id === m.id) ? prev! : [...(prev ?? []), m]);
      if (m.sender_id !== userId) markConversationRead(conversationId, userId).catch(() => {});
    });
    return unsubscribe;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages.length]);

  async function submit() {
    const body = draft.trim();
    if (!body) return;
    setSending(true);
    setDraft("");
    try {
      await sendMessage(conversationId, userId, body);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to send");
      setDraft(body);
    } finally { setSending(false); }
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-end bg-black/40 p-0 sm:place-items-center sm:p-4" onClick={onClose}>
      <div className="flex h-[85vh] w-full max-w-md flex-col rounded-t-3xl border border-border bg-card shadow-elegant sm:h-[600px] sm:rounded-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div className="flex items-center gap-2">
            <MessageCircle className="h-4 w-4 text-brand-violet" />
            <h3 className="font-semibold text-sm">{otherLabel ?? "Conversation"}</h3>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 hover:bg-accent"><X className="h-4 w-4" /></button>
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
          {isLoading ? (
            <div className="grid h-full place-items-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
          ) : messages.length === 0 ? (
            <div className="grid h-full place-items-center text-center text-sm text-muted-foreground">
              <div><MessageCircle className="mx-auto mb-2 h-6 w-6 opacity-40" />No messages yet — say hello.</div>
            </div>
          ) : (
            messages.map((m) => {
              const mine = m.sender_id === userId;
              return (
                <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[75%] rounded-2xl px-3.5 py-2 text-sm ${mine ? "bg-gradient-brand text-white" : "bg-accent text-foreground"}`}>
                    <div className="whitespace-pre-wrap break-words">{m.body}</div>
                    <div className={`mt-1 text-[10px] ${mine ? "text-white/70" : "text-muted-foreground"}`}>
                      {new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={bottomRef} />
        </div>

        <div className="flex items-center gap-2 border-t border-border p-3">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submit(); } }}
            placeholder="Type a message…"
            className="flex-1 rounded-full border border-input bg-background px-4 py-2.5 text-sm outline-none focus:border-brand-violet"
          />
          <button onClick={submit} disabled={sending || !draft.trim()}
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full btn-brand btn-brand-hover disabled:opacity-50">
            {sending ? <Loader2 className="h-4 w-4 animate-spin text-white" /> : <Send className="h-4 w-4 text-white" />}
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * The button that opens a ChatPanel for a specific booking/task/enquiry.
 * Resolves (or lazily creates) the conversation on click, so it works
 * even for older rows created before the auto-conversation triggers
 * existed.
 */
export function MessageButton({
  contextType, contextId, subject, userId, userRole, otherUserId, otherRole, otherLabel, className,
}: {
  contextType: Parameters<typeof import("@/lib/chat").getOrCreateConversation>[0];
  contextId: string; subject: string; userId: string; userRole: string;
  otherUserId: string; otherRole: string; otherLabel?: string; className?: string;
}) {
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [opening, setOpening] = useState(false);

  async function open() {
    setOpening(true);
    try {
      const { getOrCreateConversation } = await import("@/lib/chat");
      const id = await getOrCreateConversation(contextType, contextId, subject, userId, userRole, otherUserId, otherRole);
      setConversationId(id);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not open chat");
    } finally { setOpening(false); }
  }

  return (
    <>
      <button onClick={open} disabled={opening}
        className={className ?? "inline-flex items-center gap-1.5 rounded-full border border-input px-3.5 py-1.5 text-xs font-semibold hover:bg-accent disabled:opacity-50"}>
        {opening ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <MessageCircle className="h-3.5 w-3.5" />} Message
      </button>
      {conversationId && <ChatPanel conversationId={conversationId} userId={userId} otherLabel={otherLabel} onClose={() => setConversationId(null)} />}
    </>
  );
}
