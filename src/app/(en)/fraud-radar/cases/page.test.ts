import { describe, it, expect, vi, afterEach } from "vitest";
import React from "react";
import { renderToString } from "react-dom/server";
import CasesPage from "./page";
import {
  CaseCard,
  CasesEmptyState,
  CasesSignInState,
  UsageSummary,
  formatBytes,
  type WireCase,
  type WireUsage,
} from "./CasesClient";
import { RESEARCH_LEADS_NOTE } from "@/lib/fraud-radar/investigator/guardrails";

// The page SSR-renders the client surface, which calls
// useRouter for post-create navigation; no app router is
// mounted in a unit render, so the hook is stubbed (the real
// notFound gate is preserved via importOriginal).
vi.mock("next/navigation", async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>;
  return {
    ...actual,
    useRouter: () => ({ push: () => {}, replace: () => {}, refresh: () => {} }),
  };
});

/**
 * Payload P8-D — case list surface fixtures: the page is
 * flag-gated, renders the standing research-leads framing
 * verbatim from its single source, and its presentational
 * pieces render exactly the wire shapes the P8-A API returns
 * (the caller's cases + server-derived usage posture).
 */

const CASE: WireCase = {
  id: "case_1",
  title: "Review of a recipient's awards",
  summary: "My own framing of the matter.",
  status: "open",
  visibility: "private",
  teamRef: null,
  closedAt: null,
  createdAt: "2026-10-30T00:00:00.000Z",
  updatedAt: "2026-10-31T00:00:00.000Z",
  counts: { leads: 3, evidence: 2, notes: 4, claims: 1 },
};

const USAGE: WireUsage = {
  tier: "pro",
  openCases: 2,
  maxOpenCases: 200,
  vaultEnabled: true,
  storageBytesUsed: "1500000",
  maxVaultBytes: "5000000000",
  verificationsThisMonth: 7,
  verificationsPerMonth: 300,
  resetAt: "2026-11-01T00:00:00.000Z",
};

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("/fraud-radar/cases — flag gate + framing", () => {
  it("404s while FRAUD_RADAR_ENABLED is off (the default)", () => {
    vi.stubEnv("FRAUD_RADAR_ENABLED", "");
    let thrown: unknown;
    try {
      CasesPage();
    } catch (e) {
      thrown = e;
    }
    const digest = (thrown as { digest?: string })?.digest ?? "";
    expect(
      digest === "NEXT_NOT_FOUND" || digest.startsWith("NEXT_HTTP_ERROR_FALLBACK;404"),
    ).toBe(true);
  });

  it("renders the standing framing verbatim when enabled", () => {
    vi.stubEnv("FRAUD_RADAR_ENABLED", "1");
    const html = renderToString(React.createElement(CasesPage)).replace(/<!-- -->/g, "");
    expect(html).toContain("Your research cases.");
    expect(html).toContain("visible only to you");
    // The research-leads framing is the single-source text, verbatim.
    expect(html).toContain("never a statement of how likely wrongdoing is");
    expect(RESEARCH_LEADS_NOTE).toContain("research leads");
  });
});

describe("case list — persisted-state rendering", () => {
  it("renders a case card from the API wire shape", () => {
    const html = renderToString(React.createElement(CaseCard, { c: CASE })).replace(
      /<!-- -->/g,
      "",
    );
    expect(html).toContain("Review of a recipient&#x27;s awards");
    expect(html).toContain("/fraud-radar/cases/case_1");
    expect(html).toContain("3 leads");
    expect(html).toContain("2 evidence");
    expect(html).toContain("1 claims");
    expect(html).toContain("open");
  });

  it("renders the usage posture from server-derived figures", () => {
    const html = renderToString(React.createElement(UsageSummary, { usage: USAGE })).replace(
      /<!-- -->/g,
      "",
    );
    expect(html).toContain("2 of 200");
    expect(html).toContain("1.5 MB of 5.00 GB");
    expect(html).toContain("7 of 300");
    expect(html).toContain("2026-11-01");
  });

  it("states the vault-closed posture honestly for a free-tier usage", () => {
    const html = renderToString(
      React.createElement(UsageSummary, {
        usage: { ...USAGE, tier: "free", vaultEnabled: false, maxVaultBytes: "0" },
      }),
    );
    expect(html).toContain("file uploads are not enabled on your plan");
  });

  it("renders the empty state with the cases explanation", () => {
    const html = renderToString(React.createElement(CasesEmptyState));
    expect(html).toContain("No cases yet");
    expect(html).toContain("freezes the record with its method and data vintages");
    expect(html).toContain("never a determination about its subjects");
  });

  it("renders the sign-in state for a signed-out caller", () => {
    const html = renderToString(React.createElement(CasesSignInState));
    expect(html).toContain("Sign in to use cases");
    expect(html).toContain('href="/signin"');
  });

  it("formats byte counts without inventing precision", () => {
    expect(formatBytes("0")).toBe("0 B");
    expect(formatBytes(1500)).toBe("1.5 KB");
    expect(formatBytes("5000000000")).toBe("5.00 GB");
  });
});
