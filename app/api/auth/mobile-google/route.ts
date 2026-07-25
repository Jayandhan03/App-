import { NextRequest, NextResponse } from "next/server";
import { OAuth2Client } from "google-auth-library";
import { encode } from "next-auth/jwt";
import { connectToDatabase } from "@/lib/mongodb";
import User from "@/models/User";

// Hit from inside the app after the OS-level "choose a Google account" sheet
// (@southdevs/capacitor-google-auth, backed by Play Services) returns an ID
// token. Verifying it here and minting the same session cookie the web
// GoogleProvider flow produces means mobile and web share the exact same
// NextAuth session/user record — same account, same mechanism, no sync.
const WEB_CLIENT_ID = process.env.GOOGLE_CLIENT_ID as string;
const client = new OAuth2Client(WEB_CLIENT_ID);

const SECURE_COOKIE =
    process.env.NEXTAUTH_URL?.startsWith("https://") || !!process.env.VERCEL;
const SESSION_COOKIE_NAME = SECURE_COOKIE
    ? "__Secure-next-auth.session-token"
    : "next-auth.session-token";
const SESSION_MAX_AGE = 30 * 24 * 60 * 60; // must match next-auth's default (session.maxAge)

export async function POST(req: NextRequest) {
    const { idToken } = await req.json().catch(() => ({}));
    if (!idToken) {
        return NextResponse.json({ error: "missing idToken" }, { status: 400 });
    }

    let payload;
    try {
        const ticket = await client.verifyIdToken({ idToken, audience: WEB_CLIENT_ID });
        payload = ticket.getPayload();
    } catch {
        return NextResponse.json({ error: "invalid idToken" }, { status: 401 });
    }
    if (!payload?.email || !payload.sub) {
        return NextResponse.json({ error: "invalid idToken" }, { status: 401 });
    }

    await connectToDatabase();
    const existingUser = await User.findOne({ email: payload.email });
    if (existingUser) {
        await User.updateOne(
            { email: payload.email },
            { $set: { lastLogin: new Date(), image: payload.picture } }
        );
    } else {
        await User.create({
            name: payload.name,
            email: payload.email,
            image: payload.picture,
            googleId: payload.sub,
            provider: "google",
            lastLogin: new Date(),
        });
    }

    // sub must match what the web OAuth flow puts in the JWT: Google's own
    // account id (profile.sub), not the Mongo _id — see the signIn/jwt
    // callbacks in app/api/auth/[...nextauth]/route.ts.
    const token = await encode({
        token: {
            name: payload.name,
            email: payload.email,
            picture: payload.picture,
            sub: payload.sub,
        },
        secret: process.env.NEXTAUTH_SECRET as string,
        maxAge: SESSION_MAX_AGE,
    });

    const res = NextResponse.json({ ok: true });
    res.cookies.set(SESSION_COOKIE_NAME, token, {
        httpOnly: true,
        sameSite: "lax",
        secure: SECURE_COOKIE,
        path: "/",
        maxAge: SESSION_MAX_AGE,
    });
    return res;
}
