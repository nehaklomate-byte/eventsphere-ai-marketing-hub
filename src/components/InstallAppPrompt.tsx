import { useEffect, useState } from "react";
import { Download, Share, SquarePlus, X } from "lucide-react";
import { isNativeAppShell } from "@/lib/platform";

// Chrome/Edge/Android fire this event when the site qualifies as
// installable (manifest + service worker + HTTPS). We stash it and
// trigger it ourselves from a real button — browsers no longer show
// their own mini-infobar reliably, so without this, most people never
// discover the app can be installed at all.
type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const DISMISS_KEY = "eon-install-prompt-dismissed-at";
const DISMISS_DAYS = 14;

function isStandalone(): boolean {
  return isNativeAppShell();
}

function isIOS(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

function wasDismissedRecently(): boolean {
  try {
    const raw = localStorage.getItem(DISMISS_KEY);
    if (!raw) return false;
    const days = (Date.now() - Number(raw)) / (1000 * 60 * 60 * 24);
    return days < DISMISS_DAYS;
  } catch {
    return false;
  }
}

function dismiss() {
  try {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
  } catch {
    // ignore
  }
}

export function InstallAppPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [showIOSHint, setShowIOSHint] = useState(false);
  const [dismissed, setDismissed] = useState(true); // start hidden, flip on once we know it's worth showing

  useEffect(() => {
    if (isStandalone() || wasDismissedRecently()) return;

    function onBeforeInstall(e: Event) {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      setDismissed(false);
    }
    window.addEventListener("beforeinstallprompt", onBeforeInstall);

    // iOS never fires beforeinstallprompt — there's no automatic popup there.
    // The only way to install is Share > Add to Home Screen, so we show
    // instructions instead of a button that would otherwise do nothing.
    if (isIOS()) {
      setShowIOSHint(true);
      setDismissed(false);
    }

    return () => window.removeEventListener("beforeinstallprompt", onBeforeInstall);
  }, []);

  if (dismissed) return null;

  async function handleInstallClick() {
    if (!deferred) return;
    await deferred.prompt();
    const choice = await deferred.userChoice;
    if (choice.outcome === "accepted") {
      setDismissed(true);
    } else {
      dismiss();
      setDismissed(true);
    }
    setDeferred(null);
  }

  function handleDismiss() {
    dismiss();
    setDismissed(true);
  }

  return (
    <div className="fixed inset-x-0 bottom-4 z-50 mx-auto flex w-[calc(100%-2rem)] max-w-md items-start gap-3 rounded-2xl border border-border bg-card p-4 shadow-elegant animate-page-in">
      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-brand text-white">
        {showIOSHint ? <Share className="h-5 w-5" /> : <Download className="h-5 w-5" />}
      </div>
      <div className="min-w-0 flex-1">
        {showIOSHint ? (
          <>
            <div className="text-sm font-semibold text-foreground">Install EventOrbit Nova</div>
            <p className="mt-1 text-xs text-muted-foreground">
              Tap <Share className="inline h-3.5 w-3.5 align-[-2px]" /> Share, then{" "}
              <span className="inline-flex items-center gap-1 font-medium text-foreground">
                <SquarePlus className="h-3.5 w-3.5" /> Add to Home Screen
              </span>
              . It opens like a real app, faster and full screen — with your dashboard front and centre, no browser bar.
            </p>
          </>
        ) : (
          <>
            <div className="text-sm font-semibold text-foreground">Install EventOrbit Nova</div>
            <p className="mt-1 text-xs text-muted-foreground">
              Add it to your home screen — opens like a real app, full screen, no browser address bar, with your dashboard front and centre.
            </p>
            <button
              onClick={handleInstallClick}
              className="mt-2.5 inline-flex items-center gap-1.5 rounded-full btn-brand btn-brand-hover px-4 py-2 text-xs font-semibold"
            >
              <Download className="h-3.5 w-3.5" /> Install app
            </button>
          </>
        )}
      </div>
      <button onClick={handleDismiss} aria-label="Dismiss" className="shrink-0 grid h-7 w-7 place-items-center rounded-full text-muted-foreground hover:bg-accent">
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
