import { NextRequest, NextResponse } from "next/server";
import { runApiQuotaAlerts } from "@/lib/developer/quota-alerts";

export const runtime = "nodejs";

/**
 * API-quota cron (hourly): warn a public key's owner once per key per
 * UTC day when usage crosses ~80% of their tier's daily limit.
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
    const result = await runApiQuotaAlerts(new Date());
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    console.error("[cron/api-quota-alerts] failed:", err);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
