import NextAuth, { type DefaultSession } from "next-auth";
import Google from "next-auth/providers/google";
import Resend from "next-auth/providers/resend";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { db } from "@/lib/db";
import { normalizeEmail, isValidEmail, verifyPassword } from "@/lib/password-auth";
import { subscriptionStatusFromRow } from "@/lib/subscription-status";

/* ------------------------------------------------------------------ */
/* Type augmentation: the session JWT carries the paywall state so     */
/* src/middleware.ts can gate routes on the edge with no DB round-trip.*/
/* ------------------------------------------------------------------ */
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      subscriptionStatus: string;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    subscriptionStatus?: string;
    subscriptionCheckedAt?: number;
  }
}

// Worst-case delay between a Stripe payment (webhook write) and the
// paywall recognizing it. Sign-ins always refresh immediately.
const SUBSCRIPTION_TTL_MS = 60_000;

async function resolveSubscriptionStatus(userId: string): Promise<string> {
  const sub = await db.subscription.findUnique({ where: { userId } });
  // The mapping itself is lib/subscription-status (pure, test-pinned):
  // "trialing" counts as full Pro access until the trial ends — Stripe
  // flips the status (past_due / canceled / ...) via webhook if payment
  // fails; anything else locks the gate.
  return subscriptionStatusFromRow(sub);
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  // AUTH_SECRET is read from the environment automatically.
  trustHost: true,
  adapter: PrismaAdapter(db),
  // JWT sessions, NOT database sessions: the OAuth Account/User rows are
  // still persisted via the adapter (needed for account linking), but the
  // session itself is a signed JWT the edge middleware can verify directly.
  session: { strategy: "jwt" },
  pages: {
    signIn: "/signin",
    // Magic-link "check your inbox" state renders on the sign-in page.
    verifyRequest: "/signin?check=email",
  },
  // Providers: Google OAuth + email magic link + email/password only.
  // (Other OAuth providers were removed per owner decision 2026-10-11.)
  providers: [
    ...(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET ? [Google] : []),
    // Email magic link via Resend (free tier: 100 emails/day). Needs
    // AUTH_RESEND_KEY plus a verified sender in EMAIL_FROM.
    ...(process.env.AUTH_RESEND_KEY
      ? [Resend({ from: process.env.EMAIL_FROM ?? "WorldEye <onboarding@resend.dev>" })]
      : []),
    // Email + password. Users are created by /api/auth/signup (bcrypt hash in
    // User.passwordHash); authorize() only ever *checks* credentials.
    // Precise error UX lives in /api/auth/login — this stays strict/generic.
    Credentials({
      name: "Email",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = normalizeEmail(String(credentials?.email ?? ""));
        const password = String(credentials?.password ?? "");
        if (!isValidEmail(email) || !password) return null;
        const user = await db.user.findUnique({ where: { email } });
        if (!user?.passwordHash) return null;
        // Unverified emails can't sign in with a password — they must click
        // the verification link first (sent at signup).
        if (!user.emailVerified) return null;
        if (!(await verifyPassword(password, user.passwordHash))) return null;
        return { id: user.id, name: user.name, email: user.email, image: user.image };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger }) {
      const userId = token.sub ?? user?.id;
      if (!userId) return token;

      const now = Date.now();
      const lastChecked = token.subscriptionCheckedAt ?? 0;
      const stale = now - lastChecked > SUBSCRIPTION_TTL_MS;

      // Refresh on sign-in, on explicit session update(), when the cache is
      // stale, or when the claim is missing entirely.
      if (user?.id || trigger === "update" || stale || !token.subscriptionStatus) {
        token.subscriptionStatus = await resolveSubscriptionStatus(userId);
        token.subscriptionCheckedAt = now;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;
        session.user.subscriptionStatus = token.subscriptionStatus ?? "none";
      }
      return session;
    },
  },
});
