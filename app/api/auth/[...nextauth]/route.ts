import NextAuth, { NextAuthOptions, Session } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { connectToDatabase } from "@/lib/mongodb";
import User from "@/models/User";

export const authOptions: NextAuthOptions = {
    providers: [
        GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID as string,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
            allowDangerousEmailAccountLinking: true,
            authorization: {
                params: {
                    // Without this, Google silently signs in with whatever
                    // account the browser already has an active session for.
                    // This forces the account chooser every time.
                    prompt: "select_account",
                },
            },
        }),
    ],
    secret: process.env.NEXTAUTH_SECRET,
    session: {
        strategy: "jwt",
    },
    callbacks: {
        async signIn({ user, account }) {
            if (account?.provider === "google") {
                try {
                    await connectToDatabase();

                    const existingUser = await User.findOne({ email: user.email });

                    if (existingUser) {
                        await User.updateOne(
                            { email: user.email },
                            { $set: { lastLogin: new Date(), image: user.image } }
                        );
                        console.log("✅ Updated existing user:", user.email);
                    } else {
                        await User.create({
                            name: user.name,
                            email: user.email,
                            image: user.image,
                            googleId: account.providerAccountId,
                            provider: "google",
                            lastLogin: new Date(),
                        });
                        console.log("✅ Created new user:", user.email);
                    }
                } catch (error) {
                    console.error("⚠️ MongoDB error (sign-in still allowed):", error);
                    return true;
                }
            }
            return true;
        },
        async session({ session, token }): Promise<Session> {
            if (session.user && token.sub) {
                (session.user as { id?: string }).id = token.sub;
            }
            return session;
        },
        async jwt({ token, account }) {
            if (account) {
                token.accessToken = account.access_token;
            }
            return token;
        },
    },
    pages: {},
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
