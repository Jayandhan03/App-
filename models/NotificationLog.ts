import mongoose, { Schema, Document, Model } from "mongoose";

// Written by the Python backend (app/services/notification_log_service.py ::
// record_notification) every time a push notification is built — briefing-
// ready or test — regardless of whether FCM actually delivered it. Also
// written directly by app/api/inapp-test/route.ts for the frontend-originated
// per-device test push. Read/mutated (mark-read) by the bell dropdown
// (components/NotificationBell.tsx).
export interface INotificationLog extends Document {
  email: string;
  title: string;
  body: string;
  type: "briefing" | "test";
  data: Record<string, string>;
  read: boolean;
  readAt: Date | null;
  createdAt: Date;
}

const NotificationLogSchema = new Schema<INotificationLog>({
  email: { type: String, required: true, lowercase: true, index: true },
  title: { type: String, required: true },
  body: { type: String, required: true },
  type: { type: String, enum: ["briefing", "test"], default: "briefing" },
  data: { type: Schema.Types.Mixed, default: {} },
  read: { type: Boolean, default: false },
  readAt: { type: Date, default: null },
  createdAt: { type: Date, default: Date.now, index: true },
});

NotificationLogSchema.index({ email: 1, createdAt: -1 });
NotificationLogSchema.index({ email: 1, read: 1 });

const NotificationLog: Model<INotificationLog> =
  (mongoose.models.NotificationLog as Model<INotificationLog>) ||
  mongoose.model<INotificationLog>("NotificationLog", NotificationLogSchema);

export default NotificationLog;
