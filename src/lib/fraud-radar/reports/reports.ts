/**
 * Fraud Radar Phase 9 — report service (PHASE9 §2, §5.2, §5.3).
 *
 * The write paths for reports and versions: creation against
 * the entitlement interface, title/status updates (the
 * caller's own work states), hard deletion, and version
 * creation — the one path that assembles a pin set, because
 * a version may only ever be created FROM a captured pin set
 * (pins.ts) that conforms to its template (§1.2). There is
 * no path here — or anywhere — that creates a version from
 * caller-supplied pin data, and no path that edits a version
 * after creation (§2.3.1).
 *
 * Access is NOT decided here: routes resolve ownership of
 * the report (and of any home case) first and hand this
 * module an authorised report row.
 *
 * Deletion (§5.2): hard delete; versions and export rows
 * cascade. Export Blob objects do not exist until generation
 * lands (P9-C) — that payload extends this delete with the
 * Blob sweep over the version rows it enumerates first, on
 * the Phase 8 §2.6 pattern; the store cascade here is the
 * complete P9-A semantics because no export bytes can exist
 * yet.
 */

import type { CaseStore } from "../cases/store";
import { scanBannedVocabulary } from "../investigator/guardrails";
import {
  getReportTemplate,
  type ReportTemplateDef,
} from "./templates";
import {
  capturePinSet,
  validatePinSetForTemplate,
  diffPinSets,
  PinError,
  type PinCaptureDeps,
  type PinDiff,
  type PinRequest,
  type PinSet,
} from "./pins";
import {
  defaultComposition,
  canonicalSha256,
  REPORT_GENERATOR_VERSION,
  type ReportComposition,
} from "./document";
import { templateAllowed, type ReportEntitlements } from "./entitlements";
import type {
  ReportRecord,
  ReportStore,
  ReportVersionRecord,
} from "./store";

export const REPORT_STATUSES = ["draft", "ready", "archived"] as const;

export class ReportQuotaError extends Error {
  code = "REPORT_LIMIT" as const;
  limit: number;
  constructor(limit: number) {
    super(`report limit reached (${limit})`);
    this.limit = limit;
  }
}

export class TemplateNotAllowedError extends Error {
  code = "TEMPLATE_NOT_ALLOWED" as const;
  templateId: string;
  constructor(templateId: string) {
    super(`template ${templateId} is not available on this plan`);
    this.templateId = templateId;
  }
}

export class ReportInputError extends Error {
  code = "INVALID_INPUT" as const;
  errors: string[];
  constructor(errors: string[]) {
    super(errors.join("; "));
    this.errors = errors;
  }
}

// ---------------------------------------------------------------------------
// Reports
// ---------------------------------------------------------------------------

export async function createReportForUser(
  store: ReportStore,
  args: {
    ownerId: string;
    templateId: string;
    title: string;
    caseId?: string | null;
    entitlements: ReportEntitlements | null;
  },
): Promise<ReportRecord> {
  const def = getReportTemplate(args.templateId);
  if (!def) {
    throw new ReportInputError([`unknown template: ${args.templateId}`]);
  }
  if (args.entitlements) {
    if (!templateAllowed(args.entitlements, def.id)) {
      throw new TemplateNotAllowedError(def.id);
    }
    const count = await store.countReports(args.ownerId);
    if (count >= args.entitlements.maxReports) {
      throw new ReportQuotaError(args.entitlements.maxReports);
    }
  }
  return store.createReport({
    ownerId: args.ownerId,
    templateId: def.id,
    title: args.title,
    caseId: args.caseId ?? null,
  });
}

export async function updateReportForUser(
  store: ReportStore,
  args: {
    reportRow: ReportRecord;
    patch: { title?: string; status?: string };
  },
): Promise<ReportRecord> {
  const patch: Partial<Pick<ReportRecord, "title" | "status">> = {};
  if (args.patch.title !== undefined) patch.title = args.patch.title;
  if (args.patch.status !== undefined) {
    if (!(REPORT_STATUSES as readonly string[]).includes(args.patch.status)) {
      throw new ReportInputError([`unknown report status: ${args.patch.status}`]);
    }
    patch.status = args.patch.status;
  }
  return store.updateReport(args.reportRow.id, patch);
}

export async function deleteReportForUser(
  store: ReportStore,
  args: { reportRow: ReportRecord },
): Promise<boolean> {
  return store.deleteReport(args.reportRow.id);
}

// ---------------------------------------------------------------------------
// Composition validation (§4: locked furniture can never be
// disabled or dropped; unknown keys are refused)
// ---------------------------------------------------------------------------

export function validateComposition(
  def: ReportTemplateDef,
  composition: ReportComposition,
  opts?: { partial?: boolean },
): string[] {
  const errors: string[] = [];
  const defByKey = new Map(def.sections.map((s) => [s.key, s]));
  const seen = new Set<string>();
  for (const entry of composition.sections) {
    const sectionDef = defByKey.get(entry.key);
    if (!sectionDef) {
      errors.push(`unknown section key for template ${def.id}: ${entry.key}`);
      continue;
    }
    if (seen.has(entry.key)) errors.push(`duplicate section in composition: ${entry.key}`);
    seen.add(entry.key);
    if (sectionDef.locked && entry.enabled === false) {
      errors.push(`locked furniture section cannot be disabled: ${entry.key}`);
    }
    if (sectionDef.required && entry.enabled === false) {
      errors.push(`required section cannot be disabled: ${entry.key}`);
    }
    if (entry.userText !== undefined && !sectionDef.userText) {
      errors.push(`section does not accept author text: ${entry.key}`);
    }
  }
  // A partial submission (only the sections the author
  // touched) is completed by resolveComposition; only a
  // full composition is checked for missing sections.
  if (!opts?.partial) {
    for (const sectionDef of def.sections) {
      if ((sectionDef.locked || sectionDef.required) && !seen.has(sectionDef.key)) {
        errors.push(`composition is missing a required section: ${sectionDef.key}`);
      }
    }
  }
  return errors;
}

export function resolveComposition(
  def: ReportTemplateDef,
  submitted?: ReportComposition | null,
): ReportComposition {
  if (!submitted) return defaultComposition(def.sections);
  // Normalise onto the template schema order, keeping the
  // author's enable flags / options / text per section.
  const byKey = new Map(submitted.sections.map((s) => [s.key, s]));
  return {
    sections: def.sections.map((s) => {
      const entry = byKey.get(s.key);
      return {
        key: s.key,
        enabled: entry?.enabled ?? true,
        ...(entry?.options ? { options: entry.options } : {}),
        ...(entry?.userText !== undefined ? { userText: entry.userText } : {}),
      };
    }),
  };
}

// ---------------------------------------------------------------------------
// Versions
// ---------------------------------------------------------------------------

export interface VersionAssembly {
  pinSet: PinSet;
  composition: ReportComposition;
  pinDiff: PinDiff;
}

/**
 * Capture + validate a pin set and composition for a report
 * WITHOUT storing anything — the shared core of version
 * creation and the §4.2 draft route (a draft is a preview
 * artefact, never exported; the stored version is assembled
 * by the same code so the two cannot drift).
 */
export async function assembleVersionInputs(
  caseStore: CaseStore,
  args: {
    reportRow: ReportRecord;
    request: PinRequest;
    composition?: ReportComposition | null;
    previousPinSet?: PinSet | null;
  },
  pinDeps?: PinCaptureDeps,
): Promise<VersionAssembly> {
  const def = getReportTemplate(args.reportRow.templateId);
  if (!def) {
    throw new ReportInputError([`unknown template: ${args.reportRow.templateId}`]);
  }
  // A report's home case is fixed at creation: a version may
  // pin that case or (for caseless templates) any case the
  // owner owns — capturePinSet enforces ownership either way.
  const request: PinRequest = { ...args.request };
  if (args.reportRow.caseId && !request.caseId) {
    request.caseId = args.reportRow.caseId;
  }
  let pinSet: PinSet;
  try {
    pinSet = await capturePinSet(
      caseStore,
      { ownerId: args.reportRow.ownerId, request },
      pinDeps,
    );
  } catch (err) {
    if (err instanceof PinError) {
      throw new ReportInputError([err.message]);
    }
    throw err;
  }
  const pinErrors = validatePinSetForTemplate(def, pinSet);
  if (pinErrors.length > 0) throw new ReportInputError(pinErrors);
  // Validate the RAW submission first (unknown keys, locked
  // furniture disabled, text on a non-text section) so a bad
  // key is refused rather than silently dropped by
  // normalisation; then validate the resolved composition.
  if (args.composition) {
    const rawErrors = validateComposition(def, args.composition, { partial: true });
    if (rawErrors.length > 0) throw new ReportInputError(rawErrors);
  }
  const composition = resolveComposition(def, args.composition ?? null);
  const compositionErrors = validateComposition(def, composition);
  if (compositionErrors.length > 0) throw new ReportInputError(compositionErrors);
  return {
    pinSet,
    composition,
    pinDiff: diffPinSets(args.previousPinSet ?? null, pinSet),
  };
}

export async function createVersionForUser(
  reportStore: ReportStore,
  caseStore: CaseStore,
  args: {
    reportRow: ReportRecord;
    actorId: string;
    request: PinRequest;
    composition?: ReportComposition | null;
    entitlements: ReportEntitlements | null;
  },
  pinDeps?: PinCaptureDeps,
): Promise<{ version: ReportVersionRecord; pinDiff: PinDiff }> {
  const def = getReportTemplate(args.reportRow.templateId);
  if (!def) {
    throw new ReportInputError([`unknown template: ${args.reportRow.templateId}`]);
  }
  if (args.entitlements && !templateAllowed(args.entitlements, def.id)) {
    throw new TemplateNotAllowedError(def.id);
  }
  const latest = await reportStore.getLatestVersion(args.reportRow.id);
  const assembly = await assembleVersionInputs(
    caseStore,
    {
      reportRow: args.reportRow,
      request: args.request,
      composition: args.composition ?? null,
      previousPinSet: latest?.pinSet ?? null,
    },
    pinDeps,
  );
  const version = await reportStore.createVersion({
    reportId: args.reportRow.id,
    versionNo: (latest?.versionNo ?? 0) + 1,
    templateVersion: def.version,
    generatorVersion: REPORT_GENERATOR_VERSION,
    pinSet: assembly.pinSet,
    composition: assembly.composition,
    createdById: args.actorId,
  });
  return { version, pinDiff: assembly.pinDiff };
}

// ---------------------------------------------------------------------------
// Draft pre-check (§4.2)
// ---------------------------------------------------------------------------

export interface DraftResult extends VersionAssembly {
  templateId: string;
  templateVersion: string;
  /** Hash of the draft inputs (template + pins + composition)
   *  — shown in the builder so the author can confirm the
   *  generated version matches what they previewed (§4.2).
   *  This is NOT a contentSha256: no document exists yet. */
  draftSha256: string;
  preCheck: {
    /** Banned-vocabulary hits inside author-text blocks —
     *  warnings, never edits (§0.1): the author's words are
     *  exported verbatim with the warning recorded. */
    userTextWarnings: { sectionKey: string; phrases: string[] }[];
    /** Locked furniture present in the composition. */
    furnitureComplete: boolean;
  };
}

export async function buildDraft(
  caseStore: CaseStore,
  args: {
    reportRow: ReportRecord;
    request: PinRequest;
    composition?: ReportComposition | null;
    previousPinSet?: PinSet | null;
  },
  pinDeps?: PinCaptureDeps,
): Promise<DraftResult> {
  const def = getReportTemplate(args.reportRow.templateId);
  if (!def) {
    throw new ReportInputError([`unknown template: ${args.reportRow.templateId}`]);
  }
  const assembly = await assembleVersionInputs(caseStore, args, pinDeps);
  const userTextWarnings: DraftResult["preCheck"]["userTextWarnings"] = [];
  for (const entry of assembly.composition.sections) {
    if (entry.userText) {
      const phrases = scanBannedVocabulary(entry.userText);
      if (phrases.length > 0) {
        userTextWarnings.push({ sectionKey: entry.key, phrases });
      }
    }
  }
  const furnitureComplete = def.sections
    .filter((s) => s.locked)
    .every((s) =>
      assembly.composition.sections.some(
        (entry) => entry.key === s.key && entry.enabled !== false,
      ),
    );
  return {
    ...assembly,
    templateId: def.id,
    templateVersion: def.version,
    draftSha256: canonicalSha256({
      templateId: def.id,
      templateVersion: def.version,
      pinSet: assembly.pinSet,
      composition: assembly.composition,
    }),
    preCheck: { userTextWarnings, furnitureComplete },
  };
}
