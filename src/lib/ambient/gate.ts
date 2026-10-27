/**
 * WorldEye Ambient — the free-demo gate's timing core.
 *
 * THE RULE (owner's spec, 2026-10-26): anonymous and free-tier
 * viewers get 180 seconds of Ambient streaming per session. The clock
 * counts PLAYING time only — a paused show, a buffering feed, a
 * hidden tab's stalled frame must not burn the demo. At exactly
 * 180_000 ms of accumulated playing time the player pauses, blurs and
 * raises the non-dismissible Ambient paywall. Viewers with Ambient
 * access (the Ambient subscription, or any Pro/VIP tier — see
 * lib/ambient/access) are never gated.
 *
 * The accumulator is deliberately dumb and fully deterministic:
 * callers feed it (timestamp, isPlaying) observations and read
 * `accumulatedMs`. All the judgement lives in shouldGate(), which the
 * component consults on every tick. Pinned by gate.test.ts.
 */

/** Free demo length: exactly three minutes of playing time. */
export const FREE_DEMO_LIMIT_MS = 180_000;

/**
 * Accumulates playing time from timestamped observations.
 *
 * Usage: call `observe(now, isPlaying)` on a steady tick (the player
 * uses 250 ms) and whenever play/pause state changes. Time between
 * two observations counts only when the FIRST observation said
 * playing — a stall between ticks is bounded by the tick length,
 * which is the honest granularity of "actually playing".
 */
export class PlaytimeAccumulator {
  private accumulated = 0;
  private lastAt: number | null = null;
  private lastPlaying = false;

  observe(now: number, isPlaying: boolean): number {
    if (this.lastAt !== null && this.lastPlaying) {
      const delta = now - this.lastAt;
      // Ignore backwards clock jumps; clamp absurd gaps (tab slept
      // with a playing flag stuck on): a single observation pair may
      // add at most 5 s, far above the 250 ms tick but far below abuse.
      if (delta > 0) this.accumulated += Math.min(delta, 5_000);
    }
    this.lastAt = now;
    this.lastPlaying = isPlaying;
    return this.accumulated;
  }

  get accumulatedMs(): number {
    return this.accumulated;
  }

  reset(): void {
    this.accumulated = 0;
    this.lastAt = null;
    this.lastPlaying = false;
  }
}

/** Has this viewer used up the free demo? Access bypasses entirely. */
export function shouldGate(input: {
  hasAccess: boolean;
  accumulatedMs: number;
  limitMs?: number;
}): boolean {
  if (input.hasAccess) return false;
  return input.accumulatedMs >= (input.limitMs ?? FREE_DEMO_LIMIT_MS);
}

/** Whole seconds of demo left, for the chrome's countdown chip. */
export function demoSecondsLeft(accumulatedMs: number, limitMs = FREE_DEMO_LIMIT_MS): number {
  return Math.max(0, Math.ceil((limitMs - accumulatedMs) / 1000));
}
