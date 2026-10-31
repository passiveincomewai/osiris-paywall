import { describe, it, expect, vi, beforeAll, afterEach } from "vitest";
import { renderToString } from "react-dom/server";
import { fileURLToPath } from "node:url";

/**
 * Grants ALN detail tests (Phase 4): yearly attributed totals from
 * the (mocked) Neon grain + top recipients from the real fixture
 * artifacts; unknown ALNs 404 while enabled.
 */
vi.mock("@/lib/fraud-radar/grants-neon", () => ({
  listGrantsYearly: async () => null,
  listGrantsAln: async (opts: { q?: string }) =>
    opts?.q === "93.498"
      ? {
          total: 2,
          rows: [
            {
              aln: "93.498",
              alnTitle: "Example Program",
              attributedFiscalYear: 2024,
              awards: 4,
              distinctRecipients: 3,
              obligatedAwardCumulativeUsd: 1100000,
            },
            {
              aln: "93.498",
              alnTitle: "Example Program",
              attributedFiscalYear: 2025,
              awards: 5,
              distinctRecipients: 4,
              obligatedAwardCumulativeUsd: 2000000,
            },
          ],
        }
      : { total: 0, rows: [] },
  listGrantsAgency: async () => null,
  getGrantsAlnSummary: async () => null,
  listFacYearly: async () => null,
}));

import GrantsAlnDetailPage from "./page";

const FIXTURES = fileURLToPath(
  new URL("../../../../../../lib/fraud-radar/__fixtures__/grants", import.meta.url),
);

beforeAll(() => {
  vi.stubEnv("FRAUD_RADAR_GRANTS_ARTIFACT_ROOT", FIXTURES);
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.stubEnv("FRAUD_RADAR_GRANTS_ARTIFACT_ROOT", FIXTURES);
});

const render = async (aln: string) =>
  renderToString(
    await GrantsAlnDetailPage({ params: Promise.resolve({ aln }) }),
  );

describe("/fraud-radar/grants/aln/[aln] — detail", () => {
  it("renders yearly attributed totals and top recipients", async () => {
    vi.stubEnv("FRAUD_RADAR_ENABLED", "1");
    const html = await render("93.498");
    expect(html).toContain("93.498");
    expect(html).toContain("Example Program");
    expect(html).toContain("2024");
    expect(html).toContain("2025");
    expect(html).toContain("$2,000,000.00");
    expect(html).toContain("award-cumulative");
    expect(html).toContain("ACME CORPORATION");
    expect(html).toContain("/fraud-radar/grants/recipients/ABC123DEF456");
    expect(html).toContain("never zero");
  });

  it("404s for an unknown ALN while enabled", async () => {
    vi.stubEnv("FRAUD_RADAR_ENABLED", "1");
    let digest = "";
    try {
      await GrantsAlnDetailPage({
        params: Promise.resolve({ aln: "00.000" }),
      });
    } catch (e) {
      digest = (e as { digest?: string })?.digest ?? "";
    }
    expect(
      digest === "NEXT_NOT_FOUND" ||
        digest.startsWith("NEXT_HTTP_ERROR_FALLBACK;404"),
    ).toBe(true);
  });

  it("404s while the flag is off", async () => {
    vi.stubEnv("FRAUD_RADAR_ENABLED", "");
    let digest = "";
    try {
      await GrantsAlnDetailPage({
        params: Promise.resolve({ aln: "93.498" }),
      });
    } catch (e) {
      digest = (e as { digest?: string })?.digest ?? "";
    }
    expect(
      digest === "NEXT_NOT_FOUND" ||
        digest.startsWith("NEXT_HTTP_ERROR_FALLBACK;404"),
    ).toBe(true);
  });
});
