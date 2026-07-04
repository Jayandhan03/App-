import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export const maxDuration = 30;

const BACKEND = process.env.BACKEND_URL ?? "http://localhost:8000";

/**
 * POST /api/voice-sample
 * Proxy for a quick TTS-only sample (no news fetch/summarize) — backs the
 * create-agent page's "Preview voice" button so the sample audio actually
 * uses the selected language's real neural voice and the selected tone's
 * real prosody, instead of the browser's built-in speech synthesis.
 *
 * Body: { text, language, tone }
 * Response: audio/mpeg
 */
export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.email) {
            return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 });
        }

        const body = await req.json().catch(() => ({}));
        const text = typeof body.text === "string" ? body.text.trim() : "";
        if (!text) {
            return NextResponse.json({ success: false, error: "text is required" }, { status: 422 });
        }

        const payload = {
            text,
            language: typeof body.language === "string" && body.language ? body.language : "English",
            tone: typeof body.tone === "string" && body.tone ? body.tone : "Analytical",
        };

        const backendRes = await fetch(`${BACKEND}/api/v1/audio/voice-sample`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
            signal: AbortSignal.timeout(20_000),
        });

        if (!backendRes.ok) {
            const errText = await backendRes.text();
            let errDetail: string;
            try { errDetail = JSON.parse(errText).detail ?? errText; } catch { errDetail = errText; }
            return NextResponse.json({ success: false, error: errDetail }, { status: backendRes.status });
        }

        const audioBuffer = await backendRes.arrayBuffer();
        return new NextResponse(audioBuffer, {
            status: 200,
            headers: { "Content-Type": "audio/mpeg" },
        });
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Unexpected error";
        console.error("[voice-sample]", message);
        return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
}
