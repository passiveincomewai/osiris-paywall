import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";

export const runtime = "nodejs";

const PLAN_LABELS: Record<string, string> = {
  weekly: "Weekly",
  monthly: "Monthly",
  annual: "Annual",
  enterprise: "Enterprise",
};

function planFromPriceId(priceId: string): string {
  if (priceId === process.env.STRIPE_WEEKLY_PRICE_ID) return PLAN_LABELS.weekly;
  if (priceId === process.env.STRIPE_MONTHLY_PRICE_ID) return PLAN_LABELS.monthly;
  if (priceId === process.env.STRIPE_ANNUAL_PRICE_ID) return PLAN_LABELS.annual;
  if (priceId === process.env.STRIPE_ENTERPRISE_PRICE_ID) return PLAN_LABELS.enterprise;
  return "Pro";
}

// GET /api/user/subscription — the caller's subscription state for settings.
export async function GET() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "Sign in required" }, { status: 401 });

  const sub = await db.subscription.findUnique({ where: { userId } });
  if (!sub) return NextResponse.json({ subscription: null });

  return NextResponse.json({
    subscription: {
      plan: planFromPriceId(sub.stripePriceId),
      status: sub.status,
      currentPeriodEnd: sub.currentPeriodEnd.toISOString(),
      cancelAtPeriodEnd: sub.cancelAtPeriodEnd,
    },
  });
}
