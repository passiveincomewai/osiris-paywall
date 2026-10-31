'use client';

import { useEffect, useState } from 'react';
import { AlertTriangle, Loader2 } from 'lucide-react';
import type { SavedSkiRoute } from '@/lib/ski/saved-routes';
import {
  COVERED_STATES,
  matchEventsToRoute,
  statesForRoute,
  type RoadConditionsPayload,
  type RoadEvent,
} from '@/lib/ski/road-conditions';

/**
 * Road conditions for one saved route, on the drive-up brief.
 *
 * Events come from /api/ski/road-conditions (state DOT feeds only —
 * never modelled or forecast data) and are matched to the route's
 * stored polyline in the browser (within 2 miles). Coverage honesty
 * is the point of this section:
 *   - covered states come from the payload's coveredStates (the keyless
 *     CA/MT/ID set plus any keyed state the server has configured); ID is
 *     WORK ZONES ONLY and says so;
 *   - a route through any other state gets an explicit "no feed yet"
 *     line — silence there is NOT an all-clear;
 *   - a feed that failed or went stale is named as unavailable, and
 *     its (dropped) events are never shown as current.
 */

let sharedPayload: Promise<RoadConditionsPayload | null> | null = null;

function loadRoadConditions(): Promise<RoadConditionsPayload | null> {
  if (!sharedPayload) {
    sharedPayload = fetch('/api/ski/road-conditions')
      .then(async (r) => {
        if (!r.ok) return null;
        return (await r.json()) as RoadConditionsPayload;
      })
      .catch(() => null);
  }
  return sharedPayload;
}

const CATEGORY_LABELS: Record<RoadEvent['category'], string> = {
  chain: 'Chain control',
  closure: 'Full closure',
  'lane-closure': 'Lane closure',
  restriction: 'Restriction',
  incident: 'Road event',
  workzone: 'Work zone',
};

const STATE_NAMES: Record<string, string> = {
  CA: 'California',
  MT: 'Montana',
  ID: 'Idaho',
  UT: 'Utah',
  CO: 'Colorado',
  WA: 'Washington',
  OR: 'Oregon',
  NV: 'Nevada',
  AZ: 'Arizona',
  WY: 'Wyoming',
};

/** Footer blurbs for fully covered states (ID is partial — work zones
 *  only — and is appended as its own clause, never listed here). A keyed
 *  state joins the footer only when the payload says it is covered. */
const COVERAGE_BLURBS: Record<string, string> = {
  CA: 'California (Caltrans chain controls & closures)',
  MT: 'Montana (MDT events)',
  UT: 'Utah (UDOT events & road conditions)',
  AZ: 'Arizona (AZ511 alerts & events)',
  WA: 'Washington (WSDOT pass conditions & alerts)',
  OR: 'Oregon (ODOT TripCheck reports & incidents)',
};

function joinEnglish(items: string[]): string {
  if (items.length <= 1) return items.join('');
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;
}

function updatedLabel(ts: number): string {
  if (!ts) return '';
  return ` · updated ${new Date(ts).toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })}`;
}

export default function SkiRoadConditions({ route }: { route: SavedSkiRoute }) {
  const [payload, setPayload] = useState<RoadConditionsPayload | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    loadRoadConditions().then((p) => {
      if (!cancelled) {
        setPayload(p);
        setLoaded(true);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const routeStates = statesForRoute(route.route);
  // Coverage truth travels with the payload: the server adds a state to
  // coveredStates only when its DOT key is actually configured. Until a
  // payload with that field loads (or if it is ever absent), fall back
  // to the static keyless set — CA/MT/ID.
  const effectiveCovered: readonly string[] =
    payload && payload.coveredStates && payload.coveredStates.length > 0
      ? payload.coveredStates
      : COVERED_STATES;
  const uncovered = routeStates.filter((s) => !effectiveCovered.includes(s));
  const coveredHere = routeStates.filter((s) => effectiveCovered.includes(s));

  // Coverage labelling derived from the effective covered set, so a
  // newly keyed state is named correctly the moment it lights up. With
  // no keys set these strings are identical to the previous literals.
  const coveredFull = effectiveCovered.filter((s) => s !== 'ID');
  const idClause = effectiveCovered.includes('ID')
    ? ', plus Idaho work zones only'
    : '';
  const coverageLine =
    `Road-condition coverage: ${joinEnglish(coveredFull.map((s) => STATE_NAMES[s] ?? s))}` +
    ` road events${idClause}. Other states have no feed yet.`;
  const footerText =
    `Road conditions cover ${joinEnglish(coveredFull.map((s) => COVERAGE_BLURBS[s] ?? STATE_NAMES[s] ?? s))}` +
    `${idClause}. Other states have no feed yet — an uncovered state's ` +
    `silence never means the road is clear.`;

  return (
    <div>
      <h3 className="text-sm font-semibold text-white/85">Road conditions</h3>

      {!loaded ? (
        <p className="mt-2.5 flex items-center gap-2 text-sm text-white/60" role="status">
          <Loader2 className="w-4 h-4 animate-spin text-[#D4AF37]" /> Checking the
          state DOT feeds…
        </p>
      ) : payload === null ? (
        <p className="mt-2.5 text-sm text-white/55">
          Road conditions could not be loaded just now. No feed data is shown rather
          than anything stale or guessed — try again in a moment.
        </p>
      ) : (
        <>
          {/* Feeds for the covered states on this route that are down/stale */}
          {payload.coverage
            .filter((c) => c.status === 'unavailable' && coveredHere.includes(c.state))
            .map((c) => (
              <p
                key={`${c.state}-${c.label}`}
                className="mt-2.5 flex items-start gap-2 text-sm text-amber-200/80"
              >
                <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                {STATE_NAMES[c.state] ?? c.state} {c.label.toLowerCase()} feed (
                {c.source}) is unavailable right now — conditions there are unknown,
                not clear.
              </p>
            ))}

          {(() => {
            const liveStates = new Set(
              payload.coverage.filter((c) => c.status === 'ok').map((c) => c.state),
            );
            const matched = matchEventsToRoute(
              payload.events.filter((e) => liveStates.has(e.state)),
              route.route,
            );
            if (matched.length === 0) {
              return coveredHere.length > 0 ? (
                <p className="mt-2.5 text-sm text-white/55">
                  No chain controls, closures or road events from the live DOT feeds
                  sit within 2 miles of this route right now. That only covers what
                  the feeds report — it is not a guarantee the road is clear.
                </p>
              ) : null;
            }
            return (
              <ul className="mt-2.5 space-y-2 text-sm text-white/65">
                {matched.map(({ event }) => (
                  <li key={`${event.state}-${event.sourceId}`} className="flex flex-wrap gap-x-2">
                    <span className="font-medium text-white/85">
                      {CATEGORY_LABELS[event.category]}
                      {event.route ? ` · ${event.route}` : ''}:
                    </span>
                    <span>
                      {event.statusText}
                      {event.category !== 'chain' && event.description
                        ? ` — ${event.description}`
                        : ''}
                    </span>
                    <span className="text-white/40">
                      {event.source}
                      {updatedLabel(event.updatedTs)}
                      {event.state === 'ID' ? ' · work zones only' : ''}
                    </span>
                  </li>
                ))}
              </ul>
            );
          })()}

          {/* Uncovered states on this route: explicit, never silent */}
          {uncovered.map((s) => (
            <p key={s} className="mt-2.5 text-sm text-white/55">
              No road-condition feed for {STATE_NAMES[s] ?? s} yet — its DOT requires
              an API key we don&apos;t have, so nothing here speaks for{' '}
              {STATE_NAMES[s] ?? s} roads. Check the state DOT before you drive.
            </p>
          ))}
          {routeStates.length === 0 && (
            <p className="mt-2.5 text-sm text-white/55">{coverageLine}</p>
          )}
          {coveredHere.includes('ID') && (
            <p className="mt-2 text-[11px] leading-relaxed text-white/30">
              Idaho coverage is work zones only (WZDx feed) — incidents, closures and
              pass conditions are not in it.
            </p>
          )}
        </>
      )}

      <p className="mt-2 text-[11px] leading-relaxed text-white/30">{footerText}</p>
    </div>
  );
}
