import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

// ── Firebase Admin singleton ──────────────────────────────────────────────────
// Lazy-initialised so the import is a no-op if the env var isn't set yet.
// Kept in module scope so it survives Next.js hot-reloads in dev.

let adminApp: import("firebase-admin/app").App | null = null;

async function getAdminMessaging() {
  if (!adminApp) {
    const { initializeApp, getApps, cert } = await import("firebase-admin/app");
    const { getMessaging } = await import("firebase-admin/messaging");

    if (getApps().length > 0) {
      // Already initialised by a previous invocation in this process.
      adminApp = getApps()[0];
      return getMessaging(adminApp);
    }

    const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
    if (!raw) {
      throw new Error(
        "FIREBASE_SERVICE_ACCOUNT_JSON is not set. " +
          "Download the service-account key from Firebase Console → Project Settings → Service Accounts, " +
          "base64-encode it, and add it to .env.local as FIREBASE_SERVICE_ACCOUNT_JSON=<base64>."
      );
    }

    const serviceAccount = JSON.parse(Buffer.from(raw, "base64").toString("utf-8"));
    adminApp = initializeApp({ credential: cert(serviceAccount) });
    return getMessaging(adminApp);
  }

  const { getMessaging } = await import("firebase-admin/messaging");
  return getMessaging(adminApp);
}

// ── POST /api/inapp-test ──────────────────────────────────────────────────────
// Requires a `token` — the current device's live FCM token, obtained
// client-side — and sends only to that one device. This is a per-device test
// button; it must never fan out to every device the account is signed in on.
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json(
        { success: false, error: "Not authenticated" },
        { status: 401 }
      );
    }

    // Optional: live FCM token for the current device (preferred) and a
    // clickUrl containing the test-briefing page + voice token.
    const body = await req.json().catch(() => ({}));
    const deviceToken: string | undefined =
      typeof body.token === "string" && body.token ? body.token : undefined;

    if (!deviceToken) {
      return NextResponse.json(
        { success: false, error: "No device token provided. Enable notifications and try again." },
        { status: 400 }
      );
    }

    const clickUrl: string =
      typeof body.clickUrl === "string" && body.clickUrl
        ? body.clickUrl
        : "/dashboard";
    const hasVoice = clickUrl.includes("/test-briefing");

    const messaging = await getAdminMessaging();

    const notification = {
      title: hasVoice ? "🎧 Test briefing ready" : "🔔 Leora test",
      body: hasVoice
        ? "Your Leora voice note is ready — tap to listen."
        : "Your in-app notifications are working. Briefings will arrive right here.",
    };
    const data = {
      click_action: clickUrl,
      type: "test",
      // Absolute URL so the native player (which has no browser base URL to
      // resolve a relative path against) can play it directly.
      ...(hasVoice ? { audio_url: `${req.nextUrl.origin}/audio/test-briefing.mp3` } : {}),
    };
    const webpush = {
      notification: {
        icon: "/icon-192.png",
        badge: "/icon-192.png",
        requireInteraction: false,
        actions: hasVoice ? [{ action: "play", title: "▶ Play" }] : undefined,
      },
      fcmOptions: { link: clickUrl },
    };
    const android = {
      notification: { color: "#4d7fff", priority: "high" as const },
      priority: "high" as const,
    };

    try {
      const msgId = await messaging.send({ token: deviceToken, notification, data, webpush, android });
      console.log("[inapp-test] sent to device token, messageId:", msgId);
      return NextResponse.json({ success: true, sent: 1, failed: 0 });
    } catch (sendErr: unknown) {
      const msg = sendErr instanceof Error ? sendErr.message : String(sendErr);
      console.error("[inapp-test] single-token send failed:", msg);
      return NextResponse.json(
        { success: false, error: `FCM delivery failed: ${msg}` },
        { status: 502 }
      );
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unexpected error";
    console.error("[inapp-test]", message);
    const status = message.includes("FIREBASE_SERVICE_ACCOUNT_JSON") ? 501 : 500;
    return NextResponse.json({ success: false, error: message }, { status });
  }
}
