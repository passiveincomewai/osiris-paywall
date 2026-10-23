/**
 * Teaser A/B test (Conversion Wave 2, F9) — rollout configuration.
 *
 * The whole experiment is behind ONE config knob, the env var
 * NEXT_PUBLIC_TEASER_TEST:
 *
 *   unset / "" / "off" / "0" / "false"  -> test OFF. No assignment, no
 *                                          events, no card: the homepage
 *                                          behaves exactly as today.
 *   "on" / "true"                       -> 100% of anonymous homepage
 *                                          visitors enrolled.
 *   "1" .. "100"                        -> that percentage enrolled.
 *   anything else                       -> OFF (fail closed).
 *
 * Enrolled visitors split 50/50 treatment/control (see assignment.ts).
 * Stopping the test or reverting to control-only is a config change —
 * never a code edit: flip the value and the next deployment picks it up
 * (NEXT_PUBLIC_* values are inlined at build time, the same mechanism
 * as the existing NEXT_PUBLIC_CINEMATIC_HERO flag in CinematicHero).
 */

export interface TeaserConfig {
  enabled: boolean;
  /** Percent of eligible (anonymous homepage) visitors enrolled, 1–100. */
  enrollPct: number;
}

export const TEASER_OFF: TeaserConfig = { enabled: false, enrollPct: 0 };

export function parseTeaserConfig(raw: string | undefined | null): TeaserConfig {
  if (raw == null) return TEASER_OFF;
  const v = raw.trim().toLowerCase();
  if (v === "" || v === "off" || v === "0" || v === "false") return TEASER_OFF;
  if (v === "on" || v === "true") return { enabled: true, enrollPct: 100 };
  if (/^\d+$/.test(v)) {
    const pct = Number(v);
    if (pct >= 1 && pct <= 100) return { enabled: true, enrollPct: pct };
  }
  return TEASER_OFF;
}

/** The live config, read from the environment at module call time. */
export function getTeaserConfig(): TeaserConfig {
  return parseTeaserConfig(process.env.NEXT_PUBLIC_TEASER_TEST);
}

/**
 * Analytics event names for the test (see src/lib/analytics/ingest-fields
 * for the `event:detail` storage convention). The arm rides as the
 * detail token on every event, so PageView rows split by arm natively;
 * the ARM event additionally tags the whole session (fired once per
 * session for BOTH arms) so session-level metrics — signups, trial
 * starts, camera opens — can be grouped by arm via a sessionId join.
 */
export const TEASER_EVENTS = {
  arm: "teaser_arm",
  shown: "teaser_shown",
  dismissed: "teaser_dismissed",
  signupClick: "teaser_signup_click",
} as const;
