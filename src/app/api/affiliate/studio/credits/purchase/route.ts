// POST /api/affiliate/studio/credits/purchase — start a Stripe Checkout
// (one-time payment mode) for a Studio credit pack. The pack's Stripe
// price id comes from its env slot (see CREDIT_PACKS in credits-config);
// a pack without a configured price id is unavailable, never a dead
// checkout. Credits land via the Stripe webhook (reason "pack_purchase",
// idempotent on the checkout session id) — never in this route, so a
// buyer who closes the tab mid-payment is still credited exactly once
// when the payment completes.
import { NextResponse } from "next/server";
import { stripe, appUrl } from "@/lib/stripe";
import { getCreditConfig } from "@/lib/studio/credits-settings";
import { requireStudioAccess } from "../../../_util";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const { profile, userId, error } = await requireStudioAccess();
  if (error || !profile || !userId) {
    return error ?? NextResponse.json({ error: "Not an affiliate" }, { status: 404 });
  }

  const body = (await req.json().catch(() => ({}))) as { packId?: unknown };
  const packId = typeof body.packId === "string" ? body.packId : "";

  const config = await getCreditConfig();
  const pack = config.creditPacks.find((p) => p.id === packId);
  if (!pack) {
    return NextResponse.json({ error: "Unknown credit pack" }, { status: 400 });
  }

  const priceId = process.env[pack.priceEnv];
  if (!priceId) {
    return NextResponse.json(
      { error: "pack_unavailable", message: "This pack isn't on sale yet — check back soon." },
      { status: 503 },
    );
  }

  const session = await stripe().checkout.sessions.create({
    mode: "payment",
    line_items: [{ price: priceId, quantity: 1 }],
    client_reference_id: userId,
    // Read by the webhook to credit the pack. The credit amount is
    // resolved server-side from the pack id — never from client input.
    metadata: {
      kind: "studio_credit_pack",
      packId: pack.id,
      profileId: profile.id,
      userId,
    },
    success_url: `${appUrl()}/affiliates/studio/credits?pack=success`,
    cancel_url: `${appUrl()}/affiliates/studio/credits?pack=cancelled`,
  });

  return NextResponse.json({ url: session.url });
}
