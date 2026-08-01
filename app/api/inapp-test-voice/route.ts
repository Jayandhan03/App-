import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export const maxDuration = 30;

// ── In-memory cache for test audio clips ─────────────────────────────────────
// Each entry lives for 10 minutes — long enough for the user to tap the
// notification, short enough not to pile up memory on the server.
interface CacheEntry {
  audioBase64: string;
  mimeType: string;
  expiresAt: number;
  email: string;
}

const audioCache = new Map<string, CacheEntry>();

// Purge expired entries on every request (cheap, no timer needed).
function purgeExpired() {
  const now = Date.now();
  for (const [key, entry] of audioCache.entries()) {
    if (entry.expiresAt < now) audioCache.delete(key);
  }
}

// ── POST /api/inapp-test-voice ────────────────────────────────────────────────
// Generates a short sample TTS clip via /api/voice-sample, caches it, and
// returns a one-time token the caller embeds in the notification click_action
// URL so the /test-briefing page can fetch the audio.
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 });
    }

    purgeExpired();

    const body = await req.json().catch(() => ({}));
    const language = typeof body.language === "string" && body.language ? body.language : "English";
    const tone = typeof body.tone === "string" && body.tone ? body.tone : "Analytical";

    const BACKEND = process.env.BACKEND_URL ?? "http://localhost:8000";

    // Sample text for the test briefing voice note.
    const sampleText =
      "Good morning! This is a test briefing from Leora. " +
      "Your in-app voice notifications are working perfectly. " +
      "When your agents run, their audio briefings will be delivered right here — " +
      "just like this. Tap play and stay informed, hands-free.";

    const backendRes = await fetch(`${BACKEND}/api/v1/audio/voice-sample`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: sampleText, language, tone }),
      signal: AbortSignal.timeout(25_000),
    });

    if (!backendRes.ok) {
      const errText = await backendRes.text();
      let errDetail: string;
      try { errDetail = JSON.parse(errText).detail ?? errText; } catch { errDetail = errText; }
      return NextResponse.json({ success: false, error: errDetail }, { status: 502 });
    }

    const audioBuffer = await backendRes.arrayBuffer();
    const audioBase64 = Buffer.from(audioBuffer).toString("base64");

    // Generate a random token, cache the clip for 10 minutes.
    const token = crypto.randomUUID();
    audioCache.set(token, {
      audioBase64,
      mimeType: "audio/mpeg",
      expiresAt: Date.now() + 10 * 60 * 1000,
      email: session.user.email,
    });

    return NextResponse.json({ success: true, token });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unexpected error";
    console.error("[inapp-test-voice] POST:", message);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

// ── GET /api/inapp-test-voice?token=... ──────────────────────────────────────
// Serves the cached audio for the /test-briefing player page.
// Auth-gated: only the user who generated it can fetch it.
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 });
    }

    purgeExpired();

    const token = req.nextUrl.searchParams.get("token");
    if (!token) {
      return NextResponse.json({ success: false, error: "Missing token" }, { status: 400 });
    }

    const entry = audioCache.get(token);
    if (!entry) {
      return NextResponse.json(
        { success: false, error: "Audio expired or not found. Send a new test notification." },
        { status: 404 }
      );
    }

    if (entry.email.toLowerCase() !== session.user.email.toLowerCase()) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    const audioBuffer = Buffer.from(entry.audioBase64, "base64");
    return new NextResponse(audioBuffer, {
      status: 200,
      headers: {
        "Content-Type": entry.mimeType,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unexpected error";
    console.error("[inapp-test-voice] GET:", message);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
