import { describe, it, expect, vi, beforeAll, beforeEach, afterEach } from "vitest";
import { renderToString } from "react-dom/server";
import { fileURLToPath } from "node:url";

/**
 * Grant recipient profile tests (Phase 4): identity + SAM extract
 * labels, award-cumulative totals, FAC block vs the explicit
 * no-coverage note (absence, never zero findings), subawards, and
 * the screening caveats verbatim (extract records; LEIE name
 * candidates for human review — never "matches").
 */
import GrantRecipientProfilePage from "./page";

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

const render = async (uei: string) =>
  renderToString(
    await GrantRecipientProfilePage({ params: Promise.resolve({ uei }) }),
  );

describe("/fraud-radar/grants/recipients/[uei] — profile", () => {
  it("renders identity, totals, FAC and screening with caveats", async () => {
    vi.stubEnv("FRAUD_RADAR_ENABLED", "1");
    const html = await render("ABC123DEF456");
    expect(html).toContain("ACME CORPORATION");
    expect(html).toContain("ACME CORP");
    expect(html).toContain("SAM entities extract 2026-10-05");
    expect(html).toContain("$5,000,000.50");
    expect(html).toContain("award-cumulative");
    expect(html).toContain("10.001");
    expect(html).toContain("FAIN-001");
    expect(html).toContain("Single Audit");
    expect(html).toContain("Questioned-cost flags");
    expect(html).toContain("flags only");
    // Subawards given/received from the fixture totals.
    expect(html).toContain("Given as a prime recipient");
    expect(html).toContain("Received as a subrecipient");
    // Screening: counted zero in the named extract + LEIE candidates.
    expect(html).toContain("extract 2026-301");
    expect(html).toContain("counted zero in that extract");
    expect(html).toContain("name candidate");
    expect(html).toContain("not identity matches");
    expect(html).toContain("research leads");
  });

  it("renders the explicit no-coverage note when there is no FAC record", async () => {
    vi.stubEnv("FRAUD_RADAR_ENABLED", "1");
    const html = await render("ABC123XYZ000");
    expect(html).toContain("BETA FOUNDATION");
    expect(html).toContain("No public single-audit (FAC) record");
    expect(html).toContain("below the single-audit expenditure threshold");
    expect(html).toContain("never zero findings");
    // SAM listings are records in the named extract.
    expect(html).toContain("listing record");
    expect(html).toContain("SAM exclusions extract 2026-301");
    expect(html).toContain("2023-06-01");
  });

  it("404s for an unknown UEI while enabled", async () => {
    vi.stubEnv("FRAUD_RADAR_ENABLED", "1");
    let digest = "";
    try {
      await GrantRecipientProfilePage({
        params: Promise.resolve({ uei: "ZZZ999ZZZ999" }),
      });
    } catch (e) {
      digest = (e as { digest?: string })?.digest ?? "";
    }
    expect(
      digest === "NEXT_NOT_FOUND" ||
        digest.startsWith("NEXT_HTTP_ERROR_FALLBACK;404"),
    ).toBe(true);
  });

  it("404s while the flag is off, even for a real UEI", async () => {
    vi.stubEnv("FRAUD_RADAR_ENABLED", "");
    let digest = "";
    try {
      await GrantRecipientProfilePage({
        params: Promise.resolve({ uei: "ABC123DEF456" }),
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

describe("/fraud-radar/grants/recipients/[uei] — research signals (Phase 6 B2)", () => {
  const SIGNALS = fileURLToPath(
    new URL("../../../../../../lib/fraud-radar/__fixtures__/signals", import.meta.url),
  );
  beforeEach(() => {
    vi.stubEnv("FRAUD_RADAR_SIGNALS_ARTIFACT_ROOT", SIGNALS);
  });

  it("renders grants + cross sections; X-990-01 and S-01 surface, S-06 never does", async () => {
    vi.stubEnv("FRAUD_RADAR_ENABLED", "1");
    const html = await render("ABC123DEF456");
    expect(html).toContain("Research signals — grants rules");
    expect(html).toContain("Research signals — cross-dataset");
    // The cross fixture keys this UEI's X-990-01 lead + S-01 record
    // exactly as the data layer exposes them.
    expect(html).toContain("X-990-01");
    expect(html).toContain("fac_total_amount_expended");
    expect(html).toContain("form990_total_expenses_amt");
    expect(html).toContain("Screening records — exact-identifier listings");
    expect(html).toContain("S-01");
    // The keying note states the EIN grain honestly.
    expect(html).toContain("EIN grain");
    // S-06 is confined to the admin queue — the fixture bucket
    // deliberately carries a candidate row and it must not render.
    expect(html).not.toContain("S-06");
    expect(html).not.toContain("candidate — human review");
  });
});
