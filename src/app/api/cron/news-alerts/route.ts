import { NextRequest, NextResponse } from "next/server";
import { runNewsAlerts } from "@/lib/lifecycle/news-alerts";

export const runtime = "nodejs";

/**
 * News-alerts cron (hourly :15): same-hour alerts to the verified
 * newsletter list for M7.0+ earthquakes and newly opened EONET volcano
 * events only (lib/lifecycle/news-alerts). CRON_SECRET Bearer <redacted> —
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
    const result = await runNewsAlerts();
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    console.error("[cron/news-alerts] failed:", err);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
