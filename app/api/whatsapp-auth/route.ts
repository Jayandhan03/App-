import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { connectToDatabase } from "@/lib/mongodb";
import WhatsAppLink from "@/models/WhatsAppLink";
import WhatsAppLinkToken from "@/models/WhatsAppLinkToken";
import crypto from "crypto";

// The Kapso-provisioned WhatsApp number users message to link their account
// (sandbox number during dev, your verified business number in production).
// E.164 digits only, no "+" — e.g. "15551234567".
const WHATSAPP_NUMBER = process.env.KAPSO_WHATSAPP_NUMBER ?? "";

// GET — is the current session user linked to WhatsApp?
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ connected: false });

    await connectToDatabase();
    const link = await WhatsAppLink.findOne({ email: session.user.email });
    if (!link) return NextResponse.json({ connected: false });

    return NextResponse.json({ connected: true, waId: link.waId });
  } catch {
    return NextResponse.json({ connected: false });
  }
}

// POST — mint a one-time token and return the wa.me deep-link to open.
export async function POST() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 });
    }
    if (!WHATSAPP_NUMBER) {
      return NextResponse.json(
        { success: false, error: "WhatsApp is not configured yet (missing KAPSO_WHATSAPP_NUMBER)." },
        { status: 500 }
      );
    }

    await connectToDatabase();

    const token = crypto.randomBytes(12).toString("hex");
    // One pending token per user — replace any previous attempt.
    await WhatsAppLinkToken.findOneAndUpdate(
      { email: session.user.email },
      { token, email: session.user.email, createdAt: new Date() },
      { upsert: true, new: true }
    );

    const prefill = encodeURIComponent(`LINK-${token}`);
    return NextResponse.json({
      success: true,
      deepLink: `https://wa.me/${WHATSAPP_NUMBER}?text=${prefill}`,
      whatsappNumber: WHATSAPP_NUMBER,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unexpected error";
    console.error("[whatsapp-auth POST]", message);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

// DELETE — unlink the current user's WhatsApp.
export async function DELETE() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 });
    }

    await connectToDatabase();
    await WhatsAppLink.deleteOne({ email: session.user.email });
    await WhatsAppLinkToken.deleteOne({ email: session.user.email });

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unexpected error";
    console.error("[whatsapp-auth DELETE]", message);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
