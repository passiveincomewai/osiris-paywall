// GET/POST /api/affiliate/payouts — request a payout from available balance.
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSettings } from "@/lib/affiliate/settings";
import { releaseMaturedCommissions } from "@/lib/affiliate/commissions";
import { normalizeVenmoHandle } from "@/lib/affiliate/venmo";
import { notifyPayoutRequested } from "@/lib/affiliate/payouts";
import { audit } from "@/lib/affiliate/admin";
import { requireAffiliate, activeOnly } from "../_util";

export const runtime = "nodejs";

// Methods an affiliate can pick in the live flow today. "paypal" is NOT one
// of them anymore (Venmo replaced it 2026-10-30); historical payouts keep
// their PayPal label untouched.
const LIVE_METHODS = ["venmo", "manual", "stripe_connect"];

export async function POST(req: Request) {
  const { profile, error, userId } = await requireAffiliate();
  if (error) return error;
  const blocked = activeOnly(profile);
  if (blocked) return blocked;

  const settings = await getSettings();
  await releaseMaturedCommissions().catch(() => {});

  const available = await db.commission.findMany({
    where: { affiliateProfileId: profile.id, status: "available" },
    select: { id: true, amountCents: true },
  });
  const total = available.reduce((a, c) => a + c.amountCents, 0);
  // A personal threshold (set in the dashboard) raises — never lowers —
  // the program minimum the balance must clear.
  const effectiveMin = Math.max(settings.minPayoutCents, profile.payoutThresholdCents ?? 0);
  if (total < effectiveMin) {
    return NextResponse.json(
      {
        error: profile.payoutThresholdCents && profile.payoutThresholdCents > settings.minPayoutCents
          ? `Your personal payout threshold is $${(effectiveMin / 100).toFixed(2)} — your available balance hasn't reached it yet.`
          : `Minimum payout is $${(settings.minPayoutCents / 100).toFixed(2)}`,
        availableCents: total,
      },
      { status: 400 },
    );
  }

  const { payoutEmail, payoutMethod, venmoHandle } = (await req.json().catch(() => ({}))) as {
    payoutEmail?: string; payoutMethod?: string; venmoHandle?: string;
  };

  // Validate + stage profile updates for whatever the form sent.
  const profileUpdate: { payoutEmail?: string; payoutMethod?: string; venmoHandle?: string } = {};
  if (payoutEmail) profileUpdate.payoutEmail = payoutEmail;
  if (payoutMethod !== undefined) {
    if (payoutMethod === "paypal") {
      return NextResponse.json(
        { error: "We now pay out via Venmo — choose Venmo and add your Venmo handle to request your payout." },
        { status: 400 },
      );
    }
    if (!LIVE_METHODS.includes(payoutMethod)) {
      return NextResponse.json({ error: "Unknown payout method" }, { status: 400 });
    }
    profileUpdate.payoutMethod = payoutMethod;
  }
  let normalizedHandle: string | null = null;
  if (venmoHandle !== undefined && venmoHandle !== "") {
    normalizedHandle = normalizeVenmoHandle(venmoHandle);
    if (!normalizedHandle) {
      return NextResponse.json(
        { error: "That doesn't look like a Venmo handle — use 5–30 letters, numbers, underscores or hyphens (e.g. @your-name)." },
        { status: 400 },
      );
    }
    profileUpdate.venmoHandle = normalizedHandle;
  }
  if (Object.keys(profileUpdate).length) {
    await db.affiliateProfile.update({ where: { id: profile.id }, data: profileUpdate });
  }

  const method = payoutMethod ?? profile.payoutMethod ?? "manual";
  // A stored legacy PayPal method is never deleted, but new payouts can't
  // use it — prompt for Venmo details instead of paying out via PayPal.
  if (method === "paypal") {
    return NextResponse.json(
      { error: "We now pay out via Venmo — add your Venmo handle to request your payout." },
      { status: 400 },
    );
  }
  if (method === "venmo" && !(normalizedHandle ?? profile.venmoHandle)) {
    return NextResponse.json(
      { error: "Add your Venmo handle to request a payout." },
      { status: 400 },
    );
  }

  const payout = await db.payout.create({
    data: {
      affiliateProfileId: profile.id,
      amountCents: total,
      method,
      status: "requested",
    },
  });
  await db.commission.updateMany({
    where: { id: { in: available.map((c) => c.id) } },
    data: { status: "requested", payoutId: payout.id },
  });
  await audit("payout.requested", {
    actorUserId: userId, targetType: "Payout", targetId: payout.id,
    details: { amountCents: total, count: available.length },
  });

  // Owner alert + affiliate confirmation (best-effort; the request stands
  // even if email is briefly unavailable).
  await notifyPayoutRequested(payout.id).catch((e) => {
    console.error("[payouts] request notification failed:", e);
  });

  return NextResponse.json({ payout: { id: payout.id, amountCents: total, status: payout.status } });
}
