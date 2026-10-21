/**
 * VIP Pro features — the tier gate.
 *
 * Deliberately a thin adapter over the camera-alerts tier resolver
 * (lib/camera-alerts/tier): that is the house pattern for VIP surfaces —
 * the tier is resolved FRESH from the Subscription row (never from a
 * possibly-stale JWT) and layered with any team grant via
 * lib/team/entitlement. plan-tier.ts carries the same contract for
 * session-shaped reads; server mutations here use the DB-fresh path,
 * exactly like the camera-alert APIs.
 */
import { auth } from "@/auth";
import { getUserTier, type PlanTier } from "@/lib/camera-alerts/tier";

export type { PlanTier };

export { getUserTier };

/** VIP Pro = the annual tier (enterprise included upstream). */
export function isVipTier(tier: PlanTier): boolean {
  return tier === "vip";
}

/**
 * Session gate for the VIP feature APIs, shaped like cameraAlertAccess():
 * { ok: false } when signed out, else the user id + their fresh tier.
 * Reads stay open to any signed-in owner (a lapsed VIP can still see
 * their paused rules/views and why); writes check isVipTier.
 */
export async function vipAccess(): Promise<
  { ok: true; userId: string; tier: PlanTier } | { ok: false }
> {
  const session = await auth().catch(() => null);
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) return { ok: false };
  return { ok: true, userId, tier: await getUserTier(userId) };
}
