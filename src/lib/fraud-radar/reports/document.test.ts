import { describe, it, expect } from "vitest";
import {
  canonicalDocumentBytes,
  contentSha256Of,
  buildManifest,
  defaultComposition,
  REPORT_GENERATOR_VERSION,
  type ReportDocument,
} from "./document";
import { emptyPinSet } from "./pins";

/**
 * Phase 9 Payload A — canonical document + manifest tests
 * (PHASE9 §2.4): the content-level reproducibility property —
 * the same document always produces the identical
 * contentSha256, independent of key insertion order — and
 * the manifest carrying the pin set verbatim.
 */

function doc(figure = "1200"): ReportDocument {
  return {
    modelVersion: "1",
    templateId: "A",
    templateVersion: "1.0.0",
    registryVersion: "1.0.0",
    title: "Fixture brief",
    sections: [
      {
        key: "activity-summary",
        heading: "Published activity summary",
        blocks: [
          {
            type: "figure-table",
            rows: [{ label: "Audit fee", value: figure, citation: "grants-aggregates@2026-10-06 UEI:X" }],
          },
        ],
      },
    ],
  };
}

describe("canonical document model (§2.4)", () => {
  it("identical content produces the identical contentSha256, regardless of key order", () => {
    const a = doc();
    const b = JSON.parse(JSON.stringify(doc())) as ReportDocument;
    // Rebuild with keys inserted in a different order.
    const reordered: ReportDocument = {
      sections: a.sections,
      title: a.title,
      registryVersion: a.registryVersion,
      templateVersion: a.templateVersion,
      templateId: a.templateId,
      modelVersion: a.modelVersion,
    };
    expect(canonicalDocumentBytes(a)).toBe(canonicalDocumentBytes(reordered));
    expect(contentSha256Of(a)).toBe(contentSha256Of(b));
    expect(contentSha256Of(a)).toMatch(/^[0-9a-f]{64}$/);
  });

  it("a changed figure changes the hash (content is what is pinned)", () => {
    expect(contentSha256Of(doc("1200"))).not.toBe(contentSha256Of(doc("1201")));
  });

  it("volatile facts stay out of the document body (no timestamp fields exist in the model)", () => {
    const bytes = canonicalDocumentBytes(doc());
    expect(bytes).not.toContain("generatedAt");
    expect(bytes).not.toContain("checkedAt");
  });

  it("defaultComposition enables every section in schema order", () => {
    const comp = defaultComposition([{ key: "cover" }, { key: "leads" }]);
    expect(comp.sections).toEqual([
      { key: "cover", enabled: true },
      { key: "leads", enabled: true },
    ]);
  });
});

describe("reproducibility manifest (§2.4)", () => {
  it("carries the pin set verbatim + template/generator versions + the content hash", () => {
    const pinSet = emptyPinSet();
    pinSet.datasets.push({ slug: "sam-exclusions", version: "2026-301", extractDate: "2026-10-28" });
    const manifest = buildManifest({
      reportId: "report_1",
      versionId: "version_1",
      versionNo: 3,
      templateId: "B",
      templateVersion: "1.0.0",
      pinSet,
      contentSha256: contentSha256Of(doc()),
      validationVerdict: "pass",
      generatedAt: new Date("2026-10-31T12:00:00.000Z"),
    });
    expect(manifest.pins).toEqual(pinSet);
    expect(manifest.template).toEqual({
      id: "B",
      version: "1.0.0",
      registryVersion: "1.0.0",
    });
    expect(manifest.generator.version).toBe(REPORT_GENERATOR_VERSION);
    expect(manifest.contentSha256).toBe(contentSha256Of(doc()));
    expect(manifest.validation.verdict).toBe("pass");
    expect(manifest.exports).toEqual([]);
  });
});
