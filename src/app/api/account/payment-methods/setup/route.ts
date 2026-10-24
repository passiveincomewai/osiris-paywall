// POST /api/account/payment-methods/setup — open a Stripe-hosted
// Checkout session in setup mode so the user can add a (backup) card.
// Fully hosted: card numbers never touch WorldEye (item 22). Returns
// { url } for the client to redirect to.
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { appUrl, stripe } from "@/lib/stripe";

export const runtime = "nodejs";

export async function POST() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const sub = await db.subscription.findUnique({
    where: { userId },
    select: { stripeCustomerId: true },
  });
  if (!sub) {
    return NextResponse.json(
      { error: "No billing account yet — a payment method is created at your first checkout." },
      { status: 409 },
    );
  }
  try {
    const checkout = await stripe().checkout.sessions.create({
      mode: "setup",
      customer: sub.stripeCustomerId,
      payment_method_types: ["card"],
      success_url: `${appUrl()}/settings?cardSetup=done`,
      cancel_url: `${appUrl()}/settings?cardSetup=cancelled`,
    });
    if (!checkout.url) throw new Error("Stripe returned no checkout URL");
    return NextResponse.json({ url: checkout.url });
  } catch (err) {
    console.error("[payment-methods/setup] failed:", err);
    return NextResponse.json({ error: "Couldn't open the secure card form." }, { status: 502 });
  }
}
