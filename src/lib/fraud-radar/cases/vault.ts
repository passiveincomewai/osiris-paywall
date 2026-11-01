/**
 * Fraud Radar Phase 8 — evidence vault server rules (PHASE8 §2).
 *
 * The clip-share/core.ts analogue for the vault, with the one
 * deliberate departure §2.1 names: clip shares and avatars are
 * public by design; evidence is NEVER linkable. Vault objects
 * are written with the most restrictive access the deployed
 * @vercel/blob supports ("private"), carry a random suffix, and
 * — regardless of store posture — no Blob URL or pathname is
 * ever returned to a client. Every byte leaves the vault
 * through the ownership-gated routes, which fetch server-side
 * and stream.
 *
 * Interim malware posture (§2.3) — stated plainly because copy
 * must never claim more: there is NO malware scanner in the
 * house stack and this module does not invent one. The shipped
 * controls are the closed allowlist, the size ceiling, magic-
 * byte verification at ingest, no execution/rendering/inline
 * preview of uploads, and attachment + nosniff downloads.
 * Files are "stored privately and type-checked" — never
 * "scanned" or "verified safe". The scanner decision is the
 * Phase 12 B-4 review's.
 */

import { createHash, randomUUID } from "node:crypto";
import { del, get, head } from "@vercel/blob";
import {
  EVIDENCE_EXTENSIONS,
  EVIDENCE_TYPES_BY_EXTENSION,
  VAULT_PATH_PREFIX,
  isEvidenceContentType,
  type EvidenceContentType,
} from "./vault-constants";
import { snapshotSha256 } from "./leads";
import type { CaseStore, EvidenceRecord } from "./store";

export {
  VAULT_PATH_PREFIX,
  MAX_EVIDENCE_FILE_BYTES,
  EVIDENCE_CONTENT_TYPES,
  EVIDENCE_UPLOAD_WARNING,
} from "./vault-constants";
export { isEvidenceContentType, type EvidenceContentType };

type EnvLike = Record<string, string | undefined>;

// ---------------------------------------------------------------------------
// Config + corpus firewall (§2.1 honest-unavailable, §2.7)
// ---------------------------------------------------------------------------

/** Vault storage needs a Vercel Blob store. When the token is
 *  absent the vault says so honestly (503 storage_unavailable)
 *  and never creates a metadata row pointing at nothing.
 *  Artifact-kind evidence does not need Blob and is unaffected. */
export function vaultStorageConfigured(
  env: EnvLike = process.env,
): boolean {
  return !!env.BLOB_READ_WRITE_TOKEN?.trim();
}

const ARTIFACT_ROOT_ENVS = [
  "FRAUD_RADAR_ARTIFACT_ROOT",
  "FRAUD_RADAR_CARE_ARTIFACT_ROOT",
  "FRAUD_RADAR_GRANTS_ARTIFACT_ROOT",
  "FRAUD_RADAR_SIGNALS_ARTIFACT_ROOT",
] as const;

/**
 * Corpus firewall, mechanised (§2.7): vault pathnames live
 * under `fraud-radar-evidence/`; the published-artifact roots
 * are disjoint trees. If any artifact-root env value points
 * into the vault prefix (or the vault prefix into one), the
 * configuration is a firewall breach — the vault refuses to
 * initialise rather than risk evidence entering a published
 * tree, or published reads reaching into the vault.
 */
export function assertCorpusFirewall(env: EnvLike = process.env): void {
  for (const name of ARTIFACT_ROOT_ENVS) {
    const root = env[name]?.trim();
    if (!root) continue;
    if (
      root.includes(VAULT_PATH_PREFIX.replace(/\/$/, "")) ||
      VAULT_PATH_PREFIX.startsWith(root)
    ) {
      throw new VaultError(
        "corpus_firewall",
        `artifact root ${name} overlaps the evidence vault prefix`,
      );
    }
  }
}

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

export type VaultErrorCode =
  | "invalid_input"
  | "unsupported_type"
  | "file_too_large"
  | "type_mismatch"
  | "storage_unavailable"
  | "corpus_firewall"
  | "vault_disabled"
  | "quota_exceeded";

export class VaultError extends Error {
  code: VaultErrorCode;
  constructor(code: VaultErrorCode, message: string) {
    super(message);
    this.code = code;
  }
}

// ---------------------------------------------------------------------------
// Pathnames (§2.1 — paths.ts analogue, pure)
// ---------------------------------------------------------------------------

export function newEvidenceId(): string {
  return `ev_${randomUUID().replace(/-/g, "")}`;
}

/** Pathname shape: fraud-radar-evidence/<ownerId>/<caseId>/
 *  <evidenceId>/<file> — bound to a row the user owns. Segment
 *  values are id-shaped; anything with a slash or dot-segment
 *  is refused rather than sanitised into a different path. */
export function evidenceBlobPathname(
  ownerId: string,
  caseId: string,
  evidenceId: string,
  contentType: string,
): string {
  for (const seg of [ownerId, caseId, evidenceId]) {
    if (!/^[A-Za-z0-9_-]+$/.test(seg)) {
      throw new VaultError("invalid_input", "invalid vault path segment");
    }
  }
  const ext = isEvidenceContentType(contentType)
    ? EVIDENCE_EXTENSIONS[contentType]
    : "bin";
  return `${VAULT_PATH_PREFIX}${ownerId}/${caseId}/${evidenceId}/file.${ext}`;
}

export function parseEvidencePathname(
  pathname: string,
): { ownerId: string; caseId: string; evidenceId: string } | null {
  const parts = pathname.split("/");
  if (parts.length !== 5) return null;
  if (`${parts[0]}/` !== VAULT_PATH_PREFIX) return null;
  const [, ownerId, caseId, evidenceId, file] = parts;
  if (!ownerId || !caseId || !evidenceId || !file) return null;
  return { ownerId, caseId, evidenceId };
}

/**
 * Is this URL one of OUR vault objects for THIS evidence row?
 * The completion route accepts only Blob URLs under the row's
 * own prefix — a user can never complete an upload by pointing
 * a row at someone else's object or an arbitrary external URL
 * (the isOwnShareBlobUrl precedent, tightened to the row).
 */
export function isOwnEvidenceBlobUrl(
  url: unknown,
  ownerId: string,
  caseId: string,
  evidenceId: string,
): boolean {
  if (typeof url !== "string" || !url.startsWith("https://")) return false;
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }
  if (!parsed.hostname.endsWith(".blob.vercel-storage.com")) return false;
  const prefix = `/${VAULT_PATH_PREFIX}${ownerId}/${caseId}/${evidenceId}/`;
  return parsed.pathname.startsWith(prefix);
}

// ---------------------------------------------------------------------------
// Type + hash verification (§2.3.2, §2.4)
// ---------------------------------------------------------------------------

export function sha256Hex(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

function isValidUtf8(bytes: Uint8Array): boolean {
  try {
    new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    return true;
  } catch {
    return false;
  }
}

/**
 * Magic-byte verification (§2.3.2): the stored object's first
 * bytes must agree with its claimed type. A renamed executable
 * cannot become evidence. OOXML types share the ZIP signature
 * and additionally require content-type agreement (checked by
 * the caller against the allowlist + extension). Text types
 * verify by UTF-8 validity.
 */
export function verifyMagicBytes(
  contentType: string,
  bytes: Uint8Array,
): boolean {
  const b = bytes;
  switch (contentType) {
    case "application/pdf":
      return (
        b.length >= 4 &&
        b[0] === 0x25 && // %
        b[1] === 0x50 && // P
        b[2] === 0x44 && // D
        b[3] === 0x46 // F
      );
    case "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
    case "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet":
      return b.length >= 4 && b[0] === 0x50 && b[1] === 0x4b && b[2] === 0x03 && b[3] === 0x04;
    case "image/png":
      return (
        b.length >= 8 &&
        b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 &&
        b[4] === 0x0d && b[5] === 0x0a && b[6] === 0x1a && b[7] === 0x0a
      );
    case "image/jpeg":
      return b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff;
    case "image/webp":
      return (
        b.length >= 12 &&
        b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 && // RIFF
        b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50 // WEBP
      );
    case "text/csv":
    case "text/plain":
      return isValidUtf8(b);
    case "application/json": {
      if (!isValidUtf8(b)) return false;
      try {
        JSON.parse(new TextDecoder().decode(b));
        return true;
      } catch {
        return false;
      }
    }
    default:
      return false;
  }
}

/** The content type an upload claims, corroborated by its
 *  filename extension: both must be allowlisted and agree. */
export function corroborateContentType(
  claimed: string | null | undefined,
  filename: string | null | undefined,
): EvidenceContentType {
  const type = (claimed ?? "").split(";")[0].trim().toLowerCase();
  if (!isEvidenceContentType(type)) {
    throw new VaultError(
      "unsupported_type",
      "this file type is not accepted as case evidence",
    );
  }
  const ext = (filename ?? "").split(".").pop()?.toLowerCase() ?? "";
  const byExt = EVIDENCE_TYPES_BY_EXTENSION[ext];
  if (byExt && byExt !== type) {
    throw new VaultError(
      "type_mismatch",
      "the file extension does not match its content type",
    );
  }
  return type;
}

// ---------------------------------------------------------------------------
// Blob reads (server-side only — results never reach clients)
// ---------------------------------------------------------------------------

async function streamToBytes(stream: ReadableStream<Uint8Array>): Promise<Uint8Array> {
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) {
      chunks.push(value);
      total += value.length;
    }
  }
  const out = new Uint8Array(total);
  let off = 0;
  for (const c of chunks) {
    out.set(c, off);
    off += c.length;
  }
  return out;
}

/**
 * Fetch a vault object's bytes server-side. Access tries
 * "private" first (the vault's own writes), then "public" (a
 * client-uploaded object in a public store — the bytes are
 * still only ever returned to this server, never to a client).
 * Returns null when the object does not exist.
 */
export async function readVaultBytes(
  pathnameOrUrl: string,
): Promise<{ bytes: Uint8Array; contentType: string | null; size: number } | null> {
  for (const access of ["private", "public"] as const) {
    try {
      const res = await get(pathnameOrUrl, { access });
      if (!res) continue;
      if (res.statusCode === 304 || !res.stream) continue;
      const bytes = await streamToBytes(res.stream);
      return { bytes, contentType: res.blob.contentType, size: res.blob.size ?? bytes.length };
    } catch {
      /* try the next access posture */
    }
  }
  return null;
}

/** Stream a vault object for the gated download routes. The
 *  caller wraps the stream in the §2.3.4 headers; the Blob URL
 *  inside the result is never read, logged, or forwarded. */
export async function openVaultStream(
  pathname: string,
): Promise<{ stream: ReadableStream<Uint8Array>; contentType: string | null; size: number | null } | null> {
  for (const access of ["private", "public"] as const) {
    try {
      const res = await get(pathname, { access });
      if (!res) continue;
      if (res.statusCode === 304 || !res.stream) continue;
      return { stream: res.stream, contentType: res.blob.contentType, size: res.blob.size };
    } catch {
      /* try the next access posture */
    }
  }
  return null;
}

export async function vaultObjectMeta(
  pathnameOrUrl: string,
): Promise<{ size: number; contentType: string; pathname: string } | null> {
  try {
    const meta = await head(pathnameOrUrl);
    return { size: meta.size, contentType: meta.contentType, pathname: meta.pathname };
  } catch {
    return null;
  }
}

/** Delete vault objects by pathname. Best-effort per object:
 *  returns the pathnames that could NOT be deleted so callers
 *  can mark rows deletion_pending (§2.6.1) instead of claiming
 *  a delete that has not happened. */
export async function deleteVaultObjects(
  pathnames: string[],
  env: EnvLike = process.env,
): Promise<{ deleted: string[]; failed: string[] }> {
  const deleted: string[] = [];
  const failed: string[] = [];
  if (!vaultStorageConfigured(env)) {
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

// ---------------------------------------------------------------------------
// Deletion sweeps (§2.6)
// ---------------------------------------------------------------------------

/**
 * Retry sweep for deletion_pending rows (§2.6.1): re-attempt
 * the Blob deletes; on success remove the row and record the
 * evidence_removed event (the fact + title + hash — never the
 * content). Called by the worker housekeeping pass (P8-E's
 * loop); exported + tested here so the semantics ship with
 * the vault.
 */
export async function retryPendingEvidenceDeletions(
  store: CaseStore,
  env: EnvLike = process.env,
): Promise<{ completed: number; stillPending: number }> {
  const pending = await store.listEvidenceByStorageState("deletion_pending");
  let completed = 0;
  let stillPending = 0;
  for (const row of pending) {
    const pathnames = [row.blobPathname, row.extractedTextPathname].filter(
      (p): p is string => typeof p === "string" && p.length > 0,
    );
    const { failed } = await deleteVaultObjects(pathnames, env);
    if (failed.length > 0) {
      stillPending++;
      continue;
    }
    await store.deleteEvidence(row.caseId, row.id);
    await store.createEvent({
      caseId: row.caseId,
      kind: "evidence_removed",
      actorId: row.uploadedById,
      detail: { evidenceId: row.id, title: row.title, sha256: row.sha256 },
    });
    completed++;
  }
  return { completed, stillPending };
}

/** Account-deletion sweep (§2.6.3): delete every vault object
 *  the user owns. The caller enumerates BEFORE its DB cascade
 *  (the cascade removes the rows the enumeration reads). */
export async function sweepUserVaultObjects(
  store: CaseStore,
  ownerId: string,
  env: EnvLike = process.env,
): Promise<{ deleted: string[]; failed: string[] }> {
  const pathnames = await store.listEvidencePathnamesForUser(ownerId);
  return deleteVaultObjects(pathnames, env);
}

// ---------------------------------------------------------------------------
// Artifact-kind evidence (§1.4)
// ---------------------------------------------------------------------------

/**
 * Capture an artifact-kind evidence item: a frozen reference
 * to a published record, captured server-side through the same
 * capture the leads use — the caller supplies identifiers
 * only, never an envelope. The frozen envelope + its canonical
 * hash follow the §1.3 snapshot discipline.
 */
export async function captureArtifactEnvelope(args: {
  engine: string;
  entityKey: string;
  capture: (input: {
    kind: string;
    engine: string;
    entityKey: string;
    ruleCode?: string | null;
  }) => Promise<{
    entityLabel: string;
    snapshot: unknown;
    snapshotSha256: string;
  }>;
}): Promise<{ envelope: unknown; sha256: string; entityLabel: string }> {
  const captured = await args.capture({
    kind: "entity",
    engine: args.engine,
    entityKey: args.entityKey,
    ruleCode: null,
  });
  return {
    envelope: captured.snapshot,
    sha256: snapshotSha256(captured.snapshot),
    entityLabel: captured.entityLabel,
  };
}

export type { EvidenceRecord };
