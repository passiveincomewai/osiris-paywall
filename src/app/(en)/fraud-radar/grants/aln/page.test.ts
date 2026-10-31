import { describe, it, expect, vi, afterEach } from "vitest";
import { renderToString } from "react-dom/server";

/**
 * Grants ALN explorer tests (Phase 4): flag gate + Neon-grain rows
 * rendered with award-cumulative / attributed-year labels. The Neon
 * module is mocked — this page's contract is the grain shape.
 */
vi.mock("@/lib/fraud-radar/grants-neon", () => ({
  listGrantsYearly: async () => null,
  listGrantsAln: async () => ({
    total: 1,
    rows: [
      {
        aln: "93.498",
        alnTitle: "Example Program",
        attributedFiscalYear: 2025,
        awards: 5,
        distinctRecipients: 4,
        obligatedAwardCumulativeUsd: 2000000,
      },
    ],
  }),
  listGrantsAgency: async () => null,
  getGrantsAlnSummary: async () => null,
  listFacYearly: async () => null,
}));

import GrantsAlnPage from "./page";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("/fraud-radar/grants/aln — explorer", () => {
  it("404s while the flag is off", async () => {
    vi.stubEnv("FRAUD_RADAR_ENABLED", "");
    let digest = "";
    try {
      await GrantsAlnPage({ searchParams: Promise.resolve({}) });
    } catch (e) {
      digest = (e as { digest?: string })?.digest ?? "";
    }
    expect(
      digest === "NEXT_NOT_FOUND" ||
        digest.startsWith("NEXT_HTTP_ERROR_FALLBACK;404"),
    ).toBe(true);
  });

  it("renders listing rows with cumulative labels when on", async () => {
    vi.stubEnv("FRAUD_RADAR_ENABLED", "1");
    const html = renderToString(
      await GrantsAlnPage({ searchParams: Promise.resolve({}) }),
    );
    expect(html).toContain("93.498");
    expect(html).toContain("Example Program");
    expect(html).toContain("$2,000,000.00");
    expect(html).toContain("Obligated (award-cumulative)");
    expect(html).toContain("/fraud-radar/grants/aln/93.498");
    expect(html).toContain("attributed fiscal year");
  });
});
