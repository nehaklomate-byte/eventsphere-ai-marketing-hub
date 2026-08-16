import { useEffect, useState } from "react";
import { Megaphone, X } from "lucide-react";
import { useSession } from "@/lib/session";
import { fetchUnreadBroadcast, markBroadcastRead, type ActiveBroadcast } from "@/lib/support";

const TYPE_STYLE: Record<string, string> = {
  info: "border-blue-500/30 bg-blue-500/5 text-blue-700 dark:text-blue-400",
  success: "border-emerald-500/30 bg-emerald-500/5 text-emerald-700 dark:text-emerald-400",
  warning: "border-amber-500/30 bg-amber-500/5 text-amber-700 dark:text-amber-400",
  error: "border-rose-500/30 bg-rose-500/5 text-rose-700 dark:text-rose-400",
};

/** Shows the admin's latest broadcast as a one-time popup, the first
 * time this user loads any authenticated page after it's sent.
 * Server-tracked (broadcast_message_reads), so once dismissed it's
 * gone for good — on any device, any tab, forever. Messages past
 * their deadline are never fetched in the first place. */
export function BroadcastMessagePopup() {
  const { user } = useSession();
  const [msg, setMsg] = useState<ActiveBroadcast | null>(null);
  const [dismissing, setDismissing] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    fetchUnreadBroadcast(user.id).then((m) => { if (!cancelled) setMsg(m); }).catch(() => {});
    return () => { cancelled = true; };
  }, [user?.id]);

  if (!msg || !user?.id) return null;

  async function dismiss() {
    setDismissing(true);
    try { await markBroadcastRead(msg!.id, user!.id); } catch { /* still close it locally */ }
    setMsg(null);
  }

  return (
    <div className="fixed inset-0 z-[100] grid place-items-center bg-black/40 p-4" onClick={dismiss}>
      <div className={`relative w-full max-w-sm rounded-2xl border bg-card p-5 shadow-xl ${TYPE_STYLE[msg.type] ?? TYPE_STYLE.info}`} onClick={(e) => e.stopPropagation()}>
        <button onClick={dismiss} aria-label="Close" className="absolute right-3 top-3 rounded-full p-1 text-muted-foreground hover:bg-black/5 dark:hover:bg-white/10">
          <X className="h-4 w-4" />
        </button>
        <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide">
          <Megaphone className="h-3.5 w-3.5" /> Announcement
        </div>
        <div className="mt-2 text-base font-semibold text-foreground">{msg.title}</div>
        {msg.body && <p className="mt-1.5 text-sm text-muted-foreground">{msg.body}</p>}
        <div className="mt-1 text-[11px] text-muted-foreground">{new Date(msg.created_at).toLocaleDateString("en-IN", { dateStyle: "medium" })}</div>
        <button onClick={dismiss} disabled={dismissing}
          className="mt-4 w-full rounded-full btn-brand btn-brand-hover px-4 py-2 text-sm font-semibold disabled:opacity-70">
          Got it
        </button>
      </div>
    </div>
  );
}
