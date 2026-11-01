/**
 * Scripted admin path for Fraud Radar comps (PHASE11 §3.6,
 * SHV-11: module only, NO UI). Usage:
 *   npx tsx scripts/fraud-radar-comp.ts grant <userId> <plus|pro|teams> <source> <months> <grantedBy> [reason]
 *   npx tsx scripts/fraud-radar-comp.ts revoke <userId>
 * A comp never touches a paid FR row and never touches any
 * WorldEye Subscription row.
 */
import { grantFraudRadarComp, revokeFraudRadarComp, FR_COMP_SOURCES, type FrCompSource } from "../src/lib/fraud-radar/billing/comp";
import type { FrPlanKey } from "../src/lib/fraud-radar/billing/plans";

async function main() {
  const [cmd, userId, tier, source, months, grantedBy, reason] = process.argv.slice(2);
  if (cmd === "grant") {
    if (!userId || !["plus", "pro", "teams"].includes(tier ?? "") ||
        !FR_COMP_SOURCES.includes(source as FrCompSource) || !grantedBy) {
      throw new Error("usage: grant <userId> <plus|pro|teams> <owner|support|partner|press|internal> <months> <grantedBy> [reason]");
    }
    const r = await grantFraudRadarComp(userId, tier as FrPlanKey, source as FrCompSource, Number(months ?? 12) || 12, grantedBy, reason);
    console.log(JSON.stringify(r));
  } else if (cmd === "revoke") {
    if (!userId) throw new Error("usage: revoke <userId>");
    console.log(JSON.stringify(await revokeFraudRadarComp(userId)));
  } else {
    throw new Error("usage: fraud-radar-comp.ts grant|revoke ...");
  }
}
main().catch((e) => { console.error(e); process.exit(1); });
