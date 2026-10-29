import { describe, it, expect, vi, beforeAll, afterEach } from "vitest";
import React from "react";
import { renderToString } from "react-dom/server";
import { fileURLToPath } from "node:url";

/**
 * Provider profile tests (Phase 2): identity, both role blocks, the
 * monthly chart, the HCPCS breakdown and the LEIE screening section —
 * against schema-true fixtures through the real artifact read path.
 */
import ProviderProfilePage from "./page";

const FIXTURES = fileURLToPath(
  new URL("../../../../../../lib/fraud-radar/__fixtures__/healthcare", import.meta.url),
);

beforeAll(() => {
  vi.stubEnv("FRAUD_RADAR_ARTIFACT_ROOT", FIXTURES);
  vi.stubEnv("FRAUD_RADAR_ENABLED", "1");
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.stubEnv("FRAUD_RADAR_ARTIFACT_ROOT", FIXTURES);
  vi.stubEnv("FRAUD_RADAR_ENABLED", "1");
});

async function render(npi: string) {
  const html = renderToString(
    await ProviderProfilePage({ params: Promise.resolve({ npi }) }),
  );
  return html.replace(/<!-- -->/g, "");
}

describe("/fraud-radar/healthcare/providers/[npi] — profile", () => {
  it("renders identity, both roles, chart, and HCPCS rows", async () => {
    const html = await render("1234567890");
    expect(html).toContain("SMITH JOHN");
    expect(html).toContain("Billing role");
    expect(html).toContain("Servicing role");
    expect(html).toContain("$1,000.50");
    expect(html).toContain("$250.25");
    expect(html).toContain("Monthly reported payments");
    expect(html).toContain("99213");
    expect(html).toContain("99214");
    expect(html).toContain("/fraud-radar/healthcare/hcpcs/99213");
    // Not LEIE-listed: the screening section says so without clearing anyone.
    expect(html).toContain("does not appear in the LEIE snapshot");
    expect(html).toContain("not a clearance");
  });

  it("renders the LEIE screening detail and the absent servicing role", async () => {
    const html = await render("1239999999");
    expect(html).toContain("Screening — exclusion lists");
    expect(html).toContain("1120(a)(1)");
    expect(html).toContain("Paid after exclusion month");
    expect(html).toContain("$25.00");
    expect(html).toContain("No servicing role records in this dataset");
    expect(html).toContain("never $0");
    // SAM: deliberately not provider-matched in this phase.
    expect(html).toContain("deliberately not performed");
  });

  it("404s for an unknown NPI while enabled", async () => {
    let digest = "";
    try {
      await ProviderProfilePage({ params: Promise.resolve({ npi: "5555555555" }) });
    } catch (e) {
      digest = (e as { digest?: string })?.digest ?? "";
    }
    expect(digest === "NEXT_NOT_FOUND" || digest.startsWith("NEXT_HTTP_ERROR_FALLBACK;404")).toBe(true);
  });

  it("404s while the flag is off, even for a real NPI", async () => {
    vi.stubEnv("FRAUD_RADAR_ENABLED", "");
    let digest = "";
    try {
      await ProviderProfilePage({ params: Promise.resolve({ npi: "1234567890" }) });
    } catch (e) {
      digest = (e as { digest?: string })?.digest ?? "";
    }
    expect(digest === "NEXT_NOT_FOUND" || digest.startsWith("NEXT_HTTP_ERROR_FALLBACK;404")).toBe(true);
  });
});
