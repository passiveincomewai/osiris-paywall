/**
 * Public API key authentication + quota enforcement.
 *
 * One credential format across the platform (`wek_…`, SHA-256 at rest,
 * shown once — src/lib/enterprise/tokens), two doors told apart by the
 * key's `scope`: this door accepts scope "public" only, the Enterprise
 * collections door is untouched. A key here reads ONLY the public
 * catalogue service — it names no user data and unlocks nothing else.
 *
 * Enforcement, in order: a coarse per-IP burst guard (blunts hammering
 * of the key lookup itself), the key's per-minute burst limit, then the
 * per-key daily quota counted in the key row's rate window. Rejected
 * requests are never counted. The counting update is best-effort — a
 * database hiccup never fails a read the key was entitled to (the
 * enterprise door's hits counter sets the same precedent).
 */
import { db } from "@/lib/db";
import { getClientIp, isRateLimited } from "@/lib/ssrf-guard";
import { extractApiKey, hashSecret } from "@/lib/enterprise/tokens";
import { API_TIER_LIMITS, apiTierForUser, type ApiTier, type ApiTierLimits } from "./limits";

export interface ApiKeyAuth {
  keyId: string;
  userId: string;
  keyName: string;
  keyPrefix: string;
  tier: ApiTier;
  limits: ApiTierLimits;
  usedToday: number;
  remainingToday: number;
  /** ISO timestamp of the next UTC midnight, when the quota resets. */
  resetsAt: string;
}

export type ApiAuthResult =
  | { ok: true; auth: ApiKeyAuth }
  | {
      ok: false;
      status: number;
      code: string;
      message: string;
      retryAfterSeconds?: number;
    };

const DAY_MS = 86_400_000;

export function utcDayStart(now: Date): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

export async function authenticateApiKey(
  req: Request,
  opts: { countRequest?: boolean } = {},
): Promise<ApiAuthResult> {
  if (isRateLimited(`pubapi-ip:${getClientIp(req)}`, 300)) {
    return {
      ok: false,
      status: 429,
      code: "rate_limited",
      message: "Too many requests from this network. Wait a moment.",
      retryAfterSeconds: 60,
    };
  }
  const presented = extractApiKey(req);
  if (!presented) {
    return {
      ok: false,
      status: 401,
      code: "api_key_required",
      message: "API key required (Authorization: Bearer wek_… or X-Api-Key: wek_…).",
    };
  }
  const key = await db.enterpriseApiKey
    .findUnique({ where: { keyHash: hashSecret(presented) } })
    .catch(() => null);
  if (!key || key.revokedAt) {
    return { ok: false, status: 401, code: "api_key_invalid", message: "API key invalid or revoked." };
  }
  if (key.scope !== "public") {
    return {
      ok: false,
      status: 403,
      code: "wrong_key_scope",
      message:
        "This key belongs to the Enterprise collections API. The public API needs a key created in Account Settings → API keys.",
    };
  }

  const tier = await apiTierForUser(key.userId);
  const limits = API_TIER_LIMITS[tier];

  if (isRateLimited(`pubapi:${key.id}`, limits.requestsPerMinute)) {
    return {
      ok: false,
      status: 429,
      code: "rate_limited",
      message: `Rate limit: ${limits.requestsPerMinute} requests per minute on the ${limits.planLabel} plan.`,
      retryAfterSeconds: 60,
    };
  }

  const now = new Date();
  const dayStart = utcDayStart(now);
  const resetsAtMs = dayStart.getTime() + DAY_MS;
  const usedToday =
    key.rateWindowStart && key.rateWindowStart.getTime() === dayStart.getTime()
      ? key.rateWindowCount
      : 0;

  const countRequest = opts.countRequest !== false;
  if (countRequest) {
    if (usedToday >= limits.dailyRequests) {
      return {
        ok: false,
        status: 429,
        code: "daily_quota_exceeded",
        message: `Daily quota of ${limits.dailyRequests} requests on the ${limits.planLabel} plan is used up. It resets at ${new Date(resetsAtMs).toISOString()}.`,
        retryAfterSeconds: Math.max(1, Math.ceil((resetsAtMs - now.getTime()) / 1000)),
      };
    }
    await db.enterpriseApiKey
      .update({
        where: { id: key.id },
        data: {
          rateWindowStart: dayStart,
          rateWindowCount: usedToday + 1,
          hits: { increment: 1 },
          lastUsedAt: now,
        },
      })
      .catch(() => undefined);
  }

  const used = countRequest ? usedToday + 1 : usedToday;
  return {
    ok: true,
    auth: {
      keyId: key.id,
      userId: key.userId,
      keyName: key.name,
      keyPrefix: key.keyPrefix,
      tier,
      limits,
      usedToday: used,
      remainingToday: Math.max(0, limits.dailyRequests - used),
      resetsAt: new Date(resetsAtMs).toISOString(),
    },
  };
}
