// ── TEMPORARY: Marketing Studio public test access ─────────────────────
// Owner request (Jameson, 2026-10-29): open the Marketing Studio so he
// can test it without the membership gate. While the switch below is
// true, ANY signed-in user can use the Studio: a missing affiliate
// profile is auto-provisioned (the affiliate program is free / open-join
// anyway) and the membership check is skipped. See
// src/lib/studio/access.ts (getStudioGate / ensureStudioProfile) and
// src/app/api/affiliate/_util.ts (requireStudioAccess) — those are the
// only two enforcement points, and both consult this one switch.
//
// Logged-out visitors still cannot use the Studio: every Studio write
// path is keyed to a real AffiliateProfile row and there is no guest
// profile pattern. They keep the normal sign-in redirect; the public
// read-only demo at /affiliates/demo covers no-account browsing.
//
// REVERT (one step): set STUDIO_PUBLIC_TEST_ACCESS = false and push.
// The gate is restored everywhere instantly (pages + API). Profiles
// provisioned during the window remain ordinary free affiliate
// profiles; no data cleanup is required.

export const STUDIO_PUBLIC_TEST_ACCESS = true;

/** Single read point for the switch, so tests and callers agree. */
export function studioPublicTestAccess(): boolean {
  return STUDIO_PUBLIC_TEST_ACCESS;
}
