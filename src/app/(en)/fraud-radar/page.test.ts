import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import React from "react";
import { renderToString } from "react-dom/server";

/**
 * Route flag tests (AUDIT §13.3/§14.3): flag off ⇒ the page throws
 * Next's not-found signal (a 404 in production, indistinguishable from
 * the route not existing); flag on ⇒ the shell renders with the DOJ's
 * published WHIP facts and no reward promises.
 *
 * Admin preview (2026-11-10): with the flag still off, the gate also
 * admits an admin session (fraudRadarAdminPreview, pinned for real in
 * lib/fraud-radar/access.test.ts). The preview leg is mocked here so
 * these tests pin the page's composition of the two legs; the default
 * mock is "no preview", i.e. the pre-preview behaviour.
 */
const previewMock = vi.fn(async () => false);
vi.mock("@/lib/fraud-radar/access", () => ({
  fraudRadarAdminPreview: () => previewMock(),
}));

import FraudRadarPage from "./page";

beforeEach(() => {
  previewMock.mockReset();
  previewMock.mockResolvedValue(false);
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("/fraud-radar — flag gate", () => {
  it("404s while FRAUD_RADAR_ENABLED is off (the default)", async () => {
    vi.stubEnv("FRAUD_RADAR_ENABLED", "");
    let thrown: unknown;
    try {
      await FraudRadarPage();
    } catch (e) {
      thrown = e;
    }
    const digest = (thrown as { digest?: string })?.digest ?? "";
    expect(
      digest === "NEXT_NOT_FOUND" || digest.startsWith("NEXT_HTTP_ERROR_FALLBACK;404"),
    ).toBe(true);
  });

  it("renders for an admin preview session while the flag is off", async () => {
    vi.stubEnv("FRAUD_RADAR_ENABLED", "");
    previewMock.mockResolvedValue(true);
    const el = await FraudRadarPage();
    const html = renderToString(el);
    expect(html).toContain("Government spending intelligence");
  });

  it("renders the shell when enabled, with published WHIP facts only", async () => {
    vi.stubEnv("FRAUD_RADAR_ENABLED", "1");
    const el = await FraudRadarPage();
    const html = renderToString(el);
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
    // Phase 7 investigator entry (P7-C): a shell section linking the
    // signed-in surface — the route itself stays out of the public
    // path list (pinned in flag.test.ts / isolation).
    expect(html).toContain("Ask the records: the AI Investigator");
    expect(html).toContain("/fraud-radar/investigator");
    expect(html).toContain("Sign-in required");
    expect(html).toContain("does not determine that any person or");
  });

  it("never promises the announced 1% commission anywhere on the page", async () => {
    vi.stubEnv("FRAUD_RADAR_ENABLED", "1");
    const el = await FraudRadarPage();
    const html = renderToString(el);
    expect(html).not.toContain("1%");
    expect(html.toLowerCase()).not.toContain("guaranteed");
  });
});
