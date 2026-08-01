import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import mongoose from "mongoose";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { connectToDatabase } from "@/lib/mongodb";
import AgentModel from "@/models/Agent";
import TelegramLink from "@/models/TelegramLink";
import WhatsAppLink from "@/models/WhatsAppLink";
import { LANGUAGE_CODES } from "@/lib/agentConstants";
import { computeNextRunAt } from "@/lib/schedule";
import { toClientShape } from "@/app/api/agents/route";

type Ctx = { params: Promise<{ id: string }> };

// PATCH — update any subset of an agent's config. Ownership-checked by email.
export async function PATCH(req: Request, { params }: Ctx) {
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
    const agent = await AgentModel.findOne({ _id: id, email: session.user.email });
    if (!agent) {
      return NextResponse.json({ success: false, error: "Agent not found" }, { status: 404 });
    }

    const body = await req.json().catch(() => ({}));
    const set: Record<string, unknown> = {};

    if (typeof body.name === "string" && body.name.trim()) set.name = body.name.trim();
    if (typeof body.niche === "string" && body.niche.trim()) set.niche = body.niche.trim();
    if (Array.isArray(body.topics)) set.topics = body.topics.filter(Boolean);
    if (Array.isArray(body.keywords)) set.keywords = body.keywords.filter((k: unknown) => typeof k === "string" && k.trim());
    if (typeof body.region === "string") set.region = body.region;
    if (Number.isFinite(body.articleLimit)) set.articleLimit = Math.min(20, Math.max(1, Math.round(body.articleLimit)));
    // corePrompt is the agent's locked-in research directive — user can tweak it any time after onboarding.
    if (typeof body.corePrompt === "string") set.corePrompt = body.corePrompt.trim();
    if (typeof body.onboardingSummary === "string") set.onboardingSummary = body.onboardingSummary.trim();

    // Build the "effective schedule" — the current agent's schedule, overlaid
    // with any incoming cadence/timezone changes — so nextRunAt is always
    // recomputed from the full, correct clock-time-aware picture.
    const effective = {
      frequency: agent.schedule.frequency,
      intervalMinutes: agent.schedule.intervalMinutes,
      times: agent.schedule.times,
      weekday: agent.schedule.weekday,
      timezone: agent.schedule.timezone,
    };
    let scheduleTouched = false;
    // Only present when the caller wants the next run pushed out to a
    // specific day (e.g. "start from" on cadence edits) — not persisted,
    // just used once below to compute the resulting nextRunAt.
    let startDate: string | null = null;

    if (typeof body.timezone === "string" && body.timezone) {
      effective.timezone = body.timezone;
      set["schedule.timezone"] = body.timezone;
      scheduleTouched = true;
    }

    if (body.cadence && typeof body.cadence === "object") {
      const { frequency, times, weekday, intervalMinutes } = body.cadence;
      if (typeof frequency === "string") { effective.frequency = frequency; set["schedule.frequency"] = frequency; }
      if (Array.isArray(times)) {
        const cleanTimes = times.filter((t: unknown) => typeof t === "string" && /^\d{2}:\d{2}$/.test(t));
        effective.times = cleanTimes;
        set["schedule.times"] = cleanTimes;
      }
      if (weekday === null || (Number.isInteger(weekday) && weekday >= 0 && weekday <= 6)) {
        effective.weekday = weekday;
        set["schedule.weekday"] = weekday;
      }
      if (Number.isFinite(intervalMinutes)) { effective.intervalMinutes = intervalMinutes; set["schedule.intervalMinutes"] = intervalMinutes; }
      if (typeof body.cadence.startDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(body.cadence.startDate)) {
        startDate = body.cadence.startDate;
      }
      scheduleTouched = true;
    }

    // Status and schedule.enabled must move together — the backend scheduler
    // only ever checks schedule.enabled, so a status-only patch would be cosmetic.
    let willBeEnabled = agent.schedule.enabled;
    if (body.status === "active" || body.status === "paused") {
      set.status = body.status;
      willBeEnabled = body.status === "active";
      set["schedule.enabled"] = willBeEnabled;
      scheduleTouched = true;
    }

    if (scheduleTouched) {
      set["schedule.nextRunAt"] = willBeEnabled ? computeNextRunAt({ ...effective, startDate }) : null;
    }

    if (typeof body.voice === "string" && body.voice) set["personality.voice"] = body.voice;
    if (typeof body.language === "string" && body.language) {
      set["personality.language"] = body.language;
      set["personality.languageCode"] = LANGUAGE_CODES[body.language] ?? "en";
    }

    if (typeof body.telegramEnabled === "boolean") {
      let connected = body.telegramEnabled;
      let handle: string | null = null;
      if (connected) {
        const tgLink = await TelegramLink.findOne({ email: session.user.email }).lean();
        connected = !!tgLink;
        handle = tgLink?.username ? `@${tgLink.username}` : null;
      }
      const platforms = (set.platforms as typeof agent.platforms ?? agent.platforms).map((p) =>
        p.platform === "telegram" ? { platform: "telegram" as const, connected, handle } : p
      );
      set.platforms = platforms;
    }

    if (typeof body.whatsappEnabled === "boolean") {
      let connected = body.whatsappEnabled;
      let handle: string | null = null;
      if (connected) {
        const waLink = await WhatsAppLink.findOne({ email: session.user.email }).lean();
        connected = !!waLink;
        handle = waLink?.waId ?? null;
      }
      const platforms = (set.platforms as typeof agent.platforms ?? agent.platforms).map((p) =>
        p.platform === "whatsapp" ? { platform: "whatsapp" as const, connected, handle } : p
      );
      set.platforms = platforms;
    }

    const updated = await AgentModel.findOneAndUpdate(
      { _id: id, email: session.user.email },
      { $set: set },
      { new: true }
    ).lean();

    return NextResponse.json({ success: true, agent: updated ? toClientShape(updated) : null });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unexpected error";
    console.error("[agents/[id] PATCH]", message);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

// DELETE — remove an agent permanently. Ownership-checked by email.
export async function DELETE(req: Request, { params }: Ctx) {
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
    const res = await AgentModel.deleteOne({ _id: id, email: session.user.email });
    if (res.deletedCount === 0) {
      return NextResponse.json({ success: false, error: "Agent not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unexpected error";
    console.error("[agents/[id] DELETE]", message);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
