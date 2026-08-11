import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { connectToDatabase } from "@/lib/mongodb";
import Briefing from "@/models/Briefing";

// GET — most recent briefings across all of the user's agents, newest first.
// Powers the dashboard's "Morning brief" card audio player (distinct from
// app/api/agents/[id]/briefings, which is scoped to a single agent).
export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const limit = Math.min(10, Math.max(1, Number(searchParams.get("limit")) || 3));

    await connectToDatabase();
    const briefings = await Briefing.find({ email: session.user.email })
      .sort({ createdAt: -1 })
      .limit(limit)
      .select("-script")
      .lean();

    return NextResponse.json({
      success: true,
      briefings: briefings.map((b) => ({
        id: String(b._id),
        agentId: String(b.agentId),
        agentName: b.agentName,
        agentIcon: b.agentIcon ?? "🛰️",
        createdAt: b.createdAt,
        label: b.label,
        articleCount: b.articleCount,
      })),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unexpected error";
    console.error("[briefings/recent GET]", message);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
