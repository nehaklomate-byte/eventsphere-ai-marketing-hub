import { useEffect, useState } from "react";
import { BellRing, X, Loader2 } from "lucide-react";
import { useSession } from "@/lib/session";
import { pushSupported, notificationPermission, enablePushNotifications } from "@/lib/push";

const DISMISS_KEY = "eon-push-prompt-dismissed-at";
const DISMISS_DAYS = 7;

function wasDismissedRecently(): boolean {
  try {
    const raw = localStorage.getItem(DISMISS_KEY);
    if (!raw) return false;
    return (Date.now() - Number(raw)) / (1000 * 60 * 60 * 24) < DISMISS_DAYS;
  } catch {
    return false;
  }
}

export function NotificationPermissionPrompt() {
  const { user } = useSession();
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user?.id) return setVisible(false);
    if (!pushSupported()) return;
    if (notificationPermission() !== "default") return; // already granted or blocked — nothing to ask
    if (wasDismissedRecently()) return;
    setVisible(true);
  }, [user?.id]);

  if (!visible || !user?.id) return null;

  async function handleEnable() {
    setBusy(true);
    const ok = await enablePushNotifications(user!.id);
    setBusy(false);
    setVisible(false);
    if (!ok) {
      try { localStorage.setItem(DISMISS_KEY, String(Date.now())); } catch { /* ignore */ }
    }
  }

  function handleDismiss() {
    try { localStorage.setItem(DISMISS_KEY, String(Date.now())); } catch { /* ignore */ }
    setVisible(false);
  }

  return (
    <div className="fixed inset-x-0 top-4 z-50 mx-auto flex w-[calc(100%-2rem)] max-w-md items-start gap-3 rounded-2xl border border-border bg-card p-4 shadow-elegant animate-page-in md:left-auto md:right-4 md:mx-0">
      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-brand text-white">
        <BellRing className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-semibold text-foreground">Turn on notifications</div>
        <p className="mt-1 text-xs text-muted-foreground">
          Get notified the moment someone messages you or your job status changes — even if the app is closed.
        </p>
        <button onClick={handleEnable} disabled={busy}
          className="mt-2.5 inline-flex items-center gap-1.5 rounded-full btn-brand btn-brand-hover px-4 py-2 text-xs font-semibold disabled:opacity-60">
          {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Enable notifications
        </button>
      </div>
      <button onClick={handleDismiss} aria-label="Dismiss" className="shrink-0 grid h-7 w-7 place-items-center rounded-full text-muted-foreground hover:bg-accent">
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
