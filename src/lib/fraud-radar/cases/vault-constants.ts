/**
 * Fraud Radar Phase 8 — evidence vault constants (PHASE8 §2.1,
 * §2.2). Client-safe (no imports): the browser uploader and the
 * server routes read the same numbers, so the limits the UI
 * states are the limits the API enforces — the clip-share
 * constants precedent.
 */

/** Blob pathname prefix every vault object lives under. The
 *  corpus firewall (§2.7) keeps this prefix disjoint from every
 *  published-artifact root. */
export const VAULT_PATH_PREFIX = "fraud-radar-evidence/";

/** Per-file ceiling (§2.2): documents, not media. The clip-share
 *  200 MB video ceiling is not precedent here. */
export const MAX_EVIDENCE_FILE_BYTES = 25_000_000;

/**
 * The closed content-type allowlist (§2.2): the document set the
 * §3 processing paths can actually handle, plus plain data files
 * and screenshots. Anything not listed is refused by
 * construction — executables, archives, legacy Office, HTML/SVG
 * (active content), and audio/video are all refused.
 */
export const EVIDENCE_CONTENT_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/csv",
  "text/plain",
  "application/json",
  "image/png",
  "image/jpeg",
  "image/webp",
] as const;

export type EvidenceContentType = (typeof EVIDENCE_CONTENT_TYPES)[number];

export function isEvidenceContentType(
  value: unknown,
): value is EvidenceContentType {
  return (
    typeof value === "string" &&
    (EVIDENCE_CONTENT_TYPES as readonly string[]).includes(value)
  );
}

/** Canonical extension per allowlisted type (pathname building). */
export const EVIDENCE_EXTENSIONS: Record<EvidenceContentType, string> = {
  "application/pdf": "pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
    "docx",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet":
    "xlsx",
  "text/csv": "csv",
  "text/plain": "txt",
  "application/json": "json",
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
};

/** Extension (lowercase, no dot) → content type, for uploads
 *  whose client-claimed type needs corroboration. */
export const EVIDENCE_TYPES_BY_EXTENSION: Record<string, EvidenceContentType> = {
  pdf: "application/pdf",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  csv: "text/csv",
  txt: "text/plain",
  json: "application/json",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
};

/** The §2.2 upload warning, verbatim — rendered above the
 *  uploader by the case surface (P8-D); kept here so no surface
 *  improvises its own version. */
export const EVIDENCE_UPLOAD_WARNING =
  "Upload only documents you have the right to store here. " +
  "Do not upload patient records, beneficiary lists, or other " +
  "personal health information, Social Security numbers, or " +
  "documents under a protective order or seal. Fraud Radar " +
  "stores your files privately for your case work; it does " +
  "not review them and does not submit them anywhere.";
