"use client";

export function isNativeApp(): boolean {
    if (typeof window === "undefined") return false;
    return Boolean((window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor?.isNativePlatform?.());
}

// Triggers the OS-level "choose a Google account" sheet (every account added
// on the device under Settings > Accounts, not just whatever's signed into a
// browser), then exchanges the resulting ID token for a session via
// /api/auth/mobile-google. Throws on cancel/failure — caller decides how to
// surface that.
export async function nativeGoogleSignIn(): Promise<void> {
    const { GoogleAuth } = await import("@southdevs/capacitor-google-auth");
    const user = await GoogleAuth.signIn({ scopes: ["profile", "email"] });
    const idToken = user.authentication.idToken;

    const res = await fetch("/api/auth/mobile-google", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
    });

    if (!res.ok) {
        throw new Error("mobile-google sign-in failed");
    }
}
