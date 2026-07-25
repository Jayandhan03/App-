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

messaging.onBackgroundMessage((payload) => {
  const title = payload.notification?.title ?? "Leora";
  const body = payload.notification?.body ?? "New briefing ready.";
  self.registration.showNotification(title, {
    body,
    icon: "/icon.svg",
    data: payload.data,
  });
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.click_action || "/dashboard";
  event.waitUntil(clients.openWindow(url));
});
