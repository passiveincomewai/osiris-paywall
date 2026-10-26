// ── Submit-a-camera: server-only pieces ─────────────────────────────────
// Host safety (shared SSRF guard), the intake reachability probe, and the
// submitter emails. Kept out of src/lib/camera-submissions.ts because that
// module is imported by the browser form and this one pulls in node DNS
// and the mailer.

import { validateHost, safeFetch } from "@/lib/ssrf-guard";
import { sendEmail, shell, escapeHtml } from "@/lib/email";
import { cameraUrlShapeError } from "@/lib/camera-submissions";

/**
 * Host-level URL safety: the hostname must resolve to public addresses
 * only, via the shared SSRF guard. Error text is deliberately generic —
 * the guard's internals (resolved IPs, ranges) aren't the submitter's
 * business.
 */
export async function validateCameraUrl(
  raw: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const shape = cameraUrlShapeError(raw);
  if (shape) return { ok: false, error: shape };
  const parsed = new URL(raw.trim());
  const check = await validateHost(parsed.hostname);
  if (!check.ok) {
    return {
      ok: false,
      error: "That address doesn't resolve to a public web address we can accept. Check the URL and try again.",
    };
  }
  return { ok: true };
}

export interface CameraProbe {
  probeStatus: "reachable" | "unreachable" | "unknown";
  probeDetail: string;
}

export const CAMERA_PROBE_TIMEOUT_MS = 5000;
const PROBE_MAX_BYTES = 8192;

/**
 * Best-effort reachability probe for the review queue, run once at
 * intake. Goes through safeFetch (every redirect hop re-validated against
 * the SSRF guard) with a hard timeout and a small body cap — it reads
 * just enough to know a server answered. A refused or dead probe never
 * blocks the submission itself; it only informs the reviewer.
 */
export async function probeCameraUrl(raw: string): Promise<CameraProbe> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), CAMERA_PROBE_TIMEOUT_MS);
  try {
    const res = await safeFetch(raw.trim(), {
      method: "GET",
      headers: {
        Range: `bytes=0-${PROBE_MAX_BYTES - 1}`,
        "User-Agent": "WorldEye-SubmissionCheck/1.0 (+https://worldeye.app/submit-camera)",
      },
      signal: controller.signal,
      maxRedirects: 3,
    });
    // Drain a capped slice so the socket closes cleanly, then stop.
    try {
      const reader = res.body?.getReader();
      if (reader) {
        let read = 0;
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          read += value?.byteLength ?? 0;
          if (read >= PROBE_MAX_BYTES) break;
        }
        await reader.cancel().catch(() => {});
      }
    } catch {
      /* body read errors don't change the verdict — the headers answered */
    }
    if (res.status >= 200 && res.status < 400) {
      return { probeStatus: "reachable", probeDetail: `HTTP ${res.status} at review intake` };
    }
    if (res.status === 401 || res.status === 403) {
      return { probeStatus: "reachable", probeDetail: `Server answered but refuses anonymous reads (HTTP ${res.status})` };
    }
    return { probeStatus: "unreachable", probeDetail: `HTTP ${res.status} at review intake` };
  } catch (err) {
    const name = (err as Error)?.name;
    if (name === "AbortError") {
      return { probeStatus: "unknown", probeDetail: `No answer within ${CAMERA_PROBE_TIMEOUT_MS / 1000}s at review intake` };
    }
    return { probeStatus: "unknown", probeDetail: "Probe could not complete at review intake" };
  } finally {
    clearTimeout(timer);
  }
}

/* ── Emails ──────────────────────────────────────────────────────────── */

export interface CameraSubmissionEmailView {
  submitterName: string;
  submitterEmail: string;
  cameraName: string;
  city: string;
  country: string;
  reviewerNotes?: string | null;
}

const P = (inner: string) =>
  `<p style="color:#a1a1aa;font-size:15px;line-height:1.6;">${inner}</p>`;

export function cameraSubmissionReceiptEmail(
  sub: CameraSubmissionEmailView,
): { subject: string; html: string } {
  const first = escapeHtml(sub.submitterName.split(" ")[0] || "there");
  return {
    subject: `We received your camera submission: ${sub.cameraName}`,
    html: shell(
      "Submission received",
      "Your camera is in the WorldEye review queue.",
      `${P(`Hi ${first},`)}
       ${P(`Thanks for sending us <strong style="color:#e4e4e7;">${escapeHtml(sub.cameraName)}</strong> (${escapeHtml(sub.city)}, ${escapeHtml(sub.country)}). It's now in our review queue.`)}
       ${P("A person on the team checks every submission by hand — that the feed is live, that it's public or permissioned, and that it isn't already on the map. We'll email this address again with the decision.")}
       ${P("One thing worth knowing up front: approval means the camera is cleared to be added — new cameras join the map in batches, so an approved camera may not appear on WorldEye the same day.")}`,
      null,
    ),
  };
}

export function cameraSubmissionDecisionEmail(
  sub: CameraSubmissionEmailView & { status: string },
): { subject: string; html: string } {
  const first = escapeHtml(sub.submitterName.split(" ")[0] || "there");
  const name = escapeHtml(sub.cameraName);
  if (sub.status === "approved") {
    return {
      subject: `Approved: ${sub.cameraName} is cleared to join WorldEye`,
      html: shell(
        "Your camera was approved",
        "Your submission is cleared for import into WorldEye.",
        `${P(`Hi ${first},`)}
         ${P(`Good news — <strong style="color:#e4e4e7;">${name}</strong> passed review and is cleared to be added to WorldEye.`)}
         ${P("New cameras are imported in batches, so it may take a little while before it appears on the map. There's nothing else you need to do.")}
         ${sub.reviewerNotes ? P(`Reviewer note: ${escapeHtml(sub.reviewerNotes)}`) : ""}`,
        { label: "Open WorldEye", href: "https://worldeye.app" },
      ),
    };
  }
  return {
    subject: `About your camera submission: ${sub.cameraName}`,
    html: shell(
      "Your submission wasn't approved",
      "The review decision for your camera submission.",
      `${P(`Hi ${first},`)}
       ${P(`Thanks again for sending us <strong style="color:#e4e4e7;">${name}</strong>. After review, we can't add it — usually because the feed isn't publicly viewable, couldn't be verified, or is already covered on the map.`)}
       ${sub.reviewerNotes ? P(`Reviewer note: ${escapeHtml(sub.reviewerNotes)}`) : ""}
       ${P("If you think we got it wrong — or the feed details change — just reply to this email or send a corrected submission.")}`,
      null,
    ),
  };
}

/** Best-effort senders: a mail failure never fails the submission flow. */
export async function sendCameraSubmissionReceipt(sub: CameraSubmissionEmailView): Promise<boolean> {
  const { subject, html } = cameraSubmissionReceiptEmail(sub);
  return sendEmail(sub.submitterEmail, subject, html);
}

export async function sendCameraSubmissionDecision(
  sub: CameraSubmissionEmailView & { status: string },
): Promise<boolean> {
  const { subject, html } = cameraSubmissionDecisionEmail(sub);
  return sendEmail(sub.submitterEmail, subject, html);
}
