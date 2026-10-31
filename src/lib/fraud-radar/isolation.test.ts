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

describe("§14.3 isolation — Phase 3 care routes carry the flag gate", () => {
  it("every care page and the care search API check fraudRadarEnabled", () => {
    const careFiles = [
      "app/(en)/fraud-radar/care/page.tsx",
      "app/(en)/fraud-radar/care/medicare/page.tsx",
      "app/(en)/fraud-radar/care/medicare/[npi]/page.tsx",
      "app/(en)/fraud-radar/care/hcpcs/page.tsx",
      "app/(en)/fraud-radar/care/hcpcs/[code]/page.tsx",
      "app/(en)/fraud-radar/care/hospice/page.tsx",
      "app/(en)/fraud-radar/care/home-health/page.tsx",
      "app/api/fraud-radar/care/search/route.ts",
    ];
    for (const rel of careFiles) {
      const src = readFileSync(path.join(SRC, rel), "utf8");
      expect(src, rel).toContain("fraudRadarEnabled()");
    }
  });
});

describe("§14.3 isolation — Phase 4 grants routes carry the flag gate", () => {
  it("every grants page and the grants search API check fraudRadarEnabled", () => {
    const grantsFiles = [
      "app/(en)/fraud-radar/grants/page.tsx",
      "app/(en)/fraud-radar/grants/recipients/page.tsx",
      "app/(en)/fraud-radar/grants/recipients/[uei]/page.tsx",
      "app/(en)/fraud-radar/grants/aln/page.tsx",
      "app/(en)/fraud-radar/grants/aln/[aln]/page.tsx",
      "app/(en)/fraud-radar/grants/fac/page.tsx",
      "app/api/fraud-radar/grants/search/route.ts",
    ];
    for (const rel of grantsFiles) {
      const src = readFileSync(path.join(SRC, rel), "utf8");
      expect(src, rel).toContain("fraudRadarEnabled()");
    }
  });
});

describe("§14.3 isolation — Phase 6 signals routes carry the flag gate", () => {
  it("every signals page checks fraudRadarEnabled", () => {
    const signalsFiles = [
      "app/(en)/fraud-radar/signals/page.tsx",
      "app/(en)/fraud-radar/signals/methods/page.tsx",
      "app/(en)/fraud-radar/signals/rules/[ruleCode]/page.tsx",
    ];
    for (const rel of signalsFiles) {
      const src = readFileSync(path.join(SRC, rel), "utf8");
      expect(src, rel).toContain("fraudRadarEnabled()");
    }
  });

  it("the public path list adds exactly the two signals landings", () => {
    // The full list is pinned in flag.test.ts; here the B1 delta is
    // pinned against the Phase 4 list shape: rule detail pages and
    // the admin surface stay unlisted.
    const flagSrc = readFileSync(path.join(SRC, "lib/fraud-radar/flag.ts"), "utf8");
    expect(flagSrc).toContain('"/fraud-radar/signals"');
    expect(flagSrc).toContain('"/fraud-radar/signals/methods"');
    expect(flagSrc).not.toContain("/fraud-radar/signals/rules");
  });

  it("S-06 candidate data is read only behind the admin surface", () => {
    // The candidate queue artifact has exactly one reader
    // (getAdminCandidateQueue in signals-data.ts, whose callers are
    // admin payloads). No public signals page may reference it.
    const publicFiles = [
      "app/(en)/fraud-radar/signals/page.tsx",
      "app/(en)/fraud-radar/signals/methods/page.tsx",
      "app/(en)/fraud-radar/signals/rules/[ruleCode]/page.tsx",
    ];
    for (const rel of publicFiles) {
      const src = readFileSync(path.join(SRC, rel), "utf8");
      expect(src, rel).not.toContain("getAdminCandidateQueue");
      expect(src, rel).not.toContain("candidate-queue");
    }
  });
});

describe("§14.3 isolation — Phase 6 B2 profile sections + admin candidate queue", () => {
  it("the three existing profile pages wire the shared research-signals section", () => {
    const profileFiles = [
      "app/(en)/fraud-radar/healthcare/providers/[npi]/page.tsx",
      "app/(en)/fraud-radar/care/medicare/[npi]/page.tsx",
      "app/(en)/fraud-radar/grants/recipients/[uei]/page.tsx",
    ];
    for (const rel of profileFiles) {
      const src = readFileSync(path.join(SRC, rel), "utf8");
      expect(src, rel).toContain("ResearchSignalsSection");
    }
    // The grants profile additionally wires the cross engine,
    // read by the recipient's UEI as the artifacts key it.
    const grantsSrc = readFileSync(
      path.join(SRC, "app/(en)/fraud-radar/grants/recipients/[uei]/page.tsx"),
      "utf8",
    );
    expect(grantsSrc).toContain('engine: "cross"');
    expect(grantsSrc).toContain('engine: "grants"');
  });

  it("S-06 candidate data is read only behind the admin surface (extended)", () => {
    // Across EVERY Fraud Radar source file, the admin queue reader
    // and its artifact path may be referenced only by the data
    // layer that defines them and the admin page that renders the
    // queue. In particular no profile page and no shared component
    // may touch them — the B2 negative case, enforced statically
    // alongside the render tests.
    const offenders: string[] = [];
    for (const f of fraudSourceFiles()) {
      const rel = path.relative(SRC, f);
      if (
        rel === "lib/fraud-radar/signals-data.ts" ||
        rel === "app/(en)/admin/fraud-radar/page.tsx"
      ) {
        continue;
      }
      const src = readFileSync(f, "utf8");
      if (
        src.includes("getAdminCandidateQueue") ||
        src.includes("candidate-queue.json")
      ) {
        offenders.push(rel);
      }
    }
    expect(offenders).toEqual([]);
    // And the admin page is the one place the queue is rendered.
    const adminSrc = readFileSync(
      path.join(SRC, "app/(en)/admin/fraud-radar/page.tsx"),
      "utf8",
    );
    expect(adminSrc).toContain("getAdminCandidateQueue");
    expect(adminSrc).toContain("CANDIDATE_STATUS");
  });

  it("B2 adds no public paths — the flag list is unchanged by the payload", () => {
    const flagSrc = readFileSync(path.join(SRC, "lib/fraud-radar/flag.ts"), "utf8");
    // Profile detail pages were already routed before B2 and stay
    // out of the sitemap list; the admin queue is not a public
    // path at all.
    expect(flagSrc).not.toContain("candidate");
    expect(flagSrc).not.toContain("/admin");
    expect(flagSrc).not.toContain("recipients/[");
    expect(flagSrc).not.toContain("providers/[");
  });
});

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
