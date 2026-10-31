import { describe, it, expect, vi, afterEach } from "vitest";
import React from "react";
import { renderToString } from "react-dom/server";
import FraudRadarPage from "./page";

/**
 * Route flag tests (AUDIT §13.3/§14.3): flag off ⇒ the page throws
 * Next's not-found signal (a 404 in production, indistinguishable from
 * the route not existing); flag on ⇒ the shell renders with the DOJ's
 * published WHIP facts and no reward promises.
 */
afterEach(() => {
  vi.unstubAllEnvs();
});

describe("/fraud-radar — flag gate", () => {
  it("404s while FRAUD_RADAR_ENABLED is off (the default)", () => {
    vi.stubEnv("FRAUD_RADAR_ENABLED", "");
    let thrown: unknown;
    try {
      FraudRadarPage();
    } catch (e) {
      thrown = e;
    }
    const digest = (thrown as { digest?: string })?.digest ?? "";
    expect(
      digest === "NEXT_NOT_FOUND" || digest.startsWith("NEXT_HTTP_ERROR_FALLBACK;404"),
    ).toBe(true);
  });

  it("renders the shell when enabled, with published WHIP facts only", () => {
    vi.stubEnv("FRAUD_RADAR_ENABLED", "1");
    const html = renderToString(React.createElement(FraudRadarPage));
    expect(html).toContain("Government spending intelligence");
    expect(html).toContain("Healthcare &amp; Care Programs");
    expect(html).toContain("Government Grants");
    expect(html).toContain("Government Contracts");
    // The DOJ published framework, verbatim facts:
    expect(html).toContain("$10,000 to $30,000");
    expect(html).toContain("sole discretion");
    expect(html).toContain("america.gov/fraud");
    // The honesty lines:
    expect(html).toContain("does not determine that any person or organization has");
    expect(html).toContain("never submits allegations on your behalf");
    // Phase 6 signals entry section (existing sections unchanged).
    expect(html).toContain("Research signals — statistical intelligence");
    expect(html).toContain("/fraud-radar/signals");
    expect(html).toContain("/fraud-radar/signals/methods");
    expect(html).toContain("not yet computed");
  });

  it("never promises the announced 1% commission anywhere on the page", () => {
    vi.stubEnv("FRAUD_RADAR_ENABLED", "1");
    const html = renderToString(React.createElement(FraudRadarPage));
    expect(html).not.toContain("1%");
    expect(html.toLowerCase()).not.toContain("guaranteed");
  });
});
