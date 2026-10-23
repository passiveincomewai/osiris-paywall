// ── Lifecycle campaign command ───────────────────────────────────────
// The owner-facing half of the campaign engine (lib/lifecycle/campaigns):
//
//   prepare  Mints the Stripe coupon + promotion code (capped, expiring),
//            builds the recipient segment, drafts the email, and writes a
//            reviewable draft JSON. SENDS NOTHING.
//              --slug halloween-2026 --pct 50 --max 200 \
//              --expires 2026-11-01T05:59:00Z --audience free_users \
//              --headline "Halloween: 50% off Pro" --body "..." \
//              [--cta-label "See the offer"] [--cta-path /pricing] \
//              --out draft.json
//
//   send     Sends a prepared draft — the owner's approval step. Refuses
//            to run without --confirm. Every recipient is re-checked
//            against the guards at send time and every send is logged.
//              --draft draft.json --confirm
//
// Run bundled like the other ops tools:
//   npx esbuild tools/lifecycle-campaign.ts --bundle --platform=node \
//     --outfile=/tmp/lifecycle-campaign.mjs --external:@prisma/client --external:stripe
//   node /tmp/lifecycle-campaign.mjs prepare ... / send ...

import { readFile, writeFile } from "node:fs/promises";
import {
  prepareCampaign,
  sendCampaign,
  type CampaignAudience,
  type CampaignDraft,
} from "../src/lib/lifecycle/campaigns";

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}
function required(name: string): string {
  const v = arg(name);
  if (!v) {
    console.error(`missing --${name}`);
    process.exit(2);
  }
  return v;
}

async function main() {
  const cmd = process.argv[2];
  if (cmd === "prepare") {
    const draft = await prepareCampaign({
      slug: required("slug"),
      pct: Number(required("pct")),
      maxRedemptions: Number(required("max")),
      expiresAt: new Date(required("expires")),
      headline: required("headline"),
      bodyText: required("body"),
      ctaLabel: arg("cta-label"),
      ctaPath: arg("cta-path"),
      audience: required("audience") as CampaignAudience,
    });
    const out = required("out");
    await writeFile(out, JSON.stringify(draft, null, 2), "utf8");
    console.log(
      `draft written to ${out}: code ${draft.code}, segment ${draft.segmentSize} recipient(s), ` +
        `stripe promo ${draft.stripePromotionCodeId ?? "NOT CREATED (no STRIPE_SECRET_KEY)"}. Nothing sent.`,
    );
    return;
  }
  if (cmd === "send") {
    if (!process.argv.includes("--confirm")) {
      console.error("refusing to send without --confirm (campaign sends are owner-approved)");
      process.exit(2);
    }
    const draft = JSON.parse(await readFile(required("draft"), "utf8")) as CampaignDraft;
    const summary = await sendCampaign(draft);
    console.log(
      `campaign ${draft.slug}: sent ${summary.sent}, skipped ${JSON.stringify(summary.skipped)}`,
    );
    return;
  }
  console.error("usage: lifecycle-campaign <prepare|send> [flags]");
  process.exit(2);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
