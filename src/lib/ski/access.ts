/**
 * Powder Pass — who holds ski access.
 *
 * Powder Pass is a STANDALONE ski-only product ($4.99/mo, owner's
 * pick 2026-10-28, its own Stripe price), not a Pro tier: a Powder
 * Pass subscription unlocks the ski features and nothing else, and
 * lib/plan-tier keeps the Powder Pass price OUT of the pro/vip
 * mapping for exactly that reason. Access is the union (owner's
 * spec, mirroring the Ambient pattern with the ski tier rules):
 *
 *   - an active subscription on the Powder Pass price, OR
 *   - the VIP tier (annual/enterprise, incl. team-granted effective
 *     VIP) — VIP includes Powder Pass; Pro does NOT, OR
 *   - a comp row: the comp engine's only price is a Pro price, which
 *     satisfies Ambient's tier rule but not ski's vip rule, so comps
 *     are recognised by their price id directly (lib/plan-tier
 *     isCompPriceId) — comps hold ski access the way they hold
 *     everything else the owner grants them.
 *
 * DARK LAUNCH: the whole product sits behind POWDER_PASS_ENABLED
 * (default OFF). With the flag off, skiAccessForRow is false for
 * every row, POST /api/checkout treats plan "ski" as unknown, and no
 * session ever carries skiAccess — the plumbing ships invisibly and
 * lights up only when the owner provisions the Stripe price and
 * flips the flag. No ski surface references Powder Pass until then.
 *
 * The session carries this as `session.user.skiAccess`, resolved in
 * src/auth.ts's claims alongside subscriptionStatus/planTier/
 * ambientAccess on the same 60 s TTL, so a finished Powder Pass
 * checkout reflects on the next session read — the same healing
 * path every other gate uses.
 */
import {
  isCompPriceId,
  isPowderPassPriceId,
  planTierForRow,
  powderPassPriceId,
} from "@/lib/plan-tier";
import { subscriptionStatusFromRow } from "@/lib/subscription-status";

/* The Powder Pass price-id contract lives in lib/plan-tier (the
 * price-id module); re-exported here so ski code has one import
 * home. The env var is the ONLY source — there is no fallback
 * constant, because the owner has not created the price yet and an
 * invented id would be worse than an honest "not configured". */
export { isPowderPassPriceId, powderPassPriceId };
export { POWDER_PASS_PRICE_ENV } from "@/lib/plan-tier";

export const POWDER_PASS_ENABLED_ENV = "POWDER_PASS_ENABLED";

/**
 * The dark-launch switch. Only an explicit affirmative value lights
 * the product up; unset/anything else keeps it dark (default OFF,
 * unlike the geolocation beta's default-on kill switch — nothing
 * about Powder Pass may exist publicly until the owner launches it).
 */
export function powderPassEnabled(
  env: Record<string, string | undefined> = process.env,
): boolean {
  const v = env[POWDER_PASS_ENABLED_ENV]?.trim().toLowerCase();
  return v === "1" || v === "true" || v === "on" || v === "yes";
}

interface SubRowLike {
  status: string;
  currentPeriodEnd: Date;
  stripePriceId: string;
}

/**
 * Ski access from a Subscription row alone (pure — used by the auth
 * claims resolver and unit tests). Status must first fold to
 * "active" through the codebase's standard mapping
 * (lib/subscription-status), exactly like every other entitlement.
 */
export function skiAccessForRow(
  sub: SubRowLike | null | undefined,
  env: Record<string, string | undefined> = process.env,
  now: Date = new Date(),
): boolean {
  if (!powderPassEnabled(env)) return false;
  if (subscriptionStatusFromRow(sub, now) !== "active") return false;
  if (isPowderPassPriceId(sub?.stripePriceId, env)) return true;
  if (isCompPriceId(sub?.stripePriceId)) return true;
  return planTierForRow(sub, env, now) === "vip";
}

/**
 * Client/session-side read: does this session-shaped object prove
 * ski access? The explicit `skiAccess` claim wins. Sessions minted
 * before the claim existed fall back to the tier rule — but ONLY to
 * vip: unlike Ambient (where any active sub grants access, Pro
 * included), an "active" status here cannot distinguish a Powder
 * Pass sub from a Pro one, and Pro does not include ski — so the
 * fallback stays conservative rather than over-granting.
 */
export function sessionHasSkiAccess(
  session: {
    user?: {
      skiAccess?: unknown;
      planTier?: unknown;
      subscriptionStatus?: unknown;
    } | null;
  } | null | undefined,
): boolean {
  const user = session?.user;
  if (!user) return false;
  if (user.skiAccess === true) return true;
  return user.planTier === "vip";
}
