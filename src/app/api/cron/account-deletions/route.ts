import { NextRequest, NextResponse } from "next/server";
import { processDueDeletions } from "@/lib/account/deletion";

export const runtime = "nodejs";

/**
 * Vercel Cron (daily): hard-delete accounts whose 14-day deletion
 * grace period has elapsed (item 21). House cron pattern: CRON_SECRET
 * as a Bearer token when set.
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get("authorization") ?? "";
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ ok: false }, { status: 401 });
    }
  }
  const result = await processDueDeletions();
  return NextResponse.json({ ok: true, ...result });
}
