/**
 * OI on the site's own OpenAI key ("WorldEye AI").
 *
 * Until now every OI call ran on a key the visitor pasted into their
 * browser. The site can now hold one OpenAI key of its own, in the
 * OPENAI_API_KEY environment variable, and signed-in visitors run on it:
 *
 *   - A visitor's own key (X-OI-Key) always wins, untouched, as before.
 *   - With no key of their own, a signed-in visitor on the OpenAI engine
 *     (or with no engine chosen) runs on the site's key, model
 *     OPENAI_MODEL or the provider default, inside a per-user hourly cap.
 *   - Signed out, there is no site key: the routes answer 401 and say to
 *     sign in, because an anonymous caller spending the site's credit is
 *     the one thing this design exists to prevent.
 *   - With OPENAI_API_KEY unset, a signed-in visitor is told plainly that
 *     AI is not configured on this deployment; signed-out API callers keep
 *     the long-standing "send your key" answers.
 *
 * The key itself is read here and only here, handed straight to the
 * provider call, and never sent to a browser, a response or a log.
 */
import { isRateLimited } from '@/lib/password-auth';
import { planTierOf, tierSatisfies } from '../plan-tier';
import { providerInfo, type ProviderId } from './providers';
import type { Credentials } from './service';

/** The one provider the site's key belongs to. */
export const SITE_AI_PROVIDER: ProviderId = 'openai';

/** The site's OpenAI key, or null when this deployment has none. */
export function siteAiKey(): string | null {
  const key = process.env.OPENAI_API_KEY?.trim();
  return key ? key : null;
}

/** The model site-key calls use: OPENAI_MODEL, else the OpenAI default. */
export function siteAiModel(): string {
  const model = process.env.OPENAI_MODEL?.trim();
  return model || providerInfo(SITE_AI_PROVIDER).defaultModel;
}

export function siteAiAvailable(): boolean {
  return siteAiKey() !== null;
}

/** The signed-in visitor's session facts, or null. The session is the fence: no id, no site key. */
async function siteAiSession(): Promise<{
  userId: string;
  subscriptionStatus: string | null;
  planTier: string | null;
} | null> {
  try {
    // Imported on use: the auth stack (NextAuth + Prisma) stays out of
    // every module that only needs the decision matrix.
    const { auth } = await import('@/auth');
    const session = await auth();
    const userId = session?.user?.id ?? null;
    if (!userId) return null;
    return {
      userId,
      subscriptionStatus: session?.user?.subscriptionStatus ?? null,
      planTier: session?.user?.planTier ?? null,
    };
  } catch {
    return null;
  }
}

export async function siteAiUserId(): Promise<string | null> {
  return (await siteAiSession())?.userId ?? null;
}

/**
 * "Active" exactly as the rest of the product means it: the value
 * resolveSubscriptionStatus (src/auth.ts) puts on the session — paid,
 * trialing and comp free-Pro all resolve to 'active'; everything else
 * (none, past_due, canceled, expired) does not.
 *
 * Team Access (Workstream H): subscriptionStatus stays the member's
 * OWN billing status, so a team member whose access comes from their
 * organization's owner reads not-active there; the session's planTier
 * is the EFFECTIVE tier (own or org-granted, resolved in the jwt in
 * src/auth.ts), so the gate also passes when the caller supplies that
 * tier and it satisfies "pro" via lib/plan-tier. Callers without a
 * tier (the legacy one-argument form) get the status check alone,
 * exactly as before. Fail-soft: any error reading the tier falls back
 * to the status-only result — it never throws the gate open or closed.
 */
export function isActiveSubscription(
  status: string | null | undefined,
  planTier?: string | null,
): boolean {
  if (status === 'active') return true;
  if (planTier == null) return false;
  try {
    return tierSatisfies(planTierOf({ user: { subscriptionStatus: status, planTier } }), 'pro');
  } catch {
    return false;
  }
}

export type KeyDecision =
  /** The caller sent their own key: use the credentials exactly as parsed. */
  | { kind: 'byok' }
  /** Nothing to inject and nothing new to say: downstream answers as it always has. */
  | { kind: 'passthrough' }
  /** Run on the site's key. `model` applies when the caller chose none. */
  | { kind: 'site'; key: string; model?: string }
  /** Refuse here, with a message written for the person reading it. */
  | { kind: 'error'; status: number; code: string; error: string };

/**
 * Who pays for this call. Pure — the caller supplies the session state and
 * the site key — so the whole matrix is testable without env or a database.
 */
export function decideKeyUse(
  creds: Credentials,
  opts: { signedIn: boolean; key: string | null; model: string },
): KeyDecision {
  if (creds.key) return { kind: 'byok' };
  const provider = creds.provider;
  if (provider && provider !== SITE_AI_PROVIDER) {
    // Another provider's engine: the site's OpenAI key cannot stand in for
    // it (the scripted demo needs no key at all). Downstream answers.
    return { kind: 'passthrough' };
  }
  if (opts.key) {
    if (!opts.signedIn) {
      return {
        kind: 'error',
        status: 401,
        code: 'SIGN_IN_REQUIRED',
        error: 'Sign in to use WorldEye AI — it runs on the site\'s key for subscribers.',
      };
    }
    // No engine chosen: the site's model, not the caller's stray default.
    return { kind: 'site', key: opts.key, model: provider ? undefined : opts.model };
  }
  if (opts.signedIn) {
    return {
      kind: 'error',
      status: 503,
      code: 'AI_NOT_CONFIGURED',
      error: 'AI isn\'t configured on this deployment yet.',
    };
  }
  return { kind: 'passthrough' };
}

/** Folds a decision into the credentials a route hands downstream. */
export function applyKeyDecision(creds: Credentials, decision: KeyDecision): Credentials {
  if (decision.kind !== 'site') return creds;
  return {
    provider: SITE_AI_PROVIDER,
    key: decision.key,
    model: creds.model ?? decision.model ?? siteAiModel(),
  };
}

export type ResolvedKey =
  | { ok: true; creds: Credentials; siteUserId: string | null; subscriptionActive: boolean }
  | { ok: false; status: number; code: string; error: string };

/**
 * The routes' one call: parse-independent resolution of a request's key.
 * A caller with their own key never touches the session or the site key.
 * `siteUserId` is set exactly when the site's key will pay, so the route
 * can apply the hourly cap to the right person — and `subscriptionActive`
 * says whether that person is a subscriber, for the routes (like the
 * companion's assist path) where WorldEye AI is a subscriber feature.
 */
export async function resolveRouteKey(creds: Credentials): Promise<ResolvedKey> {
  if (creds.key) return { ok: true, creds, siteUserId: null, subscriptionActive: true };
  const session = await siteAiSession();
  const decision = decideKeyUse(creds, { signedIn: session !== null, key: siteAiKey(), model: siteAiModel() });
  if (decision.kind === 'error') return { ok: false, status: decision.status, code: decision.code, error: decision.error };
  const site = decision.kind === 'site';
  return {
    ok: true,
    creds: applyKeyDecision(creds, decision),
    siteUserId: site ? (session?.userId ?? null) : null,
    subscriptionActive: site
      ? isActiveSubscription(session?.subscriptionStatus, session?.planTier)
      : true,
  };
}

/** Fair-use caps for calls the site's key pays for, per signed-in user per hour. */
export const SITE_KEY_HOURLY = { assist: 30, ask: 30, runs: 6 } as const;

export function siteKeyHourLimited(bucket: keyof typeof SITE_KEY_HOURLY, userId: string): boolean {
  return isRateLimited(`oi:site:${bucket}:${userId}`, SITE_KEY_HOURLY[bucket], 3_600_000);
}
