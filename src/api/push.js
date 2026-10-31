// Client side of Web Push. The server half is the `send-push` Edge Function.
import { supabase } from "./supabase";

const VAPID_PUBLIC_KEY = process.env.REACT_APP_VAPID_PUBLIC_KEY;

const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
const isStandalone = () => window.matchMedia?.("(display-mode: standalone)").matches || window.navigator.standalone === true;

export const pushSupported = () =>
  "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;

function urlBase64ToUint8Array(b64) {
  const pad = "=".repeat((4 - (b64.length % 4)) % 4);
  const raw = atob((b64 + pad).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

/** "unsupported" | "ios-install" | "not-configured" | "denied" | "enabled" | "disabled" */
export async function getPushState() {
  if (!pushSupported()) return isIOS() && !isStandalone() ? "ios-install" : "unsupported";
  if (!VAPID_PUBLIC_KEY) return "not-configured";
  if (Notification.permission === "denied") return "denied";
  try {
    const reg = await navigator.serviceWorker.getRegistration();
    const sub = reg ? await reg.pushManager.getSubscription() : null;
    return sub && Notification.permission === "granted" ? "enabled" : "disabled";
  } catch {
    return "disabled";
  }
}

/** Must be called from a user gesture (button click), or browsers refuse the permission prompt. */
export async function enablePush() {
  if (!pushSupported()) throw new Error("المتصفح لا يدعم الإشعارات");
  if (!VAPID_PUBLIC_KEY) throw new Error("مفتاح الإشعارات غير مضبوط");
  const perm = await Notification.requestPermission();
  if (perm !== "granted") throw new Error("لم يتم السماح بالإشعارات");

  const reg = await navigator.serviceWorker.ready;
  const sub =
    (await reg.pushManager.getSubscription()) ||
    (await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    }));

  const j = sub.toJSON();
  const { error } = await supabase.rpc("save_push_subscription", {
    p_endpoint: j.endpoint, p_p256dh: j.keys.p256dh, p_auth: j.keys.auth,
  });
  if (error) throw error;
}

export async function disablePush() {
  const reg = await navigator.serviceWorker?.getRegistration();
  const sub = reg ? await reg.pushManager.getSubscription() : null;
  if (!sub) return;
  await supabase.from("push_subscriptions").delete().eq("endpoint", sub.endpoint); // RLS: own rows only
  await sub.unsubscribe();
}
