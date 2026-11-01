import { NextRequest, NextResponse } from "next/server";
import { fraudRadarEnabled } from "@/lib/fraud-radar/flag";
import {
  caseSession,
  loadCaseForRoute,
  notFound,
  serializeEvidence,
  signInRequired,
} from "@/lib/fraud-radar/cases/route-helpers";
import { getCaseStore } from "@/lib/fraud-radar/cases/store";
import { LeadCaptureError, captureLead } from "@/lib/fraud-radar/cases/leads";
import { captureArtifactEnvelope } from "@/lib/fraud-radar/cases/vault";

/**
 * Fraud Radar Phase 8 — artifact-kind evidence (PHASE8 §1.4).
 * A captured reference to a published record, frozen as a
 * citation envelope under the §1.3 snapshot discipline. The
 * route takes IDENTIFIERS ONLY and captures server-side; a
 * client-submitted envelope is refused, exactly like a
 * client-submitted lead snapshot. Artifacts need no Blob
 * storage and are not gated by vaultEnabled — the free tier
 * holds artifact evidence (§5.3).
 */
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!fraudRadarEnabled()) return notFound();
  const session = await caseSession();
  if (!session) return signInRequired();
  const { id } = await params;
  const found = await loadCaseForRoute(session.userId, id, { write: true });
  if (!found) return notFound();
  let body: Record<string, unknown> = {};
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    /* validated below */
  }
  if ("artifactEnvelope" in body || "envelope" in body || "snapshot" in body || "data" in body) {
    return NextResponse.json(
      {
        error: "artifacts are captured server-side from identifiers only",
        code: "INVALID_INPUT",
      },
      { status: 400 },
    );
  }
  const engine = typeof body.engine === "string" ? body.engine : "";
  const entityKey = typeof body.entityKey === "string" ? body.entityKey : "";
  if (!engine || !entityKey.trim()) {
    return NextResponse.json(
      { error: "engine and entityKey are required", code: "INVALID_INPUT" },
      { status: 400 },
    );
  }
  try {
    const { envelope, sha256, entityLabel } = await captureArtifactEnvelope({
      engine,
      entityKey,
      capture: (input) => captureLead(input),
    });
    const store = getCaseStore();
    const title =
      typeof body.title === "string" && body.title.trim()
        ? body.title.trim().slice(0, 300)
        : entityLabel.slice(0, 300);
    const row = await store.createEvidence({
      caseId: id,
      kind: "artifact",
      title,
      description:
        typeof body.description === "string" ? body.description.slice(0, 10_000) : null,
      artifactEnvelope: envelope,
      artifactSha256: sha256,
      storageState: "present",
      uploadedById: session.userId,
    });
    await store.createEvent({
      caseId: id,
      kind: "evidence_added",
      actorId: session.userId,
      detail: { evidenceId: row.id, title: row.title, artifactSha256: sha256, kind: "artifact" },
    });
    return NextResponse.json({ evidence: serializeEvidence(row) }, { status: 201 });
  } catch (err) {
    if (err instanceof LeadCaptureError) {
      const status =
        err.code === "lead_not_found" || err.code === "dataset_not_published" ? 404 : 400;
      return NextResponse.json(
        { error: err.message, code: err.code.toUpperCase() },
        { status },
      );
    }
    throw err;
  }
}
