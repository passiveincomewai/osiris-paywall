import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { stripe } from "@/lib/stripe";
import { MANAGEABLE_PLANS, priceIdForPlan, type ManageablePlan } from "@/lib/billing/manage";

export const runtime = "nodejs";

/**
 * POST /api/billing/switch { plan } — swap the caller's OWN subscription
 * to another self-serve plan, server-side via the Stripe API.
 *
 * Own-sub only by construction: the subscription id comes from the
 * caller's DB row (looked up by session user id) — the request body can
 * name a plan, never a subscription. Trialing subs keep their exact
 * trial end and are charged the NEW plan's price when the trial converts
 * (proration off; nothing can be charged mid-trial). Active subs swap
 * with Stripe's standard proration (unused time credited, difference
 * billed on the next invoice). The Stripe webhook remains the DB write
 * path — this route writes nothing to the DB; the page polls
 * /api/billing/manage until the new plan shows.
 */
export async function POST(req: Request) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "Sign in required" }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as { plan?: string };
  const plan = body.plan as ManageablePlan | undefined;
  if (!plan || !MANAGEABLE_PLANS.includes(plan)) {
    return NextResponse.json({ error: "Pick a plan to switch to." }, { status: 400 });
  }

  const row = await db.subscription.findUnique({ where: { userId } });
  if (!row) return NextResponse.json({ error: "No subscription found" }, { status: 404 });
  if (row.stripeSubscriptionId.startsWith("comp_")) {
    return NextResponse.json(
      { error: "This Pro access isn't billed through Stripe — email us to change it." },
      { status: 400 },
    );
  }

  const priceId = priceIdForPlan(plan, process.env);
  if (!priceId) {
    return NextResponse.json({ error: "That plan isn't available right now." }, { status: 500 });
  }
  if (row.stripePriceId === priceId) {
    return NextResponse.json({ error: "You're already on this plan." }, { status: 400 });
  }

  try {
    const sub = await stripe().subscriptions.retrieve(row.stripeSubscriptionId);
    if (sub.customer !== row.stripeCustomerId) {
      return NextResponse.json({ error: "Subscription mismatch" }, { status: 400 });
    }
    const itemId = sub.items.data[0]?.id;
    if (!itemId) return NextResponse.json({ error: "Subscription has no plan item" }, { status: 400 });

    if (sub.status === "trialing" && sub.trial_end) {
      // Preserve the trial end EXACTLY — the swap must never shorten or
      // extend a trial the user was promised.
      await stripe().subscriptions.update(row.stripeSubscriptionId, {
        items: [{ id: itemId, price: priceId }],
        trial_end: sub.trial_end,
        proration_behavior: "none",
      });
    } else {
      await stripe().subscriptions.update(row.stripeSubscriptionId, {
        items: [{ id: itemId, price: priceId }],
        proration_behavior: "create_prorations",
      });
    }
  } catch (e) {
    console.error("[billing-switch]", e);
    return NextResponse.json({ error: "Couldn't switch your plan. Nothing was changed." }, { status: 502 });
  }

  return NextResponse.json({ ok: true, plan });
}
