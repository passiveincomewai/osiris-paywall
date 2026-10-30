'use client';

import { useState } from 'react';
import { ChevronDown, Loader2 } from 'lucide-react';
import type { PlannerDirection } from '@/lib/transit/stop-finder';
import StopRoutePlanner from './StopRoutePlanner';

/**
 * The stop planner's agency-hub form (owner feature, 2026-10-29):
 * the hub carries no single route's stops, so the visitor picks a
 * route and the planner's data loads on demand from
 * /api/transit/route — the site's own checked route API, which
 * returns the route's directions with their ordered, located stop
 * lists. The ride line is the ordered stop-to-stop polyline (the
 * API carries stops, not the GTFS shape — the route pages, which
 * render server-side, use the true shape).
 *
 * If the route API can't serve the route (feed down, route not in
 * today's pattern), the section says so and points at the route
 * list — it never renders a planner over partial data.
 */

export interface AgencyRouteOption {
  id: string;
  short: string;
  label: string;
  color: string;
}

interface RouteApiResponse {
  route?: { short?: string; long?: string; color?: string };
  directions?: Array<{
    dir: number;
    headsign: string;
    stops: Array<{ id: string; name: string; lat: number; lng: number }>;
  }>;
}

export default function AgencyStopPlanner({
  agencyId,
  agencyName,
  routes,
}: {
  agencyId: string;
  agencyName: string;
  routes: AgencyRouteOption[];
}) {
  const [routeId, setRouteId] = useState('');
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const [planner, setPlanner] = useState<{
    key: string;
    routeLabel: string;
    routeColor: string;
    directions: PlannerDirection[];
  } | null>(null);

  const pick = async (id: string) => {
    setRouteId(id);
    setPlanner(null);
    setFailed(false);
    if (!id) return;
    setLoading(true);
    try {
      const res = await fetch(
        `/api/transit/route?agency=${encodeURIComponent(agencyId)}&route=${encodeURIComponent(id)}`,
      );
      const data: RouteApiResponse = await res.json();
      if (!res.ok) throw new Error('route api');
      const directions: PlannerDirection[] = (data.directions ?? [])
        .filter(d => Array.isArray(d.stops) && d.stops.length > 0)
        .map(d => ({
          dir: d.dir,
          headsign: d.headsign,
          stops: d.stops,
          line: d.stops.map(s => [s.lng, s.lat] as [number, number]),
        }));
      if (!directions.length) throw new Error('no directions');
      const option = routes.find(r => r.id === id);
      setPlanner({
        key: id,
        routeLabel: `Route ${data.route?.long || data.route?.short || option?.short || ''}`.trim(),
        routeColor: data.route?.color || option?.color || '#D4AF37',
        directions,
      });
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="relative max-w-md">
        <label
          htmlFor="agency-planner-route"
          className="block text-xs font-semibold uppercase tracking-wider text-white/40 mb-1.5"
        >
          Route
        </label>
        <select
          id="agency-planner-route"
          value={routeId}
          onChange={e => void pick(e.target.value)}
          className="w-full appearance-none rounded-xl border border-white/10 bg-white/[0.03] pl-4 pr-10 py-3 text-sm text-white focus:outline-none focus:border-[#D4AF37]/60 focus:ring-1 focus:ring-[#D4AF37]/40"
        >
          <option value="" className="bg-[#0a0e18]">
            Choose a {agencyName} route…
          </option>
          {routes.map(r => (
            <option key={r.id} value={r.id} className="bg-[#0a0e18]">
              {r.label}
            </option>
          ))}
        </select>
        <ChevronDown className="w-4 h-4 absolute right-3.5 top-[38px] text-white/35 pointer-events-none" />
      </div>

      {loading && (
        <p className="mt-4 text-sm text-white/50 flex items-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin text-[#D4AF37]" />
          Loading that route&apos;s stops…
        </p>
      )}
      {failed && (
        <p className="mt-4 rounded-xl border border-amber-300/25 bg-amber-300/[0.07] px-4 py-3 text-sm text-amber-100/85 max-w-2xl">
          That route&apos;s stop list couldn&apos;t be loaded just now — open the route from
          the list below instead; its page carries the same planner with the full stop pattern.
        </p>
      )}
      {planner && (
        <div className="mt-6">
          <StopRoutePlanner
            key={planner.key}
            agencyName={agencyName}
            routeLabel={planner.routeLabel}
            routeColor={planner.routeColor}
            directions={planner.directions}
            heading={`Directions to ${planner.routeLabel}`}
            intro={`Enter a starting address — we'll find the nearest ${planner.routeLabel} stop and walk you to it turn by turn. Add a destination, an address or a specific stop on the route, and we'll name the stop to get off at, walk you the last leg, and show the live cameras along the whole trip.`}
          />
        </div>
      )}
    </div>
  );
}
