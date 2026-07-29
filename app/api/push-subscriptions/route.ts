import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { connectToDatabase } from "@/lib/mongodb";
import PushSubscription from "@/models/PushSubscription";

// POST — register (or re-register) this device/browser's FCM token against
// the signed-in user. Upserted by token so re-registering (e.g. a rotated
// token) never creates duplicates.
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const { token, platform } = body;
  if (typeof token !== "string" || !token) {
    return NextResponse.json({ success: false, error: "Missing token" }, { status: 400 });
  }
  if (platform !== "web" && platform !== "android") {
    return NextResponse.json({ success: false, error: "Invalid platform" }, { status: 400 });
  }

  await connectToDatabase();
  await PushSubscription.findOneAndUpdate(
    { token },
    {
      $set: {
        email: session.user.email,
        platform,
        userAgent: req.headers.get("user-agent") ?? undefined,
        lastSeenAt: new Date(),
        disabled: false,
      },
      $setOnInsert: { createdAt: new Date() },
    },
    { upsert: true }
  );

  return NextResponse.json({ success: true });
}

// GET — is this user's in-app notification toggle on for the given platform?
// Drives the toggle shown on Delivery and Create-agent, so it reflects the
// real server-side state rather than just this device's local permission.
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 });
  }

  const platform = req.nextUrl.searchParams.get("platform");
  if (platform !== "web" && platform !== "android") {
    return NextResponse.json({ success: false, error: "Invalid platform" }, { status: 400 });
  }

  await connectToDatabase();
  const subs = await PushSubscription.find({ email: session.user.email.toLowerCase(), platform }).lean();

  return NextResponse.json({ success: true, registered: subs.length > 0, enabled: subs.some((s) => !s.disabled) });
}

// PATCH — flip in-app notifications on/off for every device this user has
// registered on the given platform. Turning it back on when a token already
// exists just clears the flag here; a first-time enable still goes through
// POST above (which needs to request permission and mint a token).
export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const { platform, enabled } = body;
  if (platform !== "web" && platform !== "android") {
    return NextResponse.json({ success: false, error: "Invalid platform" }, { status: 400 });
  }
  if (typeof enabled !== "boolean") {
    return NextResponse.json({ success: false, error: "Missing enabled" }, { status: 400 });
  }

  await connectToDatabase();
  await PushSubscription.updateMany(
    { email: session.user.email.toLowerCase(), platform },
    { $set: { disabled: !enabled } }
  );

  return NextResponse.json({ success: true });
}
