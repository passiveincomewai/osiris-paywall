import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { stripe, appUrl } from "@/lib/stripe";
import { cookies } from "next/headers";
import { REF_COOKIE, findAffiliateByCode } from "@/lib/affiliate/attribution";
import { trialDaysForPlan } from "@/lib/billing/trials";
import {
  resolveCheckoutGuard,
  ALREADY_SUBSCRIBED_MESSAGE,
  ALREADY_SUBSCRIBED_CODE,
  MANAGE_SUBSCRIPTION_PATH,
} from "@/lib/billing/checkout-guard";
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
  // Free trials: weekly → 3 days, monthly → 3 days, annual → 3 days
  // (Conversion Wave 2, F2 — every self-serve trial is 3 days).
  // Enterprise has no trial. Config lives in src/lib/billing/trials.ts.
  // Stripe reports these subscriptions as `trialing`, which the paywall
  // treats as full Pro access.
  const trialDays = trialDaysForPlan(plan);
  const priceId = process.env[priceEnv];
  if (!priceId) {
    return NextResponse.json({ error: `${priceEnv} is not set` }, { status: 500 });
  }

  // Signed-in members: the dedupe guard (Wave 2 F6 —
  // lib/billing/checkout-guard owns the decision table). A member who
  // already holds a live plan — in our DB, or on a Stripe customer
  // registered under their account email — is told so, with the way to
  // manage it, instead of being sold a duplicate subscription. The 409's
  // `error` is surfaced verbatim by every checkout client (the /checkout
  // page's and embedded body's error phases, the hosted starter's
  // throw). No existing subscription or customer is modified here.
  let customerId: string | undefined;
  if (userId) {
    const existing = await db.subscription.findUnique({ where: { userId } });
    const guard = await resolveCheckoutGuard({
      userId,
      email: session.user?.email,
      dbSub: existing
        ? {
            status: existing.status,
            currentPeriodEnd: existing.currentPeriodEnd,
            stripeCustomerId: existing.stripeCustomerId,
          }
        : null,
      ports: {
        listCustomersByEmail: async (email) =>
          (await stripe().customers.list({ email, limit: 10 })).data,
        listCustomerSubscriptions: async (id) =>
          (await stripe().subscriptions.list({ customer: id, status: "all", limit: 100 })).data,
      },
    });
    if (guard.kind === "blocked") {
      return NextResponse.json(
        {
          error: ALREADY_SUBSCRIBED_MESSAGE,
          code: ALREADY_SUBSCRIBED_CODE,
          manageUrl: MANAGE_SUBSCRIPTION_PATH,
        },
        { status: 409 },
      );
    }
    customerId = guard.customerId;
    if (!customerId) {
      const customer = await stripe().customers.create({
        email: session.user?.email ?? undefined,
        metadata: { userId },
      });
      customerId = customer.id;
    }
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
