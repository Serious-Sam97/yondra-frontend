import { apiFetch } from "@/lib/api";

// Q-03 · real push: register the service worker, subscribe with the server's
// VAPID key, hand the subscription to the server. Off means unsubscribed.

interface PushInfo {
  enabled: boolean;
  public_key: string | null;
  subscribed: number;
  night: boolean;
}

const supported = () =>
  typeof window !== "undefined" &&
  "serviceWorker" in navigator &&
  "PushManager" in window &&
  typeof Notification !== "undefined";

const keyBytes = (b64: string) => {
  const pad = "=".repeat((4 - (b64.length % 4)) % 4);
  const raw = atob((b64 + pad).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
};

export async function pushInfo(): Promise<PushInfo | null> {
  if (!supported()) return null;
  try {
    return await apiFetch<PushInfo>("/api/mascot/push");
  } catch {
    return null;
  }
}

/** returns true when this browser will get his push with the tab closed */
export async function enablePush(night: boolean): Promise<boolean> {
  const info = await pushInfo();
  if (!info?.enabled || !info.public_key) return false;
  if (
    Notification.permission !== "granted" &&
    (await Notification.requestPermission()) !== "granted"
  )
    return false;
  const reg = await navigator.serviceWorker.register("/vortex-sw.js");
  await navigator.serviceWorker.ready;
  const sub =
    (await reg.pushManager.getSubscription()) ??
    (await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: keyBytes(info.public_key),
    }));
  const j = sub.toJSON();
  await apiFetch("/api/mascot/push/subscribe", {
    method: "POST",
    body: JSON.stringify({ endpoint: j.endpoint, keys: j.keys, night }),
  });
  return true;
}

export async function disablePush(): Promise<void> {
  if (!supported()) return;
  const reg = await navigator.serviceWorker.getRegistration("/vortex-sw.js");
  const sub = await reg?.pushManager.getSubscription();
  if (sub) {
    await apiFetch("/api/mascot/push/unsubscribe", {
      method: "POST",
      body: JSON.stringify({ endpoint: sub.endpoint }),
    }).catch(() => {});
    await sub.unsubscribe().catch(() => {});
  }
}
