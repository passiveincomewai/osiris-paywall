import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

/**
 * Phase 9 Payload P9-C — Report Studio surfaces (PHASE9
 * §5.1, §7.3.7): every reports page is flag-gated and
 * noindex, the surfaces render only through the gated API
 * (downloads and previews are API routes, never storage
 * URLs), and the builder submits identifiers only — no page
 * or client in this family carries pin data, a storage
 * pathname, or a public-path registration.
 */

const HERE = __dirname;

function read(rel: string): string {
  return readFileSync(path.join(HERE, rel), "utf8");
}

const PAGES = [
  "page.tsx",
  "[id]/page.tsx",
  "[id]/build/page.tsx",
];

const CLIENTS = [
  "ReportsClient.tsx",
  "[id]/ReportDetailClient.tsx",
  "[id]/build/ReportBuilderClient.tsx",
];

describe("Report Studio pages (P9-C)", () => {
  it("every page is flag-gated and noindex", () => {
    for (const rel of PAGES) {
      const src = read(rel);
      expect(src, rel).toContain("fraudRadarEnabled()");
      expect(src, rel).toContain("notFound()");
      expect(src, rel).toContain("index: false");
    }
  });

  it("no surface registers a public path or links a storage URL", () => {
    for (const rel of [...PAGES, ...CLIENTS]) {
      const src = read(rel);
      // The pages' comments name fraudRadarPublicPaths() to say
      // they are NOT in it; the pin is that no surface IMPORTS
      // or calls it (registration would be an import + a call
      // in a sitemap/nav consumer, neither of which lives here).
      expect(src, rel).not.toMatch(/import[^;]*fraudRadarPublicPaths/);
      expect(src, rel).not.toContain("blob.vercel-storage.com");
      expect(src, rel).not.toContain("fraud-radar-reports/");
    }
    // And the registry itself still gains nothing (§5.1 pin,
    // mirrored in the isolation suite).
    const flagSrc = readFileSync(
      path.join(HERE, "../../../../lib/fraud-radar/flag.ts"),
      "utf8",
    );
    expect(flagSrc).not.toContain("/fraud-radar/reports");
  });

  it("downloads and previews go through the gated API routes, named by version", () => {
    const detail = read("[id]/ReportDetailClient.tsx");
    expect(detail).toContain("/exports/${e.id}/download");
    expect(detail).toContain("/preview");
    expect(detail).toContain("Download v{detail.version.versionNo}");
  });

  it("the builder submits identifiers only — never pin data", () => {
    const builder = read("[id]/build/ReportBuilderClient.tsx");
    expect(builder).toContain("pins.caseId");
    expect(builder).not.toContain("snapshotSha256");
    expect(builder).not.toContain("pinSet");
    expect(builder).not.toContain("contentSha256");
  });

  it("the list page states the research-leads framing from its single source", () => {
    const page = read("page.tsx");
    expect(page).toContain("RESEARCH_LEADS_NOTE");
    expect(page).toContain("REPORT_TEMPLATES");
  });
});
