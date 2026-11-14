// Campaign tick: sends the next batch (≤10 per campaign) for every
// campaign in "sending" status. Two authorized callers:
//   1. The 5-minute Vercel cron, presenting the CAMPAIGN_TICK_SECRET
//      env var in the x-campaign-tick-secret header.
//   2. An admin session (the panel's "Send next batch now" button).
// Fail-closed: when CAMPAIGN_TICK_SECRET is not configured, the secret
// path cannot authorize and the tick only runs for an admin session —
// it never sends on an unauthenticated request.
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/affiliate/admin";
import { runCampaignTick } from "@/lib/campaigns/tick";

export const runtime = "nodejs";
export const maxDuration = 60;

async function handle(req: Request) {
  const secret = process.env.CAMPAIGN_TICK_SECRET;
  const presented = req.headers.get("x-campaign-tick-secret");
  if (presented !== null) {
    if (!secret) {
      return NextResponse.json(
        { error: "CAMPAIGN_TICK_SECRET is not configured on the server" },
        { status: 503 },
      );
    }
    if (presented !== secret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  } else {
    try {
      await requireAdmin();
    } catch {
      if (!secret) {
        return NextResponse.json(
          { error: "CAMPAIGN_TICK_SECRET is not configured on the server" },
          { status: 503 },
        );
      }
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const summary = await runCampaignTick();
  return NextResponse.json({ ok: true, ...summary });
}

export async function GET(req: Request) {
  return handle(req);
}

export async function POST(req: Request) {
  return handle(req);
}
