import { describe, it, expect, vi, beforeAll, afterEach } from "vitest";
import React from "react";
import { renderToString } from "react-dom/server";
import { fileURLToPath } from "node:url";

/**
 * Medicare provider search tests (Phase 3): flag gate + ranked
 * fixture results with derived amounts labelled; absence wording.
 */
import MedicareSearchPage from "./page";

const FIXTURES = fileURLToPath(
  new URL("../../../../../lib/fraud-radar/__fixtures__/care", import.meta.url),
);

beforeAll(() => {
  vi.stubEnv("FRAUD_RADAR_CARE_ARTIFACT_ROOT", FIXTURES);
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.stubEnv("FRAUD_RADAR_CARE_ARTIFACT_ROOT", FIXTURES);
});

const render = (qs: { q?: string; page?: string }) =>
  MedicareSearchPage({ searchParams: Promise.resolve(qs) });

describe("/fraud-radar/care/medicare — search", () => {
  it("404s while the flag is off", async () => {
    vi.stubEnv("FRAUD_RADAR_ENABLED", "");
    let digest = "";
    try {
      await render({ q: "1234" });
    } catch (e) {
      digest = (e as { digest?: string })?.digest ?? "";
    }
    expect(
      digest === "NEXT_NOT_FOUND" ||
        digest.startsWith("NEXT_HTTP_ERROR_FALLBACK;404"),
    ).toBe(true);
  });

  it("renders ranked results with derived labels when on", async () => {
    vi.stubEnv("FRAUD_RADAR_ENABLED", "1");
    const html = renderToString(await render({ q: "1234" }));
    expect(html).toContain("SMITH, JOHN");
    expect(html).toContain("$1,500.25");
    expect(html).toContain("derived");
    expect(html).toContain("/fraud-radar/care/medicare/1234567890");
    expect(html).toContain("DOE, JANE");
    expect(html).toContain("research lead");
  });

  it("explains absence honestly for an unknown prefix", async () => {
    vi.stubEnv("FRAUD_RADAR_ENABLED", "1");
    const html = renderToString(await render({ q: "999999" }));
    expect(html).toContain("does not mean");
    expect(html).toContain("zero activity");
  });
});
