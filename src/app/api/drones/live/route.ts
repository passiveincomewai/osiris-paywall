import { NextResponse } from 'next/server';
import { snapshot } from '@/lib/drones/store';
import type { LiveResponse } from '@/lib/drones/types';

/**
 * GET /api/drones/live — the public drone picture: drones detected by
 * connected receivers right now, the receivers themselves (the coverage
 * model), and the live count.
 *
 * Only sanitized data can reach this response (lib/drones/privacy):
 * session-scoped drone ids, drone positions only — operator locations,
 * operator IDs and raw serials do not exist server-side to leak.
 *
 * Transport honesty: Next.js on Vercel cannot hold native WebSocket
 * connections per client, and the store is per-instance memory, so this
 * is a short-poll endpoint with a 5-second shared cache — not an SSE/WS
 * stream pretending to be one. See docs/drones.md.
 */

export const dynamic = 'force-dynamic';

export async function GET() {
  const now = Date.now();
  const { drones, receivers } = snapshot(now);
  const body: LiveResponse = {
    drones,
    receivers,
    count: drones.length,
    activeReceivers: receivers.filter((r) => r.active).length,
    generatedAt: now,
    source: 'WorldEye connected Remote ID receivers & opted-in operators',
  };
  return NextResponse.json(body, {
    headers: { 'Cache-Control': 'public, s-maxage=5, stale-while-revalidate=10' },
  });
}
