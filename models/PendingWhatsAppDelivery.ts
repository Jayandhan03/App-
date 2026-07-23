import mongoose, { Schema, Document, Model } from "mongoose";

export type PendingWhatsAppDeliveryStatus = "pending" | "delivered" | "missed" | "expired" | "failed";

// Written by the Python scheduler (app/services/whatsapp_service.py ::
// queue_whatsapp_delivery) when a briefing can't be sent directly outside the
// 24h WhatsApp session window. The webhook resolves a button-tap payload back
// to this doc's _id to know which held audio to release.
export interface IPendingWhatsAppDelivery extends Document {
  email: string;
  waId: string;
  agentId?: string;
  audioFileId: mongoose.Types.ObjectId;
  filename: string;
  caption: string;
  status: PendingWhatsAppDeliveryStatus;
  createdAt: Date;
  expiresAt: Date;
  deliveredAt?: Date;
}

const PendingWhatsAppDeliverySchema = new Schema<IPendingWhatsAppDelivery>({
  email: { type: String, required: true, lowercase: true, index: true },
  waId: { type: String, required: true, index: true },
  agentId: { type: String },
  audioFileId: { type: Schema.Types.ObjectId, required: true },
  filename: { type: String, required: true },
  caption: { type: String, default: "" },
  status: {
    type: String,
    enum: ["pending", "delivered", "missed", "expired", "failed"],
    default: "pending",
    index: true,
  },
  createdAt: { type: Date, default: Date.now },
  expiresAt: { type: Date, required: true },
  deliveredAt: { type: Date },
});

const PendingWhatsAppDelivery: Model<IPendingWhatsAppDelivery> =
  (mongoose.models.PendingWhatsAppDelivery as Model<IPendingWhatsAppDelivery>) ||
  mongoose.model<IPendingWhatsAppDelivery>("PendingWhatsAppDelivery", PendingWhatsAppDeliverySchema);

export default PendingWhatsAppDelivery;
