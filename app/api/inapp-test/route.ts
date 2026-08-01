import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { connectToDatabase } from "@/lib/mongodb";
import PushSubscription from "@/models/PushSubscription";

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
// If a `token` is provided in the body (the current device's live FCM token
// obtained client-side), we send directly to that one token — this guarantees
// delivery to the exact device that clicked the button with a fresh token.
// If no token is provided we fall back to all stored non-disabled tokens for
// the user (useful for admin / batch pings).
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
    const clickUrl: string =
      typeof body.clickUrl === "string" && body.clickUrl
        ? body.clickUrl
        : "/dashboard";
    const hasVoice = clickUrl.includes("/test-briefing");

    await connectToDatabase();

    const messaging = await getAdminMessaging();

    const notification = {
      title: hasVoice ? "🎧 Test briefing ready" : "🔔 Leora test",
      body: hasVoice
        ? "Your Leora voice note is ready — tap to listen."
        : "Your in-app notifications are working. Briefings will arrive right here.",
    };
    const data = { click_action: clickUrl, type: "test" };
    const webpush = {
      notification: { icon: "/icon.svg", badge: "/icon.svg", requireInteraction: false },
      fcmOptions: { link: clickUrl },
    };
    const android = {
      notification: { color: "#4d7fff", priority: "high" as const },
      priority: "high" as const,
    };

    // ── Single-device path (preferred): client supplies its live FCM token ──
    if (deviceToken) {
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
    }

    // ── Fallback: all stored tokens for this user ──────────────────────────
    const subs = await PushSubscription.find({
      email: session.user.email.toLowerCase(),
      disabled: false,
    }).lean();

    if (subs.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error:
            "No registered devices found. Enable notifications first, then try again.",
        },
        { status: 404 }
      );
    }

    const tokens = subs.map((s) => s.token);
    const response = await messaging.sendEachForMulticast(
      { tokens, notification, data, webpush, android }
    );

    const successCount = response.successCount;
    const failureCount = response.failureCount;

    if (failureCount > 0) {
      response.responses.forEach((r, i) => {
        if (!r.success) {
          console.warn("[inapp-test] token failed:", {
            token: tokens[i].slice(0, 20) + "…",
            error: r.error?.message,
          });
        }
      });
    }

    if (successCount === 0) {
      return NextResponse.json(
        {
          success: false,
          error: `FCM rejected all ${failureCount} token(s). They may be stale — toggle notifications off and on again to re-register.`,
        },
        { status: 502 }
      );
    }

    return NextResponse.json({ success: true, sent: successCount, failed: failureCount });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unexpected error";
    console.error("[inapp-test]", message);
    const status = message.includes("FIREBASE_SERVICE_ACCOUNT_JSON") ? 501 : 500;
    return NextResponse.json({ success: false, error: message }, { status });
  }
}
