// ── Creator free-Pro program: shared constants + input validation ────────
// Creators with 25k+ followers on a supported platform can apply for free
// Pro (12 months). Follower counts are self-reported at application time and
// verified by an admin at review — the apply endpoint therefore accepts any
// non-negative claim but rejects structurally invalid input.

export const CREATOR_MIN_FOLLOWERS = 25_000;
export const CREATOR_PRO_MONTHS = 12;

export const CREATOR_PLATFORMS = [
  "instagram",
  "tiktok",
  "youtube",
  "x",
  "twitch",
  "other",
] as const;
export type CreatorPlatform = (typeof CREATOR_PLATFORMS)[number];

export type CreatorApplicationStatus = "pending" | "approved" | "rejected";

export interface CreatorApplicationInput {
  platform: CreatorPlatform;
  handle: string;
  profileUrl: string;
  followers: number;
}

export type CreatorValidation =
  | { ok: true; value: CreatorApplicationInput }
  | { ok: false; error: string };

/** Validate + normalize a creator application body. Pure — unit-tested. */
export function validateCreatorApplication(body: unknown): CreatorValidation {
  if (!body || typeof body !== "object") return { ok: false, error: "Invalid request body" };
  const b = body as Record<string, unknown>;

  const platform = typeof b.platform === "string" ? b.platform.trim().toLowerCase() : "";
  if (!(CREATOR_PLATFORMS as readonly string[]).includes(platform)) {
    return { ok: false, error: `platform must be one of: ${CREATOR_PLATFORMS.join(", ")}` };
  }

  const handle = typeof b.handle === "string" ? b.handle.trim().replace(/^@+/, "") : "";
  if (!handle || handle.length > 100) {
    return { ok: false, error: "handle is required (max 100 characters)" };
  }

  const profileUrl = typeof b.profileUrl === "string" ? b.profileUrl.trim() : "";
  let url: URL;
  try {
    url = new URL(profileUrl);
  } catch {
    return { ok: false, error: "profileUrl must be a valid URL" };
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return { ok: false, error: "profileUrl must be an http(s) URL" };
  }
  if (profileUrl.length > 500) return { ok: false, error: "profileUrl is too long" };

  const followersRaw = typeof b.followers === "string" ? Number(b.followers) : b.followers;
  if (typeof followersRaw !== "number" || !Number.isFinite(followersRaw)) {
    return { ok: false, error: "followers must be a number" };
  }
  const followers = Math.floor(followersRaw);
  if (followers < 0) return { ok: false, error: "followers cannot be negative" };
  if (followers > 2_000_000_000) return { ok: false, error: "followers is implausibly large" };

  return {
    ok: true,
    value: {
      platform: platform as CreatorPlatform,
      handle,
      profileUrl,
      followers,
    },
  };
}
