import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { fraudRadarEnabled } from "@/lib/fraud-radar/flag";
import { fraudRadarAdminPreview } from "@/lib/fraud-radar/access";
import {
  caseSession,
  loadCaseForRoute,
  notFound,
  serializeEvidence,
  signInRequired,
  vaultErrorResponse,
} from "@/lib/fraud-radar/cases/route-helpers";
import { getCaseStore } from "@/lib/fraud-radar/cases/store";
import { caseEntitlementsForSession } from "@/lib/fraud-radar/cases/entitlements";
import {
  MAX_EVIDENCE_FILE_BYTES,
  assertCorpusFirewall,
  corroborateContentType,
  evidenceBlobPathname,
  newEvidenceId,
  sha256Hex,
  vaultStorageConfigured,
  verifyMagicBytes,
} from "@/lib/fraud-radar/cases/vault";

/**
 * Fraud Radar Phase 8 — case evidence collection (PHASE8 §5.2,
 * §2). GET lists the case's vault items (metadata + hashes
 * only — never a Blob URL or pathname). POST is the server-side
 * multipart ingest: the file passes through this route, is
 * allowlist/size/magic-byte checked, hashed (SHA-256 over the
 * exact bytes), and stored with `put()` under the case-scoped
 * pathname bound to a server-minted evidence row. The direct-
 * upload pattern (initiate → token → complete, §2.4) is the
 * second ingest path into the same rows; both enforce the
 * identical rules here in the vault module.
 *
 * Check order (§5.1): flag (404) → session (401) → case access
 * (404) → storage configured (503) → entitlement/quota (429)
 * → validation (400/413) → work.
 */
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!fraudRadarEnabled() && !(await fraudRadarAdminPreview())) return notFound();
  const session = await caseSession();
  if (!session) return signInRequired();
  const { id } = await params;
  const found = await loadCaseForRoute(session.userId, id);
  if (!found) return notFound();
  const items = await getCaseStore().listEvidence(id);
  return NextResponse.json({ evidence: items.map(serializeEvidence) });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!fraudRadarEnabled() && !(await fraudRadarAdminPreview())) return notFound();
  const session = await caseSession();
  if (!session) return signInRequired();
  const { id } = await params;
  const found = await loadCaseForRoute(session.userId, id, { write: true });
  if (!found) return notFound();
  if (!vaultStorageConfigured()) {
    return NextResponse.json(
      { error: "storage_unavailable", code: "STORAGE_UNAVAILABLE" },
      { status: 503 },
    );
  }
  try {
    assertCorpusFirewall();
  } catch (err) {
    return vaultErrorResponse(err) ?? NextResponse.json({ error: "storage_unavailable", code: "STORAGE_UNAVAILABLE" }, { status: 503 });
  }
  const { entitlements } = caseEntitlementsForSession(session.session);
  if (!entitlements || !entitlements.storage.vaultEnabled) {
    return NextResponse.json(
      {
        error: "the evidence vault opens with a Fraud Radar plan",
        code: "VAULT_DISABLED",
      },
      { status: 429 },
    );
  }
  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json(
      { error: "attach a file", code: "INVALID_INPUT" },
      { status: 400 },
    );
  }
  const titleRaw = form?.get("title");
  const descRaw = form?.get("description");
  const title =
    typeof titleRaw === "string" && titleRaw.trim()
      ? titleRaw.trim().slice(0, 300)
      : file.name.slice(0, 300);
  const description =
    typeof descRaw === "string" ? descRaw.slice(0, 10_000) : null;

  let contentType: string;
  try {
    contentType = corroborateContentType(file.type, file.name);
  } catch (err) {
    return vaultErrorResponse(err) ?? notFound();
  }
  if (file.size > MAX_EVIDENCE_FILE_BYTES || file.size > entitlements.storage.maxEvidenceFileBytes) {
    return NextResponse.json(
      {
        error: `evidence files must be ${MAX_EVIDENCE_FILE_BYTES} bytes or smaller`,
        code: "FILE_TOO_LARGE",
        limit: MAX_EVIDENCE_FILE_BYTES,
      },
      { status: 413 },
    );
  }
  const store = getCaseStore();
  const used = await store.sumEvidenceBytes(session.userId);
  if (used + BigInt(file.size) > entitlements.storage.maxVaultBytes) {
    return NextResponse.json(
      {
        error: `vault storage limit reached (${entitlements.storage.maxVaultBytes.toString()} bytes)`,
        code: "QUOTA_EXCEEDED",
        limit: entitlements.storage.maxVaultBytes.toString(),
      },
      { status: 429 },
    );
  }
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (!verifyMagicBytes(contentType, bytes)) {
    return NextResponse.json(
      {
        error: "the file contents do not match its content type",
        code: "TYPE_MISMATCH",
      },
      { status: 400 },
    );
  }
  const sha256 = sha256Hex(bytes);
  // The row is minted BEFORE the upload so the pathname binds
  // to a row this caller owns (§2.4 binding discipline).
  const evidenceId = newEvidenceId();
  const plannedPathname = evidenceBlobPathname(session.userId, id, evidenceId, contentType);
  const pending = await store.createEvidence({
    id: evidenceId,
    caseId: id,
    kind: "upload",
    title,
    description,
    originalFilename: file.name.slice(0, 300),
    contentType,
    blobPathname: plannedPathname,
    storageState: "pending",
    uploadedById: session.userId,
  });
  let blobPathname: string;
  try {
    const blob = await put(plannedPathname, Buffer.from(bytes), {
      access: "private",
      addRandomSuffix: true,
      contentType,
    });
    blobPathname = blob.pathname;
  } catch {
    await store.deleteEvidence(id, pending.id).catch(() => false);
    return NextResponse.json(
      { error: "storage_unavailable", code: "STORAGE_UNAVAILABLE" },
      { status: 503 },
    );
  }
  const completed = await store.updateEvidence(id, pending.id, {
    blobPathname,
    contentType,
    sizeBytes: BigInt(bytes.length),
    sha256,
    storageState: "present",
  });
  await store.createEvent({
    caseId: id,
    kind: "evidence_added",
    actorId: session.userId,
    detail: { evidenceId: pending.id, title, sha256, sizeBytes: bytes.length },
  });
  return NextResponse.json(
    { evidence: serializeEvidence(completed ?? pending) },
    { status: 201 },
  );
}
