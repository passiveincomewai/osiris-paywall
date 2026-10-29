import { describe, it, expect, vi, beforeAll, afterEach } from "vitest";
import React from "react";
import { renderToString } from "react-dom/server";
import { fileURLToPath } from "node:url";

/**
 * Medicare provider profile tests (Phase 3): yearly blocks only for
 * published years (2023 absent for the fixture provider — never a
 * zero year), derived labels, and the LEIE research-lead block with
 * its timing caveats.
 */
import MedicareProfilePage from "./page";

const FIXTURES = fileURLToPath(
  new URL("../../../../../../lib/fraud-radar/__fixtures__/care", import.meta.url),
);

beforeAll(() => {
  vi.stubEnv("FRAUD_RADAR_CARE_ARTIFACT_ROOT", FIXTURES);
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.stubEnv("FRAUD_RADAR_CARE_ARTIFACT_ROOT", FIXTURES);
});

const render = async (npi: string) =>
  renderToString(
    await MedicareProfilePage({ params: Promise.resolve({ npi }) }),
  );

describe("/fraud-radar/care/medicare/[npi] — profile", () => {
  it("renders yearly blocks and the services breakdown", async () => {
    vi.stubEnv("FRAUD_RADAR_ENABLED", "1");
    const html = await render("1234567890");
    expect(html).toContain("SMITH, JOHN");
    expect(html).toContain("2022");
    expect(html).toContain("2024");
    expect(html).toContain("$1,000.00");
    expect(html).toContain("99213");
    expect(html).toContain("/fraud-radar/care/hcpcs/99213");
    expect(html).toContain("never a zero year");
    expect(html).toContain("No exact-NPI match in the LEIE snapshot");
  });

  it("renders the LEIE block as a caveated research lead", async () => {
    vi.stubEnv("FRAUD_RADAR_ENABLED", "1");
    const html = await render("1234567899");
    expect(html).toContain("List of Excluded");
    expect(html).toContain("MANDATORY");
    expect(html).toContain("2019-05-01");
    expect(html).toContain("$250.50");
    expect(html).toContain("never a Fraud Radar finding");
  });

  it("404s for an unknown NPI while enabled", async () => {
    vi.stubEnv("FRAUD_RADAR_ENABLED", "1");
    let digest = "";
    try {
      await MedicareProfilePage({
        params: Promise.resolve({ npi: "5555555555" }),
      });
    } catch (e) {
      digest = (e as { digest?: string })?.digest ?? "";
    }
    expect(
      digest === "NEXT_NOT_FOUND" ||
        digest.startsWith("NEXT_HTTP_ERROR_FALLBACK;404"),
    ).toBe(true);
  });

  it("404s while the flag is off, even for a real NPI", async () => {
    vi.stubEnv("FRAUD_RADAR_ENABLED", "");
    let digest = "";
    try {
      await MedicareProfilePage({
        params: Promise.resolve({ npi: "1234567890" }),
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
