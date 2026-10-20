import { auth } from "@/auth";
import { db } from "@/lib/db";
import { resolveRecordingTier, type PlanTier } from "@/lib/recording/tier";

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
  const pro = !!(
    sub &&
    (sub.status === "active" || sub.status === "trialing") &&
    sub.currentPeriodEnd > new Date()
  );
  const tier: PlanTier = resolveRecordingTier({
    pro,
    stripePriceId: sub?.stripePriceId,
    env: process.env,
  });
  return pro
    ? { ok: true, userId, pro: true, tier: tier === "vip" ? "vip" : "pro" }
    : { ok: true, userId, pro: false, tier: "free" };
}
