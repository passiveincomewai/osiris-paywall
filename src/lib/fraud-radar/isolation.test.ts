import { describe, it, expect, vi, afterEach } from "vitest";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
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
        rel === "app/(en)/admin/fraud-radar/page.tsx" ||
        // Phase 8 §1.3 rule 4 (added by P7-D, 2026-10-31): the
        // case lead-capture module is the second sanctioned
        // reader — its candidate path (pinCandidateLeadAsAdmin)
        // refuses non-admins in code, and the public capture
        // path rejects candidate pairs outright. No public
        // surface reads the queue through it.
        rel === "lib/fraud-radar/cases/leads.ts"
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

describe("§14.3 isolation — Phase 7 investigator UI (P7-C)", () => {
  it("the investigator page carries the flag gate", () => {
    const src = readFileSync(
      path.join(SRC, "app/(en)/fraud-radar/investigator/page.tsx"),
      "utf8",
    );
    expect(src).toContain("fraudRadarEnabled()");
  });

  it("the investigator is never a public path — flag.ts does not list it", () => {
    const flagSrc = readFileSync(path.join(SRC, "lib/fraud-radar/flag.ts"), "utf8");
    expect(flagSrc).not.toContain("/fraud-radar/investigator");
  });

  it("the investigator UI shares no code with OI (PHASE7 §1.2 separation)", () => {
    const uiFiles = [
      "app/(en)/fraud-radar/investigator/page.tsx",
      "app/(en)/fraud-radar/investigator/InvestigatorClient.tsx",
    ];
    for (const rel of uiFiles) {
      const src = readFileSync(path.join(SRC, rel), "utf8");
      expect(src, rel).not.toMatch(/from\s+["']@\/lib\/oi\//);
      expect(src, rel).not.toMatch(/from\s+["']@\/components\/oi\//);
    }
  });
});

describe("§14.3 isolation — Phase 7 investigator completion (P7-D)", () => {
  const INVESTIGATOR_API_ROUTES = [
    "app/api/fraud-radar/investigator/conversations/route.ts",
    "app/api/fraud-radar/investigator/conversations/[id]/route.ts",
    "app/api/fraud-radar/investigator/conversations/[id]/messages/route.ts",
    "app/api/fraud-radar/investigator/conversations/[id]/turns/[turnId]/events/route.ts",
    "app/api/fraud-radar/investigator/usage/route.ts",
  ];

  it("every investigator API route carries the flag gate (flag-off 404 list)", () => {
    for (const rel of INVESTIGATOR_API_ROUTES) {
      const src = readFileSync(path.join(SRC, rel), "utf8");
      expect(src, rel).toContain("fraudRadarEnabled()");
    }
  });

  it("investigator ↔ OI disjointness holds in BOTH directions (PHASE7 §1.2)", () => {
    // No Fraud Radar source imports OI code…
    const frOffenders = fraudSourceFiles().filter((f) =>
      /from\s+["']@\/lib\/oi\/|from\s+["']@\/components\/oi\//.test(
        readFileSync(f, "utf8"),
      ),
    );
    expect(frOffenders).toEqual([]);
    // …and no OI source imports Fraud Radar code.
    const oiDir = path.join(SRC, "lib/oi");
    const oiOffenders: string[] = [];
    const walk = (dir: string) => {
      for (const name of readdirSync(dir)) {
        const p = path.join(dir, name);
        if (statSync(p).isDirectory()) walk(p);
        else if (
          /\.(ts|tsx)$/.test(name) &&
          !/\.test\.(ts|tsx)$/.test(name) &&
          /fraud-radar/.test(readFileSync(p, "utf8"))
        ) {
          oiOffenders.push(path.relative(SRC, p));
        }
      }
    };
    walk(oiDir);
    expect(oiOffenders).toEqual([]);
  });

  it("the investigator layer imports no billing or Stripe code (explicit pin)", () => {
    const invDir = path.join(SRC, "lib/fraud-radar/investigator");
    const offenders: string[] = [];
    for (const name of readdirSync(invDir)) {
      if (!/\.ts$/.test(name) || /\.test\.ts$/.test(name)) continue;
      const src = readFileSync(path.join(invDir, name), "utf8");
      if (/from\s+["']@\/lib\/billing|from\s+["']stripe["']|from\s+["']@\/lib\/stripe/.test(src)) {
        offenders.push(name);
      }
    }
    expect(offenders).toEqual([]);
  });

  it("the Phase 8 candidate-queue reader stays admin-gated in code", () => {
    // Companion to the B2 exception above: leads.ts may reference
    // the queue only because its candidate path refuses
    // non-admins. If that refusal ever disappears, this pin —
    // not just the B2 list — goes red.
    const leadsSrc = readFileSync(
      path.join(SRC, "lib/fraud-radar/cases/leads.ts"),
      "utf8",
    );
    expect(leadsSrc).toContain("pinCandidateLeadAsAdmin");
    expect(leadsSrc).toContain("candidate_admin_only");
    expect(leadsSrc).toContain("if (!args.isAdmin)");
  });

  it("admin investigator usage is aggregates-only: no conversation text is read", () => {
    // The read model selects no text column and exposes no
    // message-reading helper…
    const usageSrc = readFileSync(
      path.join(SRC, "lib/fraud-radar/investigator/admin-usage.ts"),
      "utf8",
    );
    expect(usageSrc).not.toMatch(/content\s*:\s*true/);
    expect(usageSrc).not.toContain("listMessages");
    expect(usageSrc).not.toContain("getMessage");
    // …and the admin page renders that section from the aggregate
    // read model alone, under its aggregates-only framing.
    const adminSrc = readFileSync(
      path.join(SRC, "app/(en)/admin/fraud-radar/page.tsx"),
      "utf8",
    );
    expect(adminSrc).toContain("getInvestigatorAdminUsage");
    expect(adminSrc).toContain("never shows conversation content");
  });
});

describe("§14.3 isolation — Phase 8 evidence vault (P8-B)", () => {
  const vaultRouteFiles = [
    "app/api/fraud-radar/cases/[id]/evidence/route.ts",
    "app/api/fraud-radar/cases/[id]/evidence/initiate/route.ts",
    "app/api/fraud-radar/cases/[id]/evidence/artifact/route.ts",
    "app/api/fraud-radar/cases/evidence-upload-token/route.ts",
    "app/api/fraud-radar/cases/[id]/evidence/[evidenceId]/route.ts",
    "app/api/fraud-radar/cases/[id]/evidence/[evidenceId]/complete/route.ts",
    "app/api/fraud-radar/cases/[id]/evidence/[evidenceId]/download/route.ts",
    "app/api/fraud-radar/cases/[id]/evidence/[evidenceId]/extracted/route.ts",
    "app/api/fraud-radar/cases/[id]/evidence/[evidenceId]/verify/route.ts",
    "app/api/fraud-radar/cases/[id]/evidence/[evidenceId]/process/route.ts",
  ];

  it("every vault API route carries the flag gate", () => {
    for (const rel of vaultRouteFiles) {
      const src = readFileSync(path.join(SRC, rel), "utf8");
      expect(src, rel).toContain("fraudRadarEnabled()");
    }
  });

  it("no vault route or module ever emits a Blob URL (no redirect, no downloadUrl, no blob.url)", () => {
    for (const rel of vaultRouteFiles) {
      const src = readFileSync(path.join(SRC, rel), "utf8");
      expect(src, rel).not.toContain("downloadUrl");
      expect(src, rel).not.toContain("blob.vercel-storage.com");
      expect(src, rel).not.toMatch(/NextResponse\.redirect/);
    }
    const helpersSrc = readFileSync(
      path.join(SRC, "lib/fraud-radar/cases/route-helpers.ts"),
      "utf8",
    );
    // The serialiser names no pathname/URL field for evidence.
    expect(helpersSrc).not.toContain("blobPathname: e.");
    expect(helpersSrc).not.toContain("extractedTextPathname: e.");
  });

  it("the download route carries the §2.3.4 hardening headers", () => {
    const src = readFileSync(
      path.join(SRC, "app/api/fraud-radar/cases/[id]/evidence/[evidenceId]/download/route.ts"),
      "utf8",
    );
    expect(src).toContain("Content-Disposition");
    expect(src).toContain("attachment");
    expect(src).toContain("nosniff");
    expect(src).toContain("private, no-store");
    expect(src).toContain("loadCaseForRoute");
  });

  it("evidence children resolve through their case in the store (§1.5)", () => {
    const storeSrc = readFileSync(
      path.join(SRC, "lib/fraud-radar/cases/store.ts"),
      "utf8",
    );
    expect(storeSrc).toContain("getEvidence(caseId");
    expect(storeSrc).toContain("where: { id: evidenceId, caseId }");
  });

  it("the corpus firewall holds in the vault module (§2.7): firewall assertion + no publication path", () => {
    const vaultSrc = readFileSync(
      path.join(SRC, "lib/fraud-radar/cases/vault.ts"),
      "utf8",
    );
    expect(vaultSrc).toContain("assertCorpusFirewall");
    expect(vaultSrc).toContain("VAULT_PATH_PREFIX");
    // The vault never writes a data-source registry entry and
    // no Phase 8 module imports a publication/artifact path.
    const casesDir = path.join(SRC, "lib/fraud-radar/cases");
    for (const name of readdirSync(casesDir)) {
      if (!/\.ts$/.test(name) || /\.test\.ts$/.test(name)) continue;
      const src = readFileSync(path.join(casesDir, name), "utf8");
      expect(src, name).not.toContain("frDataSource");
      expect(src, name).not.toMatch(/from\s+["']@\/lib\/fraud-radar\/(healthcare|care|grants|signals)-data["']/);
    }
  });

  it("the investigator tool registry contains no evidence tool (§2.7)", () => {
    const toolsSrc = readFileSync(
      path.join(SRC, "lib/fraud-radar/investigator/tools.ts"),
      "utf8",
    );
    expect(toolsSrc).not.toContain("FrCaseEvidence");
    expect(toolsSrc).not.toContain("evidence_download");
    expect(toolsSrc).not.toContain("fraud-radar-evidence");
  });

  it("the vault claims no malware scanner (§2.3): no scan vocabulary in the vault module", () => {
    const vaultSrc = readFileSync(
      path.join(SRC, "lib/fraud-radar/cases/vault.ts"),
      "utf8",
    );
    expect(vaultSrc).not.toMatch(/clamav|virustotal/i);
    expect(vaultSrc).not.toContain("scanState");
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

describe("§14.3 isolation — Phase 8 cases (P8-A)", () => {
  const caseRouteFiles = [
    "app/api/fraud-radar/cases/route.ts",
    "app/api/fraud-radar/cases/usage/route.ts",
    "app/api/fraud-radar/cases/[id]/route.ts",
    "app/api/fraud-radar/cases/[id]/leads/route.ts",
    "app/api/fraud-radar/cases/[id]/leads/from-investigator/route.ts",
    "app/api/fraud-radar/cases/[id]/leads/[leadId]/route.ts",
    "app/api/fraud-radar/cases/[id]/notes/route.ts",
    "app/api/fraud-radar/cases/[id]/notes/[noteId]/route.ts",
  ];

  it("every cases API route carries the flag gate", () => {
    for (const rel of caseRouteFiles) {
      const src = readFileSync(path.join(SRC, rel), "utf8");
      expect(src, rel).toContain("fraudRadarEnabled()");
    }
  });

  it("cases are never public paths — flag.ts does not list them (§5.1)", () => {
    const flagSrc = readFileSync(path.join(SRC, "lib/fraud-radar/flag.ts"), "utf8");
    expect(flagSrc).not.toContain("/fraud-radar/cases");
  });

  it("child routes resolve children through their case, never by own id alone", () => {
    for (const rel of [
      "app/api/fraud-radar/cases/[id]/leads/[leadId]/route.ts",
      "app/api/fraud-radar/cases/[id]/notes/[noteId]/route.ts",
    ]) {
      const src = readFileSync(path.join(SRC, rel), "utf8");
      expect(src, rel).toContain("loadCaseForRoute");
    }
    // The store's child reads/writes all take the parent caseId.
    const storeSrc = readFileSync(
      path.join(SRC, "lib/fraud-radar/cases/store.ts"),
      "utf8",
    );
    expect(storeSrc).toContain("getLead(caseId");
    expect(storeSrc).toContain("getNote(caseId");
    expect(storeSrc).toContain("where: { id: leadId, caseId }");
    expect(storeSrc).toContain("where: { id: noteId, caseId }");
  });

  it("snapshot immutability is structural: the store has no snapshot update path (§1.3 rule 1)", () => {
    const storeSrc = readFileSync(
      path.join(SRC, "lib/fraud-radar/cases/store.ts"),
      "utf8",
    );
    // The only lead mutation named in the store is the annotation
    // write; no update writes a snapshot field after creation.
    expect(storeSrc).toContain("updateLeadAnnotation");
    expect(storeSrc).not.toMatch(/updateMany\(\{\s*where: \{ id: leadId, caseId \},\s*data: \{[^}]*snapshot/);
    const leadsSrc = readFileSync(
      path.join(SRC, "lib/fraud-radar/cases/leads.ts"),
      "utf8",
    );
    expect(leadsSrc).toContain("captureLead");
    expect(leadsSrc).not.toContain("updateLead");
  });

  it("no Phase 8 module imports the pipeline, a publication path, or OI code (corpus firewall §2.7)", () => {
    const casesDir = path.join(SRC, "lib/fraud-radar/cases");
    for (const name of readdirSync(casesDir)) {
      if (!/\.ts$/.test(name) || /\.test\.ts$/.test(name)) continue;
      const src = readFileSync(path.join(casesDir, name), "utf8");
      expect(src, name).not.toMatch(/fr_pipeline|pipeline\//);
      expect(src, name).not.toMatch(/from\s+["']@\/lib\/oi\//);
    }
    for (const rel of caseRouteFiles) {
      const src = readFileSync(path.join(SRC, rel), "utf8");
      expect(src, rel).not.toMatch(/from\s+["']@\/lib\/oi\//);
    }
  });
});

describe("§14.3 isolation — Phase 8 claim verification (P8-C)", () => {
  const claimRouteFiles = [
    "app/api/fraud-radar/cases/[id]/claims/route.ts",
    "app/api/fraud-radar/cases/[id]/claims/[claimId]/route.ts",
    "app/api/fraud-radar/cases/[id]/claims/[claimId]/verify/route.ts",
    "app/api/fraud-radar/cases/[id]/claims/[claimId]/verifications/route.ts",
  ];

  it("every claim API route carries the flag gate", () => {
    for (const rel of claimRouteFiles) {
      const src = readFileSync(path.join(SRC, rel), "utf8");
      expect(src, rel).toContain("fraudRadarEnabled()");
    }
  });

  it("claims resolve through their case, never by own id alone (§1.5)", () => {
    for (const rel of claimRouteFiles.slice(1)) {
      const src = readFileSync(path.join(SRC, rel), "utf8");
      expect(src, rel).toContain("loadCaseForRoute");
      expect(src, rel).toContain("getClaim(id, claimId)");
    }
    const storeSrc = readFileSync(
      path.join(SRC, "lib/fraud-radar/cases/store.ts"),
      "utf8",
    );
    expect(storeSrc).toContain("getClaim(caseId");
    expect(storeSrc).toContain("where: { id: claimId, caseId }");
  });

  it("verifications are append-only: the store and routes expose no update or delete for them (§1.6)", () => {
    const storeSrc = readFileSync(
      path.join(SRC, "lib/fraud-radar/cases/store.ts"),
      "utf8",
    );
    expect(storeSrc).toContain("createVerification");
    expect(storeSrc).toContain("listVerifications");
    expect(storeSrc).not.toContain("updateVerification");
    expect(storeSrc).not.toContain("deleteVerification");
    const historySrc = readFileSync(
      path.join(SRC, claimRouteFiles[3]),
      "utf8",
    );
    expect(historySrc).toContain("export async function GET");
    expect(historySrc).not.toMatch(/export async function (POST|PATCH|PUT|DELETE)/);
  });

  it("the verdict vocabulary is closed and single-sourced (§4.2)", () => {
    const verdictsSrc = readFileSync(
      path.join(SRC, "lib/fraud-radar/cases/claim-verdicts.ts"),
      "utf8",
    );
    for (const verdict of [
      "supported",
      "contradicted",
      "not-in-corpus",
      "insufficient-data",
    ]) {
      expect(verdictsSrc, verdict).toContain(`"${verdict}"`);
    }
    // The checker's write path goes through the store's single
    // verification create, which re-checks the closed set.
    const storeSrc = readFileSync(
      path.join(SRC, "lib/fraud-radar/cases/store.ts"),
      "utf8",
    );
    expect(storeSrc).toContain("verdict outside the closed vocabulary");
  });

  it("the checker reads the corpus only through the Phase 7 tool registry interface (§4.3)", () => {
    const checkerSrc = readFileSync(
      path.join(SRC, "lib/fraud-radar/cases/claim-check.ts"),
      "utf8",
    );
    expect(checkerSrc).toContain("executeTool");
    expect(checkerSrc).toContain("CLAIM_CHECKER_VERSION");
    // No direct artifact or pipeline reads in the checker.
    expect(checkerSrc).not.toMatch(/createArtifactLoader|createGrantsLoader|createCareLoader/);
    expect(checkerSrc).not.toMatch(/fr_pipeline|pipeline\//);
  });
});

describe("§14.3 isolation — Phase 8 case surfaces + pinning (P8-D)", () => {
  const casePageFiles = [
    "app/(en)/fraud-radar/cases/page.tsx",
    "app/(en)/fraud-radar/cases/[id]/page.tsx",
  ];

  it("every case page carries the flag gate, and cases stay out of publicPaths + sitemap (§5.1)", () => {
    for (const rel of casePageFiles) {
      const src = readFileSync(path.join(SRC, rel), "utf8");
      expect(src, rel).toContain("fraudRadarEnabled()");
      expect(src, rel).toContain("notFound()");
      expect(src, rel).toContain("index: false");
    }
    const flagSrc = readFileSync(path.join(SRC, "lib/fraud-radar/flag.ts"), "utf8");
    expect(flagSrc).not.toContain("/fraud-radar/cases");
    const sitemapSrc = readFileSync(path.join(SRC, "app/sitemap.ts"), "utf8");
    expect(sitemapSrc).not.toContain("fraud-radar/cases");
  });

  it("case surfaces render only through the case APIs — no data-layer or store imports", () => {
    for (const rel of [
      "app/(en)/fraud-radar/cases/CasesClient.tsx",
      "app/(en)/fraud-radar/cases/[id]/CaseDetailClient.tsx",
      "components/fraud-radar/PinToCase.tsx",
    ]) {
      const src = readFileSync(path.join(SRC, rel), "utf8");
      expect(src, rel).toContain("/api/fraud-radar/cases");
      expect(src, rel).not.toMatch(/signals-data|healthcare-data|grants-data|care-data|cases\/store|cases\/leads/);
      expect(src, rel).not.toMatch(/@vercel\/blob|BLOB_READ_WRITE_TOKEN/);
    }
  });

  it("PinToCase submits identifiers only and gates the candidate kind to an admin context (§1.3 rules 3–4)", () => {
    const src = readFileSync(
      path.join(SRC, "components/fraud-radar/PinToCase.tsx"),
      "utf8",
    );
    expect(src).toContain("pinKindAllowed");
    expect(src).toContain('kind === "candidate"');
    // The pin body builder never assembles a snapshot.
    const bodyFn = src.slice(src.indexOf("buildPinBody"), src.indexOf("pinKindAllowed"));
    expect(bodyFn).not.toContain("snapshot");
  });

  it("no non-admin surface passes an admin context or offers a candidate pin", () => {
    for (const rel of [
      "components/fraud-radar/ResearchSignals.tsx",
      "app/(en)/fraud-radar/grants/recipients/[uei]/page.tsx",
      "app/(en)/fraud-radar/healthcare/providers/[npi]/page.tsx",
      "app/(en)/fraud-radar/care/medicare/[npi]/page.tsx",
    ]) {
      const src = readFileSync(path.join(SRC, rel), "utf8");
      expect(src, rel).not.toContain("adminContext");
      expect(src, rel).not.toContain('kind="candidate"');
    }
  });

  it("case-surface copy carries no verdict outside the closed set and no guaranteed amounts", () => {
    for (const rel of [
      "app/(en)/fraud-radar/cases/page.tsx",
      "app/(en)/fraud-radar/cases/CasesClient.tsx",
      "app/(en)/fraud-radar/cases/[id]/page.tsx",
      "app/(en)/fraud-radar/cases/[id]/CaseDetailClient.tsx",
      "components/fraud-radar/PinToCase.tsx",
    ]) {
      const src = readFileSync(path.join(SRC, rel), "utf8");
      expect(src, rel).not.toMatch(/"fraudulent"|"confirmed fraud"|"guilty"|"cleared"/);
      expect(src, rel).not.toContain("1%");
    }
  });
});

describe("§14.3 isolation — Phase 11 billing (SHV-11)", () => {
  it("no lib/fraud-radar module imports lib/billing (dependency guard, §0.2)", () => {
    const root = path.join(SRC, "lib/fraud-radar");
    const walk = (d: string): string[] =>
      readdirSync(d, { withFileTypes: true }).flatMap((e) =>
        e.isDirectory() ? walk(path.join(d, e.name)) : e.name.endsWith(".ts") ? [path.join(d, e.name)] : []);
    for (const f of walk(root)) {
      const src = readFileSync(f, "utf8");
      expect(src, path.relative(SRC, f)).not.toMatch(/from\s+["']@\/lib\/billing\//);
      expect(src, path.relative(SRC, f)).not.toMatch(/from\s+["'].*lib\/pro\/comp/);
    }
  });

  it("the billing state route is flag-gated and no FR checkout/portal route exists (P11-D deferred)", () => {
    const route = readFileSync(path.join(SRC, "app/api/fraud-radar/billing/route.ts"), "utf8");
    expect(route).toContain("fraudRadarEnabled()");
    expect(route).toContain("checkoutAvailable: false");
    expect(existsSync(path.join(SRC, "app/api/fraud-radar/billing/checkout"))).toBe(false);
    expect(existsSync(path.join(SRC, "app/api/fraud-radar/billing/portal"))).toBe(false);
  });

  it("billing copy carries no fraud verdicts and no guaranteed amounts", () => {
    for (const rel of [
      "lib/fraud-radar/billing/plans.ts",
      "lib/fraud-radar/billing/entitlements.ts",
      "app/api/fraud-radar/billing/route.ts",
    ]) {
      const src = readFileSync(path.join(SRC, rel), "utf8");
      expect(src, rel).not.toMatch(/"fraudulent"|"confirmed fraud"|"guilty"/);
      expect(src, rel).not.toContain("guaranteed 1%");
    }
  });
});

describe("§14.3 isolation — Phase 5 contracts routes carry the flag gate", () => {
  it("every contracts page and the contracts search API check fraudRadarEnabled", () => {
    const contractsFiles = [
      "app/(en)/fraud-radar/contracts/page.tsx",
      "app/(en)/fraud-radar/contracts/vendors/page.tsx",
      "app/(en)/fraud-radar/contracts/vendors/[uei]/page.tsx",
      "app/(en)/fraud-radar/contracts/awards/[awardKey]/page.tsx",
      "app/(en)/fraud-radar/contracts/naics/page.tsx",
      "app/(en)/fraud-radar/contracts/naics/[code]/page.tsx",
      "app/(en)/fraud-radar/contracts/psc/page.tsx",
      "app/(en)/fraud-radar/contracts/psc/[code]/page.tsx",
      "app/api/fraud-radar/contracts/search/route.ts",
    ];
    for (const rel of contractsFiles) {
      const src = readFileSync(path.join(SRC, rel), "utf8");
      expect(src, rel).toContain("fraudRadarEnabled()");
    }
  });

  it("the public path list adds exactly the contracts landing + NAICS/PSC explorers", () => {
    const flagSrc = readFileSync(path.join(SRC, "lib/fraud-radar/flag.ts"), "utf8");
    expect(flagSrc).toContain('"/fraud-radar/contracts"');
    expect(flagSrc).toContain('"/fraud-radar/contracts/naics"');
    expect(flagSrc).toContain('"/fraud-radar/contracts/psc"');
    // Vendor search, vendor/award detail and the search API stay
    // out of the sitemap (grants precedent, Phase 5 spec).
    expect(flagSrc).not.toContain("/fraud-radar/contracts/vendors");
    expect(flagSrc).not.toContain("/fraud-radar/contracts/awards");
  });

  it("no contracts surface carries FAC data (FAC does not cover contracts)", () => {
    const contractsFiles = [
      "app/(en)/fraud-radar/contracts/page.tsx",
      "app/(en)/fraud-radar/contracts/vendors/[uei]/page.tsx",
      "app/(en)/fraud-radar/contracts/awards/[awardKey]/page.tsx",
      "lib/fraud-radar/contracts-data.ts",
      "lib/fraud-radar/contracts-neon.ts",
    ];
    for (const rel of contractsFiles) {
      const src = readFileSync(path.join(SRC, rel), "utf8");
      expect(src, rel).not.toMatch(/FrFac|facYearly|getFac|listFac/);
    }
  });

  it("S-06 confinement holds for the contracts profile", () => {
    const src = readFileSync(
      path.join(SRC, "app/(en)/fraud-radar/contracts/vendors/[uei]/page.tsx"),
      "utf8",
    );
    expect(src).not.toContain("getAdminCandidateQueue");
    expect(src).not.toContain("candidate-queue");
  });
});

describe("§14.3 isolation — Phase 10 graph/geo routes + firewall (P10-A)", () => {
  const p10Files = [
    "app/api/fraud-radar/graph/ego/route.ts",
    "app/api/fraud-radar/graph/search/route.ts",
    "app/api/fraud-radar/geo/states/route.ts",
    "app/api/fraud-radar/geo/counties/route.ts",
  ];

  it("every Phase 10 API route carries the flag gate", () => {
    for (const rel of p10Files) {
      const src = readFileSync(path.join(SRC, rel), "utf8");
      expect(src, rel).toContain("fraudRadarEnabled()");
    }
  });

  it("graph and geo are not public paths yet (geo joins only in P10-C; graph never)", () => {
    const flagSrc = readFileSync(path.join(SRC, "lib/fraud-radar/flag.ts"), "utf8");
    expect(flagSrc).not.toContain("/fraud-radar/graph");
  });

  it("Phase 10 data modules read no case data (§7.1 firewall, summary pin)", () => {
    for (const rel of [
      "lib/fraud-radar/graphs-data.ts",
      "lib/fraud-radar/geo-data.ts",
    ]) {
      const src = readFileSync(path.join(SRC, rel), "utf8");
      expect(src, rel).not.toContain("FrCase");
      expect(src, rel).not.toContain("BLOB_READ_WRITE_TOKEN");
    }
  });
});

describe("§14.3 isolation — Phase 10 profile Network sections (P10-B2)", () => {
  it("the three profile families wire the shared Network section", () => {
    for (const rel of [
      "app/(en)/fraud-radar/grants/recipients/[uei]/page.tsx",
      "app/(en)/fraud-radar/healthcare/providers/[npi]/page.tsx",
      "app/(en)/fraud-radar/care/medicare/[npi]/page.tsx",
    ]) {
      const src = readFileSync(path.join(SRC, rel), "utf8");
      expect(src, rel).toContain("ProfileNetworkSection");
    }
  });

  it("B2 adds no public paths — the flag list is unchanged by the payload", () => {
    const flagSrc = readFileSync(path.join(SRC, "lib/fraud-radar/flag.ts"), "utf8");
    expect(flagSrc).not.toContain("/fraud-radar/graph");
  });
});
