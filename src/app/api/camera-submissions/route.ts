// POST /api/camera-submissions — public submit-a-camera intake.
// Validates via the shared parser (src/lib/camera-submissions), checks the
// URL's host against the shared SSRF guard, duplicate-checks the feed
// against the published catalogue and the pending review queue,
// rate-limits per IP with the same helper the contact/auth routes use,
// stores the submission as "pending" for the admin review queue, and
// emails the submitter a receipt. An exact duplicate is refused with
// 409 and the answer names what it duplicates — nothing is stored. A
// possible duplicate is stored and flagged for the reviewer (the flag
// rides on probeDetail, which the admin queue renders) and reported to
// the submitter. Every success response reports what the checks
// actually found in `checks`, so the form never claims a check that
// didn't run. A hidden honeypot field silently drops bot submissions:
// they get a success-shaped answer and nothing is stored or sent.
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { isRateLimited, clientIp } from "@/lib/password-auth";
import {
  parseCameraSubmission,
  isHoneypotTripped,
} from "@/lib/camera-submissions";
import {
  validateCameraUrl,
  probeCameraUrl,
  checkCatalogueDuplicates,
  checkPendingSubmissionDuplicates,
  possibleDuplicateNote,
  sendCameraSubmissionReceipt,
} from "@/lib/camera-submissions-server";
import type { DuplicateCheck } from "@/lib/camera-duplicates";

export const runtime = "nodejs";

export async function POST(req: Request) {
  if (isRateLimited(`camera-submit:${clientIp(req)}`, 5, 60 * 60 * 1000)) {
    return NextResponse.json(
      { error: "Too many submissions from this network. Try again in an hour, or email us directly." },
      { status: 429 },
    );
  }

  const body = await req.json().catch(() => null);

  // Honeypot: a filled hidden field means a bot. Answer like a success
  // (don't tip it off) and store nothing.
  if (isHoneypotTripped(body)) {
    return NextResponse.json({ ok: true });
  }

  const parsed = parseCameraSubmission(body);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }
  const data = parsed.data;

  const hostCheck = await validateCameraUrl(data.url);
  if (!hostCheck.ok) {
    return NextResponse.json({ error: hostCheck.error }, { status: 400 });
  }

  // Duplicate checks. Both are best-effort: a check that fails to run
  // (catalogue chunk unreadable, queue read hiccup) never blocks a
  // submission — it just reports "unknown" in `checks`.
  const catalogueDup = await checkCatalogueDuplicates(data).catch(() => null);
  if (catalogueDup?.verdict === "exact") {
    const m = catalogueDup.matches[0];
    const place = [m.city, m.country].filter(Boolean).join(", ");
    return NextResponse.json(
      {
        error:
          `That feed is already on WorldEye as “${m.name}”${place ? ` (${place})` : ""}. ` +
          "If this is a different camera, send its direct feed address; if the listing looks wrong, tell us via the contact page.",
        checks: { urlSafety: "passed", duplicate: "exact" },
      },
      { status: 409 },
    );
  }

  const pendingDup = await checkPendingSubmissionDuplicates(data).catch(() => null);
  if (pendingDup?.verdict === "exact") {
    const m = pendingDup.matches[0];
    return NextResponse.json(
      {
        error:
          `That feed has already been submitted as “${m.name}” and is waiting for review — there's no need to send it again. ` +
          "We'll email the original submitter the decision; if that wasn't you and this is a different camera, send its direct feed address.",
        checks: { urlSafety: "passed", duplicate: "exact" },
      },
      { status: 409 },
    );
  }

  // The verdict the submitter and the reviewer see: the catalogue match
  // is the stronger signal, so it wins when both checks found something.
  const duplicates: DuplicateCheck | null =
    catalogueDup?.verdict === "possible"
      ? catalogueDup
      : pendingDup?.verdict === "possible"
        ? pendingDup
        : (catalogueDup ?? pendingDup);

  // Best-effort reachability probe for the reviewer. It never blocks the
  // submission — a feed can refuse datacenter probes and still be fine.
  const probe = await probeCameraUrl(data.url).catch(() => null);

  // A possible-duplicate flag rides on probeDetail so it reaches the
  // reviewer in the admin queue alongside the probe verdict.
  const dupNote = duplicates ? possibleDuplicateNote(duplicates) : null;
  const probeDetail =
    [probe?.probeDetail ?? null, dupNote].filter(Boolean).join(" · ") || null;

  const sub = await db.cameraSubmission.create({
    data: {
      ...data,
      probeStatus: probe?.probeStatus ?? "unknown",
      probeDetail,
      probedAt: probe ? new Date() : null,
    },
  });

  // Receipt email is best-effort: the submission counts even if the mail
  // provider hiccups; the timestamp records what actually happened.
  const receiptSent = await sendCameraSubmissionReceipt({
    submitterName: sub.submitterName,
    submitterEmail: sub.submitterEmail,
    cameraName: sub.cameraName,
    city: sub.city,
    country: sub.country,
  }).catch(() => false);
  if (receiptSent) {
    await db.cameraSubmission
      .update({ where: { id: sub.id }, data: { receiptEmailedAt: new Date() } })
      .catch(() => {});
  }

  return NextResponse.json({
    ok: true,
    id: sub.id,
    checks: {
      urlSafety: "passed",
      reachability: probe?.probeStatus ?? "unknown",
      duplicate: duplicates?.verdict ?? "unknown",
      receiptEmailed: receiptSent,
    },
  });
}
