// Detects "this is running as a real app, not a normal browser tab" across
// every wrapper we support: a browser-installed PWA (Chrome/Edge/Android),
// iOS "Add to Home Screen", and a Capacitor-wrapped native Android/iOS app.
// Capacitor injects a `window.Capacitor` global into its WebView at
// runtime — it does NOT make `(display-mode: standalone)` match, since
// that media query is a browser-install signal, not a native-shell one.
// Any UI that should behave differently "as an app" vs "as a website"
// (skip-to-dashboard, hide the install prompt, etc.) must check this,
// not just the media query, or it silently misses the Capacitor build.
export function isNativeAppShell(): boolean {
  if (typeof window === "undefined") return false;

  const w = window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } };
  if (w.Capacitor?.isNativePlatform?.()) return true;

  const nav = navigator as Navigator & { standalone?: boolean };
  if (nav.standalone === true) return true; // iOS Safari "Add to Home Screen"

  return window.matchMedia?.("(display-mode: standalone)").matches ?? false; // browser-installed PWA
}
