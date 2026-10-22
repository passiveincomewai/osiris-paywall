import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { stripe } from "@/lib/stripe";
import {
  MANAGEABLE_PLANS,
  invoicePaymentIntentId,
  priceIdForPlan,
  type ManageablePlan,
} from "@/lib/billing/manage";

export const runtime = "nodejs";

/**
 * POST /api/billing/switch { plan } — swap the caller's OWN subscription
 * to another self-serve plan, server-side via the Stripe API.
 *
 * Own-sub only by construction: the subscription id comes from the
 * caller's DB row (looked up by session user id) — the request body can
 * name a plan, never a subscription. Trialing subs keep their exact
 * trial end and are charged the NEW plan's price when the trial converts
 * (proration off; nothing can be charged mid-trial).
 *
 * Active subs: the swap runs with proration AND
 * payment_behavior "pending_if_incomplete". An interval-changing switch
 * makes Stripe bill the prorated difference TODAY; if the card on file
 * covers it, the switch completes instantly (state "switched"). If not,
 * Stripe leaves the OLD plan fully in effect with the price change
 * pending, and this route returns state "payment_required" with the
 * open invoice's amount + PaymentIntent client secret — the page renders
 * an embedded Stripe payment form for exactly that invoice, and paying
 * it is what completes the switch. (The pre-fix flow swapped first and
 * let the failed charge flip the member to past_due with no on-site way
 * to pay — the bug Jameson hit on 2026-10-21.)
 *
 * The Stripe webhook remains the DB write path — this route writes
 * nothing to the DB; the page polls /api/billing/manage until the new
 * plan shows.
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
      return NextResponse.json({ ok: true, plan, state: "switched" });
    }

    const updated = await stripe().subscriptions.update(row.stripeSubscriptionId, {
      items: [{ id: itemId, price: priceId }],
      proration_behavior: "create_prorations",
      payment_behavior: "pending_if_incomplete",
      expand: ["latest_invoice"],
    });

    if (!updated.pending_update) {
      // No payment outstanding: either nothing was due today, or the
      // card on file covered the prorated invoice and it already paid.
      return NextResponse.json({ ok: true, plan, state: "switched" });
    }

    // The prorated invoice is open and unpaid — the OLD plan is still in
    // effect. Hand the page everything it needs to collect the payment
    // on-site: amount, the invoice's PaymentIntent client secret (for
    // the embedded Stripe form), and the hosted invoice URL (fallback).
    const invoice =
      updated.latest_invoice && typeof updated.latest_invoice === "object"
        ? updated.latest_invoice
        : null;
    let clientSecret: string | null = null;
    const piId = invoicePaymentIntentId(invoice);
    if (piId) {
      try {
        const pi = await stripe().paymentIntents.retrieve(piId);
        clientSecret = pi.client_secret ?? null;
      } catch {
        clientSecret = null;
      }
    }
    return NextResponse.json({
      ok: true,
      plan,
      state: "payment_required",
      amountDue: invoice?.amount_due ?? null,
      currency: invoice?.currency ?? "usd",
      clientSecret,
      hostedInvoiceUrl: invoice?.hosted_invoice_url ?? null,
    });
  } catch (e) {
    console.error("[billing-switch]", e);
    return NextResponse.json({ error: "Couldn't switch your plan. Nothing was changed." }, { status: 502 });
  }
}
