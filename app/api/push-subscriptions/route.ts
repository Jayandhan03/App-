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
