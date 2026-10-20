import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getClientIp, isRateLimited } from "@/lib/ssrf-guard";
import { userHasLiveEnterprise } from "@/lib/enterprise/access";
import { collectionPayload } from "@/lib/enterprise/service";
import { extractApiKey, hashSecret } from "@/lib/enterprise/tokens";

export const runtime = "nodejs";
/* A cold instance may first have to build the camera catalogue in-process. */
export const maxDuration = 60;

/**
 * The API door onto the same payload as the token feed:
 *   GET /api/v1/collections/<id>/cameras
 *   Authorization: Bearer wek_…   (or X-Api-Key: wek_…)
 * A key reads only its owner's collections — anyone else's collection id
 * is a 404, exactly as if it didn't exist. Revoked keys die at once.
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (isRateLimited(`ent-api:${getClientIp(req)}`, 300)) {
    return NextResponse.json({ error: "Too many requests. Wait a moment." }, { status: 429 });
  }
  const presented = extractApiKey(req);
  if (!presented) {
    return NextResponse.json(
      { error: "API key required (Authorization: Bearer wek_…)." },
      { status: 401 },
    );
  }
  const key = await db.enterpriseApiKey.findUnique({ where: { keyHash: hashSecret(presented) } });
  if (!key || key.revokedAt) {
    return NextResponse.json({ error: "API key invalid or revoked." }, { status: 401 });
  }
  const { id } = await params;
  const collection = await db.cameraCollection.findFirst({
    where: { id, userId: key.userId },
  });
  if (!collection) {
    return NextResponse.json({ error: "Collection not found." }, { status: 404 });
  }
  if (!(await userHasLiveEnterprise(key.userId))) {
    return NextResponse.json(
      { error: "The Enterprise subscription for this key is not active." },
      { status: 403 },
    );
  }
  const origin = new URL(req.url).origin;
  const result = await collectionPayload(collection.id, origin);
  if (!result.ok) {
    return NextResponse.json(
      { error: "The camera catalogue is still loading. Try again in a moment." },
      { status: 503 },
    );
  }
  await db.enterpriseApiKey
    .update({
      where: { id: key.id },
      data: { hits: { increment: 1 }, lastUsedAt: new Date() },
    })
    .catch(() => undefined);
  return NextResponse.json(
    {
      collection: { id: collection.id, name: collection.name },
      generatedAt: new Date().toISOString(),
      attribution: "Camera data via WorldEye. Credit each camera's listed source.",
      count: result.payload.cameras.length,
      cameras: result.payload.cameras,
      excludedCount: result.payload.excluded.length,
      excluded: result.payload.excluded,
    },
    { headers: { "Cache-Control": "private, max-age=60" } },
  );
}
