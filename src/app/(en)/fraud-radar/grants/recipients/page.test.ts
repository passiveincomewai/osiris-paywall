import { describe, it, expect, vi, beforeAll, afterEach } from "vitest";
import { renderToString } from "react-dom/server";
import { fileURLToPath } from "node:url";

/**
 * Grant recipient search tests (Phase 4): flag gate + artifact-backed
 * results ranked by obligated award-cumulative totals, with the
 * measure and screening caveats on the page.
 */
import GrantRecipientsSearchPage from "./page";

const FIXTURES = fileURLToPath(
  new URL("../../../../../lib/fraud-radar/__fixtures__/grants", import.meta.url),
);

beforeAll(() => {
  vi.stubEnv("FRAUD_RADAR_GRANTS_ARTIFACT_ROOT", FIXTURES);
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.stubEnv("FRAUD_RADAR_GRANTS_ARTIFACT_ROOT", FIXTURES);
});

const render = async (sp: { q?: string; page?: string }) =>
  renderToString(
    await GrantRecipientsSearchPage({ searchParams: Promise.resolve(sp) }),
  );

describe("/fraud-radar/grants/recipients — search", () => {
  it("404s while FRAUD_RADAR_ENABLED is off", async () => {
    vi.stubEnv("FRAUD_RADAR_ENABLED", "");
    let digest = "";
    try {
      await GrantRecipientsSearchPage({
        searchParams: Promise.resolve({ q: "ABC1" }),
      });
    } catch (e) {
      digest = (e as { digest?: string })?.digest ?? "";
    }
    expect(
      digest === "NEXT_NOT_FOUND" ||
        digest.startsWith("NEXT_HTTP_ERROR_FALLBACK;404"),
    ).toBe(true);
  });

  it("renders UEI-prefix results ranked by obligated (cumulative)", async () => {
    vi.stubEnv("FRAUD_RADAR_ENABLED", "1");
    const html = await render({ q: "ABC1" });
    expect(html).toContain("ACME CORPORATION");
    expect(html).toContain("BETA FOUNDATION");
    expect(html).toContain("/fraud-radar/grants/recipients/ABC123DEF456");
    expect(html).toContain("$5,000,000.50");
    expect(html).toContain("award-cumulative");
    expect(html).toContain("research leads");
  });

  it("renders name-search results", async () => {
    vi.stubEnv("FRAUD_RADAR_ENABLED", "1");
    const html = await render({ q: "acme corp" });
    expect(html).toContain("ACME CORPORATION");
    expect(html).toContain("ABC123DEF456");
  });

  it("explains too-short queries honestly", async () => {
    vi.stubEnv("FRAUD_RADAR_ENABLED", "1");
    const html = await render({ q: "AB" });
    expect(html).toContain("at least 3 characters");
  });
});
