import mongoose, { Schema, Document, Model } from "mongoose";

/**
 * A single deployed agent, owned by a user (by email, matching the rest of this
 * codebase's convention — see TelegramLink/UserPreference).
 *
 * Written by the Next.js app (create/edit/delete). READ by the FastAPI backend
 * scheduler, which also writes back delivery bookkeeping (schedule.lastSentAt,
 * schedule.nextRunAt, lastResult, stats.briefingsSent, stats.sourcesTracked).
 * Collection name resolves to "agents" — matched by the backend.
 */
export interface IAgentPersonality {
  voice: string;
  language: string;
  languageCode: string;
  toneSummary: string;
}

export interface IAgentPlatform {
  platform: "telegram" | "whatsapp";
  connected: boolean;
  handle: string | null;
}

export interface IAgentSchedule {
  frequency: string;
  intervalMinutes: number;
  times: string[];
  weekday: number | null;
  timezone: string;
  enabled: boolean;
  nextRunAt: Date | null;
  lastSentAt: Date | null;
}

export interface IAgentStats {
  briefingsSent: number;
  sourcesTracked: number;
}

export interface IAgent extends Document {
  email: string;
  name: string;
  icon: string;
  accent: string;
  niche: string;
  description: string;
  status: "active" | "paused";
  topics: string[];
  keywords: string[];
  region: string;
  /** The agent's locked-in research directive, derived from the onboarding chat with Leora. */
  corePrompt: string;
  /** Plain-English summary of corePrompt, shown back to the user as "what this agent will deliver". */
  onboardingSummary: string;
  articleLimit: number;
  /** How far back this agent's news search looks: anytime | 1h | 1d | 7d | 1y. */
  dataWindow: string;
  personality: IAgentPersonality;
  platforms: IAgentPlatform[];
  schedule: IAgentSchedule;
  stats: IAgentStats;
  lastResult: unknown;
  createdAt: Date;
  updatedAt: Date;
}

const AgentSchema = new Schema<IAgent>(
  {
    email: { type: String, required: true, index: true, lowercase: true, trim: true },
    name: { type: String, required: true, trim: true },
    icon: { type: String, default: "🛰️" },
    accent: { type: String, default: "#4d7fff" },
    niche: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    status: { type: String, enum: ["active", "paused"], default: "active" },
    topics: { type: [String], default: [] },
    keywords: { type: [String], default: [] },
    region: { type: String, default: "Global" },
    articleLimit: { type: Number, default: 5 },
    dataWindow: { type: String, enum: ["anytime", "1h", "1d", "7d", "1y"], default: "1d" },
    corePrompt: { type: String, default: "" },
    onboardingSummary: { type: String, default: "" },
    personality: {
      voice: { type: String, default: "Analytical" },
      language: { type: String, default: "English" },
      languageCode: { type: String, default: "en" },
      toneSummary: { type: String, default: "" },
    },
    platforms: {
      type: [
        {
          platform: { type: String, enum: ["telegram", "whatsapp"], required: true },
          connected: { type: Boolean, default: false },
          handle: { type: String, default: null },
        },
      ],
      default: [],
    },
    schedule: {
      frequency: { type: String, default: "Daily brief" },
      intervalMinutes: { type: Number, default: 1440 },
      times: { type: [String], default: ["09:00"] },
      weekday: { type: Number, default: null },
      timezone: { type: String, default: "UTC" },
      enabled: { type: Boolean, default: true },
      nextRunAt: { type: Date, default: null },
      lastSentAt: { type: Date, default: null },
    },
    stats: {
      briefingsSent: { type: Number, default: 0 },
      sourcesTracked: { type: Number, default: 0 },
    },
    lastResult: { type: Schema.Types.Mixed, default: null },
  },
  { timestamps: true }
);

const Agent: Model<IAgent> = (mongoose.models.Agent as Model<IAgent>) || mongoose.model<IAgent>("Agent", AgentSchema);

export default Agent;
