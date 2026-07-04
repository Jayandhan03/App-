import mongoose, { Schema, Document, Model } from "mongoose";

/**
 * A per-user library of topics locked in through Leora's onboarding chat —
 * kept independent of any single agent so a topic a user has already defined
 * (its research directive, keywords, region) can be reused or swapped back in
 * on a different agent later instead of being lost when they change topics.
 * Deduped per (email, topic): re-locking the same topic just bumps lastUsedAt.
 */
export interface ISavedTopic extends Document {
  email: string;
  topic: string;
  summary: string;
  corePrompt: string;
  keywords: string[];
  region: string;
  lastUsedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const SavedTopicSchema = new Schema<ISavedTopic>(
  {
    email: { type: String, required: true, index: true, lowercase: true, trim: true },
    topic: { type: String, required: true, trim: true },
    summary: { type: String, default: "" },
    corePrompt: { type: String, required: true },
    keywords: { type: [String], default: [] },
    region: { type: String, default: "Global" },
    lastUsedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

SavedTopicSchema.index({ email: 1, topic: 1 }, { unique: true });

const SavedTopic: Model<ISavedTopic> =
  (mongoose.models.SavedTopic as Model<ISavedTopic>) ||
  mongoose.model<ISavedTopic>("SavedTopic", SavedTopicSchema);

export default SavedTopic;
