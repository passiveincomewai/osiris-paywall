import { NextRequest, NextResponse } from "next/server";
import { sendWeeklyDigest } from "@/lib/lifecycle/digest";

export const runtime = "nodejs";
export const maxDuration = 300;

/**
 * Vercel Cron (Mondays 15:00 UTC ≈ morning in Utah): the "In Case You
 * Missed It" weekly digest to verified newsletter subscribers. All
 * content is built from live data at send time (lib/lifecycle/digest)
 * and the issue simply does not send when no source has anything.
 * DigestSendLog makes each (subscriber, issue) pair send at most once,
 * so a retried cron run is harmless. ?dryRun=1 renders the issue and
 * counts eligible recipients without sending (still CRON_SECRET-gated —
 * the summary is derived from the real subscriber list).
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
  const summary = await sendWeeklyDigest({ dryRun });
  return NextResponse.json({ ok: true, ...summary, sampleHtml: undefined, sampleSubject: undefined });
}
