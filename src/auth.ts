import NextAuth, { type DefaultSession } from "next-auth";
import GitHub from "next-auth/providers/github";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { db } from "@/lib/db";

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
  if (sub && sub.status === "active" && sub.currentPeriodEnd > new Date()) {
    return "active";
  }
  // Anything else (past_due, canceled, expired, never subscribed) locks the gate.
  return sub?.status ?? "none";
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  // AUTH_SECRET is read from the environment automatically.
  trustHost: true,
  adapter: PrismaAdapter(db),
  // JWT sessions, NOT database sessions: the OAuth Account/User rows are
  // still persisted via the adapter (needed for account linking), but the
  // session itself is a signed JWT the edge middleware can verify directly.
  session: { strategy: "jwt" },
  // Providers are opt-in: a provider is only registered when its env vars
  // exist, so local dev works with a single OAuth app (or none, until set).
  providers: [
    ...(process.env.AUTH_GITHUB_ID && process.env.AUTH_GITHUB_SECRET ? [GitHub] : []),
    ...(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET ? [Google] : []),
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
