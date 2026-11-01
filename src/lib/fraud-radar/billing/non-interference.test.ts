import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * §7.3.1 billing non-interference suite (SHV-11 applicable half:
 * P11-C/D webhook+checkout fixtures are deferred with those
 * payloads). Pins: FR code never imports house billing, never
 * references the house Subscription model, plan-tier.ts carries
 * no FR price id, and enumerating surfaces carry no FR offer.
 */
const SRC = fileURLToPath(new URL("../../../", import.meta.url));

function walk(d: string): string[] {
  return readdirSync(d, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? walk(path.join(d, e.name)) : e.name.endsWith(".ts") || e.name.endsWith(".tsx") ? [path.join(d, e.name)] : []);
}

describe("§7.3.1 non-interference (SHV-11)", () => {
  it("no fraud-radar module imports lib/billing, lib/stripe or lib/pro/comp", () => {
    for (const f of walk(path.join(SRC, "lib/fraud-radar"))) {
      const s = readFileSync(f, "utf8");
      const rel = path.relative(SRC, f);
      if (rel.endsWith("non-interference.test.ts") || rel.endsWith("isolation.test.ts")) continue;
      expect(s, rel).not.toMatch(/@\/lib\/billing\//);
      expect(s, rel).not.toMatch(/@\/lib\/stripe/);
      expect(s, rel).not.toMatch(/@\/lib\/pro\/comp/);
    }
  });
  it("billing modules never touch the house Subscription model", () => {
    for (const f of walk(path.join(SRC, "lib/fraud-radar/billing"))) {
      if (f.endsWith(".test.ts")) continue;
      const s = readFileSync(f, "utf8");
      expect(s, f).not.toMatch(/db\.subscription\b/);
      expect(s, f).not.toMatch(/\.fraudRadarSubscription\.(delete|deleteMany)/);
    }
    // comp upsert is the one sanctioned grant write, on the FR
    // table only; the one FR update (comp revoke) is decision-gated.
    const comp = readFileSync(path.join(SRC, "lib/fraud-radar/billing/comp.ts"), "utf8");
    expect(comp).toContain("fraudRadarSubscription.upsert");
    expect(comp).toContain("frCompRevokeDecision(existing)");
  });
  it("plan-tier.ts and pricing surfaces carry no Fraud Radar offer/price id", () => {
    const pt = readFileSync(path.join(SRC, "lib/plan-tier.ts"), "utf8");
    expect(pt).not.toMatch(/FRAUD_RADAR|fraud-radar|FraudRadar/);
    const plans = readFileSync(path.join(SRC, "lib/fraud-radar/billing/plans.ts"), "utf8");
    expect(plans).not.toMatch(/price_[A-Za-z0-9]{8,}/); // no invented Stripe price ids
  });
  it("usage ledger module exposes no update/delete path (append-only)", () => {
    const u = readFileSync(path.join(SRC, "lib/fraud-radar/billing/usage.ts"), "utf8");
    expect(u).not.toMatch(/frUsageLedger\.(update|updateMany|delete|deleteMany)/);
  });
});
