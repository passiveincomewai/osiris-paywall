import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { renderToString } from "react-dom/server";

/**
 * Admin registry health view tests. The auth + admin gate and the
 * registry read model are mocked, following the /admin/conversion
 * render-test pattern: these tests pin the page's structure and its
 * honest empty states, not the database.
 */
const authMock = vi.fn();
const healthMock = vi.fn();

vi.mock("@/auth", () => ({ auth: () => authMock() }));
vi.mock("@/lib/affiliate/admin", () => ({
  adminEmails: () => ["admin@example.com"],
}));
vi.mock("@/lib/fraud-radar/registry-admin", () => ({
  getRegistryHealth: () => healthMock(),
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
});
