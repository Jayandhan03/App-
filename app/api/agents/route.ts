import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { connectToDatabase } from "@/lib/mongodb";
import AgentModel, { IAgent } from "@/models/Agent";
import TelegramLink from "@/models/TelegramLink";
import WhatsAppLink from "@/models/WhatsAppLink";
import { LANGUAGE_CODES } from "@/lib/agentConstants";
import { computeNextRunAt } from "@/lib/schedule";

export type AgentPersonality = {
  voice: string;
  voiceId?: string;
  language: string;
  languageCode?: string;
  toneSummary?: string;
};

export type AgentPlatform = {
  platform: "telegram" | "whatsapp";
  connected: boolean;
  handle?: string | null;
};

export type AgentSchedule = {
  frequency: string;
  intervalMinutes: number;
  times: string[];
  weekday: number | null;
  timezone: string;
  enabled: boolean;
  nextRunAt?: string | null;
  lastSentAt?: string | null;
};

export type AgentStats = {
  briefingsSent: number;
  sourcesTracked: number;
  lastBriefing?: string | null;
};

export type Agent = {
  id: string;
  name: string;
  icon: string;
  accent: string;
  niche: string;
  description: string;
  status: "active" | "paused";
  keywords: string[];
  region: string;
  /** The agent's locked-in research directive, derived from the onboarding chat with Leora. */
  corePrompt: string;
  /** Plain-English summary of corePrompt, shown back to the user as "what this agent will deliver". */
  onboardingSummary: string;
  personality: AgentPersonality;
  platforms: AgentPlatform[];
  schedule: AgentSchedule;
  stats: AgentStats;
};

/** Map a stored Mongo agent document to the shape the dashboard renders. */
export function toClientShape(doc: any): Agent {
  return {
    id: String(doc._id),
    name: doc.name,
    icon: doc.icon ?? "🛰️",
    accent: doc.accent ?? "#4d7fff",
    niche: doc.niche,
    description: doc.description ?? "",
    status: doc.status ?? "active",
    keywords: doc.topics?.length ? doc.topics : doc.keywords ?? [],
    region: doc.region ?? "Global",
    corePrompt: doc.corePrompt ?? "",
    onboardingSummary: doc.onboardingSummary ?? "",
    personality: {
      voice: doc.personality?.voice ?? "Analytical",
      language: doc.personality?.language ?? "English",
      languageCode: doc.personality?.languageCode ?? "en",
      toneSummary: doc.personality?.toneSummary ?? "",
    },
    platforms: (doc.platforms ?? []).map((p: any) => ({
      platform: p.platform,
      connected: !!p.connected,
      handle: p.handle ?? null,
    })),
    schedule: {
      frequency: doc.schedule?.frequency ?? "Daily brief",
      intervalMinutes: doc.schedule?.intervalMinutes ?? 1440,
      times: doc.schedule?.times ?? [],
      weekday: doc.schedule?.weekday ?? null,
      timezone: doc.schedule?.timezone ?? "UTC",
      enabled: doc.schedule?.enabled ?? true,
      nextRunAt: doc.schedule?.nextRunAt ?? null,
      lastSentAt: doc.schedule?.lastSentAt ?? null,
    },
    stats: {
      briefingsSent: doc.stats?.briefingsSent ?? 0,
      sourcesTracked: doc.stats?.sourcesTracked ?? 0,
      lastBriefing: doc.schedule?.lastSentAt ?? null,
    },
  };
}

// GET — the current user's real deployed agents. Empty array for new users.
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 });
    }

    await connectToDatabase();
    const docs = await AgentModel.find({ email: session.user.email }).sort({ createdAt: -1 }).lean();
    return NextResponse.json({ success: true, agents: docs.map(toClientShape) });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unexpected error";
    console.error("[agents GET]", message);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

// POST — deploy a new agent from the Create-agent flow.
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));

    const name = typeof body.name === "string" ? body.name.trim() : "";
    const topic = typeof body.topic === "string" ? body.topic.trim() : "";
    if (!name || !topic) {
      return NextResponse.json({ success: false, error: "Agent name and topic are required." }, { status: 400 });
    }

    await connectToDatabase();

    const language = typeof body.language === "string" && body.language ? body.language : "English";
    const languageCode = LANGUAGE_CODES[language] ?? "en";
    const voice = typeof body.voice === "string" && body.voice ? body.voice : "Analytical";

    const intervalMinutes = Number.isFinite(body.intervalMinutes) ? Math.max(15, Math.round(body.intervalMinutes)) : 1440;
    const frequency = typeof body.frequency === "string" && body.frequency ? body.frequency : "Daily brief";
    const times = Array.isArray(body.times) ? body.times.filter((t: unknown) => typeof t === "string" && /^\d{2}:\d{2}$/.test(t)) : ["09:00"];
    const weekday = Number.isInteger(body.weekday) && body.weekday >= 0 && body.weekday <= 6 ? body.weekday : null;
    const timezone = typeof body.timezone === "string" && body.timezone ? body.timezone : "UTC";
    const startDate = typeof body.startDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(body.startDate) ? body.startDate : null;
    const scheduleEnabled = body.scheduleEnabled !== false;

    // Never trust client-supplied connection state — derive delivery from the real links.
    const [tgLink, waLink] = await Promise.all([
      TelegramLink.findOne({ email: session.user.email }).lean(),
      WhatsAppLink.findOne({ email: session.user.email }).lean(),
    ]);
    const wantsTelegram = body.telegramEnabled !== false;
    const wantsWhatsapp = body.whatsappEnabled !== false;
    const platforms = [
      {
        platform: "telegram" as const,
        connected: !!tgLink && wantsTelegram,
        handle: tgLink?.username ? `@${tgLink.username}` : null,
      },
      {
        platform: "whatsapp" as const,
        connected: !!waLink && wantsWhatsapp,
        handle: waLink?.waId ?? null,
      },
    ];

    // A delivery channel is mandatory.
    if (!platforms.some(p => p.connected)) {
      return NextResponse.json({ success: false, error: "Select a delivery channel to deploy this agent." }, { status: 422 });
    }

    const onboardingSummary = typeof body.onboardingSummary === "string" ? body.onboardingSummary.trim() : "";
    const corePrompt = typeof body.corePrompt === "string" ? body.corePrompt.trim() : "";
    const keywords = Array.isArray(body.keywords) ? body.keywords.filter((k: unknown) => typeof k === "string" && k.trim()) : [];

    const doc = await AgentModel.create({
      email: session.user.email,
      name,
      niche: topic,
      description: typeof body.description === "string" && body.description ? body.description : onboardingSummary,
      topics: [topic],
      keywords,
      region: typeof body.region === "string" && body.region ? body.region : "Global",
      corePrompt,
      onboardingSummary,
      articleLimit: Number.isFinite(body.articleLimit) ? Math.min(20, Math.max(1, Math.round(body.articleLimit))) : 5,
      personality: { voice, language, languageCode, toneSummary: "" },
      platforms,
      schedule: {
        frequency,
        intervalMinutes,
        times,
        weekday,
        timezone,
        enabled: scheduleEnabled,
        nextRunAt: scheduleEnabled ? computeNextRunAt({ frequency, intervalMinutes, times, weekday, timezone, startDate }) : null,
        lastSentAt: null,
      },
      stats: { briefingsSent: 0, sourcesTracked: 0 },
    } satisfies Partial<IAgent>);

    return NextResponse.json({ success: true, agent: toClientShape(doc) });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unexpected error";
    console.error("[agents POST]", message);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
