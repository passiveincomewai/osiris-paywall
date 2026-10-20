import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { stripe } from "@/lib/stripe";
import { assembleManageView, type ManageStripeSub } from "@/lib/billing/manage";
import { describeStripePrice, planByPriceIdFromEnv } from "@/lib/billing/trial-reminders";

export const runtime = "nodejs";

// GET /api/billing/manage — the signed-in user's OWN subscription,
// assembled for the in-house management page (/settings/subscription).
// DB row is the base truth; the live Stripe subscription only adds what
// the DB doesn't store (trial end, the enterprise price label). A Stripe
// hiccup degrades the figures, never the page.
export async function GET() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "Sign in required" }, { status: 401 });

  const dbSub = await db.subscription.findUnique({ where: { userId } });

  let stripeSub: ManageStripeSub | null = null;
  let currentPriceLabel: string | null = null;
  if (dbSub && !dbSub.stripeSubscriptionId.startsWith("comp_")) {
    try {
      const sub = await stripe().subscriptions.retrieve(dbSub.stripeSubscriptionId, {
        expand: ["items.data.price"],
      });
      stripeSub = { status: sub.status, trial_end: sub.trial_end };
      const price = sub.items.data[0]?.price;
      if (price) {
        currentPriceLabel = describeStripePrice(
          {
            id: price.id,
            unit_amount: price.unit_amount,
            currency: price.currency,
            recurring: price.recurring
              ? { interval: price.recurring.interval, interval_count: price.recurring.interval_count }
              : null,
          },
          planByPriceIdFromEnv(process.env),
        ).chargeLabel;
      }
    } catch {
      stripeSub = null;
    }
  }

  return NextResponse.json(
    assembleManageView({ dbSub, stripeSub, env: process.env, currentPriceLabel }),
  );
}
