"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { isNativeApp } from "@/lib/capacitor";

// Mounted app-wide (see app/layout.tsx). Only does anything inside the
// native shell.
export default function PushNotificationBridge() {
  const router = useRouter();

  useEffect(() => {
    if (!isNativeApp()) return;

    const removers: Array<() => void> = [];

    (async () => {
      const { PushNotifications } = await import("@capacitor/push-notifications");
      const { LocalNotifications } = await import("@capacitor/local-notifications");
      const { registerPlugin } = await import("@capacitor/core");

      // Native plugin (VoiceNotePlugin.java in the Leora-mobile Android
      // project) — owns a real MediaPlayer + MediaSession + MediaStyle
      // notification, so a voice-note push gets an actual play/pause/seek
      // bar in the shade, playable without opening the app. Falls back to a
      // plain local notification below for anything without a playable URL.
      const VoiceNotePlayer = registerPlugin<{
        play(opts: { url: string; title: string; body: string }): Promise<void>;
      }>("VoiceNotePlayer");

      // A "▶ Play" action button on voice-note notifications, alongside the
      // default tap-to-open. Both route to the same click_action — a
      // notification can't play audio itself, native or web, so tapping
      // either one opens the app straight into auto-playing the clip.
      await LocalNotifications.registerActionTypes({
        types: [{ id: "VOICE_NOTE", actions: [{ id: "play", title: "▶ Play" }] }],
      }).catch(() => { /* older OS versions may not support custom action types */ });

      // Tapped a push notification (delivered while backgrounded — Android
      // shows those automatically) → route to wherever its payload says to
      // go (see data.click_action in push_service.py), same as the web
      // service worker's notificationclick handler does for browser pushes.
      const pushTap = await PushNotifications.addListener("pushNotificationActionPerformed", (action) => {
        const target = (action.notification.data?.click_action as string) || "/dashboard";
        router.push(target);
      });
      removers.push(() => pushTap.remove());

      // Android does NOT auto-display a system notification for pushes that
      // arrive while the app is in the foreground — that's standard FCM
      // behavior, not a bug. Post one ourselves so a real entry still lands
      // in the shade instead of the push silently vanishing while open.
      const pushReceived = await PushNotifications.addListener("pushNotificationReceived", async (notification) => {
        const audioUrl = notification.data?.audio_url as string | undefined;

        // Voice note with a real, directly-playable clip → hand off to the
        // native media player for an actual play/pause/seek notification.
        if (audioUrl) {
          try {
            await VoiceNotePlayer.play({
              url: audioUrl,
              title: notification.title ?? "Leora",
              body: notification.body ?? "New briefing ready.",
            });
            return;
          } catch (err) {
            console.warn("[push-bridge] native voice player failed, falling back:", err);
            // fall through to the plain local notification below
          }
        }

        try {
          await LocalNotifications.requestPermissions();
          const clickAction = notification.data?.click_action as string | undefined;
          await LocalNotifications.schedule({
            notifications: [
              {
                id: Math.floor(Date.now() % 2147483647),
                title: notification.title ?? "Leora",
                body: notification.body ?? "New briefing ready.",
                extra: notification.data ?? {},
                ...(clickAction ? { actionTypeId: "VOICE_NOTE" } : {}),
              },
            ],
          });
        } catch (err) {
          console.warn("[push-bridge] foreground local notification failed:", err);
        }
      });
      removers.push(() => pushReceived.remove());

      // Tapped one of our own foreground-posted local notifications → same
      // routing as a tapped push notification.
      const localTap = await LocalNotifications.addListener("localNotificationActionPerformed", (action) => {
        const target = (action.notification.extra?.click_action as string) || "/dashboard";
        router.push(target);
      });
      removers.push(() => localTap.remove());
    })();

    return () => removers.forEach((remove) => remove());
  }, [router]);

  return null;
}
