import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { getShareCodeForUser } from "@/lib/share/identity";
import {
  MAX_ACTIVE_SHARES_PER_USER,
  MAX_SHARE_FILE_BYTES,
  defaultShareTitle,
  generateShareSlug,
  isOwnShareBlobUrl,
  shareStorageConfigured,
} from "@/lib/clip-share/core";
import { watchUrl } from "@/lib/clip-share/links";

export const runtime = "nodejs";

async function sessionUserId(): Promise<string | null> {
  const session = await auth().catch(() => null);
  return (session?.user as { id?: string } | undefined)?.id ?? null;
}

function shareJson(s: {
  id: string;
  slug: string;
  clipId: string;
  title: string;
  posterUrl: string | null;
  views: number;
  revokedAt: Date | null;
  createdAt: Date;
  cameraName: string;
  durationSec: number;
}) {
  return {
    id: s.id,
    slug: s.slug,
    clipId: s.clipId,
    title: s.title,
    posterUrl: s.posterUrl,
    views: s.views,
    revoked: !!s.revokedAt,
    createdAt: s.createdAt,
    cameraName: s.cameraName,
    durationSec: s.durationSec,
    url: watchUrl(s.slug),
  };
}

/** The signed-in user's shares + whether hosted sharing is configured. */
export async function GET() {
  const userId = await sessionUserId();
  if (!userId) return NextResponse.json({ error: "signin" }, { status: 401 });
  const shares = await db.clipShare.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  return NextResponse.json({ configured: shareStorageConfigured(), shares: shares.map(shareJson) });
}

/**
 * Create a public share for a clip the caller owns. The file itself was
 * uploaded straight to blob storage via /api/share/upload-token; this
 * route binds that upload to the clip after verifying the URL is our
 * storage, under this clip's prefix, and the clip belongs to the
 * caller. Nothing is public before this row exists.
 */
export async function POST(req: NextRequest) {
  const userId = await sessionUserId();
  if (!userId) return NextResponse.json({ error: "signin" }, { status: 401 });
  if (!shareStorageConfigured()) {
    return NextResponse.json({ error: "sharing_unavailable" }, { status: 503 });
  }
  const body = await req.json().catch(() => ({}));
  const clipId = typeof body.clipId === "string" ? body.clipId : "";
  const blobUrl = typeof body.blobUrl === "string" ? body.blobUrl : "";
  const posterUrl = typeof body.posterUrl === "string" && body.posterUrl ? body.posterUrl : null;

  const clip = clipId
    ? await db.clipMeta.findFirst({ where: { id: clipId, userId } }).catch(() => null)
    : null;
  if (!clip) return NextResponse.json({ error: "clip not found" }, { status: 404 });
  if (clip.sizeBytes > MAX_SHARE_FILE_BYTES) {
    return NextResponse.json({ error: "clip_too_large" }, { status: 413 });
  }
  if (!isOwnShareBlobUrl(blobUrl, clip.id)) {
    return NextResponse.json({ error: "invalid blob url" }, { status: 400 });
  }
  if (posterUrl && !isOwnShareBlobUrl(posterUrl, clip.id)) {
    return NextResponse.json({ error: "invalid poster url" }, { status: 400 });
  }

  const active = await db.clipShare.count({ where: { userId, revokedAt: null } });
  if (active >= MAX_ACTIVE_SHARES_PER_USER) {
    return NextResponse.json({ error: "share_limit" }, { status: 403 });
  }

  const title =
    typeof body.title === "string" && body.title.trim()
      ? body.title.trim().slice(0, 140)
      : defaultShareTitle(clip.cameraName, clip.startedAt);

  // The sharer's universal share code, captured now so watch-page
  // visits attribute through the same we_ref mechanism as /ref/<code>.
  const ref = await getShareCodeForUser(userId).catch(() => null);

  // Share default (account settings item 19): new shares start with
  // the visibility the user picked in settings — public by default,
  // unlisted when they chose it. They can still flip a single share
  // afterwards; this is only the starting state.
  const { getPreferences } = await import("@/lib/account/preferences");
  const shareVisibility = await getPreferences(userId)
    .then((p) => (p.shareVisibility === "unlisted" ? "unlisted" : "public"))
    .catch(() => "public");

  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const share = await db.clipShare.create({
        data: {
          slug: generateShareSlug(),
          userId,
          clipId: clip.id,
          title,
          blobUrl,
          posterUrl,
          mimeType: clip.mimeType,
          sizeBytes: clip.sizeBytes,
          durationSec: clip.durationSec,
          cameraName: clip.cameraName,
          refCode: ref?.code ?? null,
          visibility: shareVisibility,
        },
      });
      return NextResponse.json({ share: shareJson(share) });
    } catch (e) {
      // Slug collision — mint another and retry.
      if (e instanceof Error && /unique/i.test(e.message)) continue;
      throw e;
    }
  }
  return NextResponse.json({ error: "could not create share" }, { status: 500 });
}
