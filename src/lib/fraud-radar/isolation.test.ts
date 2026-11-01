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
