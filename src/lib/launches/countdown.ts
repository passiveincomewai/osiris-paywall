/**
 * OSIRIS — launch countdown maths (pure).
 *
 * The one clock the Space Missions layer shows. Kept pure and small so the
 * chip, the panel and the tests all read the same numbers. A countdown is
 * only ever as precise as LL2's NET precision — when LL2 says the NET is
 * only known to the day or month, the UI must show the date, not a fake
 * ticking seconds readout, and `approximate` says so.
 */

export interface Countdown {
  /** Whole seconds from now until NET (negative once NET has passed). */
  secondsToNet: number | null;
  /** "T−" before NET, "T+" after. */
  sign: 'T−' | 'T+';
  /** True when LL2's precision is coarser than the minute (Day/Month/…). */
  approximate: boolean;
  /** Display label: "T−2D 04:13:55", "T−04:13:55", "T+00:07:31", "NET TBD". */
  label: string;
}

const PRECISE = new Set(['minute', 'second', 'hour']);

export function countdownTo(netIso: string | null, netPrecision: string | null, nowMs: number): Countdown {
  if (!netIso) return { secondsToNet: null, sign: 'T−', approximate: true, label: 'NET TBD' };
  const netMs = Date.parse(netIso);
  if (!Number.isFinite(netMs)) return { secondsToNet: null, sign: 'T−', approximate: true, label: 'NET TBD' };
  const seconds = Math.floor((netMs - nowMs) / 1000);
  const approximate = !(netPrecision && PRECISE.has(netPrecision.toLowerCase()));
  const sign = seconds < 0 ? 'T+' : 'T−';
  const abs = Math.abs(seconds);
  const days = Math.floor(abs / 86400);
  const hh = Math.floor((abs % 86400) / 3600);
  const mm = Math.floor((abs % 3600) / 60);
  const ss = abs % 60;
  const p2 = (n: number) => String(n).padStart(2, '0');
  const clock = `${p2(hh)}:${p2(mm)}:${p2(ss)}`;
  return {
    secondsToNet: seconds,
    sign,
    approximate,
    label: days > 0 ? `${sign}${days}D ${clock}` : `${sign}${clock}`,
  };
}

/** The next launch that can actually be counted down to: earliest NET in the future (or just passed within the hour — launches slip, and a T+ readout for the first hour is honest). */
export function nextLaunch<T extends { net: string | null }>(upcoming: T[], nowMs: number): T | null {
  let best: T | null = null;
  let bestMs = Infinity;
  for (const l of upcoming) {
    if (!l.net) continue;
    const ms = Date.parse(l.net);
    if (!Number.isFinite(ms)) continue;
    if (ms < nowMs - 3_600_000) continue; // more than an hour gone — it's previous now
    if (ms < bestMs) { bestMs = ms; best = l; }
  }
  // Nothing within the window — fall back to the earliest future NET at all.
  if (!best) {
    for (const l of upcoming) {
      if (!l.net) continue;
      const ms = Date.parse(l.net);
      if (!Number.isFinite(ms) || ms < nowMs) continue;
      if (ms < bestMs) { bestMs = ms; best = l; }
    }
  }
  return best;
}
