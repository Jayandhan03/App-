import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import crypto from "crypto";
import { connectToDatabase } from "@/lib/mongodb";
import MobileAuthCode from "@/models/MobileAuthCode";

// Reached inside the system browser (Custom Tab) right after Google sign-in
// completes there. Mints a short-lived, single-use code tied to the session
// cookie that browser tab just received, then hands off to the native app via
// a custom URL scheme. The app exchanges the code for the same session inside
// its own WebView at /api/auth/mobile-exchange — Custom Tabs and the app's
// embedded WebView do not share a cookie jar, so the session can't cross over
// on its own.
export async function GET(req: NextRequest) {
    const secret = process.env.NEXTAUTH_SECRET as string;
    const rawToken = await getToken({ req, secret, raw: true });

    if (!rawToken) {
        return NextResponse.redirect(new URL("/signin", req.url));
    }

    const code = crypto.randomBytes(32).toString("hex");

    await connectToDatabase();
    await MobileAuthCode.create({
        code,
        token: rawToken,
        expiresAt: new Date(Date.now() + 60 * 1000),
    });

    const deepLink = `leora://auth-callback?code=${code}`;
    const html = `<!doctype html>
<html>
  <head><meta charset="utf-8" /><title>Leora</title></head>
  <body style="font-family: sans-serif; text-align: center; padding-top: 3rem;">
    <p>Signed in — returning to the app…</p>
    <p><a href="${deepLink}">Tap here if you're not redirected automatically</a></p>
    <script>window.location.replace(${JSON.stringify(deepLink)});</script>
  </body>
</html>`;

    return new NextResponse(html, {
        headers: { "Content-Type": "text/html; charset=utf-8" },
    });
}
