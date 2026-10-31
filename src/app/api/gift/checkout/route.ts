import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { stripe, appUrl } from "@/lib/stripe";
import { resolvePlan } from "@/lib/billing/plans";
import { giftSubscriptionsEnabled } from "@/lib/billing/gift-flag";
import { generateGiftCode, isGiftPlanKey } from "@/lib/billing/gift";
import { normalizeEmail, isValidEmail } from "@/lib/password-auth";

export const runtime = "nodejs";

/**
 * POST /api/gift/checkout — start a gift purchase.
 *
 * Dark behind GIFT_SUBSCRIPTIONS_ENABLED (404 while off, the
 * developer-platform/Powder pattern). Creates the GiftSubscription
 * row (status "pending") and a subscription-mode Checkout Session on
 * the chosen grid plan's EXISTING price id. Deliberate differences
 * from /api/checkout:
 *   - NO trial: the buyer pays the first term up front; the gift IS
 *     that one prepaid term (fulfilment cancels renewal — see
 *     lib/billing/gift.ts).
 *   - NO buyer customer and NO dedupe guard: the buyer is purchasing
 *     for someone else, so being subscribed themselves is irrelevant,
 *     and attaching their Stripe customer would entitle the wrong
 *     account. The session is guest-style; Stripe collects the
 *     buyer's email for the receipt.
 *   - NO promotion codes (allow_promotion_codes stays off): WELCOME50
 *     is a self-serve signup offer, not a gift discount.
 * Fulfilment happens in the Stripe webhook (kind: "gift").
 */
export async function POST(req: Request) {
  if (!giftSubscriptionsEnabled(process.env)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const session = await auth();
  const userId = session?.user?.id;

  const body = (await req.json().catch(() => ({}))) as {
    planKey?: unknown;
    recipientEmail?: unknown;
    buyerEmail?: unknown;
  };

  if (!isGiftPlanKey(body.planKey)) {
    return NextResponse.json({ error: "Unknown gift plan" }, { status: 400 });
  }
  const resolved = resolvePlan(body.planKey, process.env);
  if (!resolved.priceId) {
    return NextResponse.json(
      { error: `${resolved.envKey} is not set` },
      { status: 500 },
    );
  }

  const recipientEmail =
    typeof body.recipientEmail === "string" ? normalizeEmail(body.recipientEmail) : "";
  if (!recipientEmail || !isValidEmail(recipientEmail)) {
    return NextResponse.json(
      { error: "Enter a valid email for the recipient" },
      { status: 400 },
    );
  }

  // Signed-in buyers gift from their account email; guests supply the
  // email Stripe should receipt (and the recipient email names as the
  // sender). A session email always wins over a posted one.
  const buyerEmail = session?.user?.email
    ? normalizeEmail(session.user.email)
    : typeof body.buyerEmail === "string"
      ? normalizeEmail(body.buyerEmail)
      : "";
  if (!buyerEmail || !isValidEmail(buyerEmail)) {
    return NextResponse.json(
      { error: "Enter a valid email for the buyer" },
      { status: 400 },
    );
  }
  if (recipientEmail === buyerEmail) {
    return NextResponse.json(
      {
        error:
          "You can't gift a plan to your own email — subscribe from the pricing page instead.",
      },
      { status: 400 },
    );
  }

  const gift = await db.giftSubscription.create({
    data: {
      code: generateGiftCode(),
      buyerUserId: userId ?? null,
      buyerEmail,
      recipientEmail,
      planKey: body.planKey,
      stripePriceId: resolved.priceId,
    },
  });

  const checkoutSession = await stripe().checkout.sessions.create({
    mode: "subscription",
    // Read by the webhook's gift branch (lib/billing/gift fulfilment).
    metadata: { kind: "gift", giftId: gift.id },
    customer_email: buyerEmail,
    line_items: [{ price: resolved.priceId, quantity: 1 }],
    subscription_data: {
      // Marks the Stripe subscription itself as a gift so the
      // webhook's entitlement writer skips it unconditionally.
      metadata: { gift: "1", giftId: gift.id },
    },
    // Same rationale as /api/checkout: the billing address rides onto
    // the saved payment method for Radar scoring.
    billing_address_collection: "required",
    success_url: `${appUrl()}/gift/sent`,
    cancel_url: `${appUrl()}/gift?checkout=cancelled`,
  });

  await db.giftSubscription.update({
    where: { id: gift.id },
    data: { stripeCheckoutSessionId: checkoutSession.id },
  });

  return NextResponse.json({ url: checkoutSession.url });
}
