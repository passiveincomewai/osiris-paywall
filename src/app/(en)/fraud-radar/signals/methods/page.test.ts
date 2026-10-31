import { describe, it, expect, vi, beforeAll, afterEach } from "vitest";
import { renderToString } from "react-dom/server";
import { fileURLToPath } from "node:url";

/**
 * Signals methods tests (Phase 6, Payload B1): flag gate, and the
 * methods content the design binds — the three-part lead test, peer
 * construction with rungs and the minimum peer size, the
 * not-computed vocabulary, by-construction disclosure, the
 * no-composite-scores rule, dataset vintages, and the honest
 * model deferral (deterministic rules in v1, zero model rows).
 */
import SignalsMethodsPage from "./page";

const FIXTURES = fileURLToPath(
  new URL("../../../../../lib/fraud-radar/__fixtures__/signals", import.meta.url),
);

beforeAll(() => {
  vi.stubEnv("FRAUD_RADAR_SIGNALS_ARTIFACT_ROOT", FIXTURES);
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.stubEnv("FRAUD_RADAR_SIGNALS_ARTIFACT_ROOT", FIXTURES);
});

describe("/fraud-radar/signals/methods — flag gate + methods", () => {
  it("404s while FRAUD_RADAR_ENABLED is off", async () => {
    vi.stubEnv("FRAUD_RADAR_ENABLED", "");
    let digest = "";
    try {
      await SignalsMethodsPage();
    } catch (e) {
      digest = (e as { digest?: string })?.digest ?? "";
    }
    expect(
      digest === "NEXT_NOT_FOUND" ||
        digest.startsWith("NEXT_HTTP_ERROR_FALLBACK;404"),
    ).toBe(true);
  });

  it("states the lead test, peer construction and the not-computed vocabulary", async () => {
    vi.stubEnv("FRAUD_RADAR_ENABLED", "1");
    const html = renderToString(await SignalsMethodsPage());
    expect(html).toContain("How research signals are computed");
    // The three-part lead test.
    expect(html).toContain("Band.");
    expect(html).toContain("Effect floor.");
    expect(html).toContain("Activity floor.");
    expect(html).toContain("99th percentile");
    // Peer construction: minimum size + rungs.
    expect(html).toContain("30 entities");
    expect(html).toContain("fallback ladder");
    expect(html).toContain("taxonomy");
    // Not-computed vocabulary, every state.
    for (const s of [
      "not_computed_peer_group_too_small",
      "not_computed_missing_peer_key",
      "not_computed_below_activity_floor",
      "not_computed_suppressed_source",
      "not_computed_period_unaligned",
      "not_computed_input_not_published",
    ]) {
      expect(html).toContain(s);
    }
    expect(html).toContain("Missing is never zero");
    // By-construction disclosure.
    expect(html).toContain("By-construction counts, published");
    expect(html).toContain("expected-by-construction");
    // No composite scores, and why.
    expect(html).toContain("No composite scores");
    expect(html).toContain("never ranked against each other");
  });

  it("states the language rules, vintages and the model deferral honestly", async () => {
    vi.stubEnv("FRAUD_RADAR_ENABLED", "1");
    const html = renderToString(await SignalsMethodsPage());
    expect(html).toContain("research leads");
    expect(html).toContain("never a grade");
    // Vintages from the fixture dataset meta.
    expect(html).toContain("2026-02-09+2022-2024+2026-10-06");
    expect(html).toContain("1.1.0");
    // PyOD / model posture: designed, deferred, zero model rows.
    expect(html).toContain("deterministic rule");
    expect(html).toContain("has not shipped");
    expect(html).toContain("zero");
    expect(html).toContain("model-derived rows");
    const lower = html.toLowerCase();
    for (const banned of ["fraud score", "risk score", "suspicious", "guilty"]) {
      expect(lower).not.toContain(banned);
    }
  });
});
