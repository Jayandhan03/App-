import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import mongoose from "mongoose";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { connectToDatabase } from "@/lib/mongodb";
import Briefing from "@/models/Briefing";

const MAX_LIMIT = 50;

// GET — the user's briefing library across every agent, newest first.
// Powers the dashboard's "Briefing library" card: paginated via skip/limit so
// the whole history is reachable by scrolling, and optionally narrowed to one
// agent via ?agentId. (app/api/agents/[id]/briefings serves the per-agent
// history embedded in the agents table.)
//
// Returns `total` for the *current* query so the UI can show a real count on
// every filter chip and know when to stop asking for more pages.
export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const limit = Math.min(MAX_LIMIT, Math.max(1, Number(searchParams.get("limit")) || 3));
    const skip = Math.max(0, Number(searchParams.get("skip")) || 0);
    const agentId = searchParams.get("agentId");

    const query: Record<string, unknown> = { email: session.user.email };
    if (agentId) {
      if (!mongoose.isValidObjectId(agentId)) {
        return NextResponse.json({ success: false, error: "Invalid agent id" }, { status: 400 });
      }
      query.agentId = new mongoose.Types.ObjectId(agentId);
    }

    await connectToDatabase();
    const [briefings, total] = await Promise.all([
      Briefing.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).select("-script").lean(),
      Briefing.countDocuments(query),
    ]);

    return NextResponse.json({
      success: true,
      total,
      hasMore: skip + briefings.length < total,
      briefings: briefings.map((b) => ({
        id: String(b._id),
        agentId: String(b.agentId),
        agentName: b.agentName,
        agentIcon: b.agentIcon ?? "🛰️",
        createdAt: b.createdAt,
        label: b.label,
        articleCount: b.articleCount,
        channels: b.channels ?? {},
      })),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unexpected error";
    console.error("[briefings/recent GET]", message);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
