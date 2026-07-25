"use client";

export function isNativeApp(): boolean {
    if (typeof window === "undefined") return false;
    return Boolean((window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor?.isNativePlatform?.());
}

// Opens the real sign-in page in a Chrome Custom Tab (a genuine browser, not
// the app's embedded WebView) so Google's OAuth flow is allowed to run.
// The page redirects to /api/auth/mobile-bridge on success, which hands
// the session back to the app via a leora:// deep link.
export async function openGoogleSignIn() {
    const { Browser } = await import("@capacitor/browser");
    const callbackUrl = encodeURIComponent("/api/auth/mobile-bridge");
    await Browser.open({
        url: `${window.location.origin}/signin?callbackUrl=${callbackUrl}`,
    });
}
