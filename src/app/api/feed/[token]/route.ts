import { NextRequest, NextResponse } from "next/server";
import { getClientIp, isRateLimited } from "@/lib/ssrf-guard";
import { userHasLiveEnterprise } from "@/lib/enterprise/access";
import { collectionPayload, collectionByTokenHash, recordFeedHit } from "@/lib/enterprise/service";
import { hashSecret, looksLikeFeedToken } from "@/lib/enterprise/tokens";

export const runtime = "nodejs";
/* A cold instance may first have to build the camera catalogue in-process. */
export const maxDuration = 60;

/**
 * The private token feed: GET /api/feed/<token> → the collection's
 * rights-cleared cameras as JSON. The token is the credential (only its
 * SHA-256 hash is stored); regenerating it in the dashboard is the
 * revocation. The feed lives and dies with the owner's Enterprise
 * subscription. Responses cache briefly — integrators poll, and the
 * catalogue itself only moves on a minutes cadence.
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!looksLikeFeedToken(token)) {
    return NextResponse.json({ error: "Feed not found." }, { status: 404 });
  }
  if (isRateLimited(`ent-feed:${getClientIp(req)}`, 120)) {
    return NextResponse.json({ error: "Too many requests. Wait a moment." }, { status: 429 });
  }
  const collection = await collectionByTokenHash(hashSecret(token));
  if (!collection) {
    return NextResponse.json({ error: "Feed not found." }, { status: 404 });
  }
  if (!(await userHasLiveEnterprise(collection.userId))) {
    return NextResponse.json(
      { error: "This feed's Enterprise subscription is not active." },
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
  await recordFeedHit(collection.id);
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
    { headers: { "Cache-Control": "public, max-age=60, s-maxage=60" } },
  );
}
