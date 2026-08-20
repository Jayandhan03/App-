import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import mongoose from "mongoose";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { connectToDatabase } from "@/lib/mongodb";
import NotificationLog from "@/models/NotificationLog";
import Briefing from "@/models/Briefing";
import Agent from "@/models/Agent";

const MAX_LIMIT = 50;

const objectIds = (values: (string | undefined)[]) =>
  [...new Set(values.filter((v): v is string => !!v && mongoose.isValidObjectId(v)))]
    .map((v) => new mongoose.Types.ObjectId(v));

// GET — the signed-in user's notification inbox, newest first.
//
// Paginated via skip/limit (with `total`/`hasMore`) and optionally narrowed to
// unread with ?unread=1 — the unread filter has to be applied server-side, not
// in the client, or paging would silently skip unread items sitting past the
// current page.
//
// Each briefing notification is joined back to its Briefing and Agent so the
// inbox can render the agent's own icon/accent and play the audio inline. The
// raw log rows are deliberately thin (title/body strings written at push time),
// so without this join every row would look identical — which is exactly what
// the notification panel used to suffer from.
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 });
  }

  await connectToDatabase();
  const email = session.user.email.toLowerCase();

  const { searchParams } = new URL(req.url);
  const limit = Math.min(MAX_LIMIT, Math.max(1, Number(searchParams.get("limit")) || 20));
  const skip = Math.max(0, Number(searchParams.get("skip")) || 0);
  const unreadOnly = searchParams.get("unread") === "1";

  const query: Record<string, unknown> = { email };
  if (unreadOnly) query.read = false;

  const [logs, total, unreadCount] = await Promise.all([
    NotificationLog.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    NotificationLog.countDocuments(query),
    NotificationLog.countDocuments({ email, read: false }),
  ]);

  // Two batched lookups for the whole page rather than one per row.
  const briefingIds = objectIds(logs.map((n) => (n.data as Record<string, string>)?.briefingId));
  const agentIds = objectIds(logs.map((n) => (n.data as Record<string, string>)?.agentId));

  type BriefingLite = { _id: mongoose.Types.ObjectId; label: string; articleCount: number; agentIcon?: string };
  type AgentLite = { _id: mongoose.Types.ObjectId; name: string; icon: string; accent: string; niche: string };

  const [briefingDocs, agentDocs] = await Promise.all([
    briefingIds.length
      ? Briefing.find({ _id: { $in: briefingIds }, email }).select("articleCount label agentIcon").lean()
      : Promise.resolve([]),
    agentIds.length
      ? Agent.find({ _id: { $in: agentIds }, email }).select("name icon accent niche").lean()
      : Promise.resolve([]),
  ]);

  const briefingById = new Map(
    (briefingDocs as unknown as BriefingLite[]).map((b) => [String(b._id), b] as const),
  );
  const agentById = new Map(
    (agentDocs as unknown as AgentLite[]).map((a) => [String(a._id), a] as const),
  );

  return NextResponse.json({
    success: true,
    total,
    unreadCount,
    hasMore: skip + logs.length < total,
    notifications: logs.map((n) => {
      const data = (n.data ?? {}) as Record<string, string>;
      const briefing = data.briefingId ? briefingById.get(data.briefingId) : undefined;
      const agent = data.agentId ? agentById.get(data.agentId) : undefined;

      return {
        id: String(n._id),
        title: n.title,
        body: n.body,
        type: n.type,
        data,
        read: n.read,
        createdAt: n.createdAt,
        // Null when the agent was deleted or the briefing aged out — the row
        // then falls back to the plain title/body it was logged with.
        agent: agent
          ? { id: String(agent._id), name: agent.name, icon: agent.icon, accent: agent.accent, niche: agent.niche }
          : null,
        // Present ⇒ the audio is still on disk, so the row can offer playback.
        briefing: briefing
          ? { id: String(briefing._id), label: briefing.label, articleCount: briefing.articleCount, icon: briefing.agentIcon }
          : null,
      };
    }),
  });
}

// PATCH — mark one notification read/unread ({id, read?}) or every unread
// notification read ({all: true}). Mirrors the disabled-toggle bulk-update
// convention in app/api/push-subscriptions/route.ts.
export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const { id, all, read } = body;
  const email = session.user.email.toLowerCase();

  await connectToDatabase();

  if (all === true) {
    await NotificationLog.updateMany({ email, read: false }, { $set: { read: true, readAt: new Date() } });
    return NextResponse.json({ success: true });
  }

  if (typeof id !== "string" || !id || !mongoose.isValidObjectId(id)) {
    return NextResponse.json({ success: false, error: "Missing id" }, { status: 400 });
  }

  // read defaults to true so existing callers that send only {id} keep working.
  const nextRead = read !== false;
  await NotificationLog.updateOne(
    { _id: id, email },
    { $set: { read: nextRead, readAt: nextRead ? new Date() : null } },
  );

  const unreadCount = await NotificationLog.countDocuments({ email, read: false });
  return NextResponse.json({ success: true, unreadCount });
}

// DELETE — remove one notification (?id=), or bulk-clear with ?scope=read
// (everything already read) / ?scope=all. Deleting is the only way to get an
// item out of the inbox: the log is append-only from the push side.
export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 });
  }

  const email = session.user.email.toLowerCase();
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  const scope = searchParams.get("scope");

  await connectToDatabase();

  if (scope === "all") {
    await NotificationLog.deleteMany({ email });
    return NextResponse.json({ success: true, unreadCount: 0 });
  }

  if (scope === "read") {
    await NotificationLog.deleteMany({ email, read: true });
    const unreadCount = await NotificationLog.countDocuments({ email, read: false });
    return NextResponse.json({ success: true, unreadCount });
  }

  if (!id || !mongoose.isValidObjectId(id)) {
    return NextResponse.json({ success: false, error: "Missing id" }, { status: 400 });
  }

  await NotificationLog.deleteOne({ _id: id, email });
  const unreadCount = await NotificationLog.countDocuments({ email, read: false });
  return NextResponse.json({ success: true, unreadCount });
}
