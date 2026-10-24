// GET /api/account/payment-methods — the caller's Stripe cards.
// Card data lives only in Stripe; we list what Stripe reports for the
// customer's id from their Subscription row. The subscription's
// default payment method is marked DEFAULT; any other card is the
// backup (item 22).
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { stripe } from "@/lib/stripe";

export const runtime = "nodejs";

export async function GET() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const sub = await db.subscription.findUnique({
    where: { userId },
    select: { stripeCustomerId: true, stripeSubscriptionId: true },
  });
  if (!sub) return NextResponse.json({ methods: [] });
  try {
    const s = stripe();
    const [list, stripeSub] = await Promise.all([
      s.paymentMethods.list({ customer: sub.stripeCustomerId, type: "card", limit: 10 }),
      s.subscriptions.retrieve(sub.stripeSubscriptionId).catch(() => null),
    ]);
    const defaultId =
      (typeof stripeSub?.default_payment_method === "string"
        ? stripeSub.default_payment_method
        : stripeSub?.default_payment_method?.id) ?? null;
    return NextResponse.json({
      methods: list.data.map((pm) => ({
        id: pm.id,
        brand: pm.card?.brand ?? "card",
        last4: pm.card?.last4 ?? "????",
        expMonth: pm.card?.exp_month ?? 0,
        expYear: pm.card?.exp_year ?? 0,
        isDefault: pm.id === defaultId,
      })),
    });
  } catch (err) {
    console.error("[payment-methods] list failed:", err);
    return NextResponse.json({ error: "Couldn't load payment methods." }, { status: 502 });
  }
}
