/**
 * Fraud Radar Phase 9 — report generation enqueue (PHASE9
 * §3.1, §5.2, §5.3).
 *
 * The web tier's half of generation: validate the requested
 * formats against the template registry, enforce the monthly
 * generation quota (the FrReportGenerationJob table is the
 * ledger — the same rows the /usage route reconciles
 * against), and create ONE queued job row. Rendering NEVER
 * happens in the request (§3.1): the pipeline worker
 * (fr_pipeline/report_render.py) claims queued jobs, builds
 * the canonical document from the version's pinned inputs,
 * runs the §3.4 validator before any file exists, writes
 * document.json + preview.html + exports to Blob under the
 * report prefix, and completes the version row once through
 * the store's write-once completion.
 *
 * Format honesty (§3.3/§3.5): the registry lists every format
 * a template may export, but the worker's capability decides
 * what a job can produce. PDF is designed-deferred — the
 * worker has no WeasyPrint (no Pango/Cairo on the host), so a
 * PDF request is accepted into the job and the finished
 * version's manifest records `pdf: unavailable_in_worker_env`
 * with the reason; no PDF file is ever fabricated. Templates
 * the registry marks unavailable (the §7.2 cut line) cannot
 * be generated at all — the renderer refuses them, so the
 * enqueue refuses first with the honest reason.
 */

import { getReportTemplate, EXPORT_FORMATS, type ExportFormat } from "./templates";
import type { ReportEntitlements } from "./entitlements";
import type {
  ReportGenerationJobRecord,
  ReportRecord,
  ReportStore,
  ReportVersionRecord,
} from "./store";

export class GenerationInputError extends Error {
  code = "INVALID_INPUT" as const;
  errors: string[];
  constructor(errors: string[]) {
    super(errors.join("; "));
    this.errors = errors;
  }
}

export class GenerationQuotaError extends Error {
  code = "GENERATION_LIMIT" as const;
  limit: number;
  resetAt: string;
  constructor(limit: number, resetAt: Date) {
    super(`generation limit reached (${limit} per month)`);
    this.limit = limit;
    this.resetAt = resetAt.toISOString();
  }
}

export class GenerationConflictError extends Error {
  code = "GENERATION_CONFLICT" as const;
  reason: "job_in_flight" | "already_generated";
  constructor(reason: "job_in_flight" | "already_generated") {
    super(
      reason === "job_in_flight"
        ? "a generation job for this version is already queued or processing"
        : "this version has already been generated; its exports are final",
    );
    this.reason = reason;
  }
}

export class TemplateUnavailableError extends Error {
  code = "TEMPLATE_UNAVAILABLE" as const;
  templateId: string;
  constructor(templateId: string) {
    super(
      `template ${templateId} is not yet available in this deployment`,
    );
    this.templateId = templateId;
  }
}

/** Validate a requested format list against the registry:
 *  a non-empty list of known export formats, all offered by
 *  the report's template, de-duplicated in request order. */
export function validateGenerationFormats(
  templateId: string,
  requested: unknown,
): ExportFormat[] {
  const def = getReportTemplate(templateId);
  if (!def) {
    throw new GenerationInputError([`unknown template: ${templateId}`]);
  }
  if (!Array.isArray(requested) || requested.length === 0) {
    throw new GenerationInputError([
      "formats must be a non-empty array of export formats",
    ]);
  }
  const formats: ExportFormat[] = [];
  for (const raw of requested) {
    if (
      typeof raw !== "string" ||
      !(EXPORT_FORMATS as readonly string[]).includes(raw)
    ) {
      throw new GenerationInputError([
        `unknown export format: ${String(raw)}`,
      ]);
    }
    const format = raw as ExportFormat;
    if (!def.formats.includes(format)) {
      throw new GenerationInputError([
        `template ${def.id} does not offer the ${format} format`,
      ]);
    }
    if (!formats.includes(format)) formats.push(format);
  }
  return formats;
}

export function monthWindow(now: Date): { start: Date; end: Date } {
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
  return { start, end };
}

/**
 * Enqueue one generation job for a version. Access is NOT
 * decided here: the route resolves report ownership first
 * and hands this module an authorised report + version.
 * Storage configuration is likewise the route's check (§3.5:
 * no job is created when exports cannot be stored).
 */
export async function enqueueGeneration(
  store: ReportStore,
  args: {
    reportRow: ReportRecord;
    version: ReportVersionRecord;
    formats: unknown;
    entitlements: ReportEntitlements | null;
    now?: Date;
  },
): Promise<ReportGenerationJobRecord> {
  const def = getReportTemplate(args.reportRow.templateId);
  if (!def) {
    throw new GenerationInputError([
      `unknown template: ${args.reportRow.templateId}`,
    ]);
  }
  if (!def.available) {
    throw new TemplateUnavailableError(def.id);
  }
  const formats = validateGenerationFormats(def.id, args.formats);
  if (
    args.version.contentSha256 !== null &&
    args.version.validationVerdict !== null &&
    args.version.validationVerdict.startsWith("pass")
  ) {
    throw new GenerationConflictError("already_generated");
  }
  const existing = await store.listGenerationJobs(
    args.reportRow.id,
    args.version.id,
  );
  if (existing.some((j) => j.status === "queued" || j.status === "processing")) {
    throw new GenerationConflictError("job_in_flight");
  }
  const now = args.now ?? new Date();
  if (args.entitlements) {
    const { start, end } = monthWindow(now);
    const used = await store.countGenerationJobsInRange(
      args.reportRow.ownerId,
      start,
      end,
    );
    if (used >= args.entitlements.generationsPerMonth) {
      throw new GenerationQuotaError(args.entitlements.generationsPerMonth, end);
    }
  }
  return store.createGenerationJob({
    versionId: args.version.id,
    reportId: args.reportRow.id,
    ownerId: args.reportRow.ownerId,
    formats,
  });
}
