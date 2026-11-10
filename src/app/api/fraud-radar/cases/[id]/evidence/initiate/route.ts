import { NextRequest, NextResponse } from "next/server";
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
  vaultStorageConfigured,
} from "@/lib/fraud-radar/cases/vault";

/**
 * Fraud Radar Phase 8 — evidence upload initiation (PHASE8
 * §2.4 step 1). Validates type/size/quota, creates the pending
 * FrCaseEvidence row (storageState "pending") with a server-
 * minted id, and returns the pathname the client uploader must
 * use — bound to this row, this case, and this owner. A
 * client-reported size is never trusted: completion re-checks
 * the stored object's real size (§2.4 step 3).
 */
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

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
      { error: "the evidence vault opens with a Fraud Radar plan", code: "VAULT_DISABLED" },
      { status: 429 },
    );
  }
  let body: Record<string, unknown> = {};
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    /* validated below */
  }
  const filename = typeof body.filename === "string" ? body.filename : "";
  let contentType: string;
  try {
    contentType = corroborateContentType(
      typeof body.contentType === "string" ? body.contentType : null,
      filename,
    );
  } catch (err) {
    return vaultErrorResponse(err) ?? notFound();
  }
  const sizeBytes = typeof body.sizeBytes === "number" ? body.sizeBytes : NaN;
  if (!Number.isFinite(sizeBytes) || sizeBytes < 0) {
    return NextResponse.json(
      { error: "sizeBytes is required", code: "INVALID_INPUT" },
      { status: 400 },
    );
  }
  if (sizeBytes > MAX_EVIDENCE_FILE_BYTES || sizeBytes > entitlements.storage.maxEvidenceFileBytes) {
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
  if (used + BigInt(Math.trunc(sizeBytes)) > entitlements.storage.maxVaultBytes) {
    return NextResponse.json(
      {
        error: `vault storage limit reached (${entitlements.storage.maxVaultBytes.toString()} bytes)`,
        code: "QUOTA_EXCEEDED",
        limit: entitlements.storage.maxVaultBytes.toString(),
      },
      { status: 429 },
    );
  }
  const evidenceId = newEvidenceId();
  const pathname = evidenceBlobPathname(session.userId, id, evidenceId, contentType);
  const title =
    typeof body.title === "string" && body.title.trim()
      ? body.title.trim().slice(0, 300)
      : filename.slice(0, 300) || "Untitled evidence";
  const row = await store.createEvidence({
    id: evidenceId,
    caseId: id,
    kind: "upload",
    title,
    description: typeof body.description === "string" ? body.description.slice(0, 10_000) : null,
    originalFilename: filename.slice(0, 300) || null,
    contentType,
    sizeBytes: BigInt(Math.trunc(sizeBytes)),
    blobPathname: pathname,
    storageState: "pending",
    uploadedById: session.userId,
  });
  return NextResponse.json(
    { evidence: serializeEvidence(row), evidenceId: row.id, pathname },
    { status: 201 },
  );
}
