import { NextRequest, NextResponse } from "next/server";
import { runCardExpiryNotices } from "@/lib/billing/card-expiry";

export const runtime = "nodejs";

/**
 * Card-expiry cron (monthly): warn subscribers whose Stripe card
 * expires during the next calendar month, while updating it is still
 * a choice rather than an emergency. CRON_SECRET Bearer <redacted> —
 * same house pattern as the other crons.
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const authHeader = req.headers.get("authorization") ?? "";
    if (authHeader !== `Bearer ${secret}`) {
      return NextResponse.json({ ok: false }, { status: 401 });
    }
  }
  try {
    const result = await runCardExpiryNotices(new Date());
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    console.error("[cron/card-expiry] failed:", err);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
