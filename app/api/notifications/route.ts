import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { connectToDatabase } from "@/lib/mongodb";
import NotificationLog from "@/models/NotificationLog";

const LIST_LIMIT = 30;

// GET — recent notification log for the signed-in user, newest first, plus
// the current unread count (so the dropdown can render both in one fetch).
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 });
  }

  await connectToDatabase();
  const email = session.user.email.toLowerCase();

  const [logs, unreadCount] = await Promise.all([
    NotificationLog.find({ email }).sort({ createdAt: -1 }).limit(LIST_LIMIT).lean(),
    NotificationLog.countDocuments({ email, read: false }),
  ]);

  return NextResponse.json({
    success: true,
    unreadCount,
    notifications: logs.map((n) => ({
      id: String(n._id),
      title: n.title,
      body: n.body,
      type: n.type,
      data: n.data ?? {},
      read: n.read,
      createdAt: n.createdAt,
    })),
  });
}

// PATCH — mark one notification read ({id}) or every unread notification
// read ({all: true}). Mirrors the disabled-toggle bulk-update convention in
// app/api/push-subscriptions/route.ts.
export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const { id, all } = body;
  const email = session.user.email.toLowerCase();

  await connectToDatabase();

  if (all === true) {
    await NotificationLog.updateMany({ email, read: false }, { $set: { read: true, readAt: new Date() } });
    return NextResponse.json({ success: true });
  }

  if (typeof id !== "string" || !id) {
    return NextResponse.json({ success: false, error: "Missing id" }, { status: 400 });
  }

  await NotificationLog.updateOne({ _id: id, email }, { $set: { read: true, readAt: new Date() } });
  return NextResponse.json({ success: true });
}
