import { describe, it, expect, vi, beforeAll, beforeEach, afterEach } from "vitest";
import { renderToString } from "react-dom/server";
import { fileURLToPath } from "node:url";

/**
 * Signals index tests (Phase 6, Payload B1): flag gate, per-engine
 * rule sections rendered from the catalog + the Neon summary grain
 * (fail-soft to the artifact summary file), by-construction counts
 * and noise caution beside the counts, the not-computed breakdown,
 * and the contracts engine in its explicit pending state — never
 * zeros, never absent. Language discipline is pinned: no banned
 * framing anywhere in the rendered page.
 */
const summariesMock = vi.fn();

vi.mock("@/lib/fraud-radar/signals-neon", () => ({
  listSignalRuleSummaries: () => summariesMock(),
  getSignalRuleSummary: async () => null,
}));

import SignalsPage from "./page";

const FIXTURES = fileURLToPath(
  new URL("../../../../lib/fraud-radar/__fixtures__/signals", import.meta.url),
);

const NEON_ROWS = [
  {
    signalsVersion: "2026-02-09+2022-2024+2026-10-06",
    engine: "healthcare",
    ruleCode: "H-MCD-01",
    ruleName: "Paid per claim line above specialty-state peer band (billing)",
    ruleLibraryVersion: "1.1.0",
    entitiesEvaluated: 320178,
    leadsPublished: 2941,
    aboveBandBeforeEffectFloor: 3254,
    expectedByConstruction: 3201.78,
    noiseCaution: true,
    peerDefinition:
      "Providers reporting the same NPPES primary taxonomy in the same NPPES practice state (NBER mirror of CMS NPPES, 2026-08), computed separately per role; fallback rungs: taxonomy national, then practice state across taxonomies. Minimum peer group size 30 entities clearing the rule's activity floor.",
    inputVersions:
      "medicaid-provider-aggregates-enriched/2026-02-09; medicaid-provider-aggregates/2026-02-09; nppes/2026-08 (NBER mirror of CMS NPPES)",
    notComputed: {
      not_computed_below_activity_floor: 293435,
      not_computed_missing_peer_key: 5474,
    },
  },
  {
    signalsVersion: "2026-02-09+2022-2024+2026-10-06",
    engine: "grants",
    ruleCode: "G-01",
    ruleName: "Obligated per award above ALN peer band",
    ruleLibraryVersion: "1.1.0",
    entitiesEvaluated: 56615,
    leadsPublished: 658,
    aboveBandBeforeEffectFloor: 658,
    expectedByConstruction: 566.15,
    noiseCaution: true,
    peerDefinition: "Recipients whose modal assistance listing is the same listing.",
    inputVersions: "grants-aggregates/2026-10-06",
    notComputed: { not_computed_missing_peer_key: 3619 },
  },
];

beforeAll(() => {
  vi.stubEnv("FRAUD_RADAR_SIGNALS_ARTIFACT_ROOT", FIXTURES);
});
beforeEach(() => {
  summariesMock.mockReset();
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.stubEnv("FRAUD_RADAR_SIGNALS_ARTIFACT_ROOT", FIXTURES);
});

describe("/fraud-radar/signals — flag gate + index", () => {
  it("404s while FRAUD_RADAR_ENABLED is off", async () => {
    vi.stubEnv("FRAUD_RADAR_ENABLED", "");
    summariesMock.mockResolvedValue(NEON_ROWS);
    let digest = "";
    try {
      await SignalsPage();
    } catch (e) {
      digest = (e as { digest?: string })?.digest ?? "";
    }
    expect(
      digest === "NEXT_NOT_FOUND" ||
        digest.startsWith("NEXT_HTTP_ERROR_FALLBACK;404"),
    ).toBe(true);
  });

  it("renders per-engine rules with counts, context and the contracts pending state", async () => {
    vi.stubEnv("FRAUD_RADAR_ENABLED", "1");
    summariesMock.mockResolvedValue(NEON_ROWS);
    const html = renderToString(await SignalsPage());
    // Engine sections.
    expect(html).toContain("Healthcare — Medicaid");
    expect(html).toContain("Government grants &amp; single audits");
    expect(html).toContain("Cross-dataset");
    // Rule rendered from the catalog with its summary counts.
    expect(html).toContain("H-MCD-01");
    expect(html).toContain("Paid per claim line above specialty-state peer band (billing)");
    expect(html).toContain("Research lead");
    expect(html).toContain("320,178");
    expect(html).toContain("2,941");
    expect(html).toContain("3,254");
    expect(html).toContain("3,201.78");
    expect(html).toContain("Noise caution");
    expect(html).toContain("not_computed_below_activity_floor: 293,435");
    expect(html).toContain("NBER mirror of CMS NPPES");
    expect(html).toContain("/fraud-radar/signals/rules/H-MCD-01");
    expect(html).toContain("/fraud-radar/signals/methods");
    // Vintage context.
    expect(html).toContain("2026-02-09+2022-2024+2026-10-06");
    expect(html).toContain("Neon summary grain");
    // Contracts: explicit pending state, never zeros, never absent.
    expect(html).toContain("not_computed_input_not_published");
    expect(html).toContain("not yet computed");
    expect(html).toContain("C-01");
    expect(html).toContain("S-02");
    // Language discipline — no banned framing.
    const lower = html.toLowerCase();
    for (const banned of [
      "fraud score",
      "risk score",
      "suspicious",
      "guilty",
      "probability of fraud",
      "worst offenders",
    ]) {
      expect(lower).not.toContain(banned);
    }
  });

  it("fails soft to the artifact summary file when the Neon grain is not loaded", async () => {
    vi.stubEnv("FRAUD_RADAR_ENABLED", "1");
    summariesMock.mockResolvedValue(null);
    const html = renderToString(await SignalsPage());
    expect(html).toContain("artifact summary file");
    // The fixture signals-neon.json carries H-MCD-01 and H-MCD-05.
    expect(html).toContain("H-MCD-05");
    expect(html).toContain("Sharp step-up in monthly paid (own history)");
    expect(html).toContain("19,746");
    // Own-history form: by-construction is not applicable, never zero.
    expect(html).toContain("not applicable to this rule&#x27;s form");
  });
});
