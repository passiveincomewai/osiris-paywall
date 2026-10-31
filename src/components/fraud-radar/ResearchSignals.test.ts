import { describe, it, expect, vi, afterEach } from "vitest";
import React from "react";
import { renderToString } from "react-dom/server";
import { fileURLToPath } from "node:url";
import { ResearchSignalsSection } from "./ResearchSignals";

/**
 * Research signals profile section tests (Phase 6, Payload B2):
 * the shared section renders an entity's published leads with the
 * full provenance block as UI (rule name from the catalog, entity
 * value vs peer median, percentile band, effect size, peer
 * definition + rung + n, input versions), the honest no-leads
 * state, the labelled not-computed state with its reason, and
 * class-S screening records in their own block. The negative
 * case is pinned explicitly: S-06 candidate pairs never render
 * in this public component, even though the cross fixture bucket
 * deliberately carries one.
 */
const FIXTURES = fileURLToPath(
  new URL("../../lib/fraud-radar/__fixtures__/signals", import.meta.url),
);

afterEach(() => {
  vi.unstubAllEnvs();
});

async function renderSection(props: {
  engine: "healthcare" | "care" | "grants" | "cross";
  entityKey: string;
  heading?: string;
  note?: string;
}) {
  const el = await ResearchSignalsSection(props);
  if (el === null) return null;
  return renderToString(el as React.ReactElement).replace(/<!-- -->/g, "");
}

describe("ResearchSignalsSection — fail-soft", () => {
  it("renders nothing when no signals artifact is configured", async () => {
    // No FRAUD_RADAR_SIGNALS_ARTIFACT_ROOT stubbed in this test, and
    // the loader caches only a configured root — the section is
    // absent and the profile page stands on its own data.
    const el = await ResearchSignalsSection({
      engine: "healthcare",
      entityKey: "1234567890",
    });
    expect(el).toBeNull();
  });
});

describe("ResearchSignalsSection — lead rendering with provenance", () => {
  it("renders a peer lead with name, values, band, effect size, peer block and inputs", async () => {
    vi.stubEnv("FRAUD_RADAR_SIGNALS_ARTIFACT_ROOT", FIXTURES);
    const html = await renderSection({
      engine: "healthcare",
      entityKey: "1234567890",
    });
    expect(html).not.toBeNull();
    expect(html!).toContain("Research signals — Healthcare — Medicaid");
    expect(html!).toContain(
      "Research lead — Paid per claim line above specialty-state peer band (billing)",
    );
    // Measured values + band + effect size.
    expect(html!).toContain("512.34");
    expect(html!).toContain("peer-group median of 120.5");
    expect(html!).toContain("among 214 peers");
    expect(html!).toContain("within that group");
    expect(html!).toContain("ratio to peer median 4.25×");
    expect(html!).toContain("robust distance from peer median 6.1");
    expect(html!).toContain("peer 99th percentile 480.75");
    // Peer definition + rung + n are UI, not tooltips.
    expect(html!).toContain("same NPPES primary taxonomy");
    expect(html!).toContain("Rung used: L1");
    expect(html!).toContain("Peer group size: 214");
    // Input versions + computed date + provenance verdict.
    expect(html!).toContain("nppes/2026-08 (NBER mirror of CMS NPPES)");
    expect(html!).toContain("Computed 2026-10-31");
    expect(html!).toContain("Provenance complete");
    // Catalog caveat text resolved beside the lead.
    expect(html!).toContain("NPPES identity fields come from nppes-2026-08");
    // Standing research-leads framing.
    expect(html!).toContain("research leads");
    expect(html!).toContain("never a grade");
    // Language discipline — no banned framing anywhere.
    const lower = html!.toLowerCase();
    for (const banned of [
      "fraud score",
      "risk score",
      "suspicious",
      "guilty",
      "probability of fraud",
      "worst offenders",
    ]) {
      expect(lower).not.toContain(banned);
    }
  });

  it("renders an own-history lead with its published detail figures", async () => {
    vi.stubEnv("FRAUD_RADAR_SIGNALS_ARTIFACT_ROOT", FIXTURES);
    const html = await renderSection({
      engine: "healthcare",
      entityKey: "1234567890",
    });
    // H-MCD-05 is not in the fixture catalog, so the code itself is
    // the heading — no name is invented for it.
    expect(html!).toContain("Research lead — H-MCD-05");
    expect(html!).toContain("Own history (no peer group)");
    expect(html!).toContain("step_month");
    expect(html!).toContain("2021-03-01");
    expect(html!).toContain("$55,000.00");
  });
});

describe("ResearchSignalsSection — honest empty and not-computed states", () => {
  it("renders the no-leads state for an entity with no published signals", async () => {
    vi.stubEnv("FRAUD_RADAR_SIGNALS_ARTIFACT_ROOT", FIXTURES);
    const html = await renderSection({
      engine: "grants",
      entityKey: "ABC123DEF456",
    });
    expect(html).not.toBeNull();
    expect(html!).toContain("No research signals in the current vintage");
    expect(html!).toContain("no research leads from the current rule library");
    expect(html!).toContain("absence of a lead is not a clearance");
    expect(html!).not.toContain("Research lead —");
  });

  it("renders a not-computed state with its reason — never as zero", async () => {
    vi.stubEnv("FRAUD_RADAR_SIGNALS_ARTIFACT_ROOT", FIXTURES);
    const html = await renderSection({
      engine: "healthcare",
      entityKey: "5550001111",
    });
    expect(html).not.toBeNull();
    expect(html!).toContain("Comparisons not computed for this entity");
    expect(html!).toContain("not_computed_below_activity_floor");
    expect(html!).toContain("minimum-activity floor");
    expect(html!).toContain(
      "Paid per claim line above specialty-state peer band (billing)",
    );
    // A not-computed comparison is not a lead and not a figure.
    expect(html!).not.toContain("Research lead —");
    expect(html!).not.toContain("peer-group median");
  });
});

describe("ResearchSignalsSection — cross engine and S-06 confinement", () => {
  it("renders X-990-01 with both published figures and S-01 in its own block", async () => {
    vi.stubEnv("FRAUD_RADAR_SIGNALS_ARTIFACT_ROOT", FIXTURES);
    const html = await renderSection({
      engine: "cross",
      entityKey: "ABC123DEF456",
      heading: "Research signals — cross-dataset",
    });
    expect(html).not.toBeNull();
    expect(html!).toContain("X-990-01");
    expect(html!).toContain("fac_total_amount_expended");
    expect(html!).toContain("$200,000.00");
    expect(html!).toContain("form990_total_expenses_amt");
    expect(html!).toContain("$900,000.00");
    expect(html!).toContain("audit_year");
    // Screening records: their own block, never merged with leads.
    expect(html!).toContain("Screening records — exact-identifier listings");
    expect(html!).toContain("S-01");
    expect(html!).toContain("FIXTURE RECIPIENT");
    expect(html!).toContain("never merged with rule leads");
  });

  it("never renders S-06 candidate pairs in a public section", async () => {
    vi.stubEnv("FRAUD_RADAR_SIGNALS_ARTIFACT_ROOT", FIXTURES);
    const html = await renderSection({
      engine: "cross",
      entityKey: "ABC123DEF456",
    });
    // The fixture bucket deliberately carries an S-06 row in its
    // screeningRecords; neither the code nor its constant status
    // may appear in any public render.
    expect(html).not.toBeNull();
    expect(html!).not.toContain("S-06");
    expect(html!).not.toContain("candidate — human review");
    expect(html!).not.toContain("candidate-queue");
  });
});
