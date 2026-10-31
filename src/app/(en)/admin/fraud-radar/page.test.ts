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
  vi.stubEnv("FRAUD_RADAR_ENABLED", "");
});

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
