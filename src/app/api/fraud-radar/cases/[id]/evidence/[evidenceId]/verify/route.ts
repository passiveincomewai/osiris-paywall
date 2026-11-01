import { NextResponse } from "next/server";
import { fraudRadarEnabled } from "@/lib/fraud-radar/flag";
import {
  caseSession,
  loadCaseForRoute,
  notFound,
  signInRequired,
} from "@/lib/fraud-radar/cases/route-helpers";
import { getCaseStore } from "@/lib/fraud-radar/cases/store";
import { readVaultBytes, sha256Hex } from "@/lib/fraud-radar/cases/vault";

/**
 * Fraud Radar Phase 8 — evidence integrity verification
 * (PHASE8 §2.4). Re-fetches the stored object through the
 * gated server path, re-hashes it, and compares against the
 * SHA-256 recorded at ingest. A mismatch is reported as an
 * integrity failure ({ ok: false }) — never a silent pass.
 * The response carries hashes only: no URL, no pathname, no
 * content.
 */
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string; evidenceId: string }> },
) {
  if (!fraudRadarEnabled()) return notFound();
  const session = await caseSession();
  if (!session) return signInRequired();
  const { id, evidenceId } = await params;
  const found = await loadCaseForRoute(session.userId, id);
  if (!found) return notFound();
  const row = await getCaseStore().getEvidence(id, evidenceId);
  if (!row || row.kind !== "upload" || row.storageState !== "present" || !row.blobPathname || !row.sha256) {
    return notFound();
  }
  const read = await readVaultBytes(row.blobPathname);
  if (!read) return notFound();
  const actual = sha256Hex(read.bytes);
  return NextResponse.json({
    ok: actual === row.sha256,
    sha256: actual,
    storedSha256: row.sha256,
  });
}
