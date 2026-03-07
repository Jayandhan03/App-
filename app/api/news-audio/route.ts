import { NextResponse } from "next/server";

/**
 * Proxy for POST /news-audio on the FastAPI backend.
 *
 * Current TTS engine: Google TTS (gTTS)
 *   • Response format : audio/mpeg (.mp3)
 *   • voice_id        : BCP-47 language code passed to gTTS (default "en")
 *   • model_id        : ignored by gTTS, kept in payload for schema compatibility
 */
export async function POST(req: Request) {
    try {
        const body = await req.json();

        // Map incoming fields → gTTS-compatible defaults
        const payload = {
            topic: body.topic,
            limit: body.limit ?? 5,
            time_published: body.time_published ?? "anytime",
            voice_id: body.voice_id ?? "en",   // BCP-47 lang code for gTTS
            model_id: body.model_id ?? "",     // ignored by gTTS
        };

        const response = await fetch("http://localhost:8000/news-audio", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            const errText = await response.text();
            let errDetail: string;
            try {
                const parsed = JSON.parse(errText);
                errDetail = parsed.detail ?? parsed.error ?? errText;
            } catch {
                errDetail = errText;
            }
            return NextResponse.json(
                { success: false, error: errDetail },
                { status: response.status }
            );
        }

        // Stream the MP3 bytes back to the browser
        const audioBuffer = await response.arrayBuffer();

        const contentDisposition =
            response.headers.get("Content-Disposition") ??
            `attachment; filename="${payload.topic.replace(/\s+/g, "_").slice(0, 40)}_news.mp3"`;

        // Forward metadata headers from backend when present
        const extraHeaders: Record<string, string> = {};
        const xTopic = response.headers.get("X-Topic");
        const xArticleCount = response.headers.get("X-Article-Count");
        if (xTopic) extraHeaders["X-Topic"] = xTopic;
        if (xArticleCount) extraHeaders["X-Article-Count"] = xArticleCount;

        return new NextResponse(audioBuffer, {
            status: 200,
            headers: {
                "Content-Type": "audio/mpeg",   // gTTS produces MP3
                "Content-Disposition": contentDisposition,
                ...extraHeaders,
            },
        });

    } catch (error: any) {
        return NextResponse.json(
            { success: false, error: error.message ?? "Unexpected server error" },
            { status: 500 }
        );
    }
}
