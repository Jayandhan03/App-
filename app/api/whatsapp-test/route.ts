import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { connectToDatabase } from "@/lib/mongodb";
import WhatsAppLink from "@/models/WhatsAppLink";

const BACKEND = process.env.BACKEND_URL ?? "http://localhost:8000";

// POST — exercise the real confirm-then-deliver flow: sends the approved
// "briefing ready" template (not raw text, which 422s outside the 24h
// session window) and queues a short test clip that arrives once the user
// taps the button.
export async function POST() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 });
    }

    await connectToDatabase();
    const link = await WhatsAppLink.findOne({ email: session.user.email });
    if (!link) {
      return NextResponse.json({ success: false, error: "WhatsApp not connected" }, { status: 404 });
    }

    const res = await fetch(`${BACKEND}/api/v1/whatsapp/test-ping`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: session.user.email }),
      signal: AbortSignal.timeout(55000),
    });

    if (!res.ok) {
      const rawBody = await res.text();
      const err = (() => { try { return JSON.parse(rawBody); } catch { return null; } })();
      console.error("[whatsapp-test] backend rejected test-ping", { status: res.status, body: rawBody });
      const message = typeof err?.detail === "string" ? err.detail : rawBody.slice(0, 300) || `Backend error (HTTP ${res.status})`;
      return NextResponse.json({ success: false, error: message }, { status: 502 });
    }

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unexpected error";
    console.error("[whatsapp-test]", message);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
