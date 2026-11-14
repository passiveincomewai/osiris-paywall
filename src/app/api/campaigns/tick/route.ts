// Campaign tick: sends the next batch (≤10 per campaign) for every
// campaign in "sending" status. Authorized callers:
//   1. A scheduler presenting CAMPAIGN_TICK_SECRET — either in the
//      x-campaign-tick-secret header or as an Authorization Bearer.
//   2. Vercel's own cron (vercel.json, every 5 minutes), which sends
//      Authorization: Bearer <CRON_SECRET> — it cannot attach custom
//      headers, so the Bearer path is what lets it authenticate.
//   3. An admin session (the panel's "Send next batch now" button).
// Fail-closed: when neither secret is configured, an unauthenticated
// request gets the 503 config error; a wrong credential gets a 401 —
// the tick never sends on an unauthenticated request.
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/affiliate/admin";
import { runCampaignTick } from "@/lib/campaigns/tick";
import {
  tickCredentialStatus,
  tickSecretsConfigured,
} from "@/lib/campaigns/tick-auth";

export const runtime = "nodejs";
export const maxDuration = 60;

const NOT_CONFIGURED = {
  error: "CAMPAIGN_TICK_SECRET is not configured on the server",
};

async function handle(req: Request) {
  const secrets = {
    tickSecret: process.env.CAMPAIGN_TICK_SECRET,
    cronSecret: process.env.CRON_SECRET,
  };
  const credential = tickCredentialStatus(req.headers, secrets);

  if (credential === "invalid") {
    if (!tickSecretsConfigured(secrets)) {
      return NextResponse.json(NOT_CONFIGURED, { status: 503 });
    }
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (credential === "none") {
    try {
      await requireAdmin();
    } catch {
      if (!tickSecretsConfigured(secrets)) {
        return NextResponse.json(NOT_CONFIGURED, { status: 503 });
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
