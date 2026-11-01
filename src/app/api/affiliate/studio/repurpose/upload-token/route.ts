// Client-upload token for Repurposing Machine source videos. Follows
// the clip-share pattern: the browser uploads straight to Vercel Blob;
// access is bound to the session, the pathname prefix, and project
// ownership (the project must belong to the caller's affiliate
// profile). Without BLOB_READ_WRITE_TOKEN the route 503s honestly and
// the Machine falls back to browser-local mode.
import { NextRequest, NextResponse } from "next/server";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { shareStorageConfigured } from "@/lib/clip-share/core";

export const runtime = "nodejs";

/** 500 MB ceiling for a source video (spec §1 validation). */
export const MAX_SOURCE_BYTES = 500_000_000;
export const SOURCE_CONTENT_TYPES = ["video/mp4", "video/quicktime", "video/webm"];

export async function POST(req: NextRequest) {
  if (!shareStorageConfigured()) {
    return NextResponse.json({ error: "uploads_unavailable" }, { status: 503 });
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

        // Pathname shape: studio-sources/<projectId>/<file>
        const parts = pathname.split("/");
        if (parts[0] !== "studio-sources" || !parts[1] || !parts[2]) {
          throw new Error("invalid upload path");
        }
        const profile = await db.affiliateProfile
          .findUnique({ where: { userId }, select: { id: true } })
          .catch(() => null);
        if (!profile) throw new Error("not an affiliate");
        const project = await db.studioProject
          .findFirst({ where: { id: parts[1], profileId: profile.id }, select: { id: true } })
          .catch(() => null);
        if (!project) throw new Error("project not found");

        return {
          allowedContentTypes: SOURCE_CONTENT_TYPES,
          maximumSizeInBytes: MAX_SOURCE_BYTES,
          addRandomSuffix: true,
          allowOverwrite: false,
          tokenPayload: JSON.stringify({ userId, projectId: project.id }),
        };
      },
      onUploadCompleted: async () => {
        // No-op: the client PATCHes the project with the blob URL once
        // the upload resolves — completion webhooks are not the source
        // of truth (same contract as clip shares).
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
