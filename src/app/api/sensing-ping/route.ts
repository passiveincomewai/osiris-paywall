/**
 * GET /api/sensing-ping — the far end of the /sensing page's WiFi Link
 * measurement. The page times repeated fetches to this endpoint; the
 * round-trip crosses the visitor's own WiFi link as its first hop, so the
 * timing series carries that link's jitter (RavenScope's ping-backend
 * idea, with this endpoint as the ping target).
 *
 * Deliberately minimal: no body, no-store, no logging of who probed.
 */
export async function GET() {
  return new Response(null, {
    status: 204,
    headers: { "Cache-Control": "no-store" },
  });
}
