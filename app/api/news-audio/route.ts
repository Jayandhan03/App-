import { NextResponse } from "next/server";

// Raise the serverless timeout to 60s (requires Vercel Pro; free tier caps at 10s)
export const maxDuration = 60;

/**
 * GET /api/news-audio  ← debug ping
 * Returns the resolved BACKEND_URL so we can verify the env var is set on Vercel.
 */
export async function GET() {
    const BACKEND = process.env.BACKEND_URL ?? "http://localhost:8000";
    let healthStatus: unknown = null;
    let healthError: string | null = null;

    try {
        const res = await fetch(`${BACKEND}/api/v1/health`, {
            signal: AbortSignal.timeout(10_000),
        });
        healthStatus = await res.json();
    } catch (e: any) {
        healthError = e.message ?? String(e);
    }

    return NextResponse.json({
        backend_url:   BACKEND,
        health_status: healthStatus,
        health_error:  healthError,
        env_keys:      Object.keys(process.env).filter(k => k.startsWith("BACKEND") || k.startsWith("NEXT")),
    });
}

/**
 * POST /api/news-audio
 * Proxy for POST /api/v1/audio/news on the IndustryEar FastAPI backend.
 *
 * Full pipeline (server-side):
 *   1. Fetch latest articles via RapidAPI / Tavily
 *   2. Summarize into a broadcast-style script via Grok LLM
 *   3. Convert to speech via gTTS
 *   4. Stream the MP3 bytes back to the browser
 *
 * Response:  audio/mpeg  (downloadable .mp3)
 */
export async function POST(req: Request) {
    const BACKEND = process.env.BACKEND_URL ?? "http://localhost:8000";
    console.log("[news-audio] BACKEND_URL =", BACKEND);

    try {
        const body = await req.json();
        console.log("[news-audio] Request body =", JSON.stringify(body));

        const payload = {
            topic:          body.topic,
            limit:          body.limit          ?? 5,
            time_published: body.time_published ?? "anytime",
            language:       body.language       ?? "English",
            tone:           body.tone           ?? "Analytical",
        };

        if (!payload.topic?.trim()) {
            return NextResponse.json(
                { success: false, error: "topic is required" },
                { status: 422 }
            );
        }

        console.log("[news-audio] Calling backend:", `${BACKEND}/api/v1/audio/news`);

        let backendRes: Response;
        try {
            backendRes = await fetch(`${BACKEND}/api/v1/audio/news`, {
                method:  "POST",
                headers: { "Content-Type": "application/json" },
                body:    JSON.stringify(payload),
                signal:  AbortSignal.timeout(55_000),   // 55 s — accounts for Render cold-start
            });
        } catch (fetchErr: any) {
            console.error("[news-audio] fetch() threw:", fetchErr?.name, fetchErr?.message);
            return NextResponse.json(
                {
                    success: false,
                    error:   `Could not reach backend (${fetchErr?.name ?? "NetworkError"}): ${fetchErr?.message}`,
                    backend_url: BACKEND,
                },
                { status: 502 }
            );
        }

        console.log("[news-audio] Backend responded:", backendRes.status, backendRes.statusText);

        if (!backendRes.ok) {
            const errText = await backendRes.text();
            console.error("[news-audio] Backend error body:", errText);
            let errDetail: string;
            try {
                const parsed = JSON.parse(errText);
                errDetail = parsed.detail ?? parsed.error ?? errText;
            } catch {
                errDetail = errText;
            }
            return NextResponse.json(
                { success: false, error: errDetail, backend_status: backendRes.status },
                { status: backendRes.status }
            );
        }

        // ── Forward the MP3 stream + headers ─────────────────────────
        const audioBuffer = await backendRes.arrayBuffer();
        console.log("[news-audio] Audio bytes received:", audioBuffer.byteLength);

        const contentDisposition =
            backendRes.headers.get("Content-Disposition") ??
            `attachment; filename="${payload.topic.replace(/\s+/g, "_").slice(0, 40)}_news.mp3"`;

        const extraHeaders: Record<string, string> = {};
        const xTopic        = backendRes.headers.get("X-Topic");
        const xArticleCount = backendRes.headers.get("X-Article-Count");
        if (xTopic)        extraHeaders["X-Topic"]         = xTopic;
        if (xArticleCount) extraHeaders["X-Article-Count"] = xArticleCount;

        return new NextResponse(audioBuffer, {
            status: 200,
            headers: {
                "Content-Type":        "audio/mpeg",
                "Content-Disposition": contentDisposition,
                ...extraHeaders,
            },
        });

    } catch (error: any) {
        console.error("[news-audio] Unhandled error:", error?.name, error?.message, error?.stack);
        return NextResponse.json(
            {
                success:     false,
                error:       error.message ?? "Unexpected server error",
                error_name:  error?.name,
                backend_url: BACKEND,
            },
            { status: 500 }
        );
    }
}
