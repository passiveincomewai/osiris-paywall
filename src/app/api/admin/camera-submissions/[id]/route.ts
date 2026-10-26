// Admin: review one camera submission.
// PATCH { decision: "approve" | "reject", reviewerNotes?: string }
// Approve → status "approved" (cleared for import — the catalogue import
// itself is a separate ops step, so nothing goes live from here).
// Reject  → status "rejected". Both stamp reviewedAt/reviewedBy, keep the
// reviewer's notes on the row, and email the submitter the decision
// (best-effort; decisionEmailedAt records whether it actually sent).
// Gated by the same requireAdmin() (ADMIN_EMAILS) as the rest of /admin.
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin, audit } from "@/lib/affiliate/admin";
import { reviewDecision, REVIEWER_NOTES_MAX } from "@/lib/camera-submissions";
import { sendCameraSubmissionDecision } from "@/lib/camera-submissions-server";

export const runtime = "nodejs";

function forbidden(e: unknown) {
  return NextResponse.json({ error: "Forbidden" }, { status: (e as { status?: number }).status ?? 403 });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let session;
  try { session = await requireAdmin(); } catch (e) { return forbidden(e); }

  const body = (await req.json().catch(() => ({}))) as { decision?: unknown; reviewerNotes?: unknown };
  const reviewerNotes =
    typeof body.reviewerNotes === "string" ? body.reviewerNotes.trim().slice(0, REVIEWER_NOTES_MAX) : "";

  const existing = await db.cameraSubmission.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Submission not found" }, { status: 404 });

  const verdict = reviewDecision(existing.status, body.decision);
  if (!verdict.ok) {
    return NextResponse.json({ error: verdict.error }, { status: verdict.conflict ? 409 : 400 });
  }

  const updated = await db.cameraSubmission.update({
    where: { id },
    data: {
      status: verdict.nextStatus,
      reviewerNotes: reviewerNotes || null,
      reviewedBy: session?.user?.email ?? null,
      reviewedAt: new Date(),
    },
  });

  // Decision email is best-effort — the review stands either way, and the
  // timestamp says honestly whether the submitter was told.
  const decisionEmailed = await sendCameraSubmissionDecision({
    submitterName: updated.submitterName,
    submitterEmail: updated.submitterEmail,
    cameraName: updated.cameraName,
    city: updated.city,
    country: updated.country,
    reviewerNotes: updated.reviewerNotes,
    status: updated.status,
  }).catch(() => false);
  if (decisionEmailed) {
    await db.cameraSubmission
      .update({ where: { id }, data: { decisionEmailedAt: new Date() } })
      .catch(() => {});
  }

  await audit(`camera-submission.${body.decision === "approve" ? "approve" : "reject"}`, {
    actorUserId: session?.user?.id, targetType: "CameraSubmission", targetId: id,
    details: {
      cameraName: existing.cameraName, kind: existing.kind, category: existing.category,
      probeStatus: existing.probeStatus, decisionEmailed,
    },
  });
  return NextResponse.json({ id: updated.id, status: updated.status, decisionEmailed });
}
