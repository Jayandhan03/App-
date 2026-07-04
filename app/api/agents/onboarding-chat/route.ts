import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export const maxDuration = 60;

const BACKEND = process.env.BACKEND_URL ?? "http://localhost:8000";

/**
 * POST /api/agents/onboarding-chat
 * Proxy for the Grok-powered agent onboarding chatbot on the FastAPI backend.
 * Its only job is to lock in what a single agent should research — greet, take
 * the user's request, reflect it back with three follow-ups, then finalize.
 *
 * Body: { messages: [{ role, content }, ...] }
 * Returns: { reply, complete, locked: { topic, summary, core_prompt, keywords, region } | null }
 */
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const messages = Array.isArray(body.messages) ? body.messages : [];

    const res = await fetch(`${BACKEND}/api/v1/agents/onboarding-chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages }),
      signal: AbortSignal.timeout(55_000),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return NextResponse.json(
        { success: false, error: data.detail ?? data.error ?? "Chat failed" },
        { status: res.status }
      );
    }

    return NextResponse.json(data);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unexpected error";
    console.error("[agents/onboarding-chat]", message);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
