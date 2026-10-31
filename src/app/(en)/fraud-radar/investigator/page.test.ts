import { describe, it, expect, vi, afterEach } from "vitest";
import React from "react";
import { renderToString } from "react-dom/server";
import InvestigatorPage from "./page";
import {
  CitationChips,
  MessageView,
  UsageDisplay,
  citationLabel,
  type InvestigatorCopy,
  type WireMessage,
} from "./InvestigatorClient";
import {
  CAVEAT_TEXT,
  INVESTIGATOR_NOT_CONFIGURED_TEXT,
  RESEARCH_LEADS_NOTE,
  VALIDATOR_FALLBACK_NOTICE,
} from "@/lib/fraud-radar/investigator/guardrails";
import {
  formatCitation,
  type ToolResult,
} from "@/lib/fraud-radar/investigator/citations";

/**
 * Payload P7-C surface fixtures: the investigator page renders
 * persisted state — a stored conversation with its citation
 * record, the labelled code-rendered fallback turn, the honest
 * model-down state, and the usage display — from the same wire
 * shapes the P7-B API returns, so what a reload shows is what
 * these fixtures pin. Standing copy is asserted against the
 * guardrails constants themselves, never against retyped text.
 */

const COPY: InvestigatorCopy = {
  researchLeadsNote: RESEARCH_LEADS_NOTE,
  notConfiguredText: INVESTIGATOR_NOT_CONFIGURED_TEXT,
  fallbackNotice: VALIDATOR_FALLBACK_NOTICE,
  caveatText: CAVEAT_TEXT,
};

const GRANT_RESULT: ToolResult = {
  envelope: {
    tool: "get_grant_recipient_profile",
    dataset: "grants-aggregates",
    datasetVersion: "2026-10-06",
    grainKey: "UEI:ABC123DEF456",
    sourceVintages: [{ source: "usaspending", version: "2026-10-06" }],
    caveats: ["CUMULATIVE_AMOUNTS"],
    truncated: false,
  },
  data: { uei: "ABC123DEF456" },
};

function message(patch: Partial<WireMessage>): WireMessage {
  return {
    id: "msg_1",
    conversationId: "conv_1",
    role: "assistant",
    content: "",
    toolCalls: null,
    model: "gemini-2.0-flash",
    promptVersion: "1.0.0",
    inputTokens: 10,
    outputTokens: 20,
    validatorVerdict: "pass",
    status: "complete",
    errorCode: null,
    createdAt: "2026-10-31T00:00:00.000Z",
    ...patch,
  };
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("/fraud-radar/investigator — flag gate + framing", () => {
  it("404s while FRAUD_RADAR_ENABLED is off (the default)", () => {
    vi.stubEnv("FRAUD_RADAR_ENABLED", "");
    let thrown: unknown;
    try {
      InvestigatorPage();
    } catch (e) {
      thrown = e;
    }
    const digest = (thrown as { digest?: string })?.digest ?? "";
    expect(
      digest === "NEXT_NOT_FOUND" || digest.startsWith("NEXT_HTTP_ERROR_FALLBACK;404"),
    ).toBe(true);
  });

  it("renders the standing framing from the guardrails constants when enabled", () => {
    vi.stubEnv("FRAUD_RADAR_ENABLED", "1");
    const html = renderToString(React.createElement(InvestigatorPage));
    expect(html).toContain("AI Investigator");
    expect(html).toContain("research assistant over the public records");
    expect(html).toContain("does not determine that any person or organization");
    // The research-leads framing is the guardrails text, verbatim.
    expect(html).toContain("never a statement of how likely wrongdoing is");
    expect(html).toContain("visible only to you");
  });
});

describe("investigator surface — persisted turns", () => {
  it("renders a persisted answer with its citation chips, caveats and profile link", () => {
    const html = renderToString(
      React.createElement(MessageView, {
        message: message({
          content: "The published record for this recipient is shown below.",
          toolCalls: [GRANT_RESULT],
        }),
        copy: COPY,
      }),
    );
    expect(html).toContain("The published record for this recipient is shown below.");
    // The chip is the §2.3 citation form, identical to the lib formatter.
    expect(citationLabel(GRANT_RESULT.envelope)).toBe(
      formatCitation(GRANT_RESULT.envelope),
    );
    expect(html).toContain("grants-aggregates@2026-10-06");
    expect(html).toContain("UEI:ABC123DEF456");
    expect(html).toContain("/fraud-radar/grants/recipients/ABC123DEF456");
    // The envelope's caveat code resolves to the guardrails text.
    expect(html).toContain("Award-cumulative amounts");
    expect(html).not.toContain("Code-rendered results");
  });

  it("renders citation chips standalone from the persisted record", () => {
    const html = renderToString(
      React.createElement(CitationChips, {
        results: [GRANT_RESULT],
        caveatText: CAVEAT_TEXT,
      }),
    );
    expect(html).toContain("Sources cited in this answer");
    expect(html).toContain(formatCitation(GRANT_RESULT.envelope));
  });

  it("labels the validator-fallback turn as code-rendered results, with the notice", () => {
    const table =
      "The assistant's draft answer contained figures that could not be verified against the tool results, so the verified results are shown directly.\n\n### get_grant_recipient_profile — grants-aggregates@2026-10-06 · UEI:ABC123DEF456";
    const html = renderToString(
      React.createElement(MessageView, {
        message: message({
          content: table,
          toolCalls: [GRANT_RESULT],
          validatorVerdict: "fallback",
        }),
        copy: COPY,
      }),
    );
    expect(html).toContain("Code-rendered results — not an assistant answer.");
    expect(html).toContain(
      "The assistant&#x27;s draft answer contained figures that could not be verified",
    );
    expect(html).toContain("get_grant_recipient_profile");
  });

  it("renders the honest error state for a failed turn (model down)", () => {
    const html = renderToString(
      React.createElement(MessageView, {
        message: message({
          content: "",
          status: "error",
          errorCode: "PROVIDER_UNAVAILABLE",
          validatorVerdict: null,
        }),
        copy: COPY,
      }),
    );
    expect(html).toContain("The investigator service is unavailable right now.");
    expect(html).toContain("was not charged");
  });

  it("renders the model-down deployment text from the guardrails constant", () => {
    expect(INVESTIGATOR_NOT_CONFIGURED_TEXT).toBe(
      "The investigator isn't available on this deployment yet.",
    );
    expect(COPY.notConfiguredText).toBe(INVESTIGATOR_NOT_CONFIGURED_TEXT);
  });

  it("renders a user turn as the user's own words", () => {
    const html = renderToString(
      React.createElement(MessageView, {
        message: message({ role: "user", content: "What is published for UEI ABC123DEF456?" }),
        copy: COPY,
      }),
    );
    expect(html).toContain("What is published for UEI ABC123DEF456?");
    expect(html).not.toContain("Sources cited");
  });
});

describe("investigator surface — usage display", () => {
  it("shows ops used / allowance and the reset date from the API summary", () => {
    const html = renderToString(
      React.createElement(UsageDisplay, {
        usage: {
          tier: "free",
          limit: 5,
          used: 3,
          remaining: 2,
          resetAt: "2026-11-01T00:00:00.000Z",
        },
      }),
    );
    expect(html).toContain("3 of 5 research operations used this month");
    expect(html).toContain("free tier");
    expect(html).toContain("2026-11-01");
  });
});
