import { supabase } from "@/integrations/supabase/client";

// Public key only — safe to ship in the client bundle. Set on Vite as
// VITE_VAPID_PUBLIC_KEY, matching the VAPID_PRIVATE_KEY secret used by
// the send-push edge function.
const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined;

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

export function pushSupported(): boolean {
  return typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window && !!VAPID_PUBLIC_KEY;
}

export function notificationPermission(): NotificationPermission | "unsupported" {
  if (typeof Notification === "undefined") return "unsupported";
  return Notification.permission;
}

/** Asks for permission (if needed) and saves a push subscription for this user/device. */
export async function enablePushNotifications(userId: string): Promise<boolean> {
  if (!pushSupported()) return false;

  const permission = await Notification.requestPermission();
  if (permission !== "granted") return false;

  const reg = await navigator.serviceWorker.ready;
  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY!) as BufferSource,
    });
  }

  const json = sub.toJSON();
  const { error } = await supabase.from("push_subscriptions" as never).upsert(
    {
      user_id: userId,
      endpoint: json.endpoint,
      p256dh: json.keys?.p256dh,
      auth_key: json.keys?.auth,
    } as never,
    { onConflict: "endpoint" }
  );
  return !error;
}

/** Fire-and-forget OS push notification to one or more users — the
 * same mechanism chat.ts already uses for messages, reused here for
 * hire requests (venue→worker, venue→vendor, vendor→worker) so the
 * recipient is actually alerted instead of only getting a row in
 * worker_notifications/vendor_notifications that they'd have to open
 * the app and check for themselves. Never throws — a push failure
 * should never block the booking request itself from going through. */
export async function notifyUsers(userIds: string[], title: string, body: string, url = "/"): Promise<void> {
  if (userIds.length === 0) return;
  try {
    await supabase.functions.invoke("send-push", { body: { user_ids: userIds, title, body, url } });
  } catch {
    // best-effort — the in-app notification row still exists regardless
  }
}

export async function disablePushNotifications(): Promise<void> {
  if (!pushSupported()) return;
  const reg = await navigator.serviceWorker.ready;
  const sub = await reg.pushManager.getSubscription();
  if (!sub) return;
  await supabase.from("push_subscriptions" as never).delete().eq("endpoint" as never, sub.endpoint as never);
  await sub.unsubscribe();
}
