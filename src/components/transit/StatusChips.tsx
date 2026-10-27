'use client';

/**
 * OSIRIS — the rider-status chips shared by the transit selection
 * card and the Transit Explorer (rider upgrade, 2026-10-26): one
 * visual language for "is my bus on time" and "is my route running
 * normally", computed by lib/transit/status from the feeds' own
 * fields — never styled guesses.
 */

import { delayStatus, type DelayTone, type RouteStatus } from '@/lib/transit/status';

const TONE_STYLE: Record<DelayTone, { color: string; background: string }> = {
  green: { color: '#7EE2A8', background: 'rgba(110,231,160,0.12)' },
  amber: { color: '#FCD34D', background: 'rgba(252,211,77,0.12)' },
  red: { color: '#FCA5A5', background: 'rgba(248,113,113,0.14)' },
  cyan: { color: '#7DD3FC', background: 'rgba(125,211,252,0.12)' },
  muted: { color: 'rgba(255,255,255,0.45)', background: 'rgba(255,255,255,0.07)' },
};

const chipCls =
  'inline-block text-[8px] font-mono font-bold rounded px-1.5 py-0.5 whitespace-nowrap align-middle';

/** Delay chip for one arrival (delay seconds + basis from the stop API). */
export function DelayChip({
  delayS,
  basis,
}: {
  delayS?: number | null;
  basis: 'realtime' | 'scheduled';
}) {
  const st = delayStatus(delayS, basis);
  return (
    <span className={chipCls} style={TONE_STYLE[st.tone]} title={st.label}>
      {st.label.toUpperCase()}
    </span>
  );
}

/** Service-status chip for one route (from its active GTFS-RT alerts). */
export function RouteStatusChip({ status }: { status: RouteStatus }) {
  if (status.status === 'normal') {
    return (
      <span className={chipCls} style={TONE_STYLE.green} title="No active alerts on this route">
        NORMAL SERVICE
      </span>
    );
  }
  return (
    <span className={chipCls} style={TONE_STYLE[status.tone]} title={status.label}>
      {status.label.toUpperCase()}
    </span>
  );
}
