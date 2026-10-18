import { NextResponse } from 'next/server';
import { ingestConfigured, verifyIngestBearer } from '@/lib/drones/ingest-auth';
import { sanitizeObservation } from '@/lib/drones/privacy';
import { ingestReport, rateLimitOk } from '@/lib/drones/store';
import type { IngestBody } from '@/lib/drones/types';

/**
 * POST /api/drones/ingest — Remote ID observations from CONNECTED
 * RECEIVERS and OPTED-IN OPERATOR gateways.
 *
 * Auth: `Authorization: Bearer <token>` where tokens are provisioned by
 * the operator in DRONE_INGEST_TOKENS / DRONE_INGEST_TOKEN (see
 * lib/drones/ingest-auth). Unconfigured → 404 (the endpoint pretends not
 * to exist, mirroring /api/internal/studio-ai).
 *
 * Every observation passes the privacy filter (lib/drones/privacy)
 * BEFORE storage: operator/pilot location, operator IDs, Self-ID text
 * and authentication data are dropped; the drone's persistent id is
 * replaced by a session-scoped hash. Payload format: docs/drones.md.
 */

export const dynamic = 'force-dynamic';

const MAX_OBSERVATIONS = 500;
const MAX_BODY_BYTES = 512_000;

export async function POST(req: Request) {
  if (!ingestConfigured()) {
    return NextResponse.json({ error: 'not found' }, { status: 404 });
  }
  const auth = verifyIngestBearer(req);
  if (!auth) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const rawText = await req.text();
  if (rawText.length > MAX_BODY_BYTES) {
    return NextResponse.json({ error: 'payload too large' }, { status: 413 });
  }
  let body: IngestBody;
  try {
    body = JSON.parse(rawText) as IngestBody;
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 });
  }

  const rx = body.receiver;
  if (
    !rx || typeof rx.lat !== 'number' || typeof rx.lng !== 'number' ||
    rx.lat < -90 || rx.lat > 90 || rx.lng < -180 || rx.lng > 180 ||
    !Array.isArray(body.observations)
  ) {
    return NextResponse.json(
      { error: 'receiver {lat,lng} and observations[] are required' },
      { status: 400 },
    );
  }

  // Token-bound receivers report under their bound id; the shared-token
  // form may name its receiver in the body (sanitized to a slug).
  const receiverId =
    auth.receiverId ??
    (typeof (rx as any).id === 'string'
      ? String((rx as any).id).toLowerCase().replace(/[^a-z0-9-_]/g, '').slice(0, 40)
      : '') ??
    '';
  const effectiveId = receiverId || 'shared';
  const now = Date.now();
  if (!rateLimitOk(`ingest:${effectiveId}`, now)) {
    return NextResponse.json({ error: 'rate limited' }, { status: 429 });
  }

  const clean = body.observations
    .slice(0, MAX_OBSERVATIONS)
    .map((o) => sanitizeObservation(o, now))
    .filter((o): o is NonNullable<typeof o> => o !== null);

  const { accepted } = ingestReport(
    {
      id: effectiveId,
      name: typeof rx.name === 'string' ? rx.name : undefined,
      lat: rx.lat,
      lng: rx.lng,
      radiusM: rx.radiusM,
    },
    clean,
    now,
  );

  return NextResponse.json({
    accepted,
    received: Math.min(body.observations.length, MAX_OBSERVATIONS),
    stored: clean.length,
  });
}
