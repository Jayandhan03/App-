"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { isNativeApp } from "@/lib/capacitor";

// Mounted app-wide (see app/layout.tsx). Only does anything inside the
// native shell: routes a tapped push notification to wherever its payload
// says to go (see data.click_action in push_service.py), same as the web
// service worker's notificationclick handler does for browser pushes.
export default function PushNotificationBridge() {
  const router = useRouter();

  useEffect(() => {
    if (!isNativeApp()) return;

    let removeListener: (() => void) | undefined;

    (async () => {
      const { PushNotifications } = await import("@capacitor/push-notifications");
      const sub = await PushNotifications.addListener("pushNotificationActionPerformed", (action) => {
        const target = (action.notification.data?.click_action as string) || "/dashboard";
        router.push(target);
      });
      removeListener = () => sub.remove();
    })();

    return () => removeListener?.();
  }, [router]);

  return null;
}
