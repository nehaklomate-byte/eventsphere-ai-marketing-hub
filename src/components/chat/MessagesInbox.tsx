import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { MessageCircle, Loader2 } from "lucide-react";
import { fetchMyConversations, type ConversationSummary } from "@/lib/chat";
import { ChatPanel } from "./ChatPanel";

const CONTEXT_LABEL: Record<string, string> = {
  hall_enquiry: "Venue enquiry", vendor_enquiry: "Vendor enquiry", worker_enquiry: "Worker enquiry",
  worker_task: "Worker booking", vendor_task: "Vendor booking", customer_booking: "Booking",
};

/** Drop into any role's Messages/Notifications page: <MessagesInbox userId={user.id} /> */
export function MessagesInbox({ userId }: { userId: string }) {
  const [openId, setOpenId] = useState<string | null>(null);
  const { data: conversations = [], isLoading } = useQuery({
    queryKey: ["my-conversations", userId], queryFn: () => fetchMyConversations(userId), refetchInterval: 20000,
  });

  if (isLoading) return <div className="grid place-items-center py-16"><Loader2 className="h-6 w-6 animate-spin text-brand-violet" /></div>;

  if (conversations.length === 0) {
    return (
      <div className="rounded-2xl border border-border bg-card p-10 text-center">
        <MessageCircle className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">No conversations yet. Messaging starts automatically once you book, enquire, or get assigned a task.</p>
      </div>
    );
  }

  const active = conversations.find((c) => c.id === openId);

  return (
    <>
      <div className="divide-y divide-border rounded-2xl border border-border bg-card">
        {conversations.map((c) => (
          <ConversationRow key={c.id} conversation={c} onClick={() => setOpenId(c.id)} />
        ))}
      </div>
      {active && (
        <ChatPanel conversationId={active.id} userId={userId}
          otherLabel={active.subject ?? CONTEXT_LABEL[active.context_type]} onClose={() => setOpenId(null)} />
      )}
    </>
  );
}

function ConversationRow({ conversation, onClick }: { conversation: ConversationSummary; onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex w-full items-center gap-3 px-5 py-4 text-left hover:bg-accent/50 transition-colors">
      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-gradient-brand text-white text-xs font-semibold">
        {(conversation.subject ?? "?")[0]?.toUpperCase()}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <span className="truncate text-sm font-semibold">{conversation.subject ?? CONTEXT_LABEL[conversation.context_type]}</span>
          <span className="shrink-0 text-[10px] text-muted-foreground">{new Date(conversation.last_message_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</span>
        </div>
        <div className="flex items-center justify-between gap-2">
          <span className="truncate text-xs text-muted-foreground">{conversation.last_message_preview ?? CONTEXT_LABEL[conversation.context_type]}</span>
          {conversation.unread_count > 0 && (
            <span className="shrink-0 grid h-5 min-w-5 place-items-center rounded-full bg-brand-violet px-1.5 text-[10px] font-bold text-white">{conversation.unread_count}</span>
          )}
        </div>
      </div>
    </button>
  );
}
