import { NextRequest, NextResponse } from "next/server";
import { sendDailyBriefs } from "@/lib/vip/brief";

export const runtime = "nodejs";
export const maxDuration = 300;

/**
 * Vercel Cron (daily): email the personal brief to VIP members who
 * opted in. The sender enforces the ≤1-per-20h watermark itself, so
 * the schedule is a trigger, not the guarantee. Same CRON_SECRET
 * Bearer pattern as the other house crons.
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get("authorization") ?? "";
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ ok: false }, { status: 401 });
    }
  }
  const summary = await sendDailyBriefs();
  return NextResponse.json({ ok: true, ...summary });
}
