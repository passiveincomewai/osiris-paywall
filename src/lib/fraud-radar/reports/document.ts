/**
 * Fraud Radar Phase 9 — the canonical Report Document Model
 * + reproducibility manifest (PHASE9 §2.4).
 *
 * The generator's real output is this model: ordered sections
 * of typed blocks, serialised canonically — object keys
 * sorted, arrays in composition order, UTF-8, no timestamps
 * or random ids inside the document body (volatile facts live
 * in the manifest envelope, not the content). The canonical
 * serialisation is the Phase 8 one (cases/leads.ts
 * canonicalJson), imported — never re-implemented — so a lead
 * snapshot hash and a report content hash are the same kind
 * of statement.
 *
 * contentSha256 = SHA-256(canonical bytes). The guaranteed
 * property (§2.4, acceptance §7.3.1): re-running the
 * generator over the same pin set + composition + template
 * version + generator version reproduces the identical
 * contentSha256. File-level byte identity is claimed only
 * where §2.4 claims it (JSON/CSV/ZIP); PDF/DOCX bytes may
 * differ across renderer runs and this module never says
 * otherwise.
 *
 * The section builders that PRODUCE documents are the
 * worker's (P9-C); this module is the shared contract —
 * types, canonicalisation, hashing, validation of document
 * shape, and the manifest builder — used by the draft
 * pre-check (P9-A), the surfaces (P9-B), and mirrored by the
 * pipeline validator (P9-C, same fixture set).
 */

import { createHash } from "node:crypto";
import { canonicalJson } from "../cases/leads";
import {
  REPORT_TEMPLATE_REGISTRY_VERSION,
  type ExportFormat,
  type TemplateId,
} from "./templates";
import {
  REPORT_GENERATOR_VERSION,
  REPORT_VALIDATOR_VERSION,
} from "./versions";
import type { PinSet } from "./pins";

export { canonicalJson };

export {
  REPORT_GENERATOR_VERSION,
  REPORT_VALIDATOR_VERSION,
} from "./versions";

// ---------------------------------------------------------------------------
// Document model (§2.4)
// ---------------------------------------------------------------------------

export type ReportBlock =
  | { type: "heading"; level: 1 | 2 | 3; text: string }
  | { type: "paragraph"; text: string; userText?: boolean }
  | {
      type: "table";
      caption?: string;
      columns: string[];
      /** Cell values as rendered strings; a published null is
       *  rendered by the builder as its label, never "0" and
       *  never an empty string that implies zero (§0.5). */
      rows: string[][];
      citation?: string;
    }
  | {
      type: "figure-table";
      caption?: string;
      rows: { label: string; value: string; citation: string }[];
    }
  | {
      /** A signal/screening provenance block, byte-identical
       *  to the pinned lead snapshot's block (§0.3). */
      type: "provenance-block";
      leadId: string;
      snapshotSha256: string;
      text: string;
    }
  | { type: "citation-list"; citations: string[] }
  | { type: "user-text"; text: string };

export interface ReportDocumentSection {
  key: string;
  heading: string;
  blocks: ReportBlock[];
}

export interface ReportDocument {
  /** Model shape version — not a timestamp, not an id. */
  modelVersion: "1";
  templateId: TemplateId;
  templateVersion: string;
  registryVersion: string;
  /** The report's title as the author wrote it (§0.1 user
   *  words, attributed on the cover at render time). */
  title: string;
  sections: ReportDocumentSection[];
}

/** Canonical bytes of a document: the exact bytes whose
 *  SHA-256 is the version's contentSha256. */
export function canonicalDocumentBytes(doc: ReportDocument): string {
  return canonicalJson(doc);
}

export function contentSha256Of(doc: ReportDocument): string {
  return createHash("sha256")
    .update(canonicalDocumentBytes(doc), "utf8")
    .digest("hex");
}

/** SHA-256 over any pin-shaped value, on the same canonical
 *  serialisation (used for the case snapshot pin, §2.1). */
export function canonicalSha256(value: unknown): string {
  return createHash("sha256").update(canonicalJson(value), "utf8").digest("hex");
}

// ---------------------------------------------------------------------------
// Composition (§4: which sections, in what order, with which
// per-section options + the author's own text blocks)
// ---------------------------------------------------------------------------

export interface SectionComposition {
  key: string;
  /** Optional sections the author turned off are recorded
   *  here as enabled: false — never silently dropped, and
   *  locked furniture can never carry enabled: false (the
   *  validator rejects it). */
  enabled: boolean;
  options?: Record<string, unknown>;
  /** The author's own text for user-text sections (§0.1). */
  userText?: string;
}

export interface ReportComposition {
  sections: SectionComposition[];
}

/** The default composition for a template: schema order,
 *  every section enabled. */
export function defaultComposition(
  sections: { key: string }[],
): ReportComposition {
  return { sections: sections.map((s) => ({ key: s.key, enabled: true })) };
}

// ---------------------------------------------------------------------------
// Reproducibility manifest (§2.4)
// ---------------------------------------------------------------------------

export interface ReportManifest {
  reportId: string;
  versionNo: number;
  versionId: string;
  template: { id: TemplateId; version: string; registryVersion: string };
  generator: {
    version: string;
    rendererVersions: Record<string, string>;
  };
  /** The §2.1 pin set, verbatim. */
  pins: PinSet;
  contentSha256: string;
  validation: {
    verdict: string;
    validatorVersion: string;
    checkedAt: string;
    warnings: string[];
  };
  generatedAt: string;
  exports: { format: ExportFormat | string; sha256: string; bytes: number }[];
}

export function buildManifest(args: {
  reportId: string;
  versionId: string;
  versionNo: number;
  templateId: TemplateId;
  templateVersion: string;
  pinSet: PinSet;
  contentSha256: string;
  validationVerdict: string;
  validationWarnings?: string[];
  generatedAt: Date;
  rendererVersions?: Record<string, string>;
  exports?: ReportManifest["exports"];
}): ReportManifest {
  return {
    reportId: args.reportId,
    versionNo: args.versionNo,
    versionId: args.versionId,
    template: {
      id: args.templateId,
      version: args.templateVersion,
      registryVersion: REPORT_TEMPLATE_REGISTRY_VERSION,
    },
    generator: {
      version: REPORT_GENERATOR_VERSION,
      rendererVersions: args.rendererVersions ?? {},
    },
    pins: args.pinSet,
    contentSha256: args.contentSha256,
    validation: {
      verdict: args.validationVerdict,
      validatorVersion: REPORT_VALIDATOR_VERSION,
      checkedAt: args.generatedAt.toISOString(),
      warnings: args.validationWarnings ?? [],
    },
    generatedAt: args.generatedAt.toISOString(),
    exports: args.exports ?? [],
  };
}
