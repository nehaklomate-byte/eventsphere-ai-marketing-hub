import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Send, Loader2, MessageCircle, X, Check, CheckCheck } from "lucide-react";
import { toast } from "sonner";
import {
  fetchMessages, sendMessage, markConversationRead, subscribeToMessages, subscribeToReadReceipts,
  fetchConversationReadState, type Message,
} from "@/lib/chat";
import { AttachmentUpload, AttachmentGallery, type Attachment } from "@/components/AttachmentUpload";
import { EmojiPicker } from "@/components/EmojiPicker";

/**
 * Drop this in wherever a booking/task/enquiry has a "Message" button.
 * Fully self-contained: fetches history, subscribes to realtime updates,
 * marks read on open, and sends new messages.
 */
export function ChatPanel({ conversationId, userId, otherLabel, aboutLabel, onClose }: {
  conversationId: string; userId: string; otherLabel?: string; aboutLabel?: string; onClose: () => void;
}) {
  const qc = useQueryClient();
  const [draft, setDraft] = useState("");
  const [pendingAttachments, setPendingAttachments] = useState<Attachment[]>([]);
  const [sending, setSending] = useState(false);
  // last_read_at of the OTHER participant — everything I sent at or
  // before this timestamp has been seen, WhatsApp-style.
  const [otherLastReadAt, setOtherLastReadAt] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const { data: messages = [], isLoading } = useQuery({
    queryKey: ["messages", conversationId],
    queryFn: () => fetchMessages(conversationId),
  });

  useEffect(() => {
    markConversationRead(conversationId, userId).catch(() => {});
    fetchConversationReadState(conversationId).then((rows) => {
      const other = rows.find((r) => r.user_id !== userId);
      setOtherLastReadAt(other?.last_read_at ?? null);
    }).catch(() => {});

    const unsubscribeMessages = subscribeToMessages(conversationId, (m) => {
      qc.setQueryData<Message[]>(["messages", conversationId], (prev) => (prev ?? []).some((x) => x.id === m.id) ? prev! : [...(prev ?? []), m]);
      if (m.sender_id !== userId) markConversationRead(conversationId, userId).catch(() => {});
    });
    const unsubscribeReads = subscribeToReadReceipts(conversationId, (row) => {
      if (row.user_id !== userId) setOtherLastReadAt(row.last_read_at);
    });
    return () => { unsubscribeMessages(); unsubscribeReads(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages.length]);

  async function submit() {
    const body = draft.trim();
    if (!body && pendingAttachments.length === 0) return; // a photo-only message is fine, an empty one isn't
    const attachments = pendingAttachments;
    setSending(true);
    setDraft("");
    setPendingAttachments([]);
    try {
      await sendMessage(conversationId, userId, body, attachments);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to send");
      setDraft(body);
      setPendingAttachments(attachments);
    } finally { setSending(false); }
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-end bg-black/40 p-0 sm:place-items-center sm:p-4" onClick={onClose}>
      <div className="flex h-[85vh] w-full max-w-md flex-col rounded-t-3xl border border-border bg-card shadow-elegant sm:h-[600px] sm:rounded-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div className="flex items-center gap-2 min-w-0">
            <MessageCircle className="h-4 w-4 shrink-0 text-brand-violet" />
            <div className="min-w-0">
              <h3 className="truncate font-semibold text-sm">{otherLabel ?? "Conversation"}</h3>
              {aboutLabel && <p className="truncate text-[11px] text-muted-foreground">{aboutLabel}</p>}
            </div>
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
            messages.map((m, idx) => {
              const mine = m.sender_id === userId;
              // Only label the sender when it changes from the previous
              // bubble — same WhatsApp behaviour, avoids repeating the
              // name on every line of a back-to-back run of messages.
              const prevSender = idx > 0 ? messages[idx - 1].sender_id : null;
              const showSenderLabel = !mine && m.sender_id !== prevSender;
              const seen = mine && otherLastReadAt && new Date(m.created_at) <= new Date(otherLastReadAt);
              return (
                <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                  <div className="max-w-[75%]">
                    {showSenderLabel && (
                      <div className="mb-0.5 px-1 text-[11px] font-semibold text-brand-violet">{m.sender_name}</div>
                    )}
                    <div className={`rounded-2xl px-3.5 py-2 text-sm ${mine ? "bg-gradient-brand text-white" : "bg-accent text-foreground"}`}>
                      {m.body && <div className="whitespace-pre-wrap break-words">{m.body}</div>}
                      {m.attachments?.length > 0 && <AttachmentGallery attachments={m.attachments} />}
                      <div className={`mt-1 flex items-center gap-1 text-[10px] ${mine ? "text-white/70" : "text-muted-foreground"}`}>
                        <span>{new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                        {mine && (seen ? <CheckCheck className="h-3 w-3" /> : <Check className="h-3 w-3" />)}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={bottomRef} />
        </div>

        <div className="border-t border-border p-3">
          {pendingAttachments.length > 0 && (
            <div className="mb-2">
              <AttachmentUpload pathPrefix={`chat/${conversationId}`} value={pendingAttachments} onChange={setPendingAttachments} maxFiles={6} />
            </div>
          )}
          <div className="flex items-center gap-1.5">
            {pendingAttachments.length === 0 && (
              <AttachmentUpload pathPrefix={`chat/${conversationId}`} value={pendingAttachments} onChange={setPendingAttachments} maxFiles={6} compact />
            )}
            <EmojiPicker compact onSelect={(e) => setDraft((d) => d + e)} />
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submit(); } }}
              placeholder="Type a message…"
              className="flex-1 rounded-full border border-input bg-background px-4 py-2.5 text-sm outline-none focus:border-brand-violet"
            />
            <button onClick={submit} disabled={sending || (!draft.trim() && pendingAttachments.length === 0)}
              className="grid h-10 w-10 shrink-0 place-items-center rounded-full btn-brand btn-brand-hover disabled:opacity-50">
              {sending ? <Loader2 className="h-4 w-4 animate-spin text-white" /> : <Send className="h-4 w-4 text-white" />}
            </button>
          </div>
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
