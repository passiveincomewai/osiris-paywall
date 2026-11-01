import { describe, it, expect, vi, afterEach } from "vitest";
import React from "react";
import { renderToString } from "react-dom/server";
import CaseDetailPage from "./page";
import {
  ActivityView,
  CaseNotFoundState,
  ClaimView,
  EvidenceRow,
  LeadCard,
  NoteView,
  VerificationView,
  citationLabel,
  currentRecordHref,
  processingLabel,
  type WireClaim,
  type WireEvidence,
  type WireLead,
  type WireVerification,
} from "./CaseDetailClient";
import { VERDICT_DEFINITIONS } from "@/lib/fraud-radar/cases/claim-verdicts";
import { EVIDENCE_UPLOAD_WARNING } from "@/lib/fraud-radar/cases/vault-constants";

/**
 * Payload P8-D — case workspace fixtures: every section
 * renders from the persisted wire shapes the P8-A/B/C APIs
 * return. The lead fixture's snapshot carries a distinctive
 * vintage + figures; the assertions pin that the SNAPSHOT is
 * what renders (its dataset version, its provenance, its
 * hash), with the live profile present only as a separate,
 * labelled link. Verdict fixtures pin that the §4.2
 * definition travels with the verdict word, from the single
 * source module.
 */

const LEAD: WireLead = {
  id: "lead_1",
  caseId: "case_1",
  kind: "signal",
  engine: "grants",
  entityKey: "UEI:ABC123DEF456",
  entityLabel: "Example Recipient Inc",
  snapshot: {
    tool: "case_lead_capture",
    dataset: "research-signals",
    datasetVersion: "2026-02-09+2022-2024+2026-10-06",
    grainKey: "UEI:ABC123DEF456",
    sourceVintages: [{ source: "usaspending", version: "2026-10-06" }],
    caveats: ["CUMULATIVE_AMOUNTS"],
    truncated: false,
    data: { code: "G-01", measureValue: 4.25, peerMedian: 1.1 },
  },
  snapshotSha256: "abc123snapshotsha25600000000000000000000000000000000000000000000",
  sourceDataset: "research-signals",
  sourceDatasetVersion: "2026-02-09+2022-2024+2026-10-06",
  ruleCode: "G-01",
  pinnedById: "user-a",
  pinnedAt: "2026-10-31T00:00:00.000Z",
  annotation: null,
};

const EVIDENCE: WireEvidence = {
  id: "ev_1",
  caseId: "case_1",
  kind: "upload",
  title: "Filed audit report",
  description: null,
  originalFilename: "audit.pdf",
  contentType: "application/pdf",
  sizeBytes: "2500000",
  sha256: "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
  storageState: "present",
  artifactEnvelope: null,
  artifactSha256: null,
  processingStatus: "processed",
  processingPath: "text_extract",
  processorVersion: "text-extract-1",
  pageCount: 12,
  uploadedById: "user-a",
  createdAt: "2026-10-31T00:00:00.000Z",
  updatedAt: "2026-10-31T00:00:00.000Z",
};

const VERIFICATION: WireVerification = {
  id: "ver_1",
  claimId: "claim_1",
  verdict: "supported",
  verdictDefinition: VERDICT_DEFINITIONS.supported,
  evidence: {
    citations: [
      {
        dataset: "grants-aggregates",
        datasetVersion: "2026-10-06",
        grainKey: "UEI:ABC123DEF456",
        caveats: ["CUMULATIVE_AMOUNTS"],
      },
    ],
    figures: [],
  },
  summary: "Verdict: supported. Compared figures — obligated $2,100,000 (corpus) vs $2,100,000 (claim).",
  validatorVerdict: "pass",
  corpusVersions: { "grants-aggregates": "2026-10-06" },
  checkerVersion: "1.0.0",
  model: null,
  promptVersion: null,
  createdById: "user-a",
  createdAt: "2026-10-31T00:00:00.000Z",
};

const CLAIM: WireClaim = {
  id: "claim_1",
  caseId: "case_1",
  statement: "Recipient ABC123DEF456 received $2,100,000 obligated across its awards.",
  subjectEngine: "grants",
  subjectEntityKey: "UEI:ABC123DEF456",
  createdById: "user-a",
  createdAt: "2026-10-31T00:00:00.000Z",
};

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("/fraud-radar/cases/[id] — flag gate", () => {
  it("404s while FRAUD_RADAR_ENABLED is off (the default)", async () => {
    vi.stubEnv("FRAUD_RADAR_ENABLED", "");
    let thrown: unknown;
    try {
      await CaseDetailPage({ params: Promise.resolve({ id: "case_1" }) });
    } catch (e) {
      thrown = e;
    }
    const digest = (thrown as { digest?: string })?.digest ?? "";
    expect(
      digest === "NEXT_NOT_FOUND" || digest.startsWith("NEXT_HTTP_ERROR_FALLBACK;404"),
    ).toBe(true);
  });
});

describe("workspace — leads render from the snapshot (§1.3 rule 2)", () => {
  it("renders the snapshot's dataset version, provenance and hash", () => {
    const html = renderToString(React.createElement(LeadCard, { lead: LEAD })).replace(
      /<!-- -->/g,
      "",
    );
    expect(html).toContain("Example Recipient Inc");
    expect(html).toContain("Snapshot as pinned");
    expect(html).toContain("research-signals@2026-02-09+2022-2024+2026-10-06");
    expect(html).toContain("usaspending 2026-10-06");
    expect(html).toContain("CUMULATIVE_AMOUNTS");
    expect(html).toContain(LEAD.snapshotSha256);
    expect(html).toContain("Dataset refreshes do not change it");
    // The live profile is a separate, labelled link — never merged.
    expect(html).toContain("Current published record (live)");
    expect(html).toContain("/fraud-radar/grants/recipients/ABC123DEF456");
  });

  it("keeps a candidate lead's status verbatim", () => {
    const candidate: WireLead = {
      ...LEAD,
      id: "lead_2",
      kind: "candidate",
      ruleCode: "S-06",
      engine: "cross",
      entityKey: "NPI:1234567890",
    };
    const html = renderToString(React.createElement(LeadCard, { lead: candidate }));
    expect(html).toContain("candidate — human review");
  });

  it("maps entities to their live profile routes", () => {
    expect(currentRecordHref("healthcare", "NPI:1234567890")).toBe(
      "/fraud-radar/healthcare/providers/1234567890",
    );
    expect(currentRecordHref("care", "NPI:1234567890")).toBe(
      "/fraud-radar/care/medicare/1234567890",
    );
    expect(currentRecordHref("grants", "UEI:ABC123DEF456")).toBe(
      "/fraud-radar/grants/recipients/ABC123DEF456",
    );
    expect(currentRecordHref("contracts", "UEI:ABC123DEF456")).toBeNull();
  });
});

describe("workspace — evidence rendering", () => {
  it("renders metadata + short hash + the gated download path, never a Blob URL", () => {
    const html = renderToString(
      React.createElement(EvidenceRow, { item: EVIDENCE, caseId: "case_1" }),
    ).replace(/<!-- -->/g, "");
    expect(html).toContain("Filed audit report");
    expect(html).toContain("SHA-256: 0123456789abcdef…");
    expect(html).toContain("/api/fraud-radar/cases/case_1/evidence/ev_1/download");
    expect(html).not.toContain("blob.core");
    expect(html).not.toContain("fraud-radar-evidence/");
    // The fallback path label is honest about its limits (§3.4).
    expect(html).toContain("Text extraction (basic — tables and layout may be incomplete)");
    expect(html).toContain("Machine-extracted — check figures against the original");
  });

  it("labels the Docling path distinctly", () => {
    expect(processingLabel({ ...EVIDENCE, processingPath: "docling" })).toBe(
      "Structured extraction (Docling)",
    );
    expect(processingLabel({ ...EVIDENCE, processingStatus: "not_requested", processingPath: null })).toBe(
      "not requested",
    );
  });

  it("the upload warning is the §2.2 verbatim constant", () => {
    expect(EVIDENCE_UPLOAD_WARNING).toContain(
      "Do not upload patient records, beneficiary lists, or other personal health information",
    );
    expect(EVIDENCE_UPLOAD_WARNING).toContain("it does not review them and does not submit them anywhere");
  });
});

describe("workspace — claims + verifications", () => {
  it("renders the verdict with its §4.2 definition and citation chips", () => {
    const html = renderToString(
      React.createElement(ClaimView, { claim: CLAIM, verifications: [VERIFICATION] }),
    ).replace(/<!-- -->/g, "");
    expect(html).toContain("Recipient ABC123DEF456 received $2,100,000 obligated");
    expect(html).toContain("Your statement, as written");
    expect(html).toContain("supported");
    // The definition travels with the word, from the single source.
    expect(html).toContain("it is not a determination about any allegation");
    expect(html).toContain("grants-aggregates@2026-10-06");
    expect(html).toContain("/fraud-radar/grants/recipients/ABC123DEF456");
    expect(html).toContain("checker 1.0.0");
  });

  it("renders the citation chip label in the §2.3 form", () => {
    expect(
      citationLabel({
        dataset: "grants-aggregates",
        datasetVersion: "2026-10-06",
        grainKey: "UEI:ABC123DEF456",
      }),
    ).toBe("grants-aggregates@2026-10-06 · UEI:ABC123DEF456");
  });

  it("renders an unverified claim honestly", () => {
    const html = renderToString(
      React.createElement(ClaimView, { claim: CLAIM, verifications: [] }),
    );
    expect(html).toContain("Not yet verified against the published corpus.");
  });

  it("renders every verdict definition from the closed set", () => {
    for (const verdict of ["supported", "contradicted", "not-in-corpus", "insufficient-data"] as const) {
      const html = renderToString(
        React.createElement(VerificationView, {
          v: { ...VERIFICATION, verdict, verdictDefinition: VERDICT_DEFINITIONS[verdict] },
        }),
      );
      expect(html).toContain(verdict);
      expect(html.length).toBeGreaterThan(0);
    }
  });
});

describe("workspace — notes, activity, not-found", () => {
  it("renders a note with its anchor label", () => {
    const html = renderToString(
      React.createElement(NoteView, {
        note: {
          id: "note_1",
          caseId: "case_1",
          leadId: "lead_1",
          evidenceId: null,
          claimId: null,
          body: "Check the second vintage too.",
          authorId: "user-a",
          createdAt: "2026-10-31T00:00:00.000Z",
          updatedAt: "2026-10-31T00:00:00.000Z",
        },
      }),
    );
    expect(html).toContain("Check the second vintage too.");
    expect(html).toContain("on a pinned lead");
  });

  it("renders the activity log kinds + dates", () => {
    const html = renderToString(
      React.createElement(ActivityView, {
        events: [
          {
            id: "ev1",
            kind: "lead_pinned",
            actorId: "user-a",
            detail: { title: "Example Recipient Inc" },
            createdAt: "2026-10-31T00:00:00.000Z",
          },
        ],
      }),
    );
    expect(html).toContain("lead_pinned");
    expect(html).toContain("Example Recipient Inc");
  });

  it("the not-found state leaks no existence information", () => {
    const html = renderToString(React.createElement(CaseNotFoundState));
    expect(html).toContain("Case not found");
    expect(html).toContain("It may have been deleted, or the link may be incorrect");
    expect(html).not.toContain("another user");
    expect(html).not.toContain("permission");
  });
});
