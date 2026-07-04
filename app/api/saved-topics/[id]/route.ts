import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import mongoose from "mongoose";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { connectToDatabase } from "@/lib/mongodb";
import SavedTopicModel from "@/models/SavedTopic";

type Ctx = { params: Promise<{ id: string }> };

// DELETE — forget a saved topic. Ownership-checked by email.
export async function DELETE(req: Request, { params }: Ctx) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 });
    }

    const { id } = await params;
    if (!mongoose.isValidObjectId(id)) {
      return NextResponse.json({ success: false, error: "Invalid topic id" }, { status: 400 });
    }

    await connectToDatabase();
    const res = await SavedTopicModel.deleteOne({ _id: id, email: session.user.email });
    if (res.deletedCount === 0) {
      return NextResponse.json({ success: false, error: "Saved topic not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unexpected error";
    console.error("[saved-topics/[id] DELETE]", message);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
