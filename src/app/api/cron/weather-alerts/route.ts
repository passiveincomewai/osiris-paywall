import { NextRequest, NextResponse } from "next/server";
import { runWeatherAlerts } from "@/lib/lifecycle/weather-alerts";

export const runtime = "nodejs";

/**
 * Weather-alerts cron (hourly :25): National Weather Service Severe /
 * Extreme warnings for the places users saved cameras at
 * (lib/lifecycle/weather-alerts). CRON_SECRET Bearer <redacted> — same
 * house pattern as the other crons.
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
    const result = await runWeatherAlerts();
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    console.error("[cron/weather-alerts] failed:", err);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
