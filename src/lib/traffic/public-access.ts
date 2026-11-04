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
// Scope:
// - VIEWING: the three traffic layer keys above — panel + globe, above.
// - DATA PATH (added 2026-11-04): /api/traffic/flow also consults this
//   switch. It originally did not, and the result was the broken
//   half-state diagnosed that day: layers visible to everyone, but the
//   flow tiles 403'd for every non-subscriber, so congestion colours
//   never rendered and the chip read "live traffic flow unavailable"
//   for the entire public while subscribers saw live flow. While the
//   switch is on, the proxy serves tiles to any viewer (its per-IP
//   rate limit, zoom band and instance cache still bound the spend);
//   access.ts itself is unchanged and decides again the moment the
//   switch goes off.
// - Every other premium layer keeps its normal gate —
//   checkPremiumEntitlement (src/lib/premium-entitlement.ts) is NOT
//   touched, and the separate question of whether an active Lite-only
//   subscription should read as premium for traffic is NOT decided here.
//
// REVERT (one step): set TRAFFIC_PUBLIC_ACCESS = false and push. The
// locks are restored everywhere instantly (panel + globe + tile proxy).
// No data cleanup is required.

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
