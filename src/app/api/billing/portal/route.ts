import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { stripe, appUrl } from "@/lib/stripe";

export const runtime = "nodejs";

// POST /api/billing/portal — Stripe customer portal (invoices, payment
// method, cancel). Works with Stripe's default portal configuration.
export async function POST() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "Sign in required" }, { status: 401 });

  const sub = await db.subscription.findUnique({
    where: { userId },
    select: { stripeCustomerId: true },
  });
  if (!sub?.stripeCustomerId) {
    return NextResponse.json({ error: "No billing account found" }, { status: 404 });
  }

  try {
    const portal = await stripe().billingPortal.sessions.create({
      customer: sub.stripeCustomerId,
      return_url: `${appUrl()}/settings`,
    });
    return NextResponse.json({ url: portal.url });
  } catch (e) {
    console.error("[billing-portal]", e);
    return NextResponse.json({ error: "Couldn't open the billing portal" }, { status: 500 });
  }
}
