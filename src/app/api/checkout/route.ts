import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { stripe, appUrl } from "@/lib/stripe";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  }

  const { plan } = (await req.json().catch(() => ({}))) as { plan?: string };
  const priceEnv =
    plan === "monthly" ? "STRIPE_MONTHLY_PRICE_ID"
    : plan === "annual" ? "STRIPE_ANNUAL_PRICE_ID"
    : "STRIPE_WEEKLY_PRICE_ID";
  const priceId = process.env[priceEnv];
  if (!priceId) {
    return NextResponse.json({ error: `${priceEnv} is not set` }, { status: 500 });
  }

  // Already holding an active pass? Send them straight in — no double charge.
  const existing = await db.subscription.findUnique({ where: { userId } });
  if (existing?.status === "active" && existing.currentPeriodEnd > new Date()) {
    return NextResponse.json({ url: "/dashboard" });
  }

  // Reuse the Stripe customer across resubscribes (keeps invoices tidy).
  let customerId = existing?.stripeCustomerId;
  if (!customerId) {
    const customer = await stripe().customers.create({
      email: session.user?.email ?? undefined,
      metadata: { userId },
    });
    customerId = customer.id;
  }

  const checkoutSession = await stripe().checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    client_reference_id: userId,
    line_items: [{ price: priceId, quantity: 1 }],
    subscription_data: { metadata: { userId } },
    allow_promotion_codes: true,
    success_url: `${appUrl()}/?checkout=success`,
    cancel_url: `${appUrl()}/pricing?checkout=cancelled`,
  });

  return NextResponse.json({ url: checkoutSession.url });
}
