import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import MobileAuthCode from "@/models/MobileAuthCode";

const SECURE_COOKIE =
    process.env.NEXTAUTH_URL?.startsWith("https://") || !!process.env.VERCEL;
const SESSION_COOKIE_NAME = SECURE_COOKIE
    ? "__Secure-next-auth.session-token"
    : "next-auth.session-token";
const SESSION_MAX_AGE = 30 * 24 * 60 * 60; // must match next-auth's default (session.maxAge)

// Reached inside the app's own embedded WebView (via the leora://auth-callback
// deep link) to redeem the one-time code minted by /api/auth/mobile-bridge and
// apply the same session cookie the web login already produced.
export async function GET(req: NextRequest) {
    const code = req.nextUrl.searchParams.get("code");
    const signinUrl = new URL("/signin", req.url);

    if (!code) {
        return NextResponse.redirect(signinUrl);
    }

    await connectToDatabase();
    const entry = await MobileAuthCode.findOneAndDelete({ code });

    if (!entry || entry.expiresAt < new Date()) {
        return NextResponse.redirect(signinUrl);
    }

    const res = NextResponse.redirect(new URL("/dashboard", req.url));
    res.cookies.set(SESSION_COOKIE_NAME, entry.token, {
        httpOnly: true,
        sameSite: "lax",
        secure: SECURE_COOKIE,
        path: "/",
        maxAge: SESSION_MAX_AGE,
    });
    return res;
}
