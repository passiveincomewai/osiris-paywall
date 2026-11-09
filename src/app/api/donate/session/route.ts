/**
 * POST /api/donate/session — create a Stripe Embedded Checkout session
 * for a Support WorldEye donation (2026-11-09).
 *
 * Body: { amount, frequency: "once" | "monthly", source }.
 * Returns ONLY { clientSecret } — the popup mounts Stripe Embedded
 * Checkout with it. Amounts are validated server-side (whole dollars,
 * $1–$1,000) and prices resolve BY LOOKUP KEY (preset) or session-time
 * price_data (custom) — see src/lib/donate/prices.ts. The products are
 * owner-created in the Stripe dashboard; while they don't exist this
 * endpoint answers 503 and the popup shows its error state.
 *
 * Donation sessions are unmistakably marked — metadata.type =
 * "donation" on the session, the payment intent, and (via
 * subscription_data) the subscription — because the webhook's
 * donation branch keys on it to record the gift WITHOUT ever granting
 * plan access (src/lib/donate/record.ts).
 */
import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { appUrl, stripe } from "@/lib/stripe";
import { parseDonateSessionRequest } from "@/lib/donate/config";
import { buildDonateLineItem } from "@/lib/donate/prices";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = parseDonateSessionRequest(body);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }
  const { amount, frequency, source } = parsed;

  const line = await buildDonateLineItem(frequency, amount);
  if (!line.ok) {
    return NextResponse.json({ error: line.error }, { status: 503 });
  }

  // Identity is optional — guests donate too. For a signed-in donor we
  // attach their Stripe customer when one is known (an existing
  // subscription row, else a customer search by email) and always
  // stamp client_reference_id + metadata.userId so the webhook can
  // set the supporter flag.
  let userId: string | null = null;
  let email: string | null = null;
  let customerId: string | null = null;
  try {
    const session = await auth();
    if (session?.user?.id) {
      userId = session.user.id;
      email = session.user.email ?? null;
      const sub = await db.subscription
        .findFirst({
          where: { userId },
          select: { stripeCustomerId: true },
        })
        .catch(() => null);
      customerId = sub?.stripeCustomerId ?? null;
      if (!customerId && email) {
        const found = await stripe().customers.list({ email, limit: 1 });
        customerId = found.data[0]?.id ?? null;
      }
    }
  } catch {
    // A session read failure must not block a guest donation.
    userId = null;
    email = null;
    customerId = null;
  }

  const metadata: Record<string, string> = {
    type: "donation",
    frequency,
    source,
    ...(userId ? { userId } : {}),
  };

  const params: Stripe.Checkout.SessionCreateParams = {
    ui_mode: "embedded",
    redirect_on_completion: "if_required",
    return_url: `${appUrl()}/support/thanks?session_id={CHECKOUT_SESSION_ID}`,
    line_items: [line.lineItem],
    metadata,
    ...(userId ? { client_reference_id: userId } : {}),
    ...(customerId
      ? { customer: customerId }
      : email
        ? { customer_email: email }
        : {}),
  };

  if (frequency === "once") {
    params.mode = "payment";
    params.submit_type = "donate";
    // customer_creation only applies when no customer is attached.
    if (!customerId) params.customer_creation = "if_required";
    params.payment_intent_data = {
      description: "Support WorldEye donation",
      metadata: { type: "donation", source },
      ...(email ? { receipt_email: email } : {}),
    };
  } else {
    params.mode = "subscription";
    params.subscription_data = {
      description: "Monthly support for WorldEye",
      metadata,
    };
  }

  try {
    const created = await stripe().checkout.sessions.create(params);
    if (!created.client_secret) {
      return NextResponse.json(
        { error: "Checkout is unavailable right now." },
        { status: 502 },
      );
    }
    return NextResponse.json({ clientSecret: created.client_secret });
  } catch (err) {
    console.error("[donate] session create failed:", err);
    return NextResponse.json(
      { error: "Checkout is unavailable right now." },
      { status: 502 },
    );
  }
}
