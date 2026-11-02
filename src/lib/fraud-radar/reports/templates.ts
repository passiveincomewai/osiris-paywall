/**
 * Fraud Radar Phase 9 — Report Studio template registry
 * (PHASE9 §1.4). The ONLY home of template definitions,
 * section schemas, and honesty-furniture copy. The builder
 * (P9-B), the generator/validator (P9-C), and the registry
 * export consumed by the pipeline all read this one module —
 * copy is never written per-surface (PHASE6 §2.1 rule).
 *
 * Template-list provenance (PHASE9 §1 preamble): the master
 * spec's own A–I enumeration is not recoverable from any
 * record on disk, so the nine definitions below are THIS
 * design's assignment, covering the surfaces the spec does
 * enumerate. They are data in this registry: re-labelling or
 * re-scoping a template is a registry change (with a version
 * bump), never a redesign, and no definition here is
 * presented as the spec's original list.
 *
 * Binding rules carried by this module (PHASE9 §0):
 *  - Research leads only: system copy never declares
 *    wrongdoing, never grades an entity, never states how
 *    likely wrongdoing is. The Phase 6/7 banned-vocabulary
 *    list (investigator/guardrails.ts) is scanned over this
 *    module's copy by the test suite.
 *  - The §1.3 honesty furniture is LOCKED on every template:
 *    a definition that drops or unlocks a furniture section
 *    is a registry bug, and validateTemplateRegistry()
 *    rejects it (§3.4 check 3 mirrors this in the worker).
 *  - WHIP / reporting-to-authorities copy is prepare-and-
 *    route only (§0.6) and is imported verbatim from the
 *    Phase 7 guardrails single source — never re-drafted.
 *  - No "reviewed" / attested / certified designation exists
 *    anywhere in v1 (§0.7, launch-gate blocker B-3); the
 *    no-designation line below states the opposite plainly.
 */

import {
  REFERRAL_BLOCK,
  WHIP_FRAMEWORK_TEXT,
  NO_SUBMISSION_NOTE,
} from "../investigator/guardrails";

// ---------------------------------------------------------------------------
// Vocabulary
// ---------------------------------------------------------------------------

export const REPORT_TEMPLATE_REGISTRY_VERSION = "1.0.0";

export const TEMPLATE_IDS = ["A", "B", "C", "D", "E", "F", "G", "H", "I"] as const;
export type TemplateId = (typeof TEMPLATE_IDS)[number];

/** The pin kinds of PHASE9 §1.1 / §2.1. */
export const PIN_KINDS = [
  "case",
  "lead",
  "entity",
  "verification",
  "evidenceSelection",
  "investigatorFinding",
] as const;
export type PinKind = (typeof PIN_KINDS)[number];

export const EXPORT_FORMATS = ["pdf", "docx", "csv", "json", "zip"] as const;
export type ExportFormat = (typeof EXPORT_FORMATS)[number];

/** Where a section's content comes from. `furniture` sections
 *  are the locked §1.3 items; `user` sections render the
 *  report author's own words, labelled as such (§0.1). */
export type SectionSource =
  | PinKind
  | "furniture"
  | "registry"
  | "pins"
  | "user";

export interface ReportSectionDef {
  key: string;
  heading: string;
  source: SectionSource;
  required: boolean;
  /** The author may move this section within the template's
   *  order constraints (builder, §4). Furniture is never
   *  reorderable in v1 and never removable. */
  reorderable: boolean;
  /** Locked furniture (§1.3): present by construction,
   *  never user-edited, never removable. */
  locked?: boolean;
  /** A block the author writes; rendered attributed (§0.1). */
  userText?: boolean;
}

export interface ReportTemplateDef {
  id: TemplateId;
  /** Per-template semver (§1.4): a content change bumps it,
   *  and every generated version records the exact value. */
  version: string;
  title: string;
  purpose: string;
  audience: string;
  requiredPins: PinKind[];
  /** Alternatives that each satisfy the requirement on their
   *  own (Template H: an entity pin OR a case pin). */
  requiredPinAlternatives?: PinKind[][];
  optionalPins: PinKind[];
  /** Template I's primary input is a set of dataset
   *  vintages rather than a pin kind (§1.2). */
  requiresDatasetPins?: boolean;
  sections: ReportSectionDef[];
  formats: ExportFormat[];
  /** Only F and G may bundle evidence FILES into a ZIP, and
   *  only on explicit per-item opt-in (§3.3). Every other
   *  template cites evidence as (evidenceId, sha256) pairs. */
  zipMayIncludeEvidence: boolean;
  /** §1.3 item 8: the no-designation line is required on
   *  B, E, G and locked-on (available) for the rest. */
  noDesignationRequired: boolean;
  /** Build order (§7.1/§7.2): 1 = the SHV-9 set (A, B, G)
   *  whose section builders land first; 2 = the remaining
   *  registered definitions. `available` mirrors the cut
   *  line: order-2 templates are registered data with
   *  available: false until their builders ship — an honest
   *  absence, never a stub report. */
  buildOrder: 1 | 2;
  available: boolean;
  /** Per-template method-notes instantiation (§1.3 item 3):
   *  the semantics this template's figures carry. */
  methodNotes: string;
}

// ---------------------------------------------------------------------------
// Honesty furniture — verbatim registry copy (§1.3)
// ---------------------------------------------------------------------------

/** §1.3 item 1 — the cover line, on every report. */
export const REPORT_COVER_LINE =
  "Generated by WorldEye Fraud Radar from public records and the author's pinned research. This report is a research document, not a finding of wrongdoing.";

/** §1.3 item 2 — the research-leads disclaimer, verbatim. */
export const RESEARCH_LEADS_DISCLAIMER =
  "Research leads in this report are statistical or record-matching observations from published public data. A research lead is a reason to look closer; it is not a finding of wrongdoing, and most entities above any statistical band have ordinary explanations (case mix, specialty practice patterns, contract type, reporting practices). Determinations of fraud are made by agencies and courts, not by this platform.";

/** §1.3 item 8 — present until blocker B-3 (legal review)
 *  resolves; v1 ships no reviewed designation of any kind. */
export const NO_DESIGNATION_LINE =
  "This report has not been reviewed by an attorney or other professional on behalf of the platform.";

/** §1.3 item 7 — the WHIP block, on templates that touch
 *  reporting (B, G, H) only. Assembled from the Phase 7
 *  guardrails single source, verbatim (§0.6): the published
 *  DOJ framework, the official-portal route, and the
 *  no-submission rule. Nothing here promises an amount or
 *  an outcome, and Fraud Radar submits nothing. */
export const WHIP_BLOCK = [
  REFERRAL_BLOCK,
  WHIP_FRAMEWORK_TEXT,
  NO_SUBMISSION_NOTE,
].join("\n\n");

/** §0.9 — restated on templates whose exports can carry
 *  evidence material (B, F, G): an export leaves the vault's
 *  access control, so the author — not the platform — is
 *  responsible for what they include. A warning, not a
 *  content-scan claim. */
export const EVIDENCE_EXPORT_WARNING =
  "Exports leave the evidence vault's access control. Before sharing an export, check what you have included: the platform stores and indexes evidence, and you are responsible for the contents of files you choose to export.";

const FURNITURE_HEADINGS = {
  cover: "Cover",
  disclaimer: "What research leads are — and are not",
  methodNotes: "Method notes",
  vintages: "Dataset vintages",
  provenance: "Provenance",
  manifestSummary: "Reproducibility",
  whipBlock: "Reporting to the authorities — official channels",
  noDesignation: "Review status",
} as const;

export type FurnitureKey = keyof typeof FURNITURE_HEADINGS;

/** Every §1.3 furniture key a template must carry. The WHIP
 *  block is conditional (B, G, H); the rest are universal. */
export const UNIVERSAL_FURNITURE_KEYS: FurnitureKey[] = [
  "cover",
  "disclaimer",
  "methodNotes",
  "vintages",
  "provenance",
  "manifestSummary",
  "noDesignation",
];

export const WHIP_TEMPLATES: TemplateId[] = ["B", "G", "H"];

function furniture(key: FurnitureKey, required = true): ReportSectionDef {
  return {
    key,
    heading: FURNITURE_HEADINGS[key],
    source: "furniture",
    required,
    reorderable: false,
    locked: true,
  };
}

function section(
  key: string,
  heading: string,
  source: SectionSource,
  opts?: { required?: boolean; reorderable?: boolean; userText?: boolean },
): ReportSectionDef {
  return {
    key,
    heading,
    source,
    required: opts?.required ?? true,
    reorderable: opts?.reorderable ?? true,
    ...(opts?.userText ? { userText: true } : {}),
  };
}

/** The locked furniture sections for one template, in cover
 *  order; content sections are interleaved by each template
 *  definition below (the array order IS the schema order). */
function furnitureSet(id: TemplateId): {
  cover: ReportSectionDef;
  disclaimer: ReportSectionDef;
  methodNotes: ReportSectionDef;
  vintages: ReportSectionDef;
  provenance: ReportSectionDef;
  manifestSummary: ReportSectionDef;
  whipBlock: ReportSectionDef | null;
  noDesignation: ReportSectionDef;
} {
  return {
    cover: furniture("cover"),
    disclaimer: furniture("disclaimer"),
    methodNotes: furniture("methodNotes"),
    vintages: furniture("vintages"),
    provenance: furniture("provenance"),
    manifestSummary: furniture("manifestSummary"),
    whipBlock: WHIP_TEMPLATES.includes(id) ? furniture("whipBlock") : null,
    noDesignation: furniture(
      "noDesignation",
      id === "B" || id === "E" || id === "G",
    ),
  };
}

const ALL_FORMATS: ExportFormat[] = ["pdf", "docx", "csv", "json", "zip"];

// ---------------------------------------------------------------------------
// The nine definitions (§1.2)
// ---------------------------------------------------------------------------

function defA(): ReportTemplateDef {
  const f = furnitureSet("A");
  return {
    id: "A",
    version: "1.0.0",
    title: "Entity Research Brief",
    purpose:
      "One entity, everything the published corpus shows about it, in a single citable brief.",
    audience: "The researching user; a colleague or counsel they hand it to.",
    requiredPins: ["entity"],
    optionalPins: ["lead", "verification"],
    sections: [
      f.cover,
      f.disclaimer,
      section("entity-identity", "Entity identity (as published)", "entity"),
      section("activity-summary", "Published activity summary", "entity"),
      section("research-leads", "Research leads", "lead", { required: false }),
      section("claim-verifications", "Claim verifications about this entity", "verification", { required: false }),
      f.provenance,
      f.methodNotes,
      f.vintages,
      f.noDesignation,
      f.manifestSummary,
    ],
    formats: ALL_FORMATS,
    zipMayIncludeEvidence: false,
    noDesignationRequired: false,
    buildOrder: 1,
    available: true,
    methodNotes:
      "Each engine block keeps its own semantics: Medicare amounts are derived (services × published average) and labelled derived wherever they appear; Medicaid primary measures use the published excl-outliers treatment; USAspending amounts are award-cumulative totals, not fiscal-year obligations, outlays, or expenditures. A published null renders as not reported or as the suppression label — never as zero. Identity data from NPPES carries the NBER mirror of CMS NPPES, August 2026 vintage label.",
  };
}

function defB(): ReportTemplateDef {
  const f = furnitureSet("B");
  return {
    id: "B",
    version: "1.0.0",
    title: "Case Research Report",
    purpose: "The full dossier for one case — the Report Studio's flagship template.",
    audience: "The case owner; counsel or a reviewer they engage.",
    requiredPins: ["case"],
    optionalPins: ["evidenceSelection"],
    sections: [
      f.cover,
      f.disclaimer,
      section("case-summary", "Case summary (the author's own words)", "user", { userText: true }),
      section("subjects-and-leads", "Subjects and research leads", "case"),
      section("claims-and-verifications", "Claims and verifications", "case"),
      section("evidence-index", "Evidence index", "evidenceSelection", { required: false }),
      section("investigator-findings", "Investigator findings pinned to the case", "investigatorFinding", { required: false }),
      section("researcher-notes", "Researcher notes (the author's own words)", "user", { required: false, userText: true }),
      f.provenance,
      f.methodNotes,
      f.vintages,
      f.whipBlock!,
      f.noDesignation,
      section("event-log", "Appendix: case event log extract", "case", { required: false }),
      f.manifestSummary,
    ],
    formats: ALL_FORMATS,
    zipMayIncludeEvidence: false,
    noDesignationRequired: true,
    buildOrder: 1,
    available: true,
    methodNotes:
      "Leads render from their pinned snapshots with provenance blocks verbatim; two vintages of the same lead are labelled as two vintages, never merged. Claim statements are quoted as the author's words; each verification renders its verdict word with its definition and the figures it compared. Evidence is cited as (evidenceId, sha256) pairs; file bytes are never embedded by this template. Medicare amounts are derived and labelled derived; a published null is never rendered as zero.",
  };
}

function defC(): ReportTemplateDef {
  const f = furnitureSet("C");
  return {
    id: "C",
    version: "1.0.0",
    title: "Research-Lead Summary",
    purpose:
      "A focused briefing over a set of leads — for example all leads from one rule, one engine, or one case — for triage and hand-off.",
    audience: "The user and their team.",
    requiredPins: ["lead"],
    optionalPins: ["case"],
    sections: [
      f.cover,
      f.disclaimer,
      section("lead-set-definition", "How this lead set was selected (the author's statement)", "user", { userText: true }),
      section("leads-table", "Leads", "lead"),
      section("lead-detail", "Per-lead detail", "lead"),
      section("what-leads-are-not", "What these leads are not", "registry"),
      f.provenance,
      f.methodNotes,
      f.vintages,
      f.noDesignation,
      f.manifestSummary,
    ],
    formats: ALL_FORMATS,
    zipMayIncludeEvidence: false,
    noDesignationRequired: false,
    buildOrder: 2,
    available: false,
    methodNotes:
      "No aggregate score, count-as-grade, or cross-entity ranking is generated from a lead set. Leads are ordered as the author arranged them (default: pin order). Per-rule context (entities evaluated, entities above the band, entities remaining after floors) is rendered exactly as the signals manifest published it.",
  };
}

function defD(): ReportTemplateDef {
  const f = furnitureSet("D");
  return {
    id: "D",
    version: "1.0.0",
    title: "Peer Comparison Report",
    purpose:
      "One entity against its published peer group, with the peer statistics published as data.",
    audience: "The researching user; counsel.",
    requiredPins: ["entity", "lead"],
    optionalPins: [],
    sections: [
      f.cover,
      f.disclaimer,
      section("entity-measures", "Entity measures", "entity"),
      section("peer-group", "Peer group", "lead"),
      section("comparison-table", "Measure-by-measure comparison", "lead"),
      section("rule-caveats", "Caveats for each rule", "lead"),
      f.provenance,
      f.methodNotes,
      f.vintages,
      f.noDesignation,
      f.manifestSummary,
    ],
    formats: ALL_FORMATS,
    zipMayIncludeEvidence: false,
    noDesignationRequired: false,
    buildOrder: 2,
    available: false,
    methodNotes:
      "The peer definition lives in the pinned lead's provenance block; a peer report without a published peer group is not generatable — the builder states the published not-computed reason rather than inventing peers. Robust distance from the peer median is descriptive distance, in the signal catalogue's own wording.",
  };
}

function defE(): ReportTemplateDef {
  const f = furnitureSet("E");
  return {
    id: "E",
    version: "1.0.0",
    title: "Claim Verification Report",
    purpose: "One or more claims with their verification history, as a standalone record.",
    audience: "The user; counsel; a recipient of a correction or substantiation request.",
    requiredPins: ["verification"],
    optionalPins: [],
    sections: [
      f.cover,
      f.disclaimer,
      section("claims", "Claims (the author's statements, as written)", "verification"),
      section("verdicts", "Verdicts", "verification"),
      section("figures-compared", "Figures compared", "verification"),
      section("corpus-vintages", "Corpus vintages consulted", "verification"),
      f.provenance,
      f.methodNotes,
      f.vintages,
      f.noDesignation,
      f.manifestSummary,
    ],
    formats: ALL_FORMATS,
    zipMayIncludeEvidence: false,
    noDesignationRequired: true,
    buildOrder: 2,
    available: false,
    methodNotes:
      "Claim statements are quoted from the pinned claim, never re-typed. Each verdict uses only the claim-verification closed vocabulary, rendered with its definition; the latest run is primary and earlier runs appear in the verification history. What a supported verdict does and does not mean is stated in the verdicts section, verbatim from the claim-verification definitions.",
  };
}

function defF(): ReportTemplateDef {
  const f = furnitureSet("F");
  return {
    id: "F",
    version: "1.0.0",
    title: "Evidence Index & Custody Manifest",
    purpose:
      "A formal index of a case's evidence: what was uploaded or captured, when, by whom, its hash, and its processing state — the exhibit-list document.",
    audience: "Counsel; an agency records officer if the user chooses; the user's own records.",
    requiredPins: ["case", "evidenceSelection"],
    optionalPins: [],
    sections: [
      f.cover,
      f.disclaimer,
      section("index-table", "Evidence index", "evidenceSelection"),
      section("artifact-envelopes", "Artifact-evidence envelopes", "evidenceSelection"),
      section("integrity-statement", "Integrity statement", "registry"),
      f.provenance,
      f.methodNotes,
      f.vintages,
      f.noDesignation,
      f.manifestSummary,
    ],
    formats: ALL_FORMATS,
    zipMayIncludeEvidence: true,
    noDesignationRequired: false,
    buildOrder: 2,
    available: false,
    methodNotes:
      "File bytes are never embedded by this template's document formats; the ZIP bundle is the only route that can include the files themselves, listed in the same manifest. Hashes were computed at ingest over the stored bytes; the integrity statement describes how a reader re-verifies them. The platform stores and indexes evidence; it does not authenticate the contents of user uploads.",
  };
}

function defG(): ReportTemplateDef {
  const f = furnitureSet("G");
  return {
    id: "G",
    version: "1.0.0",
    title: "Whistleblower Tip Preparation Package",
    purpose:
      "Organise a case into the shape a filer needs before using the official portal: a factual summary, the research record behind it, and the routing information. Preparation only — Fraud Radar does not submit anything.",
    audience: "The user (as filer); their counsel.",
    requiredPins: ["case"],
    optionalPins: ["lead", "verification", "evidenceSelection"],
    sections: [
      f.cover,
      f.whipBlock!,
      f.disclaimer,
      section("filer-statement", "Filer's own statement (the author's words)", "user", { userText: true }),
      section("factual-chronology", "Factual chronology (from pinned material)", "case"),
      section("research-record", "Research record", "case"),
      section("evidence-index", "Evidence index", "evidenceSelection", { required: false }),
      section("programme-information", "Programme information and official channels", "registry"),
      section("pre-submission-checklist", "Pre-submission checklist", "registry"),
      f.provenance,
      f.methodNotes,
      f.vintages,
      f.noDesignation,
      f.manifestSummary,
    ],
    formats: ALL_FORMATS,
    zipMayIncludeEvidence: true,
    noDesignationRequired: true,
    buildOrder: 1,
    available: true,
    methodNotes:
      "The system generates no allegation text: the filer's statement section is an empty, clearly author-attributed block the builder provides. The chronology is assembled only from pinned material, each line cited. Eligibility for any award is DOJ's determination; this package states the published framework and the official channels, and nothing else about outcomes. The False Claims Act track, where mentioned, is described as a separate attorney-filed track (relator share 15–30% of recovery per published programme descriptions) with a consult-licensed-counsel line — never as legal advice.",
  };
}

function defH(): ReportTemplateDef {
  const f = furnitureSet("H");
  return {
    id: "H",
    version: "1.0.0",
    title: "FOIA Request Support Packet",
    purpose:
      "Support a user's own FOIA request: the research that motivates it, and a draft request letter scaffold the user completes and sends themselves. The platform does not send the letter.",
    audience: "The user (as requester); the agency (only the letter portion, if the user sends it).",
    requiredPins: [],
    requiredPinAlternatives: [["entity"], ["case"]],
    optionalPins: ["lead"],
    sections: [
      f.cover,
      f.disclaimer,
      section("background-research", "Background research summary", "pins"),
      section("records-sought", "Records sought (the author's list)", "user", { userText: true }),
      section("letter-scaffold", "Draft letter scaffold (the author completes and sends)", "user", { userText: true }),
      f.provenance,
      f.methodNotes,
      f.vintages,
      f.whipBlock!,
      f.noDesignation,
      f.manifestSummary,
    ],
    formats: ALL_FORMATS,
    zipMayIncludeEvidence: false,
    noDesignationRequired: false,
    buildOrder: 2,
    available: false,
    methodNotes:
      "The letter is a scaffold with bracketed author-fill fields, not legal advice; the agency's own FOIA instructions govern any request the author sends. Fee-waiver and expedited-processing language is presented as options the author may adapt. Background facts render only from pinned material, each cited.",
  };
}

function defI(): ReportTemplateDef {
  const f = furnitureSet("I");
  return {
    id: "I",
    version: "1.0.0",
    title: "Methods, Data Quality & Reproducibility Report",
    purpose:
      "The standalone audit-trail document: how the underlying data was sourced, versioned, and quality-checked, and how any figure in any other report can be re-derived.",
    audience: "Counsel; an expert reviewer; an agency diligence reader.",
    requiredPins: [],
    optionalPins: ["case"],
    requiresDatasetPins: true,
    sections: [
      f.cover,
      f.disclaimer,
      section("sources", "Sources", "registry"),
      section("dataset-vintages", "Dataset vintages and extract dates", "pins"),
      section("data-quality", "Data-quality records", "registry"),
      section("rule-library", "Rule library", "registry", { required: false }),
      section("reproducibility", "Reproducibility", "registry"),
      section("known-limitations", "Known limitations", "registry"),
      f.provenance,
      f.methodNotes,
      f.vintages,
      f.noDesignation,
      f.manifestSummary,
    ],
    formats: ALL_FORMATS,
    zipMayIncludeEvidence: false,
    noDesignationRequired: false,
    buildOrder: 2,
    available: false,
    methodNotes:
      "Source records render verbatim from the Data Source Registry. Data-quality records are the published per-dataset check states (pass / warn / fail with measured values) — never a score. Known limitations render the source-defects register entries for the pinned vintages, as the register states them.",
  };
}

export const REPORT_TEMPLATES: readonly ReportTemplateDef[] = [
  defA(),
  defB(),
  defC(),
  defD(),
  defE(),
  defF(),
  defG(),
  defH(),
  defI(),
];

export function getReportTemplate(id: string): ReportTemplateDef | null {
  return REPORT_TEMPLATES.find((t) => t.id === id) ?? null;
}

export function isTemplateId(value: string): value is TemplateId {
  return (TEMPLATE_IDS as readonly string[]).includes(value);
}

// ---------------------------------------------------------------------------
// Registry validation (§1.3 / §3.4 check 3, app-side mirror)
// ---------------------------------------------------------------------------

/**
 * Validate one template definition against the §1.3 furniture
 * contract. Returns human-readable errors (empty = valid).
 * A template schema that marks a furniture section optional,
 * unlocks it, or omits it is a registry bug — this is the
 * check that rejects it, mirrored by the worker validator.
 */
export function validateTemplateDef(def: ReportTemplateDef): string[] {
  const errors: string[] = [];
  const byKey = new Map<string, ReportSectionDef>();
  for (const s of def.sections) {
    if (byKey.has(s.key)) errors.push(`duplicate section key: ${s.key}`);
    byKey.set(s.key, s);
  }
  for (const key of UNIVERSAL_FURNITURE_KEYS) {
    const s = byKey.get(key);
    if (!s) {
      errors.push(`missing furniture section: ${key}`);
      continue;
    }
    if (!s.locked) errors.push(`furniture section is not locked: ${key}`);
    if (s.source !== "furniture") {
      errors.push(`furniture section has a non-furniture source: ${key}`);
    }
    // The no-designation section is required exactly where
    // §1.3 item 8 requires it; elsewhere it stays locked-on
    // but optional in the composition.
    if (key !== "noDesignation" && !s.required) {
      errors.push(`furniture section is marked optional: ${key}`);
    }
  }
  const noDesig = byKey.get("noDesignation");
  if (noDesig && def.noDesignationRequired !== noDesig.required) {
    errors.push(
      `noDesignation required flag disagrees with the definition (template ${def.id})`,
    );
  }
  const whip = byKey.get("whipBlock");
  if (WHIP_TEMPLATES.includes(def.id)) {
    if (!whip) errors.push(`missing WHIP block on template ${def.id}`);
    else if (!whip.locked || !whip.required) {
      errors.push(`WHIP block must be locked and required (template ${def.id})`);
    }
  } else if (whip) {
    errors.push(`WHIP block present on a non-reporting template ${def.id}`);
  }
  for (const kind of [...def.requiredPins, ...def.optionalPins]) {
    if (!(PIN_KINDS as readonly string[]).includes(kind)) {
      errors.push(`unknown pin kind: ${kind}`);
    }
  }
  for (const alt of def.requiredPinAlternatives ?? []) {
    for (const kind of alt) {
      if (!(PIN_KINDS as readonly string[]).includes(kind)) {
        errors.push(`unknown pin kind in alternatives: ${kind}`);
      }
    }
  }
  for (const format of def.formats) {
    if (!(EXPORT_FORMATS as readonly string[]).includes(format)) {
      errors.push(`unknown export format: ${format}`);
    }
  }
  if (def.zipMayIncludeEvidence && !(def.id === "F" || def.id === "G")) {
    errors.push(`zipMayIncludeEvidence is F/G only (template ${def.id})`);
  }
  return errors;
}

/** Validate the whole registry (all nine, coherent ids). */
export function validateTemplateRegistry(
  registry: readonly ReportTemplateDef[] = REPORT_TEMPLATES,
): string[] {
  const errors: string[] = [];
  const ids = registry.map((t) => t.id);
  for (const id of TEMPLATE_IDS) {
    if (!ids.includes(id)) errors.push(`registry is missing template ${id}`);
  }
  if (new Set(ids).size !== ids.length) errors.push("duplicate template ids");
  for (const def of registry) errors.push(...validateTemplateDef(def));
  return errors;
}

/**
 * Check a pin-kind set against a template's requirements
 * (§1.2): every required kind present, alternatives honoured,
 * no kind the template does not accept. Returns errors
 * (empty = the pin set may proceed to capture).
 */
export function checkTemplatePins(
  def: ReportTemplateDef,
  present: ReadonlySet<PinKind>,
  datasetPinCount: number,
  opts?: {
    /** Kinds carried TRANSITIVELY by another accepted pin
     *  (a case pin transitively pins its leads, claims and
     *  their verification runs — §1.2 Template B): they still
     *  satisfy requirements, but do not trip the
     *  not-accepted check. */
    transitiveKinds?: ReadonlySet<PinKind>;
  },
): string[] {
  const errors: string[] = [];
  const accepted = new Set<PinKind>([
    ...def.requiredPins,
    ...def.optionalPins,
    ...(def.requiredPinAlternatives ?? []).flat(),
  ]);
  for (const kind of def.requiredPins) {
    if (!present.has(kind)) errors.push(`missing required pin kind: ${kind}`);
  }
  if (def.requiredPinAlternatives && def.requiredPinAlternatives.length > 0) {
    const satisfied = def.requiredPinAlternatives.some((alt) =>
      alt.every((kind) => present.has(kind)),
    );
    if (!satisfied) {
      errors.push(
        `one of these pin alternatives is required: ${def.requiredPinAlternatives
          .map((alt) => alt.join("+"))
          .join(" or ")}`,
      );
    }
  }
  for (const kind of present) {
    if (!accepted.has(kind) && !opts?.transitiveKinds?.has(kind)) {
      errors.push(`pin kind not accepted by template ${def.id}: ${kind}`);
    }
  }
  if (def.requiresDatasetPins && datasetPinCount === 0) {
    errors.push("at least one dataset pin is required");
  }
  return errors;
}
