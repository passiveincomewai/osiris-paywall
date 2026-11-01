import { NextResponse } from "next/server";
import { fraudRadarEnabled } from "@/lib/fraud-radar/flag";
import {
  caseSession,
  loadCaseForRoute,
  notFound,
  signInRequired,
} from "@/lib/fraud-radar/cases/route-helpers";
import { getCaseStore } from "@/lib/fraud-radar/cases/store";
import { openVaultStream } from "@/lib/fraud-radar/cases/vault";

/**
 * Fraud Radar Phase 8 — evidence download (PHASE8 §2.5). The
 * ONLY way upload bytes leave the vault. Check order: flag
 * (404) → session (401) → case access (404) → evidence belongs
 * to the case (404) → stream. The route fetches from Blob
 * server-side and streams the response: it never redirects,
 * never signs a client-visible URL, never emits the Blob URL
 * or pathname in any header or body, and caches nothing
 * (`private, no-store`). Downloads are attachment + nosniff
 * for every type (§2.3.4) — there is no inline preview of
 * uploaded content in v1 beyond the gated image handling the
 * case surface performs with these same bytes.
 */
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function safeFilename(name: string | null, fallback: string): string {
  const raw = (name ?? fallback).replace(/["\r\n\\]/g, "_").slice(0, 200);
  return raw || fallback;
}

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
  if (
    !row ||
    row.kind !== "upload" ||
    row.storageState !== "present" ||
    !row.blobPathname
  ) {
    return notFound();
  }
  const opened = await openVaultStream(row.blobPathname);
  if (!opened) return notFound();
  const headers = new Headers({
    "Content-Type": row.contentType ?? opened.contentType ?? "application/octet-stream",
    "Content-Disposition": `attachment; filename="${safeFilename(row.originalFilename, row.title)}"`,
    "X-Content-Type-Options": "nosniff",
    "Cache-Control": "private, no-store",
  });
  if (opened.size !== null) headers.set("Content-Length", String(opened.size));
  return new NextResponse(opened.stream, { status: 200, headers });
}
