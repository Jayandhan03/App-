import { NextResponse } from "next/server";
import crypto from "crypto";
import { connectToDatabase } from "@/lib/mongodb";
import WhatsAppLink from "@/models/WhatsAppLink";
import WhatsAppLinkToken from "@/models/WhatsAppLinkToken";

const KAPSO_API_KEY = process.env.KAPSO_API_KEY!;
const KAPSO_PHONE_NUMBER_ID = process.env.KAPSO_PHONE_NUMBER_ID ?? "";
const KAPSO_BASE = "https://api.kapso.ai/meta/whatsapp/v24.0";
const WEBHOOK_SECRET = process.env.KAPSO_WEBHOOK_SECRET!;

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

// Pull the inbound text + sender wa_id out of Kapso's webhook payload.
// Confirmed real shape: { message: { from, text: { body }, kapso: { direction, content } }, conversation, phone_number_id }
function parseInboundMessage(body: any): { from: string; text: string } | null {
  const message = body?.message;
  if (!message) return null;
  if (message.kapso?.direction && message.kapso.direction !== "inbound") return null;

  const from: string | undefined = message.from;
  if (!from) return null;

  const text = message.text?.body ?? message.kapso?.content ?? "";
  return { from: String(from), text: String(text ?? "") };
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
