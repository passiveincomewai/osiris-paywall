// ── Ambassador program: application validation, submission, review ──────
// Ambassadors are affiliates first: applications key to the affiliate
// profile, and approval flips AffiliateProfile.isAmbassador (which also
// unlocks the ambassador template category, seeded by ambassador-seed.ts).
// One pending application per profile at a time — re-applying after a
// decision is fine, stacking pending applications is not.

import { db } from "@/lib/db";
import type { AffiliateProfile, AmbassadorApplication } from "@prisma/client";

export const AMBASSADOR_PLATFORMS = [
  "instagram",
  "tiktok",
  "youtube",
  "x",
  "twitch",
  "other",
] as const;
export type AmbassadorPlatform = (typeof AMBASSADOR_PLATFORMS)[number];

export interface AmbassadorApplicationInput {
  platform: string;
  handle: string;
  profileUrl: string;
  audience: number;
  pitch?: string | null;
}

export interface ValidatedApplicationInput {
  platform: AmbassadorPlatform;
  handle: string;
  profileUrl: string;
  audience: number;
  pitch: string | null;
}

export type ValidateApplicationResult =
  | { ok: true; data: ValidatedApplicationInput }
  | { ok: false; errors: string[] };

function isValidHttpUrl(value: unknown): value is string {
  if (typeof value !== "string" || !value.trim()) return false;
  try {
    const url = new URL(value.trim());
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

/** Pure validation of an ambassador application payload. */
export function validateApplicationInput(input: unknown): ValidateApplicationResult {
  const errors: string[] = [];
  const body = (input ?? {}) as Record<string, unknown>;

  const platform = typeof body.platform === "string" ? body.platform.trim() : "";
  if (!(AMBASSADOR_PLATFORMS as readonly string[]).includes(platform)) {
    errors.push(`platform must be one of ${AMBASSADOR_PLATFORMS.join(", ")}`);
  }

  const handle = typeof body.handle === "string" ? body.handle.trim() : "";
  if (typeof body.handle !== "string" || handle.length < 1 || handle.length > 100) {
    errors.push("handle must be 1-100 characters");
  }

  const profileUrl = typeof body.profileUrl === "string" ? body.profileUrl.trim() : "";
  if (!isValidHttpUrl(body.profileUrl)) {
    errors.push("profileUrl must be a valid http(s) URL");
  }

  const audience = body.audience;
  if (
    typeof audience !== "number" ||
    !Number.isInteger(audience) ||
    audience < 0 ||
    audience > 1_000_000_000
  ) {
    errors.push("audience must be an integer between 0 and 1000000000");
  }

  let pitch: string | null = null;
  if (body.pitch !== undefined && body.pitch !== null && body.pitch !== "") {
    if (typeof body.pitch !== "string") {
      errors.push("pitch must be a string");
    } else if (body.pitch.length > 1000) {
      errors.push("pitch must be at most 1000 characters");
    } else {
      pitch = body.pitch.trim() || null;
    }
  }

  if (errors.length > 0) return { ok: false, errors };
  return {
    ok: true,
    data: {
      platform: platform as AmbassadorPlatform,
      handle,
      profileUrl,
      audience: audience as number,
      pitch,
    },
  };
}

/** Error with an HTTP-ish status the API routes map straight through. */
export class AmbassadorError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.name = "AmbassadorError";
    this.status = status;
  }
}

/**
 * Submit an application for an affiliate profile. Rejects when the input
 * is invalid, or when the profile already has a pending application.
 */
export async function submitApplication(
  profile: Pick<AffiliateProfile, "id" | "userId">,
  input: unknown,
): Promise<AmbassadorApplication> {
  const validated = validateApplicationInput(input);
  if (!validated.ok) {
    throw new AmbassadorError(validated.errors.join("; "), 400);
  }

  const pending = await db.ambassadorApplication.findFirst({
    where: { profileId: profile.id, status: "pending" },
    select: { id: true },
  });
  if (pending) {
    throw new AmbassadorError(
      "An ambassador application is already pending for this profile",
      409,
    );
  }

  return db.ambassadorApplication.create({
    data: {
      profileId: profile.id,
      userId: profile.userId,
      platform: validated.data.platform,
      handle: validated.data.handle,
      profileUrl: validated.data.profileUrl,
      audience: validated.data.audience,
      pitch: validated.data.pitch,
    },
  });
}

export type AmbassadorDecision = "approved" | "rejected";

/** Normalize the decision spellings used across the admin surfaces. */
export function normalizeDecision(decision: unknown): AmbassadorDecision | null {
  if (decision === "approved" || decision === "approve") return "approved";
  if (decision === "rejected" || decision === "reject") return "rejected";
  return null;
}

/**
 * Decide an application: stamps status + reviewedAt, and on approval
 * flips the profile's isAmbassador flag. Returns the updated application.
 */
export async function decideApplication(
  id: string,
  decision: unknown,
): Promise<AmbassadorApplication> {
  const normalized = normalizeDecision(decision);
  if (!normalized) {
    throw new AmbassadorError('decision must be "approved" or "rejected"', 400);
  }

  const existing = await db.ambassadorApplication.findUnique({ where: { id } });
  if (!existing) throw new AmbassadorError("Application not found", 404);

  const updated = await db.ambassadorApplication.update({
    where: { id },
    data: { status: normalized, reviewedAt: new Date() },
  });

  if (normalized === "approved") {
    await db.affiliateProfile.update({
      where: { id: existing.profileId },
      data: { isAmbassador: true },
    });
  }

  return updated;
}

/** The profile's most recent application (any status), or null. */
export async function latestApplication(
  profileId: string,
): Promise<AmbassadorApplication | null> {
  return db.ambassadorApplication.findFirst({
    where: { profileId },
    orderBy: { createdAt: "desc" },
  });
}
