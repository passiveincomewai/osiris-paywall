import { NextRequest, NextResponse } from "next/server";
import { fraudRadarEnabled } from "@/lib/fraud-radar/flag";
import {
  caseSession,
  isPlatformAdmin,
  loadCaseForRoute,
  notFound,
  serializeLead,
  signInRequired,
} from "@/lib/fraud-radar/cases/route-helpers";
import { getCaseStore } from "@/lib/fraud-radar/cases/store";
import {
  LeadCaptureError,
  pinCandidateLeadAsAdmin,
  pinLead,
} from "@/lib/fraud-radar/cases/leads";

/**
 * Fraud Radar Phase 8 — case leads (PHASE8 §5.2, §1.3).
 * GET lists the case's pins (rendered from their snapshots).
 * POST pins by IDENTIFIERS ONLY — the server captures the full
 * record + provenance from the data layers; a client-submitted
 * snapshot body is rejected, never stored. S-06 candidate pairs
 * pin only through the admin path (platform admin + kind
 * "candidate"); the public capture refuses them by construction.
 */
export const dynamic = "force-dynamic";

function captureErrorResponse(err: unknown) {
  if (err instanceof LeadCaptureError) {
    if (err.code === "lead_not_found" || err.code === "dataset_not_published") {
      return NextResponse.json(
        { error: err.message, code: err.code.toUpperCase() },
        { status: 404 },
      );
    }
    return NextResponse.json(
      { error: err.message, code: err.code.toUpperCase() },
      { status: 400 },
    );
  }
  throw err;
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!fraudRadarEnabled()) return notFound();
  const session = await caseSession();
  if (!session) return signInRequired();
  const { id } = await params;
  const found = await loadCaseForRoute(session.userId, id);
  if (!found) return notFound();
  const leads = await getCaseStore().listLeads(id);
  return NextResponse.json({ leads: leads.map(serializeLead) });
}

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
  // Rule 3: identifiers only. A submitted snapshot body is a
  // fabricated-lead attempt — refuse it outright.
  if ("snapshot" in body || "snapshotSha256" in body || "data" in body) {
    return NextResponse.json(
      {
        error: "leads are captured server-side from identifiers only",
        code: "INVALID_INPUT",
      },
      { status: 400 },
    );
  }
  const kind = typeof body.kind === "string" ? body.kind : "";
  const engine = typeof body.engine === "string" ? body.engine : "";
  const entityKey = typeof body.entityKey === "string" ? body.entityKey : "";
  const ruleCode = typeof body.ruleCode === "string" ? body.ruleCode : null;
  const annotation =
    typeof body.annotation === "string" ? body.annotation.slice(0, 10_000) : null;
  const store = getCaseStore();
  try {
    if (kind === "candidate") {
      // The admin queue path (§1.3 rule 4): only a platform
      // admin may pin a candidate pair, and only into their own
      // case (write access was resolved above).
      const result = await pinCandidateLeadAsAdmin(store, {
        caseId: id,
        pinnedById: session.userId,
        isAdmin: isPlatformAdmin(session.email),
        engine,
        entityKey,
        annotation,
      });
      return NextResponse.json(
        { lead: serializeLead(result.lead), created: result.created },
        { status: result.created ? 201 : 200 },
      );
    }
    const result = await pinLead(store, {
      caseId: id,
      pinnedById: session.userId,
      input: { kind, engine, entityKey, ruleCode },
      annotation,
    });
    return NextResponse.json(
      { lead: serializeLead(result.lead), created: result.created },
      { status: result.created ? 201 : 200 },
    );
  } catch (err) {
    return captureErrorResponse(err);
  }
}
