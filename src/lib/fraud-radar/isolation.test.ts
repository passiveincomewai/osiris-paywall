import { describe, it, expect, vi, afterEach } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * §14.3 / §35 ISOLATION suite (Phase 2 form).
 *
 * The live form of §14.3 is a production flag flip (on → verify → off
 * → verify §13.3 + the §14.2 smoke list). That flip is an env change
 * owned by the launch gate; this suite is its automated, always-on
 * counterpart:
 *  1. With the flag off, the generated sitemap contains ZERO
 *     fraud-radar URLs (the sitemap consumes fraudRadarPublicPaths).
 *  2. No Fraud Radar module depends on the main product's billing,
 *     Stripe, or subscription code, and none reads or writes the main
 *     `Subscription` model — billing non-interference (§35) as a
 *     static, continuously enforced fact rather than a hope.
 * Route-level flag-off 404s are pinned by flag.test.ts and the page /
 * API tests alongside this file.
 */

const SRC = fileURLToPath(new URL("../../", import.meta.url));

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("§14.3 isolation — flag off", () => {
  it("the sitemap's only Fraud Radar input is the flag-gated path list", () => {
    // Executing the full sitemap generator in a unit test is heavy
    // (it reads the whole catalogue and fetches live incident data);
    // the isolation property decomposes exactly: (a) the sitemap
    // spreads fraudRadarPublicPaths() and nothing else fraud-shaped,
    // and (b) that list is [] while the flag is off (pinned in
    // flag.test.ts). Together they prove a dark Fraud Radar adds no
    // sitemap URLs.
    const sitemapSrc = readFileSync(path.join(SRC, "app/sitemap.ts"), "utf8");
    expect(sitemapSrc).toContain("fraudRadarPublicPaths()");
    const fraudLines = sitemapSrc
      .split("\n")
      .filter((l) => !/^\s*(\/\/|\*)/.test(l))
      .filter((l) => /fraud/i.test(l) && !/fraudRadarPublicPaths/.test(l));
    expect(fraudLines).toEqual([]);
  });
});

const FRAUD_DIRS = [
  "lib/fraud-radar",
  "app/(en)/fraud-radar",
  "app/(en)/admin/fraud-radar",
  "app/api/fraud-radar",
  "components/fraud-radar",
];

function fraudSourceFiles(): string[] {
  const out: string[] = [];
  const walk = (dir: string) => {
    for (const name of readdirSync(dir)) {
      const p = path.join(dir, name);
      if (statSync(p).isDirectory()) walk(p);
      else if (
        /\.(ts|tsx)$/.test(name) &&
        !/\.test\.(ts|tsx)$/.test(name) &&
        !name.includes("__fixtures__")
      ) {
        out.push(p);
      }
    }
  };
  for (const d of FRAUD_DIRS) {
    const abs = path.join(SRC, d);
    try {
      walk(abs);
    } catch {
      /* directory may not exist yet in a partial tree */
    }
  }
  return out;
}

describe("§35 billing non-interference — static dependency guard", () => {
  const files = fraudSourceFiles();

  it("scans a non-trivial Fraud Radar surface", () => {
    expect(files.length).toBeGreaterThan(10);
  });

  it("no Fraud Radar module imports billing, Stripe, or subscription code", () => {
    const forbidden =
      /from\s+["']@\/lib\/billing|from\s+["']stripe["']|from\s+["']@\/lib\/stripe|@\/lib\/billing\//;
    const offenders = files.filter((f) => forbidden.test(readFileSync(f, "utf8")));
    expect(offenders).toEqual([]);
  });

  it("no Fraud Radar module touches the main Subscription model", () => {
    const forbidden = /db\.subscription\b|\.frSubscription\b|model Subscription/;
    const offenders = files.filter((f) => forbidden.test(readFileSync(f, "utf8")));
    expect(offenders).toEqual([]);
  });
});
