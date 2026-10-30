import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { planByPriceIdFromEnv } from "@/lib/billing/trial-reminders";
import { checkoutPlanSummary } from "@/lib/billing/trial-checkout";
import { trialDaysLeft, trialEndingEligible } from "@/lib/popups/trial-ending";

export const runtime = "nodejs";

/**
 * trial_ending popup (#12) eligibility + the user's own numbers,
 * server-computed: the caller's subscription is trialing and its
 * current period (the trial) ends within 48 hours — see
 * lib/popups/trial-ending for the end-instant basis. Usage figures
 * are the user's own rows only: camera_open PageViews stamped with
 * their userId since the trial period began, and their SavedCamera
 * count. Anything uncertain answers eligible:false.
 * The client keys its once-per-trial record on userKey + trialEndMs.
 */
export async function GET() {
  const none = { eligible: false as const };
  try {
    const session = await auth().catch(() => null);
    const userId = (session?.user as { id?: string } | undefined)?.id;
    if (!userId) return NextResponse.json(none);
    const sub = await db.subscription
      .findUnique({
        where: { userId },
        select: {
          status: true,
          currentPeriodStart: true,
          currentPeriodEnd: true,
          stripePriceId: true,
        },
      })
      .catch(() => undefined);
    if (!sub) return NextResponse.json(none);
    const now = Date.now();
    const trialEndMs = sub.currentPeriodEnd.getTime();
    if (
      !trialEndingEligible({ status: sub.status, periodEndMs: trialEndMs, now })
    ) {
      return NextResponse.json(none);
    }
    const [cameraOpens, savedCameras] = await Promise.all([
      db.pageView.count({
        where: {
          userId,
          createdAt: { gte: sub.currentPeriodStart },
          OR: [{ event: "camera_open" }, { event: { startsWith: "camera_open:" } }],
        },
      }),
      db.savedCamera.count({ where: { userId } }),
    ]);
    const planKey = planByPriceIdFromEnv(process.env)[sub.stripePriceId] ?? null;
    const planName = planKey ? checkoutPlanSummary(planKey)?.name ?? null : null;
    return NextResponse.json(
      {
        eligible: true as const,
        userKey: userId,
        trialEndMs,
        daysLeft: trialDaysLeft(trialEndMs, now),
        planName,
        usage: { cameraOpens, savedCameras },
      },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch {
    return NextResponse.json(none);
  }
}
