// POST /api/internal/demo-studio/upload-token — Vercel Blob client-upload
// tokens for the Demo Studio worker. The worker uploads the raw
// recording, the edited video, and the poster straight to Blob; files
// never pass through this server (the pattern from /api/share/upload-token).
//
// Bound three ways: the demo bearer secret, a pathname scoped to
// demo-studio/<jobId>/<file>, and the job must exist and be in flight.
// When Blob storage isn't configured the route 503s honestly.
import { NextRequest, NextResponse } from "next/server";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { db } from "@/lib/db";
import { shareStorageConfigured } from "@/lib/clip-share/core";
import { demoStudioConfigured, verifyDemoBearer } from "@/lib/demo-studio/config";

export const runtime = "nodejs";

const MAX_DEMO_FILE_BYTES = 512 * 1024 * 1024;

export async function POST(req: NextRequest) {
  if (!demoStudioConfigured()) {
    return NextResponse.json({ error: "not configured" }, { status: 404 });
  }
  if (!verifyDemoBearer(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!shareStorageConfigured()) {
    return NextResponse.json({ error: "storage_unavailable" }, { status: 503 });
  }
  const body = (await req.json().catch(() => null)) as HandleUploadBody | null;
  if (!body) return NextResponse.json({ error: "bad request" }, { status: 400 });

  try {
    const jsonResponse = await handleUpload({
      body,
      request: req,
      onBeforeGenerateToken: async (pathname) => {
        // Pathname shape: demo-studio/<jobId>/<file>
        const parts = pathname.split("/");
        if (parts[0] !== "demo-studio" || !parts[1] || !parts[2]) {
          throw new Error("invalid demo path");
        }
        const job = await db.demoJob
          .findFirst({
            where: { id: parts[1], status: { in: ["claimed", "recording", "rendering"] } },
            select: { id: true },
          })
          .catch(() => null);
        if (!job) throw new Error("job not in flight");
        return {
          allowedContentTypes: ["video/webm", "video/mp4", "image/jpeg", "image/png", "image/webp"],
          maximumSizeInBytes: MAX_DEMO_FILE_BYTES,
          addRandomSuffix: false,
        };
      },
      onUploadCompleted: async () => {
        // The worker reports final URLs via the job complete call;
        // nothing to persist here.
      },
    });
    return NextResponse.json(jsonResponse);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
