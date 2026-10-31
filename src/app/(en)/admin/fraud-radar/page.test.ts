import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderToString } from "react-dom/server";

/**
 * Admin registry health view tests. The auth + admin gate and the
 * registry read model are mocked, following the /admin/conversion
 * render-test pattern: these tests pin the page's structure and its
 * honest empty states, not the database.
 */
const authMock = vi.fn();
const healthMock = vi.fn();
const dqMock = vi.fn();
const queueMock = vi.fn();

vi.mock("@/auth", () => ({ auth: () => authMock() }));
vi.mock("@/lib/affiliate/admin", () => ({
  adminEmails: () => ["admin@example.com"],
}));
vi.mock("@/lib/fraud-radar/registry-admin", () => ({
  getRegistryHealth: () => healthMock(),
}));
vi.mock("@/lib/fraud-radar/signals-neon", () => ({
  listDataQualityRecords: () => dqMock(),
}));
vi.mock("@/lib/fraud-radar/signals-data", () => ({
  getSignalsQuality: async () => null,
  getAdminCandidateQueue: () => queueMock(),
  CANDIDATE_STATUS: "candidate — human review",
  CANDIDATE_QUEUE_NOTE:
    "Human-review candidate pairs (S-06) appear only in the admin review queue artifact. They are candidates for human review — never identity matches, never presented as leads — and the public entity loader in this layer never returns them.",
}));
vi.mock("next/navigation", async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>;
  return { ...actual, redirect: (url: string) => { throw new Error(`REDIRECT:${url}`); } };
});

import FraudRadarAdminPage from "./page";

const adminSession = { user: { email: "admin@example.com" } };

beforeEach(() => {
  authMock.mockReset();
  healthMock.mockReset();
  dqMock.mockReset();
  dqMock.mockResolvedValue(null);
  queueMock.mockReset();
  queueMock.mockResolvedValue(null);
  vi.stubEnv("FRAUD_RADAR_ENABLED", "");
});

const QUEUE_FIXTURE = {
  version: "2026-02-09+2022-2024+2026-10-06",
  recordCode: "S-06",
  recordClass: "screening_record",
  statusConstant: "candidate — human review",
  surface: "admin review queue only — never a public entity file",
  count: 2,
  records: [
    {
      entityKey: "ABC123DEF456",
      entityKeyType: "UEI",
      code: "S-06",
      codeKind: "record",
      recordClass: "screening_record",
      recordKey: "linkage:ABC123DEF456",
      ruleLibraryVersion: "1.1.0",
      lead: false,
      status: "candidate — human review",
      measureName: "candidate_pair",
      measureValue: null,
      peerGroupDefinition: null,
      peerGroupKey: null,
      peerRung: null,
      peerN: null,
      peerMedian: null,
      peerP90: null,
      peerP99: null,
      percentileBand: null,
      percentileWithinPeerGroup: null,
      ratioToPeerMedian: null,
      robustDistanceFromPeerMedian: null,
      inputVersions: "entity-linkage-candidates/2026-10__2026-301__2026-08",
      computedAt: "2026-10-31T18:49:30+00:00",
      caveatCodes: ["EXTRACT_DATED"],
      detail: { leie_npi: "1114063849", key_type: "individual_name" },
      sourceTable: "entity-linkage-candidates/2026-10__2026-301__2026-08",
    },
    {
      entityKey: "B51603",
      entityKeyType: "CCN",
      code: "S-06",
      codeKind: "record",
      recordClass: "screening_record",
      recordKey: "care_directory:hospice|B51603",
      ruleLibraryVersion: "1.1.0",
      lead: false,
      status: "candidate — human review",
      measureName: "candidate_pair",
      measureValue: null,
      peerGroupDefinition: null,
      peerGroupKey: null,
      peerRung: null,
      peerN: null,
      peerMedian: null,
      peerP90: null,
      peerP99: null,
      percentileBand: null,
      percentileWithinPeerGroup: null,
      ratioToPeerMedian: null,
      robustDistanceFromPeerMedian: null,
      inputVersions: "care-program-aggregates/2022-2024 care_directory_candidates",
      computedAt: "2026-10-31T18:49:30+00:00",
      caveatCodes: ["EXTRACT_DATED"],
      detail: { directory: "hospice", directory_name: "COMFOR CARE HOSPICE INC" },
      sourceTable: "care-program-aggregates/2022-2024 care_directory_candidates",
    },
  ],
};

describe("/admin/fraud-radar — registry health view", () => {
  it("redirects signed-out users to the admin login", async () => {
    authMock.mockResolvedValue(null);
    await expect(FraudRadarAdminPage()).rejects.toThrow(
      "REDIRECT:/admin/login?callbackUrl=/admin/fraud-radar",
    );
  });

  it("shows the lock screen to signed-in non-admins", async () => {
    authMock.mockResolvedValue({ user: { email: "user@example.com" } });
    const html = renderToString(await FraudRadarAdminPage());
    expect(html).toContain("Admin access only");
  });

  it("renders the honest 'not available' state when the registry cannot be read", async () => {
    authMock.mockResolvedValue(adminSession);
    healthMock.mockResolvedValue({ available: false, sources: [], recentRuns: [] });
    const html = renderToString(await FraudRadarAdminPage());
    expect(html).toContain("Registry not available yet");
    expect(html).toContain("OFF — public surfaces are dark");
  });

  it("renders the empty state when tables exist but hold no sources", async () => {
    authMock.mockResolvedValue(adminSession);
    healthMock.mockResolvedValue({ available: true, sources: [], recentRuns: [] });
    const html = renderToString(await FraudRadarAdminPage());
    expect(html).toContain("Registry is empty");
  });

  it("renders sources and runs when the registry has data", async () => {
    authMock.mockResolvedValue(adminSession);
    healthMock.mockResolvedValue({
      available: true,
      sources: [
        {
          slug: "leie",
          name: "HHS-OIG LEIE",
          engine: "healthcare",
          status: "ok",
          accessType: "public_download",
          cadence: "Monthly",
          sourceVersion: "2026-10",
          lastPublishedAt: new Date("2026-10-15T00:00:00Z"),
          lastImportedAt: new Date("2026-10-16T00:00:00Z"),
          lastVerifiedAt: null,
          completeness: null,
          lastError: null,
        },
      ],
      recentRuns: [
        {
          id: "run1",
          sourceSlug: "leie",
          status: "succeeded",
          datasetVersion: "upd202610.csv",
          startedAt: new Date("2026-10-16T01:00:00Z"),
          finishedAt: new Date("2026-10-16T01:02:00Z"),
          rowsProcessed: "81234",
          artifactSha256: "abcdef0123456789",
          error: null,
        },
      ],
    });
    const html = renderToString(await FraudRadarAdminPage());
    expect(html).toContain("HHS-OIG LEIE");
    expect(html).toContain("upd202610.csv");
    expect(html).toContain("81234");
    expect(html).toContain("abcdef012345…");
  });

  it("shows the honest data-quality loading state when no verdicts are loaded", async () => {
    authMock.mockResolvedValue(adminSession);
    healthMock.mockResolvedValue({ available: false, sources: [], recentRuns: [] });
    const html = renderToString(await FraudRadarAdminPage());
    expect(html).toContain("Data quality");
    expect(html).toContain("Data quality not loaded yet");
  });

  it("renders per-dataset verdicts — the contracts FAIL visible, with its defects", async () => {
    authMock.mockResolvedValue(adminSession);
    healthMock.mockResolvedValue({ available: false, sources: [], recentRuns: [] });
    dqMock.mockResolvedValue([
      {
        datasetSlug: "usaspending-contracts",
        datasetVersion: "2026-10-06",
        runDate: "2026-10-31",
        verdict: "fail",
        checksTotal: 10,
        checksPass: 3,
        checksWarn: 1,
        checksFail: 1,
        checksError: 0,
        checksNotApplicable: 5,
        checks: {},
        defectsInForce: ["DQ-DEF-003"],
        detailPointer: "quality.json#datasets/usaspending-contracts@2026-10-06",
        filesChecked: 4,
        vintageAgeDays: 25,
      },
      {
        datasetSlug: "grants-aggregates",
        datasetVersion: "2026-10-06",
        runDate: "2026-10-31",
        verdict: "warn",
        checksTotal: 20,
        checksPass: 19,
        checksWarn: 1,
        checksFail: 0,
        checksError: 0,
        checksNotApplicable: 0,
        checks: {},
        defectsInForce: [],
        detailPointer: "quality.json#datasets/grants-aggregates@2026-10-06",
        filesChecked: 7,
        vintageAgeDays: 25,
      },
    ]);
    const html = renderToString(await FraudRadarAdminPage());
    expect(html).toContain("usaspending-contracts");
    expect(html).toContain("fail");
    expect(html).toContain("DQ-DEF-003");
    expect(html).toContain("grants-aggregates");
    expect(html).toContain("warn");
    // Aggregates only — the section carries no entity data.
    expect(html).toContain("never a score");
  });
});

describe("/admin/fraud-radar — S-06 candidate queue (Phase 6 B2)", () => {
  it("shows the honest not-loaded state when the queue artifact cannot be read", async () => {
    authMock.mockResolvedValue(adminSession);
    healthMock.mockResolvedValue({ available: false, sources: [], recentRuns: [] });
    const html = renderToString(await FraudRadarAdminPage()).replace(/<!-- -->/g, "");
    expect(html).toContain("Candidate queue — human review (S-06, Phase 6)");
    expect(html).toContain("Candidate queue not loaded yet");
    expect(html).toContain("no queue count of zero is implied");
  });

  it("renders aggregates and every row with the constant status, pair sides and extract versions", async () => {
    authMock.mockResolvedValue(adminSession);
    healthMock.mockResolvedValue({ available: false, sources: [], recentRuns: [] });
    queueMock.mockResolvedValue(QUEUE_FIXTURE);
    const html = renderToString(await FraudRadarAdminPage()).replace(/<!-- -->/g, "");
    // Aggregates header.
    expect(html).toContain("2 published");
    expect(html).toContain("linkage: 1");
    expect(html).toContain("care_directory: 1");
    expect(html).toContain("UEI: 1");
    expect(html).toContain("CCN: 1");
    // Every row carries the constant status (header + note + 2 rows
    // + the status aggregate line all state it).
    expect(html.split("candidate — human review").length - 1).toBeGreaterThanOrEqual(4);
    // Pair sides + match basis.
    expect(html).toContain("ABC123DEF456");
    expect(html).toContain("leie_npi");
    expect(html).toContain("1114063849");
    expect(html).toContain("individual_name");
    expect(html).toContain("B51603");
    expect(html).toContain("COMFOR CARE HOSPICE INC");
    expect(html).toContain("Match basis");
    expect(html).toContain("not an identity match");
    // Source / extract versions per row.
    expect(html).toContain("entity-linkage-candidates/2026-10__2026-301__2026-08");
    expect(html).toContain("care-program-aggregates/2022-2024 care_directory_candidates");
    // Admin-only framing.
    expect(html).toContain("no public route for them");
  });

  it("never renders queue records to a signed-in non-admin", async () => {
    authMock.mockResolvedValue({ user: { email: "user@example.com" } });
    queueMock.mockResolvedValue(QUEUE_FIXTURE);
    const html = renderToString(await FraudRadarAdminPage()).replace(/<!-- -->/g, "");
    expect(html).toContain("Admin access only");
    expect(html).not.toContain("ABC123DEF456");
    expect(html).not.toContain("Candidate queue");
  });
});
