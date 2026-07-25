import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import mongoose from "mongoose";
import { GridFSBucket, ObjectId } from "mongodb";
import { Readable } from "node:stream";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { connectToDatabase } from "@/lib/mongodb";
import Briefing from "@/models/Briefing";

export const runtime = "nodejs"; // GridFS needs a raw TCP connection — never edge
export const dynamic = "force-dynamic";
export const maxDuration = 30;

type Ctx = { params: Promise<{ id: string }> };

// GET — stream a briefing's audio out of the permanent "briefingAudio" GridFS
// bucket, with HTTP Range support so <audio> scrubbing/seeking works.
export async function GET(req: Request, { params }: Ctx) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { id } = await params;
  if (!mongoose.isValidObjectId(id)) {
    return NextResponse.json({ error: "Invalid briefing id" }, { status: 400 });
  }

  await connectToDatabase();

  const briefing = await Briefing.findById(id).lean();
  // 404, not 403 — never confirm existence of another user's briefing. GridFS
  // ids are guessable and the FastAPI backend has no auth of its own; this
  // check is the only access control this audio has.
  if (!briefing || briefing.email !== session.user.email) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const db = mongoose.connection.db;
  if (!db) {
    return NextResponse.json({ error: "Database unavailable" }, { status: 503 });
  }
  const bucket = new GridFSBucket(db, { bucketName: "briefingAudio" });

  const length = briefing.sizeBytes;
  const range = req.headers.get("range");

  let start = 0;
  let end = length - 1; // inclusive, HTTP-style
  let status = 200;
  const headers: Record<string, string> = {
    "Content-Type": briefing.mimeType || "audio/mpeg",
    "Accept-Ranges": "bytes",
    "Cache-Control": "private, max-age=3600",
  };

  if (range) {
    const match = /^bytes=(\d*)-(\d*)$/.exec(range);
    if (match) {
      if (match[1]) start = parseInt(match[1], 10);
      if (match[2]) end = Math.min(parseInt(match[2], 10), length - 1);
      status = 206;
      headers["Content-Range"] = `bytes ${start}-${end}/${length}`;
    }
  }

  headers["Content-Length"] = String(end - start + 1);

  // GridFSBucket's `end` option is exclusive ("stop before this byte"), unlike
  // an HTTP Range's inclusive end byte — hence the +1.
  const downloadStream = bucket.openDownloadStream(new ObjectId(briefing.audioFileId), {
    start,
    end: end + 1,
  });

  req.signal.addEventListener("abort", () => {
    downloadStream.destroy();
  });

  const webStream = Readable.toWeb(downloadStream) as ReadableStream;
  return new Response(webStream, { status, headers });
}
