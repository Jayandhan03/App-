import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { connectToDatabase } from "@/lib/mongodb";
import WhatsAppLink from "@/models/WhatsAppLink";

const KAPSO_API_KEY = process.env.KAPSO_API_KEY!;
const KAPSO_PHONE_NUMBER_ID = process.env.KAPSO_PHONE_NUMBER_ID ?? "";
const KAPSO_BASE = "https://api.kapso.ai/meta/whatsapp/v24.0";

// POST — send a test ping to the current user's linked WhatsApp number.
export async function POST() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 });
    }
    if (!KAPSO_PHONE_NUMBER_ID) {
      return NextResponse.json(
        { success: false, error: "WhatsApp is not configured yet (missing KAPSO_PHONE_NUMBER_ID)." },
        { status: 500 }
      );
    }

    await connectToDatabase();
    const link = await WhatsAppLink.findOne({ email: session.user.email });
    if (!link) {
      return NextResponse.json({ success: false, error: "WhatsApp not connected" }, { status: 404 });
    }

    const res = await fetch(`${KAPSO_BASE}/${KAPSO_PHONE_NUMBER_ID}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-API-Key": KAPSO_API_KEY },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: link.waId,
        type: "text",
        text: { body: "✅ Leora test successful! Your WhatsApp is connected — audio briefings will be delivered here." },
      }),
      signal: AbortSignal.timeout(10_000),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return NextResponse.json(
        { success: false, error: err.error?.message ?? err.message ?? "Kapso API error" },
        { status: 502 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unexpected error";
    console.error("[whatsapp-test]", message);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
