import { auth } from "@/auth";
import { db } from "@/lib/db";
import { resolveRecordingTier, type PlanTier } from "@/lib/recording/tier";
import { getEffectiveEntitlement, maxTier } from "@/lib/team/entitlement";

/** Backend Pro check for recording features. Mirrors src/auth.ts logic. */
export async function recordingAccess(): Promise<
  | { ok: true; userId: string; pro: true; tier: "pro" | "vip" }
  | { ok: true; userId: string; pro: false; tier: "free" }
  | { ok: false }
> {
  const session = await auth().catch(() => null);
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) return { ok: false };
  const sub = await db.subscription.findUnique({ where: { userId } }).catch(() => null);
  const ownPro = !!(
    sub &&
    (sub.status === "active" || sub.status === "trialing") &&
    sub.currentPeriodEnd > new Date()
  );
  const ownTier: PlanTier = resolveRecordingTier({
    pro: ownPro,
    stripePriceId: sub?.stripePriceId,
    env: process.env,
    // The row's creation date drives the legacy-VIP cutoff for the
    // annual price in the central plan config (Pricing Phase A).
    createdAt: sub?.createdAt,
  });
  // Team Access (Phase 10): a granted member inherits the org owner's
  // tier via lib/team/entitlement — the single source for the merge.
  // Fail-soft: any error in the org lookup leaves the own result
  // untouched. (The org-wide shared recording CAP itself is enforced
  // separately by the lease pool under src/app/api/team/recording.)
  let tier: PlanTier = ownTier;
  try {
    const entitlement = await getEffectiveEntitlement(userId);
    tier = maxTier(ownTier, entitlement.effectiveTier);
  } catch {
    tier = ownTier;
  }
  const pro = tier !== "free";
  return pro
    ? { ok: true, userId, pro: true, tier: tier === "vip" ? "vip" : "pro" }
    : { ok: true, userId, pro: false, tier: "free" };
}
