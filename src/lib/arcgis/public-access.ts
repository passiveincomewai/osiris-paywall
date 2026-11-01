// ── TEMPORARY: ArcGIS tools public test access ─────────────────────
// Owner request (Jameson, 2026-10-31): open the ArcGIS tools so he can
// test them without a subscription. The ArcGIS tools are the globe's
// ArcGIS Intel panel (catalog search + Feature Service layer import,
// src/components/ArcGISPanel.tsx); their only backend is /api/arcgis,
// which src/middleware.ts gates as a premium (Pro) API — so the panel
// renders for everyone but every search/import from a free or
// signed-out visitor is answered 402 premium_required. While the
// switch below is true, middleware's apiGate lets /api/arcgis through
// for everyone; every other premium/VIP gate is untouched, and the
// route's own limits (SSRF guard, 30 req/min/IP on service queries)
// stay exactly as they are.
//
// This mirrors the Marketing Studio's temporary test-access switch
// (src/lib/studio/public-access.ts).
//
// REVERT (one step): set ARCGIS_PUBLIC_TEST_ACCESS = false and push.
// /api/arcgis is premium-gated again instantly; no data cleanup is
// required (imported layers live only in the visitor's browser state).

export const ARCGIS_PUBLIC_TEST_ACCESS = true;

/** Single read point for the switch, so tests and callers agree. */
export function arcgisPublicTestAccess(): boolean {
  return ARCGIS_PUBLIC_TEST_ACCESS;
}
