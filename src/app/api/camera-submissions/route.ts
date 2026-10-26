// POST /api/camera-submissions — public submit-a-camera intake.
// Validates via the shared parser (src/lib/camera-submissions), checks the
// URL's host against the shared SSRF guard, rate-limits per IP with the
// same helper the contact/auth routes use, stores the submission as
// "pending" for the admin review queue, and emails the submitter a
// receipt. A hidden honeypot field silently drops bot submissions: they
// get a success-shaped answer and nothing is stored or sent.
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
  sendCameraSubmissionReceipt,
} from "@/lib/camera-submissions-server";

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

  const hostCheck = await validateCameraUrl(parsed.data.url);
  if (!hostCheck.ok) {
    return NextResponse.json({ error: hostCheck.error }, { status: 400 });
  }

  // Best-effort reachability probe for the reviewer. It never blocks the
  // submission — a feed can refuse datacenter probes and still be fine.
  const probe = await probeCameraUrl(parsed.data.url).catch(() => null);

  const sub = await db.cameraSubmission.create({
    data: {
      ...parsed.data,
      probeStatus: probe?.probeStatus ?? "unknown",
      probeDetail: probe?.probeDetail ?? null,
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

  return NextResponse.json({ ok: true, id: sub.id });
}
