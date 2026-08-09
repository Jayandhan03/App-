// Background push handler — runs even when no Leora tab is open. Served
// byte-for-byte from public/, so it can't read Next.js env vars; this config
// is Firebase's public web app config (safe client-side by design, same
// values embedded in lib/push.ts).
importScripts("https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.14.1/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "AIzaSyBNQLvjSILYGK7kkVfm9iO0_-bVUaTsVlw",
  authDomain: "leora-03.firebaseapp.com",
  projectId: "leora-03",
  storageBucket: "leora-03.firebasestorage.app",
  messagingSenderId: "1026194582181",
  appId: "1:1026194582181:web:5e757ab8cd8e92cac4fb4c",
});

const messaging = firebase.messaging();

// Take control of all clients immediately so a fresh SW is never stuck
// waiting behind a previous version (common cause of missed notifications
// on localhost and after deployments).
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

// Also allow the page to force-skip waiting via postMessage, in case
// skipWaiting didn't fire automatically (e.g. old SW was still running).
// Also handles PROBE_NOTIFICATION: the page calls this to check whether
// OS-level notifications are actually working (not just browser-granted).
self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") {
    self.skipWaiting();
    return;
  }

  if (event.data?.type === "PROBE_NOTIFICATION") {
    // Try showing a zero-content silent notification.  If showNotification
    // resolves, the OS is allowing display — we reply with PROBE_ACK.
    self.registration
      .showNotification("", { silent: true, tag: "__leora_probe__" })
      .then(() => {
        // Close it immediately so it never actually shows to the user.
        self.registration.getNotifications({ tag: "__leora_probe__" }).then((notifs) => {
          notifs.forEach((n) => n.close());
        });
        // Reply to the page.
        self.clients.matchAll({ type: "window" }).then((clients) => {
          clients.forEach((c) => c.postMessage({ type: "PROBE_ACK" }));
        });
      })
      .catch(() => {
        // showNotification failed — OS is blocking. No ACK sent; the
        // probeNotificationDelivery() timeout will resolve to false.
      });
  }
});


messaging.onBackgroundMessage((payload) => {
  const title = payload.notification?.title ?? "Leora";
  const body  = payload.notification?.body  ?? "New briefing ready.";
  const data = payload.data ?? {};
  self.registration.showNotification(title, {
    body,
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    data,
    ...(data.click_action ? { actions: [{ action: "play", title: "▶ Play" }] } : {}),
  });
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const data = event.notification.data || {};
  const url = data.click_action || "/dashboard";

  // "▶ Play" action — a Service Worker can't output audio itself, but if a
  // Leora tab is already open we can hand playback off to it in the
  // background instead of navigating/focusing anything. The user stays
  // exactly where they are; audio just starts.
  if (event.action === "play" && data.audio_url) {
    event.waitUntil(
      self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
        const leoraClient = clientList.find((c) => c.url.includes(self.location.origin));
        if (leoraClient) {
          leoraClient.postMessage({
            type: "PLAY_AUDIO",
            url: data.audio_url,
            title: event.notification.title,
            body: event.notification.body,
          });
          return;
        }
        // No Leora tab open at all — there's nowhere to host an <audio>
        // element, so a tab has to open (unavoidable platform limit).
        return self.clients.openWindow(url);
      })
    );
    return;
  }

  // Tapping the notification body → land on the click_action page as before.
  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        // If a Leora tab is already open, focus it instead of opening a new one.
        for (const client of clientList) {
          if (client.url.includes(self.location.origin) && "focus" in client) {
            client.navigate(url);
            return client.focus();
          }
        }
        return self.clients.openWindow(url);
      })
  );
});

