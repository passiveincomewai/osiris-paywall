/**
 * Wave 2 F10 — free-account gates for basic utility features.
 *
 * The owner's model (BRIEF F10/F4): browsing stays open to everyone; a
 * small set of *utility* actions — saving favorites, viewing the Daily
 * Spotlight Cam, the exclusive map themes — ask for a FREE account.
 * The prompt is friendly, never a hard error, and always mentions the
 * ladder benefit a free account carries (10 more camera opens than the
 * anonymous allowance: 5 anonymous + 5 email + 5 account = 15 total).
 *
 * This module is the single source for the gate copy + hrefs so every
 * surface prompts identically (one prompt system, not per-feature nags).
 * The render lives in components/AccountGatePrompt.tsx.
 */

export type GateFeature =
  | "save-camera"
  | "spotlight-view"
  | "map-theme"
  | "saved-layout"
  | "custom-route"
  | "weather-alerts"
  | "event-notifications";

export const GATE_FEATURE_LABELS: Record<GateFeature, string> = {
  "save-camera": "save cameras to My Cameras",
  "spotlight-view": "watch the Daily Spotlight Cam",
  "map-theme": "use the exclusive map themes",
  "saved-layout": "save satellite layouts",
  "custom-route": "save custom routes",
  "weather-alerts": "set weather alerts",
  "event-notifications": "get event notifications",
};

/** The ladder benefit, in the owner's own framing (BRIEF F10: the prompt
 *  mentions "+10 opens" — a free account takes a visitor from the
 *  5 anonymous opens to 15). */
export const GATE_ACCOUNT_BENEFIT =
  "A free account also unlocks 10 more camera opens — no card, no cost.";

export function gateTitle(feature: GateFeature): string {
  return `Create a free account to ${GATE_FEATURE_LABELS[feature]}`;
}

export function gateBody(feature: GateFeature): string {
  return `${GATE_ACCOUNT_BENEFIT} ${GATE_FEATURE_LABELS[feature]} will be ready the moment you're signed in.`;
}

/** Auth hrefs carrying the visitor back to where they were gated. The
 *  Auth.js pages accept callbackUrl; anything unusable falls back to
 *  the globe root, which is where every gated action lives anyway. */
export function gateAuthHref(kind: "signup" | "signin", callbackPath?: string | null): string {
  const cb = typeof callbackPath === "string" && callbackPath.startsWith("/") ? callbackPath : "/";
  return `/${kind}?callbackUrl=${encodeURIComponent(cb)}`;
}

/** Only the definitively-anonymous state is gated. A signed-in free or
 *  premium identity passes; "unknown" (session read failed) also passes
 *  — a failed read must never lock a member out of a free feature (the
 *  same failure semantics as lib/premium-entitlement). */
export function identityIsGated(state: string): boolean {
  return state === "anonymous";
}

/**
 * ── Time-boxed whole-globe account gate (owner-ordered conversion
 * test, 2026-10-27) ──────────────────────────────────────────────────
 *
 * For eight hours the globe itself — the app shell at "/" — asks every
 * signed-out visitor to create a free account first. This is a TEST
 * with a hard stop, not a permanent policy: ACCOUNT_GATE_UNTIL is the
 * exact moment the gate lifts, baked into code so no deploy is needed
 * to end it, and the root page also re-checks live so an already-open
 * tab lifts the wall the moment the window closes.
 *
 * The gate decision lives ONLY at the root page (src/app/page.tsx),
 * which renders components/GlobeAccountGate instead of the shell.
 * Nothing else consults this: /embed/*, /embed-camera, /ambient, the
 * directory/content pages and every /api/* route serve exactly as
 * before. Only the definitively-anonymous identity is gated — the
 * identityIsGated rule above: a failed session read ("unknown") never
 * locks anyone out.
 */
export const ACCOUNT_GATE_UNTIL = new Date("2026-10-27T15:23:00.000Z");

/** True while the time-boxed globe gate is running. `now` is
 *  injectable for tests; production callers pass nothing. */
export function accountGateActive(now: Date = new Date()): boolean {
  return now.getTime() < ACCOUNT_GATE_UNTIL.getTime();
}
