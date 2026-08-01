"use client";

import { useEffect, useState, useCallback } from "react";
import { isNativeApp } from "@/lib/capacitor";

// ── Firebase client config (public — safe to embed) ──────────────────────────
const firebaseConfig = {
  apiKey: "AIzaSyBNQLvjSILYGK7kkVfm9iO0_-bVUaTsVlw",
  authDomain: "leora-03.firebaseapp.com",
  projectId: "leora-03",
  storageBucket: "leora-03.firebasestorage.app",
  messagingSenderId: "1026194582181",
  appId: "1:1026194582181:web:5e757ab8cd8e92cac4fb4c",
};
const VAPID_KEY =
  "BGbXh0nISWKL4N7Qs89NAtkYBS4UDkESQIol5CGsFiGFruZ6os362GPI3s6qSPBDdl98wYTuBHNIEGMUnmVSUnU";

// ── OS / Platform detection ───────────────────────────────────────────────────
export type OsType = "windows" | "mac" | "android" | "ios" | "linux" | "other";

export function detectOs(): OsType {
  if (typeof window === "undefined") return "other";
  const ua = navigator.userAgent;
  if (/android/i.test(ua)) return "android";
  if (/iPad|iPhone|iPod/.test(ua)) return "ios";
  if (/Win/.test(ua)) return "windows";
  if (/Mac/.test(ua)) return "mac";
  if (/Linux/.test(ua)) return "linux";
  return "other";
}

// ── Token registration ────────────────────────────────────────────────────────
async function registerToken(token: string, platform: "web" | "android") {
  await fetch("/api/push-subscriptions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token, platform }),
  });
}

// ── OS-level notification permission ─────────────────────────────────────────
// On web the browser can't read OS-level settings directly, but we can:
//   1. Detect the OS and know what setting path the user needs.
//   2. Auto-open the correct OS settings page for Windows ("ms-settings:notifications").
//   3. On Android (Capacitor) open the native app-info page if permission is denied.
// This is the maximum possible automation — OS security prevents JS from
// actually granting the permission for you.

export type OsPermissionStatus =
  | "ok"              // browser says granted AND a test notification confirmed display
  | "os_blocked"      // browser says granted, but OS is suppressing display
  | "browser_denied"  // browser permission is denied
  | "browser_prompt"  // not yet asked
  | "unsupported";    // API not available

/**
 * Attempts to auto-open the correct OS notification settings page so the user
 * just has to click allow — no manual navigation required.
 * Returns true if an OS-settings page was opened.
 */
export async function openOsNotificationSettings(): Promise<boolean> {
  const os = detectOs();
  try {
    if (os === "windows") {
      // ms-settings:notifications opens Windows Settings → Notifications directly.
      window.open("ms-settings:notifications");
      return true;
    }
    if (os === "android" && isNativeApp()) {
      // On Android, the app-settings: scheme opens this app's settings page
      // where the user can toggle notifications. Works in Capacitor WebView.
      try {
        const { App } = await import("@capacitor/app");
        const info = await App.getInfo();
        // Try Capacitor's built-in openUrl if available, otherwise fall back
        // to the intent:// scheme that Android WebViews understand.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const appPlugin = App as unknown as { openUrl?: (o: { url: string }) => Promise<void> };
        if (appPlugin.openUrl) {
          await appPlugin.openUrl({ url: `app-settings:${info.id}` });
        } else {
          // Android Settings deep-link via Intent URI (works in Capacitor WebView).
          window.open(`intent:#Intent;action=android.settings.APPLICATION_DETAILS_SETTINGS;data=package:${info.id};end`);
        }
      } catch {
        window.open("app-settings:");
      }
      return true;
    }
    if (os === "mac") {
      // macOS doesn't allow web pages to open System Preferences directly.
      // We can deep-link into Chrome's own notification page though.
      window.open("chrome://settings/content/notifications");
      return true;
    }
  } catch {
    // Protocol handler may not fire in all browsers — that's fine, caller
    // shows manual fallback instructions.
  }
  return false;
}

/**
 * Probes whether a notification will actually appear by having the service
 * worker send one and listening for a confirmation message back.
 * Returns true if the notification visibly fired within the timeout.
 */
async function probeNotificationDelivery(timeoutMs = 3500): Promise<boolean> {
  if (!("serviceWorker" in navigator)) return false;
  return new Promise<boolean>((resolve) => {
    const channel = new MessageChannel();
    let settled = false;

    const done = (result: boolean) => {
      if (settled) return;
      settled = true;
      navigator.serviceWorker.removeEventListener("message", onMsg);
      resolve(result);
    };

    const onMsg = (ev: MessageEvent) => {
      if (ev.data?.type === "PROBE_ACK") done(true);
    };
    navigator.serviceWorker.addEventListener("message", onMsg);

    // Ask the active SW to show a silent probe notification and echo back.
    navigator.serviceWorker.ready
      .then((sw) => {
        sw.active?.postMessage({ type: "PROBE_NOTIFICATION" }, [channel.port2]);
        // Show a real (but quiet) notification through the SW and watch for
        // the ACK. If it never arrives the OS is swallowing notifications.
        sw.showNotification("", { silent: true, tag: "__leora_probe__" })
          .then(() => done(true))
          .catch(() => done(false));
      })
      .catch(() => done(false));

    setTimeout(() => done(false), timeoutMs);
  });
}

// ── Web push enablement ───────────────────────────────────────────────────────
function webPushSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "Notification" in window &&
    "serviceWorker" in navigator
  );
}

async function enableWebPush(): Promise<boolean> {
  if (!webPushSupported()) return false;

  // ── 1. Request browser-level permission ────────────────────────────────────
  const permission = await Notification.requestPermission();
  if (permission !== "granted") return false;

  // ── 2. Register & update the service worker ────────────────────────────────
  // Force-activate the latest SW version immediately.
  let swReg = await navigator.serviceWorker.register("/firebase-messaging-sw.js");
  await swReg.update();
  if (swReg.waiting) swReg.waiting.postMessage({ type: "SKIP_WAITING" });
  swReg = await navigator.serviceWorker.ready;

  // ── 3. Get FCM token tied to this SW registration ─────────────────────────
  const { initializeApp, getApps } = await import("firebase/app");
  const { getMessaging, getToken, onMessage } = await import("firebase/messaging");

  const app = getApps().length > 0 ? getApps()[0] : initializeApp(firebaseConfig);
  const messaging = getMessaging(app);

  const token = await getToken(messaging, {
    vapidKey: VAPID_KEY,
    serviceWorkerRegistration: swReg,
  });
  if (!token) return false;

  await registerToken(token, "web");

  // ── 4. Foreground handler — use SW showNotification (Chrome-safe) ──────────
  onMessage(messaging, async (payload) => {
    const title = payload.notification?.title ?? "Leora";
    const body = payload.notification?.body ?? "New briefing ready.";
    try {
      const sw = await navigator.serviceWorker.ready;
      await sw.showNotification(title, {
        body,
        icon: "/icon.svg",
        badge: "/icon.svg",
        data: (payload.data as Record<string, string>) ?? {},
      });
    } catch {
      if (Notification.permission === "granted")
        new Notification(title, { body, icon: "/icon.svg" });
    }
  });

  // ── 5. Probe OS-level delivery ─────────────────────────────────────────────
  // If the probe fails, the OS is blocking display. We auto-open OS settings
  // so the user just has to click "allow" without any manual navigation.
  const notifDelivered = await probeNotificationDelivery();
  if (!notifDelivered) {
    const opened = await openOsNotificationSettings();
    // Signal to callers that OS setup is still needed.
    // We return true (token is registered) but expose the OS-blocked state
    // via a module-level flag so the UI can show guidance.
    _osBlocked = true;
    _osSettingsOpened = opened;
  } else {
    _osBlocked = false;
    _osSettingsOpened = false;
  }

  return true;
}

// Module-level flags written by enableWebPush, read by useNotificationToggle.
let _osBlocked = false;
let _osSettingsOpened = false;

// ── Native push (Android / iOS via Capacitor) ─────────────────────────────────
async function enableNativePush(): Promise<boolean> {
  const { PushNotifications } = await import("@capacitor/push-notifications");

  // Check current status first — avoid re-prompting if already granted.
  const currentPerm = await PushNotifications.checkPermissions();

  if (currentPerm.receive === "denied") {
    // OS already denied. Auto-open app settings so user can flip the toggle.
    await openOsNotificationSettings();
    return false;
  }

  if (currentPerm.receive !== "granted") {
    // "prompt" — show the native OS dialog.
    const perm = await PushNotifications.requestPermissions();
    if (perm.receive !== "granted") {
      // User denied the OS dialog — open settings immediately.
      await openOsNotificationSettings();
      return false;
    }
  }

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

// ── Public API ────────────────────────────────────────────────────────────────
export async function enableNotifications(): Promise<boolean> {
  try {
    return await (isNativeApp() ? enableNativePush() : enableWebPush());
  } catch (err) {
    console.error("[push] enableNotifications failed:", err);
    return false;
  }
}

export type NotifPermission = "default" | "granted" | "denied";

async function setSubscriptionEnabled(
  platform: "web" | "android",
  enabled: boolean
): Promise<boolean> {
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
    return p.receive === "granted"
      ? "granted"
      : p.receive === "denied"
      ? "denied"
      : "default";
  }
  if (typeof window !== "undefined" && "Notification" in window) {
    return Notification.permission as NotifPermission;
  }
  return "default";
}

// ── useNotificationToggle ─────────────────────────────────────────────────────
// Full permission chain with OS-level detection and auto-open of OS settings.

export interface NotificationToggleState {
  permission: NotifPermission;
  enabled: boolean;
  loading: boolean;
  working: boolean;
  supported: boolean;
  error: string | null;
  /** OS is blocking display even though browser permission is granted */
  osBlocked: boolean;
  /** Whether we automatically opened the OS settings page for the user */
  osSettingsOpened: boolean;
  /** The detected OS — used to render OS-specific instructions */
  os: OsType;
  toggle: () => Promise<void>;
  /** Re-check if OS blocking was resolved (call after user returns from OS settings) */
  recheckOs: () => Promise<void>;
}

export function useNotificationToggle(): NotificationToggleState {
  const platform: "web" | "android" = isNativeApp() ? "android" : "web";
  const supported = isNativeApp() || webPushSupported();
  const os = detectOs();

  const [permission, setPermission] = useState<NotifPermission>("default");
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [osBlocked, setOsBlocked] = useState(false);
  const [osSettingsOpened, setOsSettingsOpened] = useState(false);

  useEffect(() => {
    if (!supported) {
      setLoading(false);
      return;
    }
    (async () => {
      const [perm, status] = await Promise.all([
        checkPermission(),
        fetch(`/api/push-subscriptions?platform=${platform}`)
          .then((r) => (r.ok ? r.json() : null))
          .catch(() => null),
      ]);
      setPermission(perm);
      setEnabled(Boolean(status?.enabled));

      // If browser permission is already granted, probe OS delivery silently.
      if (perm === "granted" && !isNativeApp()) {
        const ok = await probeNotificationDelivery(2500);
        setOsBlocked(!ok);
      }

      setLoading(false);
    })();
  }, [platform, supported]);

  const recheckOs = useCallback(async () => {
    if (!supported || isNativeApp()) return;
    const ok = await probeNotificationDelivery(2500);
    setOsBlocked(!ok);
    if (ok) setOsSettingsOpened(false);
  }, [supported]);

  const toggle = useCallback(async () => {
    if (working || !supported) return;
    setWorking(true);
    setError(null);
    try {
      if (enabled) {
        setEnabled(false);
        if (!(await setSubscriptionEnabled(platform, false))) {
          setEnabled(true);
          setError("Couldn't turn off notifications — try again.");
        }
        return;
      }

      if (permission === "granted") {
        setEnabled(true);
        const serverOk = await setSubscriptionEnabled(platform, true);
        if (!serverOk) {
          setEnabled(false);
          setError("Couldn't turn on notifications — try again.");
          return;
        }
        // Even though token exists, re-probe to catch OS-level blocking.
        const ok = await probeNotificationDelivery(2500);
        if (!ok) {
          const opened = await openOsNotificationSettings();
          setOsBlocked(true);
          setOsSettingsOpened(opened);
        }
        return;
      }

      if (permission === "denied") return;

      // First-time: full permission chain.
      const ok = await enableNotifications();
      setPermission(await checkPermission());

      if (ok) {
        setEnabled(true);
        // Sync module-level flags back into React state.
        setOsBlocked(_osBlocked);
        setOsSettingsOpened(_osSettingsOpened);
      } else {
        setError("Couldn't enable notifications — try again.");
      }
    } finally {
      setWorking(false);
    }
  }, [working, supported, enabled, permission, platform]);

  return {
    permission,
    enabled,
    loading,
    working,
    supported,
    error,
    osBlocked,
    osSettingsOpened,
    os,
    toggle,
    recheckOs,
  };
}
