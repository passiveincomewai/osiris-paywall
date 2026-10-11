import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { stripe, appUrl } from "@/lib/stripe";
import { cookies } from "next/headers";
import { REF_COOKIE, findAffiliateByCode } from "@/lib/affiliate/attribution";

export const runtime = "nodejs";

/** Resolve the referral cookie to affiliate metadata for Stripe. */
async function affiliateMetadata(): Promise<Record<string, string>> {
  try {
    const code = (await cookies()).get(REF_COOKIE)?.value?.toLowerCase();
    if (!code) return {};
    const affiliate = await findAffiliateByCode(code);
    if (!affiliate) return {};
    return { affiliateProfileId: affiliate.id };
  } catch {
    return {};
  }
}

export async function POST(req: Request) {
  // Guest checkout: no sign-in required. The account is created (or linked)
  // from the Stripe customer's email when the webhook fires, and the buyer
  // claims it with a password on /welcome after paying.
  const session = await auth();
  const userId = session?.user?.id;

  const { plan } = (await req.json().catch(() => ({}))) as { plan?: string };
  if (plan !== "weekly" && plan !== "monthly" && plan !== "annual" && plan !== "enterprise") {
    return NextResponse.json({ error: "Unknown plan" }, { status: 400 });
  }
  const priceEnv =
    plan === "monthly" ? "STRIPE_MONTHLY_PRICE_ID"
    : plan === "annual" ? "STRIPE_ANNUAL_PRICE_ID"
    : plan === "enterprise" ? "STRIPE_ENTERPRISE_PRICE_ID"
    : "STRIPE_WEEKLY_PRICE_ID";
  // Free trials: annual → 3 days, weekly → 1 day. Enterprise has no trial.
  // Stripe reports these subscriptions as `trialing`, which the paywall
  // treats as full Pro access.
  const TRIAL_DAYS: Record<string, number> = { weekly: 1, monthly: 0, annual: 3, enterprise: 0 };
  const trialDays = TRIAL_DAYS[plan] ?? 0;
  const priceId = process.env[priceEnv];
  if (!priceId) {
    return NextResponse.json({ error: `${priceEnv} is not set` }, { status: 500 });
  }

  // Signed-in users already holding an active pass go straight in — no double charge.
  let customerId: string | undefined;
  if (userId) {
    const existing = await db.subscription.findUnique({ where: { userId } });
    if (existing?.status === "active" && existing.currentPeriodEnd > new Date()) {
      return NextResponse.json({ url: "/dashboard" });
    }
    // Reuse the Stripe customer across resubscribes (keeps invoices tidy).
    customerId = existing?.stripeCustomerId;
  }
  if (!customerId && userId) {
    const customer = await stripe().customers.create({
      email: session.user?.email ?? undefined,
      metadata: { userId },
    });
    customerId = customer.id;
  }

  const checkoutSession = await stripe().checkout.sessions.create({
    mode: "subscription",
    ...(customerId ? { customer: customerId } : {}),
    // Guests: Stripe collects the email at checkout; the webhook links it.
    ...(userId ? { client_reference_id: userId } : {}),
    line_items: [{ price: priceId, quantity: 1 }],
    subscription_data: {
      metadata: {
        ...(userId ? { userId } : { guest: "1" }),
        // Affiliate attribution: resolved server-side from the httpOnly cookie.
        // The webhook reads this to award commissions on paid invoices.
        ...(await affiliateMetadata()),
      },
      ...(trialDays > 0 ? { trial_period_days: trialDays } : {}),
    },
    // Trials must collect a card up front; Stripe charges it when the trial ends.
    ...(trialDays > 0 ? { payment_method_collection: "always" as const } : {}),
    allow_promotion_codes: true,
    // Guests land on /welcome to claim their account; members go to the app.
    success_url: userId
      ? `${appUrl()}/?checkout=success`
      : `${appUrl()}/welcome?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${appUrl()}/pricing?checkout=cancelled`,
  });

  return NextResponse.json({ url: checkoutSession.url });
}
