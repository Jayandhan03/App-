import { NextResponse } from "next/server";
import crypto from "crypto";
import mongoose from "mongoose";
import { connectToDatabase } from "@/lib/mongodb";
import WhatsAppLink from "@/models/WhatsAppLink";
import WhatsAppLinkToken from "@/models/WhatsAppLinkToken";
import PendingWhatsAppDelivery from "@/models/PendingWhatsAppDelivery";

const KAPSO_API_KEY = process.env.KAPSO_API_KEY!;
const KAPSO_PHONE_NUMBER_ID = process.env.KAPSO_PHONE_NUMBER_ID ?? "";
const KAPSO_BASE = "https://api.kapso.ai/meta/whatsapp/v24.0";
const WEBHOOK_SECRET = process.env.KAPSO_WEBHOOK_SECRET!;
const BACKEND = process.env.BACKEND_URL ?? "http://localhost:8000";

// Confirmed empirically against a real Kapso delivery: signature is
// hex(HMAC-SHA256(secret_key, raw_request_body)) in the x-webhook-signature header.
function verifySignature(rawBody: string, signature: string | null): boolean {
  if (!signature) return false;
  const expected = crypto.createHmac("sha256", WEBHOOK_SECRET).update(rawBody).digest("hex");
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

async function sendText(to: string, body: string) {
  if (!KAPSO_PHONE_NUMBER_ID) return;
  await fetch(`${KAPSO_BASE}/${KAPSO_PHONE_NUMBER_ID}/messages`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-API-Key": KAPSO_API_KEY },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to,
      type: "text",
      text: { body },
    }),
  }).catch(() => {});
}

type InboundMessage =
  | { kind: "text"; from: string; text: string }
  | { kind: "button"; from: string; payload: string };

// Pull the inbound event out of Kapso's webhook payload.
// Confirmed real shape for plain text: { message: { from, text: { body }, kapso: { direction, content } }, conversation, phone_number_id }
// Button-tap shape is Meta's standard interactive reply — NOT yet confirmed
// against a live Kapso payload (no template has been approved/tested yet).
// If taps aren't being picked up once testing starts, log the raw body and
// adjust the paths below to match what Kapso actually sends.
function parseInboundMessage(body: any): InboundMessage | null {
  const message = body?.message;
  if (!message) return null;
  if (message.kapso?.direction && message.kapso.direction !== "inbound") return null;

  const from: string | undefined = message.from;
  if (!from) return null;

  // Meta's Quick Reply tap shape: message.interactive.button_reply.id carries
  // back whatever payload we sent the button with (the pending-delivery id).
  // Also covers the older non-interactive "button" message type as a fallback.
  const buttonReply = message.interactive?.button_reply ?? message.button;
  const payload: string | undefined = buttonReply?.id ?? buttonReply?.payload;
  if (payload) {
    return { kind: "button", from: String(from), payload: String(payload) };
  }

  const text = message.text?.body ?? message.kapso?.content ?? "";
  return { kind: "text", from: String(from), text: String(text ?? "") };
}

// A button tap resolves to a queued briefing; ask the FastAPI backend (which
// owns the GridFS-held audio and the real Kapso audio-send flow) to fulfill it.
async function handleButtonReply(from: string, payload: string) {
  if (!mongoose.isValidObjectId(payload)) return;

  await connectToDatabase();
  // Scope to waId too so a tap can only ever release audio queued for the
  // same phone number it was queued for.
  const pending = await PendingWhatsAppDelivery.findOne({ _id: payload, waId: from, status: "pending" });
  if (!pending) {
    await sendText(from, "That briefing isn't available anymore — it may have already been sent or expired.");
    return;
  }

  try {
    const res = await fetch(`${BACKEND}/api/v1/whatsapp/deliver-pending`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pending_id: payload }),
      signal: AbortSignal.timeout(55000),
    });
    if (!res.ok) {
      console.error("[whatsapp-webhook] deliver-pending failed", res.status, await res.text().catch(() => ""));
    }
  } catch (err: unknown) {
    console.error("[whatsapp-webhook] deliver-pending request failed", err);
  }
}

// Kapso sends webhook events here once registered (see GET ?setup=1 below).
export async function POST(req: Request) {
  try {
    const rawBody = await req.text();
    if (!verifySignature(rawBody, req.headers.get("x-webhook-signature"))) {
      return NextResponse.json({ ok: false }, { status: 401 });
    }

    const body = JSON.parse(rawBody);
    const inbound = parseInboundMessage(body);
    if (!inbound) return NextResponse.json({ ok: true });

    if (inbound.kind === "button") {
      await handleButtonReply(inbound.from, inbound.payload);
      return NextResponse.json({ ok: true });
    }

    const { from, text } = inbound;
    const match = text.trim().match(/^LINK-([a-f0-9]+)$/i);

    if (!match) {
      // Not a linking message — ignore (or route to your bot logic later).
      return NextResponse.json({ ok: true });
    }

    await connectToDatabase();
    const token = match[1];
    const pending = await WhatsAppLinkToken.findOne({ token });

    if (!pending) {
      await sendText(from, "⚠️ This link has expired. Go back to the Leora app and tap Connect WhatsApp again.");
      return NextResponse.json({ ok: true });
    }

    await WhatsAppLink.findOneAndUpdate(
      { email: pending.email },
      { waId: from, linkedAt: new Date() },
      { upsert: true, new: true }
    );
    await WhatsAppLinkToken.deleteOne({ _id: pending._id });

    await sendText(from, "✅ Connected! Your Leora account is now linked — briefings will arrive right here.");

    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unexpected error";
    console.error("[whatsapp-webhook]", message);
    // Always 200 so Kapso/Meta doesn't retry-storm on transient errors.
    return NextResponse.json({ ok: false });
  }
}

// GET ?setup=1 — one-time helper to register this route as a Kapso webhook,
// scoped to this project's sandbox phone number.
// Visit https://<your-domain>/api/whatsapp-webhook?setup=1 once after deploy.
export async function GET(req: Request) {
  const { searchParams, origin } = new URL(req.url);

  if (searchParams.get("setup") !== "1") {
    return NextResponse.json({ ok: true, message: "Add ?setup=1 to register this webhook with Kapso." });
  }
  if (!KAPSO_PHONE_NUMBER_ID) {
    return NextResponse.json({ ok: false, error: "KAPSO_PHONE_NUMBER_ID is not set." }, { status: 500 });
  }

  // Behind a tunnel/proxy, the Host header is often rewritten to the local
  // target (e.g. "localhost:3000") for vhost compatibility — the real public
  // host arrives via x-forwarded-host/proto instead. Prefer those.
  const forwardedHost = req.headers.get("x-forwarded-host");
  const forwardedProto = req.headers.get("x-forwarded-proto") ?? "https";
  const publicOrigin = forwardedHost ? `${forwardedProto}://${forwardedHost}` : origin;

  const webhookUrl = `${publicOrigin}/api/whatsapp-webhook`;
  const whatsapp_webhook: Record<string, unknown> = {
    url: webhookUrl,
    events: ["whatsapp.message.received"],
    active: true,
  };
  if (WEBHOOK_SECRET) whatsapp_webhook.secret_key = WEBHOOK_SECRET;

  const res = await fetch(
    `https://api.kapso.ai/platform/v1/whatsapp/phone_numbers/${KAPSO_PHONE_NUMBER_ID}/webhooks`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-API-Key": KAPSO_API_KEY },
      body: JSON.stringify({ whatsapp_webhook }),
    }
  );
  const json = await res.json().catch(() => ({}));

  return NextResponse.json({ ok: res.ok, status: res.status, registration: json, webhookUrl });
}
