"use client";

import { useEffect } from "react";
import { isNativeApp } from "@/lib/capacitor";

// Mounted app-wide (see app/layout.tsx). Only does anything inside the native
// shell: listens for the leora://auth-callback deep link that
// /api/auth/mobile-bridge sends the system browser to after Google sign-in,
// then navigates this WebView to /api/auth/mobile-exchange to pick up the
// same session cookie inside the app.
export default function CapacitorAuthBridge() {
    useEffect(() => {
        if (!isNativeApp()) return;

        let removeListener: (() => void) | undefined;

        (async () => {
            const { App } = await import("@capacitor/app");
            const sub = await App.addListener("appUrlOpen", ({ url }) => {
                if (!url.startsWith("leora://auth-callback")) return;
                const code = new URL(url).searchParams.get("code");
                if (code) {
                    window.location.href = `/api/auth/mobile-exchange?code=${encodeURIComponent(code)}`;
                }
            });
            removeListener = () => sub.remove();
        })();

        return () => removeListener?.();
    }, []);

    return null;
}
