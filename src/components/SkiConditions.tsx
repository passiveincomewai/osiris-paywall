'use client';

import { useEffect, useState } from 'react';
import { AlertTriangle, CloudSun, Loader2 } from 'lucide-react';
import type { SkiResort } from '@/lib/ski-resorts';

interface SkiAlert {
  event: string;
  severity: string | null;
  headline: string | null;
  expires: string | null;
}

interface ConditionsResponse {
  supported: boolean;
  provider: string | null;
  alerts: SkiAlert[];
}

type State =
  | { kind: 'loading' }
  | { kind: 'ready'; data: ConditionsResponse }
  | { kind: 'error' };

/**
 * The conditions panel on a resort page. Two honest layers, both
 * labelled with their source:
 *  - official weather alerts for the resort's exact point — the U.S.
 *    National Weather Service feed (the same one /api/weather maps),
 *    United States resorts only; elsewhere the panel says plainly that
 *    no official alert feed is integrated for the area;
 *  - road conditions: the live DOT/traffic cameras in the sections
 *    below and in the route tool — the cameras ARE the road report on
 *    this site, and the panel never dresses them up as an official
 *    road-condition claim.
 */
export default function SkiConditions({ resort }: { resort: SkiResort }) {
  const [state, setState] = useState<State>({ kind: 'loading' });

  useEffect(() => {
    let cancelled = false;
    const qs = new URLSearchParams({
      lat: String(resort.lat),
      lng: String(resort.lng),
      country: resort.countrySlug,
    });
    fetch(`/api/ski/conditions?${qs.toString()}`)
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json() as Promise<ConditionsResponse>;
      })
      .then(data => {
        if (!cancelled) setState({ kind: 'ready', data });
      })
      .catch(() => {
        if (!cancelled) setState({ kind: 'error' });
      });
    return () => {
      cancelled = true;
    };
  }, [resort]);

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
      <h3 className="flex items-center gap-2 font-semibold text-white/90">
        <CloudSun className="w-4.5 h-4.5 text-[#D4AF37]" /> Conditions at {resort.name}
      </h3>

      {state.kind === 'loading' && (
        <p className="mt-3 flex items-center gap-2 text-sm text-white/50" role="status">
          <Loader2 className="w-4 h-4 animate-spin" /> Checking official alerts for this point…
        </p>
      )}

      {state.kind === 'error' && (
        <p className="mt-3 text-sm text-white/55 leading-relaxed">
          The official alert feed could not be loaded just now. The live cameras below are still the
          ground truth for the mountain and the roads around it.
        </p>
      )}

      {state.kind === 'ready' && !state.data.supported && (
        <p className="mt-3 text-sm text-white/55 leading-relaxed">
          WorldEye does not have an official weather-alert feed integrated for {resort.country} yet, so
          this page makes no alert claims for {resort.name}. Current conditions are best read from the
          live cameras below — the slopes, the base area and the access roads as they are right now.
        </p>
      )}

      {state.kind === 'ready' && state.data.supported && state.data.alerts.length === 0 && (
        <p className="mt-3 text-sm text-white/55 leading-relaxed">
          No active weather alerts for the {resort.name} area right now.{' '}
          <span className="text-white/35">Source: {state.data.provider}.</span> Road conditions are
          still best read from the live cameras below — an unalerted day can still have a slick canyon.
        </p>
      )}

      {state.kind === 'ready' && state.data.supported && state.data.alerts.length > 0 && (
        <div className="mt-3 space-y-3">
          {state.data.alerts.map((a, i) => (
            <div key={i} className="rounded-xl border border-amber-400/30 bg-amber-400/[0.06] p-4">
              <p className="flex items-center gap-2 text-sm font-semibold text-amber-200">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                {a.event}
                {a.severity && <span className="text-xs font-medium text-amber-200/60">· {a.severity}</span>}
              </p>
              {a.headline && <p className="mt-1 text-sm text-white/65 leading-relaxed">{a.headline}</p>}
              {a.expires && (
                <p className="mt-1 text-xs text-white/35">
                  In effect until{' '}
                  {new Date(a.expires).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}
                </p>
              )}
            </div>
          ))}
          <p className="text-xs text-white/35">Source: {state.data.provider}, for the resort&apos;s exact location.</p>
        </div>
      )}

      <p className="mt-4 border-t border-white/5 pt-3 text-xs text-white/40 leading-relaxed">
        Road conditions: WorldEye shows the access roads themselves — live department-of-transportation
        and resort cameras in the sections below, plus every camera along your drive in the route tool.
        That is a live view, not an official road report; for chain laws and closures, check the
        state/provincial DOT before you travel.
      </p>
    </div>
  );
}
