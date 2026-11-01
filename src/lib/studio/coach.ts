// AI Marketing Coach — deterministic insights (spec §11 F).
//
// Every statement is computed from the affiliate's OWN measured
// per-creative numbers, and every rule has a minimum-data threshold:
// below it, the coach says "not enough data yet" instead of dressing
// up noise as insight. Nothing here invents a benchmark, a trend, or
// a platform statistic.

export interface CreativeStats {
  creativeId: string;
  title: string;
  direction: string;
  aspect: string;
  clicks: number;
  signups: number;
  paid: number;
  commissionCents: number;
}

export const MIN_CLICKS_FOR_INSIGHT = 30;

export function coachInsights(stats: CreativeStats[]): string[] {
  const totalClicks = stats.reduce((s, c) => s + c.clicks, 0);
  const out: string[] = [];

  if (stats.length === 0) {
    return ["No repurposed creatives yet — generate variations in the Machine and post them with their tracked links."];
  }
  if (totalClicks < MIN_CLICKS_FOR_INSIGHT) {
    return [
      `Not enough data yet: ${totalClicks} tracked click${totalClicks === 1 ? "" : "s"} across ${stats.length} creative${stats.length === 1 ? "" : "s"}. ` +
        `Per-creative conclusions need about ${MIN_CLICKS_FOR_INSIGHT}+ clicks — keep posting with the tracked creative links and check back.`,
    ];
  }

  const withClicks = stats.filter((c) => c.clicks > 0);
  const rate = (c: CreativeStats) => (c.clicks > 0 ? c.paid / c.clicks : 0);

  // Best converter (only with its own solid base).
  const proven = withClicks.filter((c) => c.clicks >= MIN_CLICKS_FOR_INSIGHT);
  if (proven.length > 0) {
    const best = [...proven].sort((a, b) => rate(b) - rate(a))[0];
    if (best.paid > 0) {
      out.push(
        `Your strongest creative is “${best.title}” (${best.direction.replace(/_/g, " ")}): ${best.clicks} clicks → ${best.paid} paying ` +
          `($${(best.commissionCents / 100).toFixed(2)} earned). Repurpose it again from the Machine — new angles on a proven source beat new guesses.`,
      );
    }
  }

  // Traffic but no signups: the hook/traffic works, the landing step doesn't.
  for (const c of proven) {
    if (c.signups === 0) {
      out.push(
        `“${c.title}” pulled ${c.clicks} clicks but no signups. The hook is doing its job — the gap is after the click. ` +
          `Check the end card and bio link point at this creative's tracked URL, and that the post text matches what the video promises.`,
      );
    }
  }

  // Aspect pattern, only when both sides have a real base.
  const byAspect = new Map<string, { clicks: number; paid: number }>();
  for (const c of withClicks) {
    const g = byAspect.get(c.aspect) ?? { clicks: 0, paid: 0 };
    g.clicks += c.clicks;
    g.paid += c.paid;
    byAspect.set(c.aspect, g);
  }
  const aspects = [...byAspect.entries()].filter(([, g]) => g.clicks >= MIN_CLICKS_FOR_INSIGHT);
  if (aspects.length >= 2) {
    const sorted = aspects.sort((a, b) => b[1].paid / b[1].clicks - a[1].paid / a[1].clicks);
    const [topA, topG] = sorted[0];
    const [lowA, lowG] = sorted[sorted.length - 1];
    const topRate = topG.paid / topG.clicks;
    const lowRate = lowG.paid / Math.max(1, lowG.clicks);
    if (topRate > 0 && topRate >= lowRate * 1.5) {
      out.push(
        `Format signal: your ${topA} creatives convert clicks to paying subscribers at ${(topRate * 100).toFixed(1)}% ` +
          `vs ${(lowRate * 100).toFixed(1)}% for ${lowA}. Lean the next batch toward ${topA}.`,
      );
    }
  }

  if (out.length === 0) {
    out.push(
      `${totalClicks} tracked clicks across ${withClicks.length} creatives — the base is building but no pattern clears the noise bar yet. Volume first: more posts with tracked links.`,
    );
  }
  return out;
}
