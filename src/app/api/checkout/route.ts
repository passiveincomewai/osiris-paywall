import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { stripe, appUrl } from "@/lib/stripe";
import { cookies } from "next/headers";
import { REF_COOKIE, findAffiliateByCode } from "@/lib/affiliate/attribution";
import { trialDaysForPlan } from "@/lib/billing/trials";
import { sendMetaEvent, metaUserDataFromRequest } from "@/lib/meta-capi";
import { randomUUID } from "node:crypto";

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

  const { plan, ui } = (await req.json().catch(() => ({}))) as {
    plan?: string;
    ui?: string;
  };
  if (plan !== "weekly" && plan !== "monthly" && plan !== "annual" && plan !== "enterprise") {
    return NextResponse.json({ error: "Unknown plan" }, { status: 400 });
  }
  // Embedded mode renders Stripe's form on /checkout (our domain) instead of
  // redirecting to checkout.stripe.com. Everything that decides WHAT is
  // bought (price, trial, metadata) is shared below — only the presentation
  // of the session differs. Anything other than ui:"embedded" is the hosted
  // flow exactly as before (it remains the fallback the /checkout page drops
  // to when embedded can't run, e.g. no publishable key published yet).
  const embedded = ui === "embedded";
  const priceEnv =
    plan === "monthly" ? "STRIPE_MONTHLY_PRICE_ID"
    : plan === "annual" ? "STRIPE_ANNUAL_PRICE_ID"
    : plan === "enterprise" ? "STRIPE_ENTERPRISE_PRICE_ID"
    : "STRIPE_WEEKLY_PRICE_ID";
  // Free trials: weekly → 1 day, monthly → 1 day, annual → 3 days.
  // Enterprise has no trial. Config lives in src/lib/billing/trials.ts.
  // Stripe reports these subscriptions as `trialing`, which the paywall
  // treats as full Pro access.
  const trialDays = trialDaysForPlan(plan);
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

  // Where a completed checkout lands. Guests go to /welcome to claim their
  // account (it reads ?session_id= and verifies it via /api/checkout/complete);
  // members go to the app. Embedded checkout reaches the identical place
  // through return_url — Stripe substitutes {CHECKOUT_SESSION_ID} the same
  // way — so the completion/claim flow is shared, not forked.
  const completionUrl = userId
    ? `${appUrl()}/?checkout=success`
    : `${appUrl()}/welcome?session_id={CHECKOUT_SESSION_ID}`;

  const checkoutSession = await stripe().checkout.sessions.create({
    mode: "subscription",
    ...(customerId ? { customer: customerId } : {}),
    // Session-level metadata: read by the webhook for abandoned-cart tracking.
    metadata: { plan },
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
    ...(embedded
      ? {
          ui_mode: "embedded" as const,
          // Completion redirects the top page to return_url (the default
          // redirect_on_completion is "always"; stated so it can't drift),
          // exactly like the hosted success_url below.
          redirect_on_completion: "always" as const,
          return_url: completionUrl,
        }
      : {
          success_url: completionUrl,
          cancel_url: `${appUrl()}/pricing?checkout=cancelled`,
        }),
  });

  // Meta Conversions API twin of the browser InitiateCheckout event.
  // The id is generated here, sent with the server copy, and returned in
  // the response so the client fires its fbq event with the SAME id and
  // Meta deduplicates the pair. Fire-and-forget; a no-op until
  // META_CAPI_ACCESS_TOKEN is set. Guests have no email yet — the event
  // matches on the _fbp/_fbc cookies + IP/UA instead.
  const metaEventId = randomUUID();
  void sendMetaEvent({
    eventName: "InitiateCheckout",
    eventId: metaEventId,
    eventSourceUrl: `${appUrl()}/pricing`,
    userData: metaUserDataFromRequest(req, session?.user?.email),
  });

  if (embedded) {
    // The /checkout page mounts this secret with Stripe.js; an embedded
    // session has no hosted url to redirect to.
    return NextResponse.json({ clientSecret: checkoutSession.client_secret, metaEventId });
  }
  return NextResponse.json({ url: checkoutSession.url, metaEventId });
}
