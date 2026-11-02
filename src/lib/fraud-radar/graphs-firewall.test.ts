import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * §7.1 case firewall — static guard for Phase 10 modules (Phase 8
 * §2.7 pattern): the graph/geo pipeline-facing app modules must
 * contain NO case/lead/evidence/claim model names, no vault
 * prefixes, and no Blob token usage. Case data never enters the
 * public graph or geo products — in either direction.
 */
const SRC = fileURLToPath(new URL("../../", import.meta.url));

const PHASE10_FILES = [
  "lib/fraud-radar/graphs-data.ts",
  "lib/fraud-radar/geo-data.ts",
  "lib/fraud-radar/graphs-neon.ts",
  "lib/fraud-radar/geo-neon.ts",
  "lib/fraud-radar/rate-limit.ts",
  "app/api/fraud-radar/graph/ego/route.ts",
  "app/api/fraud-radar/graph/search/route.ts",
  "app/api/fraud-radar/geo/states/route.ts",
  "app/api/fraud-radar/geo/counties/route.ts",
];

const FORBIDDEN = [
  "FrCase",
  "FrClaim",
  "FrEvidence",
  "CaseLead",
  "fraud-radar-evidence",
  "VAULT_PATH_PREFIX",
  "BLOB_READ_WRITE_TOKEN",
  "@vercel/blob",
  "assertCorpusFirewall",
];

describe("§7.1 firewall — Phase 10 modules carry no case surface", () => {
  it("no Phase 10 module references case models, the vault, or Blob", () => {
    for (const rel of PHASE10_FILES) {
      const src = readFileSync(path.join(SRC, rel), "utf8");
      for (const token of FORBIDDEN) {
        expect(src, `${rel} must not contain ${token}`).not.toContain(token);
      }
    }
  });

  it("graph/geo routes accept no case identifier parameter", () => {
    for (const rel of PHASE10_FILES.filter((f) => f.includes("/api/"))) {
      const src = readFileSync(path.join(SRC, rel), "utf8");
      expect(src, rel).not.toMatch(/searchParams\.get\("case/);
      expect(src, rel).not.toContain("caseId");
    }
  });

  it("the §2.5 banned graph vocabulary is absent from Phase 10 modules", () => {
    const banned = [
      "fraud web",
      "fraud ring",
      "fraud network",
      "web of fraud",
      "front company",
      "laundering",
      "kickback",
      "connected to fraud",
    ];
    for (const rel of PHASE10_FILES) {
      const src = readFileSync(path.join(SRC, rel), "utf8").toLowerCase();
      for (const word of banned) {
        expect(src, `${rel} must not contain "${word}"`).not.toContain(word);
      }
    }
  });
});
