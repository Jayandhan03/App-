import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { connectToDatabase } from "@/lib/mongodb";
import SavedTopicModel from "@/models/SavedTopic";

export type SavedTopicShape = {
  id: string;
  topic: string;
  summary: string;
  corePrompt: string;
  keywords: string[];
  region: string;
  lastUsedAt: string;
};

function toClientShape(doc: any): SavedTopicShape {
  return {
    id: String(doc._id),
    topic: doc.topic,
    summary: doc.summary ?? "",
    corePrompt: doc.corePrompt,
    keywords: doc.keywords ?? [],
    region: doc.region ?? "Global",
    lastUsedAt: (doc.lastUsedAt ?? doc.updatedAt ?? doc.createdAt)?.toISOString?.() ?? new Date().toISOString(),
  };
}

// GET — the current user's saved topics, most recently used first.
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 });
    }

    await connectToDatabase();
    const docs = await SavedTopicModel.find({ email: session.user.email }).sort({ lastUsedAt: -1 }).limit(30).lean();
    return NextResponse.json({ success: true, topics: docs.map(toClientShape) });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unexpected error";
    console.error("[saved-topics GET]", message);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

// POST — save (or touch) a locked-in topic. Upserted by (email, topic) so
// re-locking the same topic just bumps it to the top instead of duplicating.
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const topic = typeof body.topic === "string" ? body.topic.trim() : "";
    const corePrompt = typeof body.corePrompt === "string" ? body.corePrompt.trim() : "";
    if (!topic || !corePrompt) {
      return NextResponse.json({ success: false, error: "topic and corePrompt are required." }, { status: 400 });
    }

    const summary = typeof body.summary === "string" ? body.summary.trim() : "";
    const keywords = Array.isArray(body.keywords) ? body.keywords.filter((k: unknown) => typeof k === "string" && k.trim()) : [];
    const region = typeof body.region === "string" && body.region ? body.region : "Global";

    await connectToDatabase();
    const doc = await SavedTopicModel.findOneAndUpdate(
      { email: session.user.email, topic },
      { $set: { summary, corePrompt, keywords, region, lastUsedAt: new Date() } },
      { upsert: true, new: true }
    ).lean();

    return NextResponse.json({ success: true, topic: toClientShape(doc) });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unexpected error";
    console.error("[saved-topics POST]", message);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
