import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { giftSubscriptionsEnabled } from "@/lib/billing/gift-flag";
import { redeemDecision, giftRowId } from "@/lib/billing/gift";
import { PLAN_DEFS, type PlanKey } from "@/lib/billing/plans";
import { normalizeEmail } from "@/lib/password-auth";

export const runtime = "nodejs";

/**
 * GET /api/gift/redeem?code=… — preview a gift for the redeem page:
 * which plan, what state it's in, when the paid term ends, and
 * whether the signed-in account is the recipient. The code is the
 * bearer secret from the recipient's email, so holding it is what
 * authorizes the preview. Consumes nothing.
 */
export async function GET(req: Request) {
  if (!giftSubscriptionsEnabled(process.env)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const code = new URL(req.url).searchParams.get("code") ?? "";
  const gift = code
    ? await db.giftSubscription.findUnique({ where: { code } })
    : null;
  if (!gift) return NextResponse.json({ found: false });

  const session = await auth();
  const userEmail = session?.user?.email ? normalizeEmail(session.user.email) : null;
  const plan = PLAN_DEFS[gift.planKey as PlanKey];
  return NextResponse.json({
    found: true,
    status: gift.status,
    planKey: gift.planKey,
    planDisplayName: plan?.displayName ?? gift.planKey,
    displayPrice: plan?.displayPrice ?? null,
    recipientEmail: gift.recipientEmail,
    periodEnd: gift.periodEnd?.toISOString() ?? null,
    signedIn: !!session?.user?.id,
    emailMatches: userEmail !== null && userEmail === normalizeEmail(gift.recipientEmail),
  });
}

/**
 * POST /api/gift/redeem { code } — claim a paid gift.
 *
 * The refusal table is redeemDecision (lib/billing/gift): unknown /
 * unpaid / ALREADY REDEEMED / expired / wrong email / already
 * subscribed. On grant, one interactive transaction claims the gift
 * (conditional updateMany on status="paid" — a concurrent second
 * claim loses the race and is refused as already_redeemed) and writes
 * the recipient's Subscription row with synthetic gift ids, the real
 * gifted price id, and exactly the gift's paid period.
 */
export async function POST(req: Request) {
  if (!giftSubscriptionsEnabled(process.env)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json(
      { error: "Sign in to redeem your gift", code: "signin_required" },
      { status: 401 },
    );
  }

  const body = (await req.json().catch(() => ({}))) as { code?: unknown };
  const code = typeof body.code === "string" ? body.code.trim() : "";
  if (!code) {
    return NextResponse.json({ error: "Missing gift code" }, { status: 400 });
  }

  const gift = await db.giftSubscription.findUnique({ where: { code } });
  const existingSub = await db.subscription.findUnique({ where: { userId } });
  const now = new Date();
  const decision = redeemDecision({
    gift,
    userEmail: session.user?.email ?? "",
    existingSub,
    now,
  });
  if (decision.kind === "refuse") {
    // Lazily retire a paid gift whose term has lapsed so its state is
    // truthful everywhere else it surfaces.
    if (decision.reason === "expired" && gift?.status === "paid") {
      await db.giftSubscription.updateMany({
        where: { id: gift.id, status: "paid" },
        data: { status: "expired" },
      });
    }
    return NextResponse.json(
      { error: decision.message, code: decision.reason },
      { status: decision.httpStatus },
    );
  }

  // decision "grant" implies gift is non-null, paid, and in-term.
  const rowId = giftRowId(gift!.id);
  try {
    await db.$transaction(async (tx) => {
      const claim = await tx.giftSubscription.updateMany({
        where: { id: gift!.id, status: "paid" },
        data: { status: "redeemed", redeemedByUserId: userId, redeemedAt: now },
      });
      if (claim.count === 0) {
        throw new Error("gift_claim_lost");
      }
      // The decision guaranteed any existing row is lapsed/cancelled;
      // it yields the single-row slot to the gift (comp-yield rule).
      if (existingSub) {
        await tx.subscription.delete({ where: { userId } });
      }
      await tx.subscription.create({
        data: {
          userId,
          stripeCustomerId: rowId,
          stripeSubscriptionId: rowId,
          stripePriceId: gift!.stripePriceId,
          status: "active",
          currentPeriodStart: gift!.periodStart ?? now,
          currentPeriodEnd: gift!.periodEnd!,
          cancelAtPeriodEnd: true,
        },
      });
    });
  } catch (e) {
    if (e instanceof Error && e.message === "gift_claim_lost") {
      return NextResponse.json(
        { error: "This gift has already been redeemed.", code: "already_redeemed" },
        { status: 409 },
      );
    }
    throw e;
  }

  const plan = PLAN_DEFS[gift!.planKey as PlanKey];
  return NextResponse.json({
    ok: true,
    planKey: gift!.planKey,
    planDisplayName: plan?.displayName ?? gift!.planKey,
    currentPeriodEnd: gift!.periodEnd?.toISOString() ?? null,
  });
}
