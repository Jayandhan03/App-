import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import mongoose from "mongoose";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { connectToDatabase } from "@/lib/mongodb";
import AgentModel from "@/models/Agent";

export const maxDuration = 60;

const BACKEND = process.env.BACKEND_URL ?? "http://localhost:8000";

type Ctx = { params: Promise<{ id: string }> };

// POST — trigger an immediate delivery for this agent, outside its schedule.
export async function POST(_req: Request, { params }: Ctx) {
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
    const agent = await AgentModel.findOne({ _id: id, email: session.user.email }).lean();
    if (!agent) {
      return NextResponse.json({ success: false, error: "Agent not found" }, { status: 404 });
    }

    const res = await fetch(`${BACKEND}/api/v1/agents/deliver-now`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ agent_id: id }),
      signal: AbortSignal.timeout(55000),
    });
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      return NextResponse.json({ success: false, error: data.detail ?? "Delivery failed" }, { status: res.status });
    }

    return NextResponse.json({ success: true, result: data });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unexpected error";
    console.error("[agents/[id]/run-now POST]", message);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
