import { NextRequest, NextResponse } from "next/server";
import { runSeasonReview } from "@/lib/ski/season-review-email";

export const runtime = "nodejs";

/**
 * Vercel Cron (monthly, 1st 15:00 UTC): season-in-review emails to
 * Powder Pass members who track a pass (lib/ski/season-review-email) —
 * their own logged days and pass maths, once per user per month.
 * Auth is the house cron pattern: CRON_SECRET as a Bearer <redacted>;
 * ?dryRun=1 computes without sending.
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get("authorization") ?? "";
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ ok: false }, { status: 401 });
    }
  }
  const dryRun = req.nextUrl.searchParams.get("dryRun") === "1";
  const summary = await runSeasonReview({ dryRun });
  return NextResponse.json({ ok: true, ...summary });
}
