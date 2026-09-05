import { Capacitor } from "@capacitor/core";

/**
 * True only when this code is running inside the Capacitor-wrapped native
 * app (Android/iOS shell). Always false in a regular web browser — desktop
 * AND mobile browsers — so the existing web UI never changes.
 *
 * Wrapped in try/catch so nothing breaks if @capacitor/core isn't
 * installed yet (e.g. while still working on the web build).
 */
export function isNativeApp(): boolean {
  try {
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
}
