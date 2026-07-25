import mongoose, { Schema, Document, Model } from "mongoose";

// Written by the Python scheduler (app/services/briefing_service.py ::
// persist_briefing) every time an agent's briefing is generated — regardless
// of whether Telegram/WhatsApp are linked, since the in-app dashboard is
// always a valid delivery channel. Read here for the dashboard's per-agent
// briefing history; the audio bytes themselves live in a separate GridFS
// bucket ("briefingAudio") referenced by audioFileId.
export interface IBriefing extends Document {
  email: string;
  agentId: mongoose.Types.ObjectId;
  agentName: string;
  agentIcon?: string;
  audioFileId: mongoose.Types.ObjectId;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  articleCount: number;
  label: string;
  script: string;
  language: string;
  tone: string;
  channels: {
    app?: boolean;
    telegram?: boolean;
    whatsapp?: boolean;
  };
  createdAt: Date;
}

const BriefingSchema = new Schema<IBriefing>({
  email: { type: String, required: true, lowercase: true, index: true },
  agentId: { type: Schema.Types.ObjectId, required: true, index: true },
  agentName: { type: String, required: true },
  agentIcon: { type: String },
  audioFileId: { type: Schema.Types.ObjectId, required: true },
  filename: { type: String, required: true },
  mimeType: { type: String, default: "audio/mpeg" },
  sizeBytes: { type: Number, required: true },
  articleCount: { type: Number, default: 0 },
  label: { type: String, default: "" },
  script: { type: String, default: "" },
  language: { type: String, default: "English" },
  tone: { type: String, default: "" },
  channels: {
    app: { type: Boolean, default: false },
    telegram: { type: Boolean, default: false },
    whatsapp: { type: Boolean, default: false },
  },
  createdAt: { type: Date, default: Date.now, index: true },
});

BriefingSchema.index({ agentId: 1, createdAt: -1 });

const Briefing: Model<IBriefing> =
  (mongoose.models.Briefing as Model<IBriefing>) || mongoose.model<IBriefing>("Briefing", BriefingSchema);

export default Briefing;
