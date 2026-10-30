import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { isVerifiedRow } from "@/lib/auth-verification";
import { trialWaitingEligible } from "@/lib/popups/trial-waiting";

export const runtime = "nodejs";

/**
 * trial_waiting popup eligibility, server-verified: the caller's
 * account is ≥3 days old, its email is verified (lib/auth-verification's
 * rule), and NO Subscription row exists (a row is only created when a
 * subscription — trial included — begins, so no row = never trialed).
 * Anything uncertain (signed out, DB error, missing row) answers
 * eligible:false — this popup's claim must be true or it stays dark.
 * The client keys its once-ever record on the returned userKey.
 */
export async function GET() {
  const none = { eligible: false as const };
  try {
    const session = await auth().catch(() => null);
    const userId = (session?.user as { id?: string } | undefined)?.id;
    if (!userId) return NextResponse.json(none);
    const user = await db.user
      .findUnique({
        where: { id: userId },
        select: {
          createdAt: true,
          emailVerified: true,
          accounts: { select: { provider: true } },
        },
      })
      .catch(() => null);
    if (!user) return NextResponse.json(none);
    const sub = await db.subscription
      .findUnique({ where: { userId }, select: { id: true } })
      .catch(() => undefined);
    if (sub === undefined) return NextResponse.json(none);
    const eligible = trialWaitingEligible({
      emailVerified: isVerifiedRow(user),
      accountCreatedAtMs: user.createdAt.getTime(),
      hasSubscriptionRow: sub !== null,
      now: Date.now(),
    });
    return NextResponse.json(
      eligible ? { eligible: true as const, userKey: userId } : none,
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch {
    return NextResponse.json(none);
  }
}
