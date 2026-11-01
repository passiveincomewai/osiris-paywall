import { NextRequest, NextResponse } from "next/server";
import { runGiftReminders } from "@/lib/billing/gift-reminders";

export const runtime = "nodejs";

/**
 * Gift-reminders cron: one reminder to the buyer when a paid gift is
 * still unredeemed inside its final week. No-ops while
 * GIFT_SUBSCRIPTIONS_ENABLED is off (dark with the feature).
 * CRON_SECRET Bearer <redacted> — same house pattern as the other crons.
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
    const result = await runGiftReminders(new Date());
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    console.error("[cron/gift-reminders] failed:", err);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
