import { NextRequest, NextResponse } from "next/server";
import { runAccountDigest } from "@/lib/lifecycle/account-digest";

export const runtime = "nodejs";

/**
 * Account-digest cron (Mondays 16:00 UTC, an hour after the newsletter
 * edition): the personalised weekly digest for users who enabled it in
 * Settings (lib/lifecycle/account-digest). CRON_SECRET Bearer <redacted> —
 * same house pattern as the other crons. ?dryRun=1 computes only.
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const authHeader = req.headers.get("authorization") ?? "";
    if (authHeader !== `Bearer ${secret}`) {
      return NextResponse.json({ ok: false }, { status: 401 });
    }
  }
  const dryRun = req.nextUrl.searchParams.get("dryRun") === "1";
  try {
    const result = await runAccountDigest({ dryRun });
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    console.error("[cron/account-digest] failed:", err);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
