import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { connectToDatabase } from "@/lib/mongodb";
import NotificationLog from "@/models/NotificationLog";

// GET — lightweight unread count only, for the bell's polling loop so it
// doesn't have to pull the full notification list on every tick.
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 });
  }

  await connectToDatabase();
  const count = await NotificationLog.countDocuments({
    email: session.user.email.toLowerCase(),
    read: false,
  });

  return NextResponse.json({ success: true, count });
}
