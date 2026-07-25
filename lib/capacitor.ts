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

    let idToken: string | undefined;
    try {
        // The native plugin requires an explicit initialize() before signIn()
        // will work — it's what actually builds the underlying
        // GoogleSignInClient from the configured clientId/scopes.
        await GoogleAuth.initialize({ scopes: ["profile", "email"] });
        const user = await GoogleAuth.signIn({ scopes: ["profile", "email"] });
        idToken = user.authentication.idToken;
    } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : JSON.stringify(err);
        throw new Error(`native picker: ${msg}`);
    }

    const res = await fetch("/api/auth/mobile-google", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
    });

    if (!res.ok) {
        const body = await res.text().catch(() => "");
        throw new Error(`mobile-google exchange failed (${res.status}): ${body}`);
    }
}
