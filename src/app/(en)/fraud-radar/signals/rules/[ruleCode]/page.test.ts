import { describe, it, expect, vi, beforeAll, beforeEach, afterEach } from "vitest";
import { renderToString } from "react-dom/server";
import { fileURLToPath } from "node:url";

/**
 * Rule detail tests (Phase 6, Payload B1): flag gate, the catalog
 * definition + peer construction, counts for the published vintage
 * with the not-computed breakdown, the largest published leads by
 * the rule's own measure with provenance summaries, contracts codes
 * in the pending state, and S-06 confined to the admin queue.
 */
const summaryMock = vi.fn();

vi.mock("@/lib/fraud-radar/signals-neon", () => ({
  listSignalRuleSummaries: async () => null,
  getSignalRuleSummary: (code: string) => summaryMock(code),
}));

import SignalRuleDetailPage from "./page";

const FIXTURES = fileURLToPath(
  new URL("../../../../../../lib/fraud-radar/__fixtures__/signals", import.meta.url),
);

const H_MCD_01 = {
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
};

beforeAll(() => {
  vi.stubEnv("FRAUD_RADAR_SIGNALS_ARTIFACT_ROOT", FIXTURES);
});
beforeEach(() => {
  summaryMock.mockReset();
  summaryMock.mockImplementation(async (code: string) =>
    code === "H-MCD-01" ? H_MCD_01 : null,
  );
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.stubEnv("FRAUD_RADAR_SIGNALS_ARTIFACT_ROOT", FIXTURES);
});

const render = (ruleCode: string) =>
  SignalRuleDetailPage({ params: Promise.resolve({ ruleCode }) });

describe("/fraud-radar/signals/rules/[ruleCode] — flag gate + detail", () => {
  it("404s while FRAUD_RADAR_ENABLED is off", async () => {
    vi.stubEnv("FRAUD_RADAR_ENABLED", "");
    let digest = "";
    try {
      await render("H-MCD-01");
    } catch (e) {
      digest = (e as { digest?: string })?.digest ?? "";
    }
    expect(
      digest === "NEXT_NOT_FOUND" ||
        digest.startsWith("NEXT_HTTP_ERROR_FALLBACK;404"),
    ).toBe(true);
  });

  it("renders definition, peer construction, vintage counts and provenance-carrying leads", async () => {
    vi.stubEnv("FRAUD_RADAR_ENABLED", "1");
    const html = renderToString(await render("H-MCD-01"));
    expect(html).toContain("Paid per claim line above specialty-state peer band (billing)");
    expect(html).toContain("Research lead");
    expect(html).toContain("Peer construction");
    expect(html).toContain("same NPPES primary taxonomy");
    // Vintage counts + by-construction + noise caution.
    expect(html).toContain("2026-02-09+2022-2024+2026-10-06");
    expect(html).toContain("320,178");
    expect(html).toContain("2,941");
    expect(html).toContain("3,201.78");
    expect(html).toContain("Noise caution");
    // Not-computed breakdown.
    expect(html).toContain("not_computed_missing_peer_key");
    expect(html).toContain("5,474");
    // Largest leads from the fixture bucket, with provenance summary.
    expect(html).toContain("1234567890");
    expect(html).toContain("512.34");
    expect(html).toContain("120.5");
    expect(html).toContain("4.25");
    expect(html.replace(/<!-- -->/g, "")).toContain("Provenance complete");
    expect(html).toContain("SUPPRESSED_ROWS_ABSENT");
  });

  it("renders contracts rule codes in the pending state, never as zero", async () => {
    vi.stubEnv("FRAUD_RADAR_ENABLED", "1");
    const html = renderToString(await render("C-01"));
    expect(html).toContain("not_computed_input_not_published");
    expect(html).toContain("Not yet computed");
    expect(html).toContain("count of zero is not implied");
  });

  it("keeps S-06 on the admin queue only — no public list", async () => {
    vi.stubEnv("FRAUD_RADAR_ENABLED", "1");
    summaryMock.mockResolvedValue(null);
    const html = renderToString(await render("S-06"));
    expect(html).toContain("admin review");
    expect(html).toContain("candidate — human review");
    expect(html).not.toContain("ABC123DEF456");
  });

  it("404s for an unknown rule code", async () => {
    vi.stubEnv("FRAUD_RADAR_ENABLED", "1");
    summaryMock.mockResolvedValue(null);
    let digest = "";
    try {
      await render("ZZ-99");
    } catch (e) {
      digest = (e as { digest?: string })?.digest ?? "";
    }
    expect(
      digest === "NEXT_NOT_FOUND" ||
        digest.startsWith("NEXT_HTTP_ERROR_FALLBACK;404"),
    ).toBe(true);
  });
});
