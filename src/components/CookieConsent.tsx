import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Cookie, X } from "lucide-react";
import { isNativeAppShell } from "@/lib/platform";

const STORAGE_KEY = "eventorbit-cookie-consent";

/** Simple accept/dismiss cookie notice — no third-party consent-management
 * vendor, matching the site's current actual cookie usage (auth session +
 * basic analytics). Shown once until the visitor makes a choice.
 * Never shown inside the native app shell (Play Store app / installed
 * PWA) — people who downloaded an app don't expect a browser-cookie
 * disclosure, and app-store review guidelines treat it as web-only. */
export function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (isNativeAppShell()) return;
    if (typeof localStorage === "undefined") return;
    if (!localStorage.getItem(STORAGE_KEY)) setVisible(true);
  }, []);

  function choose(value: "accepted" | "dismissed") {
    localStorage.setItem(STORAGE_KEY, value);
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-[100] border-t border-border bg-card/95 backdrop-blur px-4 py-4 shadow-elegant sm:px-6">
      <div className="mx-auto flex max-w-5xl flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-2.5 text-sm text-muted-foreground">
          <Cookie className="mt-0.5 h-4 w-4 shrink-0 text-brand-violet" />
          <p>
            We use essential cookies to keep you signed in, and basic analytics cookies to understand how the site is
            used. See our <Link to="/privacy" className="text-brand-violet underline">Privacy Policy</Link> for details.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2 self-end sm:self-auto">
          <button onClick={() => choose("dismissed")} className="rounded-full p-2 text-muted-foreground hover:bg-accent sm:hidden" aria-label="Dismiss">
            <X className="h-4 w-4" />
          </button>
          <button onClick={() => choose("dismissed")} className="hidden rounded-full border border-input px-4 py-2 text-xs font-semibold hover:bg-accent sm:inline-flex">
            Dismiss
          </button>
          <button onClick={() => choose("accepted")} className="rounded-full btn-brand btn-brand-hover px-4 py-2 text-xs font-semibold">
            Accept
          </button>
        </div>
      </div>
    </div>
  );
}
