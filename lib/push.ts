"use client";

import { useEffect, useState } from "react";
import { isNativeApp } from "@/lib/capacitor";

// Public Firebase web app config — safe client-side by design (same values
// Firebase's own setup docs have you paste directly into client code).
// Mirrored in public/firebase-messaging-sw.js, which can't read this file.
const firebaseConfig = {
  apiKey: "AIzaSyBNQLvjSILYGK7kkVfm9iO0_-bVUaTsVlw",
  authDomain: "leora-03.firebaseapp.com",
  projectId: "leora-03",
  storageBucket: "leora-03.firebasestorage.app",
  messagingSenderId: "1026194582181",
  appId: "1:1026194582181:web:5e757ab8cd8e92cac4fb4c",
};

const VAPID_KEY = "BGbXh0nISWKL4N7Qs89NAtkYBS4UDkESQIol5CGsFiGFruZ6os362GPI3s6qSPBDdl98wYTuBHNIEGMUnmVSUnU";

async function registerToken(token: string, platform: "web" | "android") {
  await fetch("/api/push-subscriptions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token, platform }),
  });
}

// A browser can lack any of these (older Safari, non-HTTPS, in-app webviews
// that strip the API) — checked up front so we show "not supported" instead
// of silently failing after a permission prompt.
function webPushSupported(): boolean {
  return typeof window !== "undefined" && "Notification" in window && "serviceWorker" in navigator;
}

async function enableWebPush(): Promise<boolean> {
  if (!webPushSupported()) return false;

  const permission = await Notification.requestPermission();
  if (permission !== "granted") return false;

  const { initializeApp } = await import("firebase/app");
  const { getMessaging, getToken, onMessage } = await import("firebase/messaging");

  const registration = await navigator.serviceWorker.register("/firebase-messaging-sw.js");
  const app = initializeApp(firebaseConfig);
  const messaging = getMessaging(app);

  const token = await getToken(messaging, { vapidKey: VAPID_KEY, serviceWorkerRegistration: registration });
  if (!token) return false;

  await registerToken(token, "web");

  // Foreground messages don't trigger onBackgroundMessage in the SW — show
  // a native notification here too so the behavior is consistent whether
  // the tab is focused or not.
  onMessage(messaging, (payload) => {
    const title = payload.notification?.title ?? "Leora";
    const body = payload.notification?.body ?? "New briefing ready.";
    new Notification(title, { body, icon: "/icon.svg" });
  });

  return true;
}

async function enableNativePush(): Promise<boolean> {
  const { PushNotifications } = await import("@capacitor/push-notifications");

  const perm = await PushNotifications.requestPermissions();
  if (perm.receive !== "granted") return false;

  await PushNotifications.register();

  return new Promise((resolve) => {
    PushNotifications.addListener("registration", (token) => {
      registerToken(token.value, "android").then(() => resolve(true));
    });
    PushNotifications.addListener("registrationError", (err) => {
      console.error("[push] native registration failed:", err);
      resolve(false);
    });
  });
}

// Routes to the right permission flow for wherever this is actually running —
// the native Android app (Capacitor's own permission + FCM registration) vs
// the website in a browser (the Notification API + Firebase Web Messaging).
// Never throws: a failure at any step (unsupported browser, denied prompt,
// service-worker registration error, dead Firebase config) just resolves
// false so callers can show a plain "couldn't enable" state instead of an
// unhandled rejection.
export async function enableNotifications(): Promise<boolean> {
  try {
    return await (isNativeApp() ? enableNativePush() : enableWebPush());
  } catch (err) {
    console.error("[push] enableNotifications failed:", err);
    return false;
  }
}

export type NotifPermission = "default" | "granted" | "denied";

async function setSubscriptionEnabled(platform: "web" | "android", enabled: boolean): Promise<boolean> {
  const res = await fetch("/api/push-subscriptions", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ platform, enabled }),
  });
  return res.ok;
}

async function checkPermission(): Promise<NotifPermission> {
  if (isNativeApp()) {
    const { PushNotifications } = await import("@capacitor/push-notifications");
    const p = await PushNotifications.checkPermissions();
    return p.receive === "granted" ? "granted" : p.receive === "denied" ? "denied" : "default";
  }
  if (typeof window !== "undefined" && "Notification" in window) {
    return Notification.permission as NotifPermission;
  }
  return "default";
}

// Drives every in-app notification toggle in the app (delivery page, agent
// creation). `enabled` reflects the server-side flag on this platform's push
// subscription(s), not just local browser permission — so it's a real on/off
// switch instead of a one-way "granted -> stuck on" state. Toggling on for
// the first time still has to go through the OS/browser permission prompt;
// after that, on/off just flips the stored flag without re-prompting.
export function useNotificationToggle() {
  const platform: "web" | "android" = isNativeApp() ? "android" : "web";
  // Native app always has the capability (the Capacitor plugin handles the
  // OS prompt); on the website it depends on the browser actually exposing
  // Notification + service workers (missing on e.g. pre-16.4 iOS Safari).
  const supported = isNativeApp() || webPushSupported();
  const [permission, setPermission] = useState<NotifPermission>("default");
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!supported) { setLoading(false); return; }
    (async () => {
      const [perm, status] = await Promise.all([
        checkPermission(),
        fetch(`/api/push-subscriptions?platform=${platform}`)
          .then((r) => (r.ok ? r.json() : null))
          .catch(() => null),
      ]);
      setPermission(perm);
      setEnabled(Boolean(status?.enabled));
      setLoading(false);
    })();
  }, [platform, supported]);

  const toggle = async () => {
    if (working || !supported) return;
    setWorking(true);
    setError(null);
    try {
      if (enabled) {
        // Browser/OS permission can't be revoked from JS, so "off" just
        // stops us from sending — it doesn't touch the permission grant.
        if (await setSubscriptionEnabled(platform, false)) setEnabled(false);
        else setError("Couldn't turn off notifications — try again.");
        return;
      }
      if (permission === "granted") {
        // Already granted — no need to re-prompt, just clear the flag
        // (covers the case where a token exists but was switched off).
        if (await setSubscriptionEnabled(platform, true)) setEnabled(true);
        else setError("Couldn't turn on notifications — try again.");
        return;
      }
      if (permission === "denied") return;
      const ok = await enableNotifications();
      setPermission(await checkPermission());
      if (ok) setEnabled(true);
      else setError("Couldn't enable notifications — try again.");
    } finally {
      setWorking(false);
    }
  };

  return { permission, enabled, loading, working, supported, error, toggle };
}
