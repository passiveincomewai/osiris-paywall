// ── TEMPORARY: real-traffic layers public access ──────────────────────
// Owner request (Jameson, 2026-10-31): make the real traffic layers
// visible WITHOUT a subscription, "for now", while he evaluates them.
// While the switch below is true, the three traffic layer keys are
// treated as unlocked for every viewer: the LayerPanel rows toggle, the
// group switch works, the globe receives the layers, and the Pro upgrade
// embed stops pitching Traffic as a locked feature. See
// src/components/LayerPanel.tsx (trafficPublicAccess prop) and
// src/components/Dashboard.tsx (globeActiveLayers) — those are the only
// two enforcement points for layer visibility, and both consult this
// one switch.
//
// Scope, deliberately narrow:
// - VIEWING only. /api/traffic/flow's own behaviour is unchanged, and
//   every other premium layer keeps its normal gate —
//   checkPremiumEntitlement (src/lib/premium-entitlement.ts) is NOT
//   touched, and the separate question of whether an active Lite-only
//   subscription should read as premium for traffic is NOT decided here.
// - The server-side API gate (src/lib/traffic/access.ts) is a different
//   module for a different path and is NOT affected by this switch.
//
// REVERT (one step): set TRAFFIC_PUBLIC_ACCESS = false and push. The
// locks are restored everywhere instantly (panel + globe). No data
// cleanup is required.

export const TRAFFIC_PUBLIC_ACCESS = true;

/** Single read point for the switch, so tests and callers agree. */
export function trafficPublicAccess(): boolean {
  return TRAFFIC_PUBLIC_ACCESS;
}

/** The layer keys this switch unlocks, as a set: LayerPanel also hands
 *  it to premiumLayerLabels({ excludeKeys }) so the Pro pitch drops
 *  exactly the layers this switch opens — never a second list that
 *  could drift from it. */
export const TRAFFIC_LAYER_KEYS: ReadonlySet<string> = new Set([
  'traffic',
  'traffic_vehicles',
  'traffic_congestion',
]);

export function isTrafficLayerKey(key: string): boolean {
  return TRAFFIC_LAYER_KEYS.has(key);
}

/** Whether `key` is viewable by this viewer: subscribers see everything,
 *  and while the public-access switch is on, everyone sees traffic. */
export function trafficLayerUnlocked(key: string, isPremiumUser: boolean): boolean {
  return isPremiumUser || (TRAFFIC_PUBLIC_ACCESS && isTrafficLayerKey(key));
}
