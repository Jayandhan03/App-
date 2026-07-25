import mongoose, { Schema, Document, Model } from "mongoose";

// One doc per device/browser that's granted notification permission. Written
// here when the user opts in (web button click or native mobile prompt);
// read by the Python backend (push_service.py) at send time. Both web
// (Firebase JS SDK) and Android (@capacitor/push-notifications) ultimately
// produce an FCM registration token, so one shape covers both platforms.
export interface IPushSubscription extends Document {
  email: string;
  token: string;
  platform: "web" | "android";
  userAgent?: string;
  createdAt: Date;
  lastSeenAt: Date;
  disabled: boolean;
}

const PushSubscriptionSchema = new Schema<IPushSubscription>({
  email: { type: String, required: true, lowercase: true, index: true },
  token: { type: String, required: true, unique: true },
  platform: { type: String, enum: ["web", "android"], required: true },
  userAgent: { type: String },
  createdAt: { type: Date, default: Date.now },
  lastSeenAt: { type: Date, default: Date.now },
  disabled: { type: Boolean, default: false },
});

const PushSubscription: Model<IPushSubscription> =
  (mongoose.models.PushSubscription as Model<IPushSubscription>) ||
  mongoose.model<IPushSubscription>("PushSubscription", PushSubscriptionSchema);

export default PushSubscription;
