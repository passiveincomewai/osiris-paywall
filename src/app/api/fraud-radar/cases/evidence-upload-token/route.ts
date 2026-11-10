import { NextRequest, NextResponse } from "next/server";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { fraudRadarEnabled } from "@/lib/fraud-radar/flag";
import { fraudRadarAdminPreview } from "@/lib/fraud-radar/access";
import { caseSession, notFound } from "@/lib/fraud-radar/cases/route-helpers";
import { getCaseStore } from "@/lib/fraud-radar/cases/store";
import {
  EVIDENCE_CONTENT_TYPES,
  MAX_EVIDENCE_FILE_BYTES,
  parseEvidencePathname,
  vaultStorageConfigured,
} from "@/lib/fraud-radar/cases/vault";

/**
 * Fraud Radar Phase 8 — client-upload token for the vault
 * (PHASE8 §2.4 step 2; the share/upload-token precedent). The
 * browser uploads straight to Blob; this route binds the
 * upload three ways: a signed-in session, a pathname under
 * fraud-radar-evidence/<ownerId>/<caseId>/<evidenceId>/ where
 * ownerId IS the caller, and a pending evidence row for that
 * exact case + id created by the initiate route. The token
 * carries the §2.2 allowlist + ceiling server-side.
 */
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  if (!fraudRadarEnabled() && !(await fraudRadarAdminPreview())) return notFound();
  if (!vaultStorageConfigured()) {
    return NextResponse.json(
      { error: "storage_unavailable", code: "STORAGE_UNAVAILABLE" },
      { status: 503 },
    );
  }
  const body = (await req.json().catch(() => null)) as HandleUploadBody | null;
  if (!body) return NextResponse.json({ error: "bad request" }, { status: 400 });
  try {
    const jsonResponse = await handleUpload({
      body,
      request: req,
      onBeforeGenerateToken: async (pathname) => {
        const session = await caseSession();
        if (!session) throw new Error("signin required");
        const parsed = parseEvidencePathname(pathname);
        if (!parsed) throw new Error("invalid evidence path");
        if (parsed.ownerId !== session.userId) throw new Error("evidence not found");
        const store = getCaseStore();
        const caseRow = await store.getCaseById(parsed.caseId);
        if (!caseRow || caseRow.ownerId !== session.userId) {
          throw new Error("evidence not found");
        }
        const row = await store.getEvidence(parsed.caseId, parsed.evidenceId);
        if (!row || row.storageState !== "pending" || row.uploadedById !== session.userId) {
          throw new Error("evidence not found");
        }
        return {
          allowedContentTypes: [...EVIDENCE_CONTENT_TYPES],
          maximumSizeInBytes: MAX_EVIDENCE_FILE_BYTES,
          addRandomSuffix: true,
          tokenPayload: JSON.stringify({
            userId: session.userId,
            caseId: parsed.caseId,
            evidenceId: parsed.evidenceId,
          }),
        };
      },
      onUploadCompleted: async () => {
        // No-op: the completion route (§2.4 step 3) verifies the
        // object and completes the row — webhooks are not the
        // source of truth (the share precedent).
      },
    });
    return NextResponse.json(jsonResponse);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "upload token failed" },
      { status: 400 },
    );
  }
}
