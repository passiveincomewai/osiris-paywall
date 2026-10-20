import NextAuth, { type DefaultSession } from "next-auth";
import Google from "next-auth/providers/google";
import Resend from "next-auth/providers/resend";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { db } from "@/lib/db";
import { normalizeEmail, isValidEmail, verifyPassword } from "@/lib/password-auth";
import { subscriptionStatusFromRow } from "@/lib/subscription-status";
import { planTierForRow, type PlanTier } from "@/lib/plan-tier";
import { getEffectiveEntitlement, maxTier } from "@/lib/team/entitlement";

/* ------------------------------------------------------------------ */
/* Type augmentation: the session JWT carries the paywall state so     */
/* src/middleware.ts can gate routes on the edge with no DB round-trip.*/
/* ------------------------------------------------------------------ */
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      subscriptionStatus: string;
      /** Plan tier (lib/plan-tier): "free" | "pro" | "vip" — annual is VIP. */
      planTier: string;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    subscriptionStatus?: string;
    planTier?: string;
    subscriptionCheckedAt?: number;
  }
}

// Worst-case delay between a Stripe payment (webhook write) and the
// paywall recognizing it. Sign-ins always refresh immediately.
const SUBSCRIPTION_TTL_MS = 60_000;

/**
 * resolveSubscriptionStatus, extended: the session's subscriptionStatus
 * AND planTier. The status mapping is lib/subscription-status (pure,
 * test-pinned): "trialing" counts as full Pro access until the trial
 * ends — Stripe flips the status (past_due / canceled / ...) via
 * webhook if payment fails; anything else locks the gate. The tier
 * mapping is lib/plan-tier (the contract: annual price → vip,
 * weekly/monthly/comp → pro, enterprise → vip).
 *
 * Semantics after Team Access Phase 10 (shared premium access):
 *   - subscriptionStatus stays the member's OWN billing status, from
 *     their own Subscription row ONLY. A team grant never changes it,
 *     and nothing is written to the member's Subscription row.
 *   - planTier is the EFFECTIVE tier: max(own tier, the tier granted by
 *     each non-suspended org membership) from lib/team/entitlement's
 *     getEffectiveEntitlement — the single source for that merge.
 * Every gate that reads planTier (planTierOf(session), the middleware
 * intel gate, client gates) therefore honours team grants, while
 * billing surfaces that read subscriptionStatus see the member's own
 * state unchanged.
 *
 * Fail-soft: the org lookup runs only inside this resolver, which the
 * jwt callback already calls solely on sign-in / update / TTL expiry —
 * no new per-request DB hit. Any error in it falls back to the own
 * tier and never breaks sign-in or the session.
 */
async function resolveSubscriptionClaims(
  userId: string,
): Promise<{ status: string; tier: string }> {
  const sub = await db.subscription.findUnique({ where: { userId } });
  const ownTier: PlanTier = planTierForRow(sub, process.env);
  let tier: PlanTier = ownTier;
  try {
    const entitlement = await getEffectiveEntitlement(userId);
    tier = maxTier(ownTier, entitlement.effectiveTier);
  } catch {
    // Team-grant lookup failed — the own tier stands on its own.
    tier = ownTier;
  }
  return {
    status: subscriptionStatusFromRow(sub),
    tier,
  };
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
      // stale, or when either claim is missing entirely (a token minted
      // before planTier existed must heal on its next session fetch).
      if (user?.id || trigger === "update" || stale || !token.subscriptionStatus || !token.planTier) {
        const claims = await resolveSubscriptionClaims(userId);
        token.subscriptionStatus = claims.status;
        token.planTier = claims.tier;
        token.subscriptionCheckedAt = now;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;
        session.user.subscriptionStatus = token.subscriptionStatus ?? "none";
        session.user.planTier = token.planTier ?? "free";
      }
      return session;
    },
  },
});
