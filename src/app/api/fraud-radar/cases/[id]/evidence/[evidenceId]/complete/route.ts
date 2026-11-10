import { NextRequest, NextResponse } from "next/server";
import { del } from "@vercel/blob";
import { fraudRadarEnabled } from "@/lib/fraud-radar/flag";
import { fraudRadarAdminPreview } from "@/lib/fraud-radar/access";
import {
  caseSession,
  loadCaseForRoute,
  notFound,
  serializeEvidence,
  signInRequired,
} from "@/lib/fraud-radar/cases/route-helpers";
import { getCaseStore } from "@/lib/fraud-radar/cases/store";
import {
  MAX_EVIDENCE_FILE_BYTES,
  isOwnEvidenceBlobUrl,
  isEvidenceContentType,
  readVaultBytes,
  sha256Hex,
  vaultObjectMeta,
  verifyMagicBytes,
} from "@/lib/fraud-radar/cases/vault";

/**
 * Fraud Radar Phase 8 — evidence upload completion (PHASE8
 * §2.4 step 3). The client reports the Blob URL of its direct
 * upload; this route accepts it only if it sits under THIS
 * pending row's own prefix, then fetches the object server-
 * side ONCE to verify magic bytes, verify the real size
 * against the initiated size, and compute SHA-256 over the
 * exact stored bytes. Any verification failure deletes the
 * Blob object AND the pending row and returns the specific
 * error — a failed completion leaves nothing behind.
 */
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; evidenceId: string }> },
) {
  if (!fraudRadarEnabled() && !(await fraudRadarAdminPreview())) return notFound();
  const session = await caseSession();
  if (!session) return signInRequired();
  const { id, evidenceId } = await params;
  const found = await loadCaseForRoute(session.userId, id, { write: true });
  if (!found) return notFound();
  const store = getCaseStore();
  const row = await store.getEvidence(id, evidenceId);
  if (!row || row.kind !== "upload" || row.storageState === "deletion_pending") {
    return notFound();
  }
  let body: Record<string, unknown> = {};
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    /* validated below */
  }
  const blobUrl = body.blobUrl;
  const fail = async (status: number, code: string, error: string) => {
    // §2.4: a verification failure removes the object (when it
    // is verifiably ours to remove) and the pending row.
    if (typeof blobUrl === "string") {
      await del(blobUrl).catch(() => null);
    }
    await store.deleteEvidence(id, evidenceId).catch(() => false);
    return NextResponse.json({ error, code }, { status });
  };
  if (!isOwnEvidenceBlobUrl(blobUrl, session.userId, id, evidenceId)) {
    // Not our prefix: refuse WITHOUT deleting (the object is
    // not verifiably this row's), and drop the pending row.
    await store.deleteEvidence(id, evidenceId).catch(() => false);
    return NextResponse.json(
      { error: "the uploaded file does not belong to this evidence item", code: "INVALID_INPUT" },
      { status: 400 },
    );
  }
  const meta = await vaultObjectMeta(blobUrl as string);
  if (!meta) return fail(400, "INVALID_INPUT", "the uploaded file could not be read back");
  if (meta.size > MAX_EVIDENCE_FILE_BYTES) {
    return fail(413, "FILE_TOO_LARGE", "the uploaded file exceeds the evidence size limit");
  }
  if (row.sizeBytes !== null && meta.size !== Number(row.sizeBytes)) {
    return fail(400, "INVALID_INPUT", "the uploaded file size does not match the initiated size");
  }
  const contentType = meta.contentType.split(";")[0].trim().toLowerCase();
  if (!isEvidenceContentType(contentType) || (row.contentType && contentType !== row.contentType)) {
    return fail(400, "TYPE_MISMATCH", "the uploaded file type does not match the initiated type");
  }
  const read = await readVaultBytes(blobUrl as string);
  if (!read) return fail(400, "INVALID_INPUT", "the uploaded file could not be read back");
  if (!verifyMagicBytes(contentType, read.bytes)) {
    return fail(400, "TYPE_MISMATCH", "the file contents do not match its content type");
  }
  const sha256 = sha256Hex(read.bytes);
  const completed = await store.updateEvidence(id, evidenceId, {
    blobPathname: meta.pathname,
    contentType,
    sizeBytes: BigInt(read.bytes.length),
    sha256,
    storageState: "present",
  });
  await store.createEvent({
    caseId: id,
    kind: "evidence_added",
    actorId: session.userId,
    detail: { evidenceId, title: row.title, sha256, sizeBytes: read.bytes.length },
  });
  return NextResponse.json({ evidence: serializeEvidence(completed ?? row) });
}
