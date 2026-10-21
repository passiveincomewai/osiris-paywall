import { NextRequest, NextResponse } from "next/server";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import {
  MAX_SHARE_FILE_BYTES,
  SHARE_PATH_PREFIX,
  shareStorageConfigured,
} from "@/lib/clip-share/core";

export const runtime = "nodejs";

/**
 * Client-upload token for clip sharing. The browser uploads the video
 * (and its poster) straight to Vercel Blob — files never pass through
 * this server. Access is bound three ways: a signed-in session, the
 * pathname must sit under the clip's own prefix, and that clip must
 * belong to the session user (checked against ClipMeta here, again at
 * share creation). When blob storage isn't configured the route 503s
 * honestly instead of minting a token that cannot work.
 */
export async function POST(req: NextRequest) {
  if (!shareStorageConfigured()) {
    return NextResponse.json({ error: "sharing_unavailable" }, { status: 503 });
  }
  const body = (await req.json().catch(() => null)) as HandleUploadBody | null;
  if (!body) return NextResponse.json({ error: "bad request" }, { status: 400 });

  try {
    const jsonResponse = await handleUpload({
      body,
      request: req,
      onBeforeGenerateToken: async (pathname) => {
        const session = await auth().catch(() => null);
        const userId = (session?.user as { id?: string } | undefined)?.id;
        if (!userId) throw new Error("signin required");

        // Pathname shape: clip-shares/<clipId>/<file>
        const parts = pathname.split("/");
        if (parts[0] !== SHARE_PATH_PREFIX.replace(/\/$/, "") || !parts[1] || !parts[2]) {
          throw new Error("invalid share path");
        }
        const clip = await db.clipMeta
          .findFirst({ where: { id: parts[1], userId }, select: { id: true } })
          .catch(() => null);
        if (!clip) throw new Error("clip not found");

        return {
          allowedContentTypes: ["video/webm", "video/mp4", "video/quicktime", "image/jpeg", "image/png"],
          maximumSizeInBytes: MAX_SHARE_FILE_BYTES,
          addRandomSuffix: false,
          allowOverwrite: true,
          tokenPayload: JSON.stringify({ userId, clipId: clip.id }),
        };
      },
      onUploadCompleted: async () => {
        // No-op: the share row is created by POST /api/share/clips once
        // the client has the blob URL — completion webhooks are not the
        // source of truth (and don't fire in local dev).
      },
    });
    return NextResponse.json(jsonResponse);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "upload token failed" },
      { status: 400 },
    );
  }
}
