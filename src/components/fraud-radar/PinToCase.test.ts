import { describe, it, expect } from "vitest";
import React from "react";
import { renderToString } from "react-dom/server";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import PinToCase, {
  PinToCasePicker,
  buildPinBody,
  pinKindAllowed,
} from "./PinToCase";

/**
 * Payload P8-D — PinToCase contract tests (PHASE8 §5.1, §1.3
 * rules 3–4): the component carries identifiers only (the
 * server captures the snapshot), it is invisible until a
 * signed-in caller's cases load, and the candidate (S-06)
 * kind is refused in every non-admin context.
 */

const SRC = fileURLToPath(new URL("../../", import.meta.url));

describe("PinToCase — identifiers only (§1.3 rule 3)", () => {
  it("builds a pin body of identifiers and nothing else", () => {
    const body = buildPinBody({
      engine: "grants",
      entityKey: "ABC123DEF456",
      ruleCode: "G-01",
      kind: "signal",
    });
    expect(Object.keys(body).sort()).toEqual(["engine", "entityKey", "kind", "ruleCode"]);
    expect(body).not.toHaveProperty("snapshot");
    expect(body).not.toHaveProperty("snapshotSha256");
    expect(body).not.toHaveProperty("data");
  });

  it("omits ruleCode for entity pins", () => {
    const body = buildPinBody({ engine: "healthcare", entityKey: "1234567890", kind: "entity" });
    expect(Object.keys(body).sort()).toEqual(["engine", "entityKey", "kind"]);
  });
});

describe("PinToCase — S-06 confinement (§1.3 rule 4)", () => {
  it("refuses the candidate kind outside an admin context", () => {
    expect(pinKindAllowed("candidate", false)).toBe(false);
    expect(pinKindAllowed("candidate", true)).toBe(true);
    expect(pinKindAllowed("signal", false)).toBe(true);
    expect(pinKindAllowed("screening", false)).toBe(true);
    expect(pinKindAllowed("entity", false)).toBe(true);
  });

  it("renders nothing for a candidate pin in a non-admin context", () => {
    const html = renderToString(
      React.createElement(PinToCase, {
        engine: "cross",
        entityKey: "1234567890",
        ruleCode: "S-06",
        kind: "candidate" as const,
      }),
    );
    expect(html).toBe("");
  });

  it("renders nothing before the caller's cases load (signed-out / flag-off posture)", () => {
    const html = renderToString(
      React.createElement(PinToCase, {
        engine: "grants",
        entityKey: "ABC123DEF456",
        kind: "entity" as const,
      }),
    );
    expect(html).toBe("");
  });
});

describe("PinToCasePicker — the case picker", () => {
  const cases = [
    { id: "case_1", title: "First matter" },
    { id: "case_2", title: "Second matter" },
  ];

  it("renders the caller's cases once open and reports the pinned state", () => {
    const html = renderToString(
      React.createElement(PinToCasePicker, {
        identifiers: { engine: "care", entityKey: "1234567890", kind: "entity" as const },
        cases,
        status: { state: "pinned" as const, caseTitle: "First matter", created: true },
        onPin: () => {},
        onCreateAndPin: () => {},
      }),
    );
    expect(html).toContain("Pinned to case");
    expect(html).toContain("First matter");
  });

  it("renders the already-pinned state distinctly (coalesced re-pin)", () => {
    const html = renderToString(
      React.createElement(PinToCasePicker, {
        identifiers: { engine: "care", entityKey: "1234567890", kind: "entity" as const },
        cases,
        status: { state: "pinned" as const, caseTitle: "Second matter", created: false },
        onPin: () => {},
        onCreateAndPin: () => {},
      }),
    );
    expect(html).toContain("Already pinned in case");
  });
});

describe("PinToCase — wiring pins over the shipped surfaces", () => {
  it("ResearchSignalsSection pins leads + screening records, never candidates", () => {
    const src = readFileSync(
      path.join(SRC, "components/fraud-radar/ResearchSignals.tsx"),
      "utf8",
    );
    expect(src).toContain('kind="signal"');
    expect(src).toContain('kind="screening"');
    expect(src).not.toContain('kind="candidate"');
    expect(src).not.toContain('ruleCode="S-06"');
  });

  it("the three profile families carry entity pins with their engines", () => {
    const grants = readFileSync(
      path.join(SRC, "app/(en)/fraud-radar/grants/recipients/[uei]/page.tsx"),
      "utf8",
    );
    expect(grants).toContain('engine="grants"');
    expect(grants).toContain('kind="entity"');
    const healthcare = readFileSync(
      path.join(SRC, "app/(en)/fraud-radar/healthcare/providers/[npi]/page.tsx"),
      "utf8",
    );
    expect(healthcare).toContain('engine="healthcare"');
    expect(healthcare).toContain('kind="entity"');
    const care = readFileSync(
      path.join(SRC, "app/(en)/fraud-radar/care/medicare/[npi]/page.tsx"),
      "utf8",
    );
    expect(care).toContain('engine="care"');
    expect(care).toContain('kind="entity"');
  });
});
