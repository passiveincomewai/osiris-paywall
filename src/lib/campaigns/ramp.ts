// Warm-up ramp for campaign sending — pure, unit-tested.
//
// A fresh sending domain earns volume gradually. When a campaign has
// no dailyCap of its own, the GLOBAL daily allowance across all
// campaigns follows this ramp, anchored at the earliest campaign send
// ever recorded (week 1 starts on that day): W1 20, W2 50, W3 100,
// W4 200, W5 400, W6+ 800 per day (UTC days).

export const RAMP_CAPS = [20, 50, 100, 200, 400, 800] as const;

export function rampDailyCap(earliestSentAt: Date | null, now: Date): number {
  if (!earliestSentAt) return RAMP_CAPS[0];
  const dayMs = 86_400_000;
  const startDay = Math.floor(earliestSentAt.getTime() / dayMs);
  const today = Math.floor(now.getTime() / dayMs);
  const weekIndex = Math.floor(Math.max(0, today - startDay) / 7);
  return RAMP_CAPS[Math.min(weekIndex, RAMP_CAPS.length - 1)];
}

export function startOfUtcDay(d: Date): Date {
  return new Date(Math.floor(d.getTime() / 86_400_000) * 86_400_000);
}
