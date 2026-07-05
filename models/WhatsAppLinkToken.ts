import mongoose, { Schema, Document, Model } from "mongoose";

/**
 * Short-lived token that binds a "Connect WhatsApp" attempt to the signed-in
 * user's email. The user opens a wa.me link pre-filled with "LINK-<token>";
 * when they hit send, our webhook receives the inbound message, looks up the
 * email here, and creates the permanent WhatsAppLink. Tokens auto-expire via
 * a TTL index — mirrors TelegramLinkToken.
 */
export interface IWhatsAppLinkToken extends Document {
  token: string;
  email: string;
  createdAt: Date;
}

const WhatsAppLinkTokenSchema = new Schema<IWhatsAppLinkToken>({
  token: { type: String, required: true, unique: true, index: true },
  email: { type: String, required: true, lowercase: true },
  createdAt: { type: Date, default: Date.now, expires: 600 },
});

const WhatsAppLinkToken: Model<IWhatsAppLinkToken> =
  (mongoose.models.WhatsAppLinkToken as Model<IWhatsAppLinkToken>) ||
  mongoose.model<IWhatsAppLinkToken>("WhatsAppLinkToken", WhatsAppLinkTokenSchema);

export default WhatsAppLinkToken;
