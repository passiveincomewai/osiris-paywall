import NextAuth, { type DefaultSession } from "next-auth";
import Google from "next-auth/providers/google";
import Resend from "next-auth/providers/resend";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { db } from "@/lib/db";
import { normalizeEmail, isValidEmail, verifyPassword } from "@/lib/password-auth";
import { subscriptionStatusFromRow } from "@/lib/subscription-status";
import { planTierForRow, type PlanTier } from "@/lib/plan-tier";
import { ambientAccessForRow } from "@/lib/ambient/access";
import { powderPassEnabled, skiAccessForRow } from "@/lib/ski/access";
import { getEffectiveEntitlement, maxTier } from "@/lib/team/entitlement";
import { resolveFraudRadarEntitlement } from "@/lib/fraud-radar/billing/tier";
import { resolveEmailVerified } from "@/lib/auth-verification";
import {
  ACQUISITION_COOKIE,
  NEWSLETTER_POPUP_SOURCE,
  POPUP_SIGNUP_EVENT,
} from "@/lib/newsletter/popup";

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
      /** WorldEye Ambient access (lib/ambient/access): an active
       * Ambient-price subscription, or any pro/vip tier. Resolved on
       * the same claims pass/TTL as planTier. */
      ambientAccess?: boolean;
      /** Powder Pass ski access (lib/ski/access): an active Powder
       * Pass-price subscription, the vip tier, or a comp. Resolved
       * on the same claims pass/TTL; always false while
       * POWDER_PASS_ENABLED is off (dark launch). */
      skiAccess?: boolean;
      /** Fraud Radar tier (Phase 11 §1.3): "free" | "plus" | "pro" |
       * "teams" | "none" — resolved on the same claims pass/TTL as
       * planTier by billing/tier's resolver; "none" while
       * FRAUD_RADAR_ENABLED is off (the resolver short-circuits
       * without a DB read). Additive claim only. */
      fraudRadarTier?: string;
      /** True when the account has 2FA on and this session hasn't
       * passed the step-up challenge yet (item 2). Middleware bounces
       * app surfaces to /auth/totp while this is true. */
      totpPending?: boolean;
      /** Email verification state (lib/auth-verification's rule:
       * User.emailVerified set OR a provider-verified OAuth link —
       * Google). Sign-in never waits for it (2026-10-29); it drives
       * the camera ladder's verify rung and the Settings badge.
       * Resolved on the same claims pass/TTL as planTier. */
      emailVerified: boolean;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    subscriptionStatus?: string;
    planTier?: string;
    ambientAccess?: boolean;
    skiAccess?: boolean;
    fraudRadarTier?: string;
    subscriptionCheckedAt?: number;
    totpEnabled?: boolean;
    totpVerified?: boolean;
    emailVerified?: boolean;
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
): Promise<{ status: string; tier: string; ambientAccess: boolean; skiAccess: boolean; fraudRadarTier: string }> {
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
    // Ambient access rides the same claims: the member's own row
    // (Ambient price → access; a tier price → access via the tier
    // rule) OR an effective pro/vip tier granted by a team — a
    // team-granted Pro member bypasses the Ambient gate like any Pro.
    ambientAccess:
      ambientAccessForRow(sub, process.env) ||
      tier === "pro" ||
      tier === "vip",
    // Powder Pass rides the same claims: the member's own row
    // (Powder Pass price → access; a comp row → access; an own vip
    // price → access via the row's tier) OR an effective vip tier
    // granted by a team — team-granted Pro does NOT include ski.
    // skiAccessForRow already returns false while the launch flag
    // is off; the effective-tier leg is flag-gated here to match.
    skiAccess:
      skiAccessForRow(sub, process.env) ||
      (powderPassEnabled(process.env) && tier === "vip"),
    // Fraud Radar rides the same claims pass (Phase 11 §1.3):
    // fail-soft — any resolver error resolves to "none" and never
    // breaks sign-in; with the flag off the resolver returns
    // "none" without touching the DB.
    fraudRadarTier: await resolveFraudRadarEntitlement(userId).then(
      (e) => e.tier,
      () => "none" as const,
    ),
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
        // Unverified emails CAN sign in with a password (Jameson's
        // order, 2026-10-29): verification is no longer a login gate.
        // It happens later, in Settings, and unlocks +5 camera checks
        // on the ladder — the state rides the session as
        // user.emailVerified (lib/auth-verification).
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
      if (user?.id || trigger === "update" || stale || !token.subscriptionStatus || !token.planTier || token.ambientAccess === undefined || token.skiAccess === undefined || token.fraudRadarTier === undefined || token.emailVerified === undefined) {
        const claims = await resolveSubscriptionClaims(userId);
        token.subscriptionStatus = claims.status;
        token.planTier = claims.tier;
        token.ambientAccess = claims.ambientAccess;
        token.skiAccess = claims.skiAccess;
        token.fraudRadarTier = claims.fraudRadarTier;
        token.subscriptionCheckedAt = now;
        // Verification rides the same pass (fail-soft inside the
        // resolver; it also stamps provider-verified OAuth rows the
        // adapter left null — lib/auth-verification).
        token.emailVerified = await resolveEmailVerified(userId);
      }

      // ── 2FA step-up claims (item 2) ──────────────────────────────
      // Stamped at sign-in only (fail-soft, one DB read on the same
      // cadence as a sign-in's subscription refresh). A session that
      // hasn't challenged yet carries totpVerified=false; the ONLY
      // way it flips is the HMAC proof cookie minted by
      // /api/account/totp/challenge after a valid code — checked here
      // on any session fetch while unverified (cheap HMAC, no DB).
      if (user?.id || token.totpEnabled === undefined) {
        try {
          const row = await db.userTotp.findUnique({
            where: { userId },
            select: { enabledAt: true },
          });
          token.totpEnabled = !!row?.enabledAt;
          token.totpVerified = !token.totpEnabled;
        } catch {
          // Fail-soft: a DB hiccup must never lock anyone out or break
          // sign-in; the claims heal on the next sign-in.
          token.totpEnabled = token.totpEnabled ?? false;
          token.totpVerified = token.totpVerified ?? true;
        }
      }
      if (token.totpEnabled && !token.totpVerified) {
        try {
          const { cookies } = await import("next/headers");
          const { verifyTotpProof, TOTP_PROOF_COOKIE } = await import("@/lib/account/totp");
          const proof = (await cookies()).get(TOTP_PROOF_COOKIE)?.value;
          if (verifyTotpProof(proof, userId)) token.totpVerified = true;
        } catch {
          // No request scope (edge decode paths) — claim stays as-is.
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;
        session.user.subscriptionStatus = token.subscriptionStatus ?? "none";
        session.user.planTier = token.planTier ?? "free";
        session.user.ambientAccess = token.ambientAccess ?? false;
        session.user.skiAccess = token.skiAccess ?? false;
        session.user.fraudRadarTier = token.fraudRadarTier ?? "none";
        // The session claim is boolean by design (JWT + Session
        // augmentations above), but this callback's session.user is
        // also intersected with AdapterUser, whose emailVerified is
        // Date | null — the intersection makes the property type
        // Date & boolean and the plain assignment fails the build's
        // type check (TS2322). Cast through the claim's own shape:
        // type-only, the runtime assignment is unchanged.
        (session.user as { emailVerified?: boolean }).emailVerified =
          token.emailVerified ?? false;
        session.user.totpPending = !!(token.totpEnabled && !token.totpVerified);
      }
      return session;
    },
  },
  events: {
    // Newsletter → account conversion test (2026-10-29): the
    // post-signup popup's Google button sets the we_acq_src cookie
    // before signIn (the we_utm pattern — set client-side, read
    // server-side; lib/newsletter/popup). createUser fires exactly
    // once per adapter-created account, so a cookie present here
    // marks an account CREATED via the popup; stamp one analytics row
    // so those accounts are countable alongside the popup's client
    // events. Fail-soft throughout: attribution must never break
    // account creation, and a stale cookie (≤30 min) is the accepted
    // fuzz of the pattern.
    async createUser({ user }) {
      try {
        if (!user.id) return;
        const { cookies } = await import("next/headers");
        const src = (await cookies()).get(ACQUISITION_COOKIE)?.value;
        if (src !== NEWSLETTER_POPUP_SOURCE) return;
        await db.pageView.create({
          data: {
            path: "/signup",
            sessionId: "server",
            userId: user.id,
            event: POPUP_SIGNUP_EVENT,
          },
        });
      } catch {
        /* attribution is best-effort */
      }
    },
  },
});
