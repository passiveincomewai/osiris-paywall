/**
 * Fraud Radar Phase 9 — report export storage (PHASE9 §5.2).
 *
 * The vault.ts analogue for report outputs. Report exports
 * are user data, never public (§0.8): objects live under the
 * per-owner prefix `fraud-radar-reports/<ownerId>/<reportId>/
 * <versionId>/`, are written by the generation worker, and
 * leave storage ONLY through the ownership-gated download /
 * preview routes, which fetch server-side and stream. No Blob
 * URL or pathname is ever returned to a client — the version
 * serializer already withholds documentPathname, and export
 * rows reach clients as ids + format + hashes only.
 *
 * The prefix is disjoint from the evidence vault prefix
 * (`fraud-radar-evidence/`) and from every published-artifact
 * root; the startup assertion below fails closed on a config
 * collision, the Phase 8 §2.7 discipline applied to reports.
 */

import { del, get } from "@vercel/blob";

type EnvLike = Record<string, string | undefined>;

export const REPORTS_PATH_PREFIX = "fraud-radar-reports/";

/** Report storage needs the same Vercel Blob store as the
 *  vault. When the token is absent the generate route says so
 *  honestly (503 storage_unavailable, §3.5) and creates no job
 *  pointing at a render that cannot be stored. Drafts and
 *  compositions (Neon) are unaffected. */
export function reportStorageConfigured(
  env: EnvLike = process.env,
): boolean {
  return !!env.BLOB_READ_WRITE_TOKEN?.trim();
}

export class ReportBlobError extends Error {
  code = "invalid_input" as const;
  constructor(message: string) {
    super(message);
  }
}

const ARTIFACT_ROOT_ENVS = [
  "FRAUD_RADAR_ARTIFACT_ROOT",
  "FRAUD_RADAR_CARE_ARTIFACT_ROOT",
  "FRAUD_RADAR_GRANTS_ARTIFACT_ROOT",
  "FRAUD_RADAR_SIGNALS_ARTIFACT_ROOT",
] as const;

const VAULT_PREFIX = "fraud-radar-evidence/";

/**
 * Corpus firewall (§5.2 storage layout): the reports prefix
 * must stay disjoint from the vault prefix and the published
 * artifact roots. A collision is a configuration breach — the
 * module refuses to serve rather than risk report bytes
 * entering a published tree or published reads reaching into
 * private exports.
 */
export function assertReportsCorpusFirewall(
  env: EnvLike = process.env,
): void {
  if (
    REPORTS_PATH_PREFIX.startsWith(VAULT_PREFIX) ||
    VAULT_PREFIX.startsWith(REPORTS_PATH_PREFIX)
  ) {
    throw new ReportBlobError("reports prefix overlaps the evidence vault prefix");
  }
  for (const name of ARTIFACT_ROOT_ENVS) {
    const root = env[name]?.trim();
    if (!root) continue;
    if (
      root.includes(REPORTS_PATH_PREFIX.replace(/\/$/, "")) ||
      REPORTS_PATH_PREFIX.startsWith(root)
    ) {
      throw new ReportBlobError(
        `artifact root ${name} overlaps the reports prefix`,
      );
    }
  }
}

// ---------------------------------------------------------------------------
// Pathnames (§5.2 — pure, segment-validated like the vault)
// ---------------------------------------------------------------------------

function segment(value: string): string {
  if (!/^[A-Za-z0-9_-]+$/.test(value)) {
    throw new ReportBlobError("invalid report path segment");
  }
  return value;
}

/** File names under a version prefix: the worker's fixed set
 *  (document.json, preview.html, manifest.json, report.json,
 *  report.pdf, report.docx, report.zip, NN-section-key.csv).
 *  Anything with a slash or dot-segment is refused rather
 *  than sanitised into a different path. */
export function reportBlobPathname(
  ownerId: string,
  reportId: string,
  versionId: string,
  file: string,
): string {
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(file) || file.includes("..")) {
    throw new ReportBlobError("invalid report file name");
  }
  return `${REPORTS_PATH_PREFIX}${segment(ownerId)}/${segment(reportId)}/${segment(versionId)}/${file}`;
}

export function reportDocumentPathname(
  ownerId: string,
  reportId: string,
  versionId: string,
): string {
  return reportBlobPathname(ownerId, reportId, versionId, "document.json");
}

export function reportPreviewPathname(
  ownerId: string,
  reportId: string,
  versionId: string,
): string {
  return reportBlobPathname(ownerId, reportId, versionId, "preview.html");
}

/** Download display name (§2.3.3): downloads always name the
 *  version — there is no "latest" download. The storage file
 *  name is never disclosed; this name is built from the
 *  format + version number only. */
export function exportDownloadFilename(
  format: string,
  versionNo: number,
): string {
  const ext =
    format === "pdf" || format === "docx" || format === "json" ||
    format === "zip" || format === "csv"
      ? format
      : "bin";
  return `fraud-radar-report-v${versionNo}.${ext}`;
}

export const EXPORT_CONTENT_TYPES: Record<string, string> = {
  pdf: "application/pdf",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  json: "application/json",
  zip: "application/zip",
  csv: "text/csv",
};

// ---------------------------------------------------------------------------
// Blob reads/writes (server-side only — results never reach
// clients as URLs)
// ---------------------------------------------------------------------------

/** Stream a report object for the gated download/preview
 *  routes. Access tries "private" first (the worker's own
 *  writes), then "public" (an object in a public store — the
 *  bytes are still only ever returned to this server, never
 *  to a client). Returns null when the object does not exist. */
export async function openReportStream(
  pathname: string,
): Promise<{
  stream: ReadableStream<Uint8Array>;
  contentType: string | null;
  size: number | null;
} | null> {
  for (const access of ["private", "public"] as const) {
    try {
      const res = await get(pathname, { access });
      if (!res) continue;
      if (res.statusCode === 304 || !res.stream) continue;
      return {
        stream: res.stream,
        contentType: res.blob.contentType,
        size: res.blob.size,
      };
    } catch {
      /* try the next access posture */
    }
  }
  return null;
}

/** Delete report objects by pathname (report deletion, §5.2).
 *  Best-effort per object: returns the pathnames that could
 *  NOT be deleted. Report rows carry no deletion_pending
 *  state (the Phase 9 schema has none), so the outcome is
 *  reported honestly in the return value instead of claiming
 *  a sweep that has not happened; undeleted objects sit under
 *  the owner's private prefix, unreachable through any route
 *  once their rows are gone. */
export async function deleteReportObjects(
  pathnames: string[],
  env: EnvLike = process.env,
): Promise<{ deleted: string[]; failed: string[] }> {
  const deleted: string[] = [];
  const failed: string[] = [];
  if (!reportStorageConfigured(env)) {
    return { deleted, failed: [...pathnames] };
  }
  for (const pathname of pathnames) {
    try {
      await del(pathname);
      deleted.push(pathname);
    } catch {
      failed.push(pathname);
    }
  }
  return { deleted, failed };
}
