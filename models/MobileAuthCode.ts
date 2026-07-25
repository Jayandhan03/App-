import mongoose, { Schema, Document, Model } from "mongoose";

export interface IMobileAuthCode extends Document {
    code: string;
    token: string;
    expiresAt: Date;
}

const MobileAuthCodeSchema: Schema<IMobileAuthCode> = new Schema(
    {
        code: { type: String, required: true, unique: true },
        token: { type: String, required: true },
        expiresAt: { type: Date, required: true },
    },
    { timestamps: true }
);

MobileAuthCodeSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const MobileAuthCode: Model<IMobileAuthCode> =
    (mongoose.models.MobileAuthCode as Model<IMobileAuthCode>) ||
    mongoose.model<IMobileAuthCode>("MobileAuthCode", MobileAuthCodeSchema);

export default MobileAuthCode;
