import { NextRequest, NextResponse } from "next/server";
import { fraudRadarEnabled } from "@/lib/fraud-radar/flag";
import { fraudRadarAdminPreview } from "@/lib/fraud-radar/access";
import {
  caseSession,
  loadCaseForRoute,
  notFound,
  serializeCase,
  signInRequired,
} from "@/lib/fraud-radar/cases/route-helpers";
import { getCaseStore } from "@/lib/fraud-radar/cases/store";
import {
  CASE_STATUSES,
  CASE_VISIBILITIES,
  deleteCaseForUser,
  updateCaseForUser,
  type CasePatch,
} from "@/lib/fraud-radar/cases/cases";

/**
 * Fraud Radar Phase 8 — one case (PHASE8 §5.2, §1.5). A case id
 * belonging to another user returns 404, not 403 — existence is
 * not leaked. DELETE is a hard delete (§2.6 rule 2).
 */
export const dynamic = "force-dynamic";

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
  const events = await getCaseStore().listEvents(id);
  return NextResponse.json({
    case: serializeCase(found.caseRow),
    events: events.map((e) => ({
      id: e.id,
      kind: e.kind,
      actorId: e.actorId,
      detail: e.detail,
      createdAt: e.createdAt.toISOString(),
    })),
  });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!fraudRadarEnabled() && !(await fraudRadarAdminPreview())) return notFound();
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
  const patch: CasePatch = {};
  if (body.title !== undefined) {
    if (typeof body.title !== "string" || !body.title.trim() || body.title.length > 200) {
      return NextResponse.json(
        { error: "title must be 1–200 characters", code: "INVALID_INPUT" },
        { status: 400 },
      );
    }
    patch.title = body.title.trim();
  }
  if (body.summary !== undefined) {
    if (body.summary !== null && typeof body.summary !== "string") {
      return NextResponse.json(
        { error: "summary must be text or null", code: "INVALID_INPUT" },
        { status: 400 },
      );
    }
    patch.summary =
      typeof body.summary === "string" ? body.summary.slice(0, 10_000) : null;
  }
  if (body.status !== undefined) {
    if (
      typeof body.status !== "string" ||
      !(CASE_STATUSES as readonly string[]).includes(body.status)
    ) {
      return NextResponse.json(
        { error: "status must be open, paused, or closed", code: "INVALID_INPUT" },
        { status: 400 },
      );
    }
    patch.status = body.status;
  }
  if (body.visibility !== undefined) {
    if (
      typeof body.visibility !== "string" ||
      !(CASE_VISIBILITIES as readonly string[]).includes(body.visibility)
    ) {
      return NextResponse.json(
        { error: "visibility must be private or team", code: "INVALID_INPUT" },
        { status: 400 },
      );
    }
    patch.visibility = body.visibility;
  }
  if (body.teamRef !== undefined) {
    if (body.teamRef !== null && typeof body.teamRef !== "string") {
      return NextResponse.json(
        { error: "teamRef must be text or null", code: "INVALID_INPUT" },
        { status: 400 },
      );
    }
    patch.teamRef = typeof body.teamRef === "string" ? body.teamRef.slice(0, 200) : null;
  }
  const updated = await updateCaseForUser(getCaseStore(), {
    caseRow: found.caseRow,
    actorId: session.userId,
    patch,
  });
  return NextResponse.json({ case: serializeCase(updated) });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!fraudRadarEnabled() && !(await fraudRadarAdminPreview())) return notFound();
  const session = await caseSession();
  if (!session) return signInRequired();
  const { id } = await params;
  const found = await loadCaseForRoute(session.userId, id, { write: true });
  if (!found) return notFound();
  await deleteCaseForUser(getCaseStore(), {
    caseRow: found.caseRow,
    actorId: session.userId,
  });
  return NextResponse.json({ ok: true });
}
