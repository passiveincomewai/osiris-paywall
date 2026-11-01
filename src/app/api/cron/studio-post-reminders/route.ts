import { NextRequest, NextResponse } from "next/server";
import { runStudioPostReminders } from "@/lib/studio/post-reminders";

export const runtime = "nodejs";

/**
 * Studio content-calendar reminders: delivers due posting reminders
 * (in-dashboard notification + email, once per offset) and flips
 * elapsed posts to reminder_due. CRON_SECRET Bearer — same house
 * pattern as the other crons. Wire an hourly schedule in vercel.json
 * or the cron host alongside the existing Studio jobs.
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
    const result = await runStudioPostReminders(new Date());
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    console.error("[cron/studio-post-reminders] failed:", err);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
