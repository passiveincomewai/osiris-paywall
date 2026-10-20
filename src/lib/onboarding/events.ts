/**
 * Onboarding analytics — the shared event contract between the onboarding
 * client (Build A) and the admin/analytics server side (Build B).
 *
 * Events are emitted through the app's EXISTING analytics path
 * (`trackAnalyticsEvent` → POST /api/analytics/track → PageView.event),
 * never a parallel pipeline. The track route stores a single `event`
 * string (≤80 chars), so parameterized events encode their parameter as
 * a `:param` suffix on the event name:
 *
 *   onboarding_impression            welcome panel was shown
 *   onboarding_start                 visitor started the tour
 *   onboarding_step_complete:<1-4>   a tour step's real action succeeded
 *   onboarding_step_skip:<1-4>       visitor explicitly skipped a step
 *   onboarding_dropoff:<1-4>         visitor exited the tour mid-step
 *   onboarding_complete              tour finished (final step)
 *   (Tour shortened 6 → 4 steps on 2026-10-14; step params 5–6 exist
 *   only in pre-change history. Event names are unchanged.)
 *   onboarding_dismiss               welcome panel dismissed ("Explore On My Own")
 *   onboarding_watch_camera          visitor took the first-camera offer
 *                                    (welcome panel or tour camera step) —
 *                                    the camera_open / feature_first_use
 *                                    signals record whether it landed
 *   feature_first_use:<feature>      first-ever use of a feature, once per
 *                                    visitor per feature. Features: camera,
 *                                    flight, satellite, layer, recon, oi,
 *                                    alerts, search, recording
 *   conversion_shown                 the Pro conversion card was displayed
 *   conversion_click_pro             visitor clicked through to /pricing
 *   conversion_dismiss               visitor chose "Keep Exploring Free"
 *
 * A/B group: assigned on first visit by `assignGroup()` in storage.ts and
 * persisted in BOTH localStorage (`we_onb_group`) and a `we_onb_group`
 * cookie — the server side stamps the group onto events from that cookie.
 * Group "a" = control (no proactive onboarding; help icon only),
 * group "b" = proactive onboarding.
 */

import { trackAnalyticsEvent } from "@/components/AnalyticsTracker";

export const ONB_EVENT = {
  impression: "onboarding_impression",
  start: "onboarding_start",
  stepComplete: "onboarding_step_complete",
  stepSkip: "onboarding_step_skip",
  dropoff: "onboarding_dropoff",
  complete: "onboarding_complete",
  dismiss: "onboarding_dismiss",
  watchCamera: "onboarding_watch_camera",
  featureFirstUse: "feature_first_use",
  conversionShown: "conversion_shown",
  conversionClickPro: "conversion_click_pro",
  conversionDismiss: "conversion_dismiss",
} as const;

export type FeatureId =
  | "camera"
  | "flight"
  | "satellite"
  | "layer"
  | "recon"
  | "oi"
  | "alerts"
  | "search"
  | "recording";

/** Fire one onboarding event through the app's existing analytics path. */
export function emitOnboarding(event: string): void {
  try {
    trackAnalyticsEvent(event);
  } catch {
    /* analytics must never break the experience */
  }
}

export function emitStepComplete(step: number): void {
  emitOnboarding(`${ONB_EVENT.stepComplete}:${step}`);
}

export function emitStepSkip(step: number): void {
  emitOnboarding(`${ONB_EVENT.stepSkip}:${step}`);
}

export function emitDropoff(step: number): void {
  emitOnboarding(`${ONB_EVENT.dropoff}:${step}`);
}

export function emitFeatureFirstUse(feature: FeatureId): void {
  emitOnboarding(`${ONB_EVENT.featureFirstUse}:${feature}`);
}
