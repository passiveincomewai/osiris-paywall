import { describe, it, expect, vi, beforeAll, afterEach } from "vitest";
import React from "react";
import { renderToString } from "react-dom/server";
import { fileURLToPath } from "node:url";

/**
 * Provider search page tests (Phase 2): flag gate, real artifact
 * search against fixtures, and the absence discipline — a role the
 * provider never appears in renders "—", never $0.00.
 */
import ProviderSearchPage from "./page";

const FIXTURES = fileURLToPath(
  new URL("../../../../../lib/fraud-radar/__fixtures__/healthcare", import.meta.url),
);

beforeAll(() => {
  vi.stubEnv("FRAUD_RADAR_ARTIFACT_ROOT", FIXTURES);
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.stubEnv("FRAUD_RADAR_ARTIFACT_ROOT", FIXTURES);
});

async function render(q?: string) {
  const html = renderToString(
    await ProviderSearchPage({
      searchParams: Promise.resolve(q ? { q } : {}),
    }),
  );
  return html.replace(/<!-- -->/g, "");
}

describe("/fraud-radar/healthcare/providers — search page", () => {
  it("404s while FRAUD_RADAR_ENABLED is off", async () => {
    vi.stubEnv("FRAUD_RADAR_ENABLED", "");
    let digest = "";
    try {
      await ProviderSearchPage({ searchParams: Promise.resolve({}) });
    } catch (e) {
      digest = (e as { digest?: string })?.digest ?? "";
    }
    expect(digest === "NEXT_NOT_FOUND" || digest.startsWith("NEXT_HTTP_ERROR_FALLBACK;404")).toBe(true);
  });

  it("renders ranked results for an NPI prefix, absence as —", async () => {
    vi.stubEnv("FRAUD_RADAR_ENABLED", "1");
    const html = await render("123");
    expect(html).toContain("3 matching providers");
    expect(html).toContain("1234567891");
    expect(html).toContain("$5,000.00"); // servicing-only provider's servicing paid
    expect(html).toContain("—"); // its billing paid: absent, not zero
    expect(html).not.toContain("$0.00");
    expect(html).toContain("Listed — review"); // LEIE badge for 1239999999
    expect(html).toContain("/fraud-radar/healthcare/providers/1234567890");
  });

  it("explains a too-short query instead of silently returning nothing", async () => {
    vi.stubEnv("FRAUD_RADAR_ENABLED", "1");
    const html = await render("12");
    expect(html).toContain("at least 3 characters");
  });

  it("gives an honest no-match explanation (absence ≠ zero activity)", async () => {
    vi.stubEnv("FRAUD_RADAR_ENABLED", "1");
    const html = await render("999");
    expect(html).toContain("No providers match");
    expect(html).toContain("not the same as zero activity");
  });
});
