import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import mongoose from "mongoose";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { connectToDatabase } from "@/lib/mongodb";
import Briefing from "@/models/Briefing";

type Ctx = { params: Promise<{ id: string }> };

// GET — recent briefing history for one agent, newest first. Ownership-checked
// by email (same convention as app/api/agents/[id]/route.ts).
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

    await connectToDatabase();
    const briefings = await Briefing.find({ agentId: id, email: session.user.email })
      .sort({ createdAt: -1 })
      .limit(20)
      .select("-script")
      .lean();

    return NextResponse.json({
      success: true,
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
