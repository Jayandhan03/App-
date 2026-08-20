import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import mongoose from "mongoose";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { connectToDatabase } from "@/lib/mongodb";
import Briefing from "@/models/Briefing";

type Ctx = { params: Promise<{ id: string }> };

const MAX_LIMIT = 50;

// GET — briefing history for one agent, newest first. Ownership-checked by
// email (same convention as app/api/agents/[id]/route.ts). Paginated via
// skip/limit with a `total` so the expanded table row can page through the
// agent's whole history instead of stopping at a fixed cap.
export async function GET(req: Request, { params }: Ctx) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 });
    }

    const { id } = await params;
    if (!mongoose.isValidObjectId(id)) {
      return NextResponse.json({ success: false, error: "Invalid agent id" }, { status: 400 });
    }

    const { searchParams } = new URL(req.url);
    const limit = Math.min(MAX_LIMIT, Math.max(1, Number(searchParams.get("limit")) || 20));
    const skip = Math.max(0, Number(searchParams.get("skip")) || 0);

    await connectToDatabase();
    const filter = { agentId: id, email: session.user.email };
    const [briefings, total] = await Promise.all([
      Briefing.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).select("-script").lean(),
      Briefing.countDocuments(filter),
    ]);

    return NextResponse.json({
      success: true,
      total,
      hasMore: skip + briefings.length < total,
      briefings: briefings.map((b) => ({
        id: String(b._id),
        createdAt: b.createdAt,
        label: b.label,
        articleCount: b.articleCount,
        language: b.language,
        tone: b.tone,
        channels: b.channels,
        sizeBytes: b.sizeBytes,
      })),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unexpected error";
    console.error("[agents/[id]/briefings GET]", message);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
