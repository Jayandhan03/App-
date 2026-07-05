import mongoose, { Schema, Document, Model } from "mongoose";

export interface IWhatsAppLink extends Document {
  email: string;
  waId: string;
  linkedAt: Date;
}

const WhatsAppLinkSchema = new Schema<IWhatsAppLink>({
  email: { type: String, required: true, unique: true, index: true, lowercase: true },
  waId: { type: String, required: true },
  linkedAt: { type: Date, default: Date.now },
});

const WhatsAppLink: Model<IWhatsAppLink> =
  (mongoose.models.WhatsAppLink as Model<IWhatsAppLink>) ||
  mongoose.model<IWhatsAppLink>("WhatsAppLink", WhatsAppLinkSchema);

export default WhatsAppLink;
