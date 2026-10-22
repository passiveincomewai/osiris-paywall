import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { stripe } from "@/lib/stripe";
import {
  assembleManageView,
  invoicePaymentIntentId,
  priceIdForPlan,
  MANAGEABLE_PLANS,
  type ManageStripeSub,
  type ManageablePlan,
} from "@/lib/billing/manage";
import { describeStripePrice, planByPriceIdFromEnv } from "@/lib/billing/trial-reminders";

export const runtime = "nodejs";

// GET /api/billing/manage — the signed-in user's OWN subscription,
// assembled for the in-house management page (/settings/subscription).
// DB row is the base truth; the live Stripe subscription only adds what
// the DB doesn't store (trial end, the enterprise price label, a pending
// plan switch awaiting payment, and per-plan "due today" switch quotes).
// A Stripe hiccup degrades the figures, never the page.
export async function GET() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "Sign in required" }, { status: 401 });

  const dbSub = await db.subscription.findUnique({ where: { userId } });

  let stripeSub: ManageStripeSub | null = null;
  let currentPriceLabel: string | null = null;
  const dueTodayByPlan: Partial<Record<ManageablePlan, number | null>> = {};
  if (dbSub && !dbSub.stripeSubscriptionId.startsWith("comp_")) {
    try {
      const sub = await stripe().subscriptions.retrieve(dbSub.stripeSubscriptionId, {
        expand: ["items.data.price", "latest_invoice"],
      });
      stripeSub = { status: sub.status, trial_end: sub.trial_end, pendingInvoice: null };
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

      // A plan switch waiting on payment (see /api/billing/switch):
      // surface its open invoice so the page can offer the payment form
      // on any visit, not just right after the switch attempt.
      if (sub.pending_update) {
        const invoice =
          sub.latest_invoice && typeof sub.latest_invoice === "object" ? sub.latest_invoice : null;
        if (invoice) {
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
          const pendingUpdate = sub.pending_update as unknown as {
            subscription_items?: Array<{ price?: string | { id?: string } | null }> | null;
          } | null;
          const rawPrice = pendingUpdate?.subscription_items?.[0]?.price;
          stripeSub.pendingInvoice = {
            id: invoice.id ?? "",
            amountDue: invoice.amount_due ?? 0,
            currency: invoice.currency ?? "usd",
            clientSecret,
            hostedUrl: invoice.hosted_invoice_url ?? null,
            newPriceId: typeof rawPrice === "string" ? rawPrice : (rawPrice?.id ?? null),
          };
        }
      }

      // "Due today" quotes for each switch target, from live Stripe
      // invoice previews of the exact swap the switch endpoint runs.
      // Only meaningful for an active sub (trialing charges nothing now;
      // past-due must settle before switching makes sense). Best-effort:
      // any preview failure leaves that plan unquoted.
      const itemId = sub.items.data[0]?.id;
      if (sub.status === "active" && itemId) {
        const currentPriceId = sub.items.data[0]?.price?.id;
        for (const plan of MANAGEABLE_PLANS) {
          const targetPriceId = priceIdForPlan(plan, process.env);
          if (!targetPriceId || targetPriceId === currentPriceId) continue;
          try {
            const preview = await stripe().invoices.createPreview({
              subscription: dbSub.stripeSubscriptionId,
              subscription_details: {
                items: [{ id: itemId, price: targetPriceId }],
                proration_behavior: "create_prorations",
              },
            });
            dueTodayByPlan[plan] = preview.amount_due;
          } catch {
            dueTodayByPlan[plan] = null;
          }
        }
      }
    } catch {
      stripeSub = null;
    }
  }

  return NextResponse.json(
    assembleManageView({ dbSub, stripeSub, env: process.env, currentPriceLabel, dueTodayByPlan }),
  );
}
