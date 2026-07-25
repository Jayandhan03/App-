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

async function enableWebPush(): Promise<boolean> {
  if (typeof window === "undefined" || !("Notification" in window)) return false;

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
    PushNotifications.addListener("registrationError", () => resolve(false));
  });
}

export async function enableNotifications(): Promise<boolean> {
  return isNativeApp() ? enableNativePush() : enableWebPush();
}

export type NotifPermission = "default" | "granted" | "denied";

// Shared by every "enable notifications" control in the app (delivery page,
// agent creation) so the permission-check + enable flow only lives once.
export function useNotificationPermission() {
  const [permission, setPermission] = useState<NotifPermission>("default");
  const [enabling, setEnabling] = useState(false);

  useEffect(() => {
    if (isNativeApp()) {
      import("@capacitor/push-notifications").then(({ PushNotifications }) =>
        PushNotifications.checkPermissions().then((p) =>
          setPermission(p.receive === "granted" ? "granted" : p.receive === "denied" ? "denied" : "default")
        )
      );
    } else if (typeof window !== "undefined" && "Notification" in window) {
      setPermission(Notification.permission as NotifPermission);
    }
  }, []);

  const enable = async () => {
    setEnabling(true);
    try {
      const ok = await enableNotifications();
      if (!isNativeApp() && typeof window !== "undefined" && "Notification" in window) {
        setPermission(Notification.permission as NotifPermission);
      } else if (ok) {
        setPermission("granted");
      }
    } finally {
      setEnabling(false);
    }
  };

  return { permission, enabling, enable };
}
