'use client';

import { useRef, useState } from 'react';
import { ChevronDown, Flag, Footprints, Loader2, MapPin, Navigation, Route } from 'lucide-react';
import { trackAnalyticsEvent } from '@/components/AnalyticsTracker';
import { CameraFeedCard, LazyCameraViewer } from '@/components/camera-feed-card';
import type { CountryCamera } from '@/lib/country-cameras';
import { directionsApiUrl } from '@/lib/transit/directions';
import {
  alightingStop,
  directionsServing,
  directionsServingJourney,
  journeyGeometry,
  nearestStop,
  rideLineBetween,
  rideLineFrom,
  routeStops,
  type AlightingHit,
  type PlannerDirection,
  type PlannerStop,
} from '@/lib/transit/stop-finder';
import StopJourneyMap from './StopJourneyMap';

/**
 * "Directions to this route" — the stop planner on the transit
 * route pages and agency hubs (owner feature, 2026-10-29). A
 * starting address goes in; the visitor gets the nearest stop ON
 * THIS ROUTE, the walking directions to it, the ride from there
 * toward the terminus, and every live camera along the way.
 *
 * The destination side (owner addition, 2026-10-30): the visitor
 * can also say where they're going — an address, or a specific
 * stop on this route picked from the stop list. The planner then
 * names the stop to GET OFF at (the stop nearest the destination
 * that the ride passes after the boarding stop), ends the ride
 * there instead of at the terminus, and walks the final leg from
 * that stop to the destination. When no single ride on the route
 * runs from the boarding stop toward the destination, it says so
 * plainly — it never invents a connection.
 *
 * Every piece is the site's own, reused rather than rebuilt:
 *  - the address field is /api/geosearch (the same geocoder the
 *    route-camera finder and the globe's directions panel use);
 *  - the walk is /api/directions in pedestrian mode (Valhalla,
 *    the same routing service the live map uses), requested via
 *    lib/transit/directions' pinned URL builder;
 *  - the nearest stop and the ride slice are lib/transit/
 *    stop-finder over the route's published GTFS stops + shape —
 *    nothing is invented, and a route without located stops says
 *    so instead of guessing;
 *  - the cameras are /api/cctv/route-cameras over the joined
 *    walk+ride geometry (1.5 km corridor, playable feeds only,
 *    in trip order) — the corridor the ski drive-up tool uses.
 *
 * The address goes only to the geocoding/routing calls that
 * answer the question; nothing is stored.
 */

interface FinderPlace {
  label: string;
  lat: number;
  lng: number;
}

interface GeoHit {
  name: string;
  context?: string;
  lat: number;
  lng: number;
  kind?: string;
}

function PlaceField({
  label,
  placeholder,
  onPick,
}: {
  label: string;
  placeholder: string;
  onPick: (place: FinderPlace | null) => void;
}) {
  const [text, setText] = useState('');
  const [results, setResults] = useState<GeoHit[]>([]);
  const [searched, setSearched] = useState(false);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const abort = useRef<AbortController | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const search = (q: string) => {
    if (timer.current) clearTimeout(timer.current);
    if (q.trim().length < 2) {
      setResults([]);
      setSearched(false);
      setLoading(false);
      return;
    }
    timer.current = setTimeout(async () => {
      abort.current?.abort();
      const ctrl = new AbortController();
      abort.current = ctrl;
      setLoading(true);
      try {
        const res = await fetch(`/api/geosearch?q=${encodeURIComponent(q)}`, {
          signal: ctrl.signal,
        });
        const data: { results?: GeoHit[] } = await res.json();
        if (ctrl.signal.aborted) return;
        setResults(data.results ?? []);
        setSearched(true);
        setOpen(true);
      } catch {
        if (!ctrl.signal.aborted) {
          setResults([]);
          setSearched(true);
        }
      }
      if (!ctrl.signal.aborted) setLoading(false);
    }, 280);
  };

  return (
    <div className="relative flex-1 min-w-[220px]">
      <label className="block text-xs font-semibold uppercase tracking-wider text-white/40 mb-1.5">
        {label}
      </label>
      <MapPin className="w-4 h-4 absolute left-3.5 top-[38px] text-white/35 pointer-events-none" />
      <input
        type="text"
        value={text}
        onChange={e => {
          setText(e.target.value);
          onPick(null);
          search(e.target.value);
        }}
        onFocus={() => results.length > 0 && setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder={placeholder}
        aria-label={label}
        className="w-full rounded-xl border border-white/10 bg-white/[0.03] pl-10 pr-9 py-3 text-sm placeholder:text-white/30 focus:outline-none focus:border-[#D4AF37]/60 focus:ring-1 focus:ring-[#D4AF37]/40"
      />
      {loading && (
        <Loader2 className="w-4 h-4 absolute right-3 top-[38px] animate-spin text-[#D4AF37]" />
      )}
      {open && results.length > 0 && (
        <div className="absolute z-20 mt-2 w-full rounded-xl border border-white/10 bg-[#0a0e18] shadow-2xl overflow-hidden">
          <ul>
            {results.map((r, i) => (
              <li key={`${r.lat},${r.lng},${i}`}>
                <button
                  type="button"
                  onMouseDown={e => {
                    e.preventDefault();
                    const place = {
                      label: r.context ? `${r.name}, ${r.context}` : r.name,
                      lat: r.lat,
                      lng: r.lng,
                    };
                    setText(r.name);
                    onPick(place);
                    setOpen(false);
                  }}
                  className="w-full px-4 py-2.5 text-sm text-left hover:bg-white/5 transition"
                >
                  <span className="block truncate">{r.name}</span>
                  {r.context && (
                    <span className="block truncate text-xs text-white/40">{r.context}</span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
      {open && searched && !loading && results.length === 0 && (
        <p className="absolute z-20 mt-2 w-full rounded-xl border border-white/10 bg-[#0a0e18] px-4 py-3 text-sm text-white/55">
          No match for that address — try adding the city or a nearby landmark.
        </p>
      )}
    </div>
  );
}

interface WalkStep {
  instruction: string;
  distance: number;
}

interface WalkResult {
  distanceM: number;
  durationS: number;
  steps: WalkStep[];
  geometry: [number, number][];
}

interface RouteCamHit extends CountryCamera {
  alongRouteM: number;
  distanceFromRouteM: number;
}

interface CamResult {
  total: number;
  shown: number;
  corridorM: number;
  cameras: RouteCamHit[];
}

function fmtDistance(m: number): string {
  if (m < 1000) return `${Math.round(m)} m`;
  return `${(m / 1000).toFixed(1)} km`;
}

function fmtDuration(s: number): string {
  const mins = Math.round(s / 60);
  if (mins < 1) return 'under a minute';
  if (mins < 60) return `${mins} min`;
  return `${Math.floor(mins / 60)} h ${mins % 60} min`;
}

function fmtAlong(m: number): string {
  if (m < 1000) return `${Math.round(m)} m along`;
  return `${(m / 1000).toFixed(1)} km along`;
}

export default function StopRoutePlanner({
  agencyName,
  routeLabel,
  routeColor,
  directions,
  heading,
  intro,
}: {
  agencyName: string;
  /** e.g. "Route Orange Line" — used in the result copy. */
  routeLabel: string;
  routeColor: string;
  directions: PlannerDirection[];
  heading: string;
  intro: string;
}) {
  const [from, setFrom] = useState<FinderPlace | null>(null);
  const [dest, setDest] = useState<FinderPlace | null>(null);
  /** A specific stop on this route chosen as the destination. */
  const [destStop, setDestStop] = useState<PlannerStop | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stopHit, setStopHit] = useState<{ stop: PlannerStop; distanceM: number } | null>(null);
  const [serving, setServing] = useState<number[]>([]);
  const [dirSel, setDirSel] = useState(0);
  const [walk, setWalk] = useState<WalkResult | null>(null);
  const [walkFailed, setWalkFailed] = useState(false);
  /** The geometry the map + corridor actually used: the routed
   *  walk, or the straight line when routing failed. */
  const [journeyWalk, setJourneyWalk] = useState<[number, number][] | null>(null);
  /** The get-off stop for the current direction, when a
   *  destination is in play; null on a start-only plan. */
  const [alight, setAlight] = useState<AlightingHit | null>(null);
  const [finalWalk, setFinalWalk] = useState<WalkResult | null>(null);
  const [finalWalkFailed, setFinalWalkFailed] = useState(false);
  /** The final leg's geometry as actually used (routed, or the
   *  straight line when routing failed) — the corridor covers it. */
  const [journeyFinal, setJourneyFinal] = useState<[number, number][] | null>(null);
  const [cams, setCams] = useState<CamResult | null>(null);
  const [camsBusy, setCamsBusy] = useState(false);
  const [camError, setCamError] = useState(false);
  const [active, setActive] = useState<CountryCamera | null>(null);

  const hasDestination = destStop !== null || dest !== null;
  const allStops = [...routeStops(directions)].sort((a, b) => a.name.localeCompare(b.name));

  /** One pedestrian routing call, as a WalkResult — null when the
   *  router is down or has no path (callers fall back honestly). */
  const fetchWalk = async (
    a: { lat: number; lng: number },
    b: { lat: number; lng: number },
  ): Promise<WalkResult | null> => {
    try {
      const res = await fetch(directionsApiUrl(a, b, 'pedestrian'));
      const dir = await res.json();
      if (!res.ok || dir.error) return null;
      const route = (dir.routes?.length ? dir.routes[0] : dir) as {
        distance: number;
        duration: number;
        steps?: WalkStep[];
        geometry: { coordinates: [number, number][] };
      };
      if (!route.geometry?.coordinates?.length) return null;
      return {
        distanceM: route.distance,
        durationS: route.duration,
        steps: route.steps ?? [],
        geometry: route.geometry.coordinates,
      };
    } catch {
      return null;
    }
  };

  /**
   * Everything downstream of the boarding walk for one direction:
   * the get-off stop (when a destination is in play), the ride
   * slice (to the alighting stop, or to the terminus without a
   * destination), the final walking leg, and the corridor cameras
   * over the joined geometry.
   */
  const planJourney = async (
    dirIndex: number,
    board: PlannerStop,
    walkGeo: [number, number][],
  ) => {
    const direction = directions[dirIndex];
    if (!direction) return;
    setAlight(null);
    setFinalWalk(null);
    setFinalWalkFailed(false);
    setJourneyFinal(null);

    let ride: [number, number][];
    let finalGeo: [number, number][] = [];
    if (hasDestination) {
      const hit = destStop
        ? ((): AlightingHit | null => {
            const b = direction.stops.findIndex(s => s.id === board.id);
            const a = direction.stops.findIndex(s => s.id === destStop.id);
            return b >= 0 && a > b
              ? { stop: destStop, distanceM: 0, stopsRidden: a - b }
              : null;
          })()
        : alightingStop(direction, board.id, dest!);
      if (!hit) return; // run() only offers directions that serve the journey
      setAlight(hit);
      ride = rideLineBetween(direction.line, board, hit.stop);
      if (dest && !destStop) {
        const fw = await fetchWalk(hit.stop, dest);
        if (fw) {
          setFinalWalk(fw);
          finalGeo = fw.geometry;
        } else {
          setFinalWalkFailed(true);
          finalGeo = [
            [hit.stop.lng, hit.stop.lat],
            [dest.lng, dest.lat],
          ];
        }
        setJourneyFinal(finalGeo);
      }
    } else {
      ride = rideLineFrom(direction.line, board);
    }

    setCamsBusy(true);
    setCamError(false);
    setCams(null);
    try {
      const geometry = journeyGeometry(journeyGeometry(walkGeo, ride), finalGeo);
      const res = await fetch('/api/cctv/route-cameras', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ coordinates: geometry }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || 'cameras failed');
      setCams({
        total: data.total,
        shown: data.shown,
        corridorM: data.corridorM,
        cameras: data.cameras,
      });
    } catch {
      /* The directions still stand — only the camera layer failed. */
      setCamError(true);
    } finally {
      setCamsBusy(false);
    }
  };

  const run = async () => {
    if (!from) {
      setError('Pick your starting address from the suggestions so the stop and the walk are exact.');
      return;
    }
    setBusy(true);
    setError(null);
    setStopHit(null);
    setWalk(null);
    setWalkFailed(false);
    setJourneyWalk(null);
    setAlight(null);
    setFinalWalk(null);
    setFinalWalkFailed(false);
    setJourneyFinal(null);
    setCams(null);
    setCamError(false);
    try {
      const hit = nearestStop(routeStops(directions), from);
      if (!hit) {
        setError(
          `${agencyName} publishes no stop locations for ${routeLabel} that we can route to — the stop list on this page is the full picture.`,
        );
        return;
      }
      const boardIdx = directionsServing(directions, hit.stop.id);
      const boardDirs = boardIdx.length ? boardIdx : [0];

      /* Which directions can actually run this trip? With a
         destination, only the ones that pass a get-off stop after
         the boarding stop — and when none can, the answer is an
         honest "this route can't make that trip", never a guess. */
      let usable = boardDirs;
      if (destStop) {
        usable = directionsServingJourney(directions, hit.stop.id, destStop.id);
        if (!usable.length) {
          setError(
            `No single ride on ${routeLabel} runs from ${hit.stop.name} to ${destStop.name} — in the route's stop order, ${destStop.name} comes before ${hit.stop.name}. Try the trip the other way round, or pick a destination address instead of a stop.`,
          );
          return;
        }
      } else if (dest) {
        usable = boardDirs.filter(i => alightingStop(directions[i], hit.stop.id, dest));
        if (!usable.length) {
          const nearestToDest = nearestStop(routeStops(directions), dest);
          setError(
            `From ${hit.stop.name}, no ${routeLabel} stop after yours runs toward ${dest.label} — the stop nearest your destination is ${nearestToDest ? nearestToDest.stop.name : 'not on this route'}, which the route passes before ${hit.stop.name}. This route can't complete that trip in one ride.`,
          );
          return;
        }
      }
      const firstDir = usable[0];
      setStopHit(hit);
      setServing(usable);
      setDirSel(firstDir);

      let walkGeo: [number, number][] = [
        [from.lng, from.lat],
        [hit.stop.lng, hit.stop.lat],
      ];
      const w = await fetchWalk(from, hit.stop);
      if (w) {
        walkGeo = w.geometry;
        setWalk(w);
      } else {
        /* Routing is down or has no path: the nearest stop is still
           the answer — shown with its straight-line distance, and
           the corridor search runs over the straight line. */
        setWalkFailed(true);
      }
      setJourneyWalk(walkGeo);
      trackAnalyticsEvent('transit_stop_planner_search');
      if (hasDestination) trackAnalyticsEvent('transit_stop_planner_destination');
      await planJourney(firstDir, hit.stop, walkGeo);
    } finally {
      setBusy(false);
    }
  };

  const pickDirection = (dirIndex: number) => {
    setDirSel(dirIndex);
    if (!stopHit) return;
    const walkGeo =
      journeyWalk ??
      ([
        [from!.lng, from!.lat],
        [stopHit.stop.lng, stopHit.stop.lat],
      ] as [number, number][]);
    void planJourney(dirIndex, stopHit.stop, walkGeo);
  };

  const direction = directions[dirSel];
  const ride =
    stopHit && direction
      ? alight
        ? rideLineBetween(direction.line, stopHit.stop, alight.stop)
        : rideLineFrom(direction.line, stopHit.stop)
      : [];
  const mapCameras = (cams?.cameras ?? [])
    .filter(c => typeof c.lat === 'number' && typeof c.lng === 'number')
    .map(c => ({
      id: c.id,
      name: c.name,
      lat: c.lat as number,
      lng: c.lng as number,
      alongKm: c.alongRouteM / 1000,
    }));

  return (
    <div>
      <h2 className="font-display text-2xl font-medium">{heading}</h2>
      <p className="text-sm text-white/50 mt-1.5 max-w-3xl leading-relaxed">{intro}</p>

      <div className="mt-5 flex flex-wrap items-end gap-3">
        <PlaceField
          label="Starting address"
          placeholder="Start — a street address, place or landmark"
          onPick={setFrom}
        />
        <PlaceField
          label="Destination (optional)"
          placeholder="Going to — an address or place, and we'll name your get-off stop"
          onPick={place => {
            setDest(place);
            if (place) setDestStop(null);
          }}
        />
      </div>
      <div className="mt-3 flex flex-wrap items-end gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <label
            htmlFor="planner-dest-stop"
            className="block text-xs font-semibold uppercase tracking-wider text-white/40 mb-1.5"
          >
            Or get off at a specific stop
          </label>
          <select
            id="planner-dest-stop"
            value={destStop?.id ?? ''}
            onChange={e => {
              const s = allStops.find(x => x.id === e.target.value) ?? null;
              setDestStop(s);
              if (s) setDest(null);
            }}
            className="w-full appearance-none rounded-xl border border-white/10 bg-white/[0.03] pl-4 pr-10 py-3 text-sm text-white focus:outline-none focus:border-[#D4AF37]/60 focus:ring-1 focus:ring-[#D4AF37]/40"
          >
            <option value="" className="bg-[#0a0e18]">
              Choose a stop on this route…
            </option>
            {allStops.map(s => (
              <option key={s.id} value={s.id} className="bg-[#0a0e18]">
                {s.name}
              </option>
            ))}
          </select>
          <ChevronDown className="w-4 h-4 absolute right-3.5 top-[38px] text-white/35 pointer-events-none" />
        </div>
        <button
          type="button"
          onClick={run}
          disabled={busy}
          className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-b from-[#e8c55a] to-[#D4AF37] text-black text-sm font-bold hover:brightness-110 transition disabled:opacity-60"
        >
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Route className="w-4 h-4" />}
          {busy ? 'Planning your trip…' : hasDestination ? 'Plan my trip' : 'Find my stop'}
        </button>
      </div>

      {error && (
        <p className="mt-4 rounded-xl border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-200" role="alert">
          {error}
        </p>
      )}

      {stopHit && (
        <div className="mt-6">
          <p className="text-base text-white/85" role="status">
            Your nearest {routeLabel} stop is{' '}
            <strong className="text-white">{stopHit.stop.name}</strong>
            <span className="text-white/50">
              {' '}— {fmtDistance(stopHit.distanceM)} from {from?.label} in a straight line.
            </span>
          </p>

          {serving.length > 1 && (
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-white/40">
                Then ride toward
              </span>
              {serving.map(i => (
                <button
                  key={directions[i].dir}
                  type="button"
                  onClick={() => pickDirection(i)}
                  aria-pressed={i === dirSel}
                  className={`rounded-lg px-3.5 py-2 text-sm transition ${
                    i === dirSel
                      ? 'bg-[#D4AF37] text-black font-bold'
                      : 'border border-white/15 text-white/75 hover:text-white hover:border-white/35'
                  }`}
                >
                  {directions[i].headsign}
                </button>
              ))}
            </div>
          )}
          {serving.length === 1 && direction && (
            <p className="mt-3 text-sm text-white/55">
              From there, {routeLabel} runs toward {direction.headsign}.
            </p>
          )}

          {alight && direction && (
            <div className="mt-4 rounded-xl border border-[#D4AF37]/25 bg-[#D4AF37]/[0.06] px-4 py-3.5 max-w-3xl">
              <p className="text-sm text-white/85 leading-relaxed" role="status">
                <Flag className="w-4 h-4 inline-block mr-1.5 -mt-0.5 text-[#D4AF37]" />
                Get off at <strong className="text-white">{alight.stop.name}</strong>
                <span className="text-white/55">
                  {' '}— {alight.stopsRidden} stop{alight.stopsRidden === 1 ? '' : 's'} from{' '}
                  {stopHit.stop.name}, toward {direction.headsign}.
                  {destStop
                    ? ' That\u2019s the stop you picked, so there\u2019s no final walk.'
                    : dest
                      ? ` It\u2019s ${fmtDistance(alight.distanceM)} from ${dest.label} in a straight line — the last leg is below.`
                      : ''}
                </span>
              </p>
            </div>
          )}

          {walk ? (
            <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,380px)_1fr]">
              <div>
                <h3 className="flex items-center gap-2 text-sm font-semibold text-white/85">
                  <Footprints className="w-4 h-4 text-[#D4AF37]" />
                  Walk {fmtDistance(walk.distanceM)} · about {fmtDuration(walk.durationS)}
                </h3>
                <ol className="mt-3 space-y-2.5">
                  {walk.steps.map((s, i) => (
                    <li key={i} className="flex gap-3 text-sm">
                      <span className="font-mono text-xs text-white/30 w-6 text-right pt-0.5 shrink-0">
                        {i + 1}
                      </span>
                      <span className="text-white/70 leading-relaxed flex-1">{s.instruction}</span>
                      {s.distance > 0 && (
                        <span className="text-xs text-white/35 shrink-0 pt-0.5">
                          {fmtDistance(s.distance)}
                        </span>
                      )}
                    </li>
                  ))}
                </ol>
              </div>
              <StopJourneyMap
                walk={walk.geometry}
                ride={ride}
                rideColor={routeColor}
                cameras={mapCameras}
                start={{ lat: from!.lat, lng: from!.lng, label: from!.label }}
                stop={{ lat: stopHit.stop.lat, lng: stopHit.stop.lng, label: stopHit.stop.name }}
                finalWalk={journeyFinal ?? undefined}
                alight={
                  alight
                    ? { lat: alight.stop.lat, lng: alight.stop.lng, label: alight.stop.name }
                    : undefined
                }
                end={
                  dest && !destStop
                    ? { lat: dest.lat, lng: dest.lng, label: dest.label }
                    : undefined
                }
              />
            </div>
          ) : walkFailed ? (
            <div className="mt-4">
              <p className="rounded-xl border border-amber-300/25 bg-amber-300/[0.07] px-4 py-3 text-sm text-amber-100/85">
                Walking directions couldn&apos;t be loaded just now, so no step-by-step is
                shown — {stopHit.stop.name} is still your nearest stop, {fmtDistance(stopHit.distanceM)}{' '}
                away in a straight line. The map and the cameras below are measured along that
                straight line and the route from the stop.
              </p>
              {journeyWalk && (
                <div className="mt-4">
                  <StopJourneyMap
                    walk={journeyWalk}
                    ride={ride}
                    rideColor={routeColor}
                    cameras={mapCameras}
                    start={{ lat: from!.lat, lng: from!.lng, label: from!.label }}
                    stop={{ lat: stopHit.stop.lat, lng: stopHit.stop.lng, label: stopHit.stop.name }}
                    finalWalk={journeyFinal ?? undefined}
                    alight={
                      alight
                        ? { lat: alight.stop.lat, lng: alight.stop.lng, label: alight.stop.name }
                        : undefined
                    }
                    end={
                      dest && !destStop
                        ? { lat: dest.lat, lng: dest.lng, label: dest.label }
                        : undefined
                    }
                  />
                </div>
              )}
            </div>
          ) : null}

          {alight && dest && !destStop && finalWalk && (
            <div className="mt-6 max-w-[420px]">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-white/85">
                <Footprints className="w-4 h-4 text-[#D4AF37]" />
                Final walk {fmtDistance(finalWalk.distanceM)} · about{' '}
                {fmtDuration(finalWalk.durationS)}
              </h3>
              <p className="mt-1 text-xs text-white/40">
                From {alight.stop.name} to {dest.label}.
              </p>
              <ol className="mt-3 space-y-2.5">
                {finalWalk.steps.map((s, i) => (
                  <li key={i} className="flex gap-3 text-sm">
                    <span className="font-mono text-xs text-white/30 w-6 text-right pt-0.5 shrink-0">
                      {i + 1}
                    </span>
                    <span className="text-white/70 leading-relaxed flex-1">{s.instruction}</span>
                    {s.distance > 0 && (
                      <span className="text-xs text-white/35 shrink-0 pt-0.5">
                        {fmtDistance(s.distance)}
                      </span>
                    )}
                  </li>
                ))}
              </ol>
            </div>
          )}
          {alight && dest && !destStop && finalWalkFailed && (
            <p className="mt-6 rounded-xl border border-amber-300/25 bg-amber-300/[0.07] px-4 py-3 text-sm text-amber-100/85 max-w-3xl">
              The final walking directions couldn&apos;t be loaded just now, so there&apos;s
              no step-by-step for the last leg — {alight.stop.name} is still your get-off
              stop, {fmtDistance(alight.distanceM)} from {dest.label} in a straight line.
              The map and the cameras below are measured along that straight line.
            </p>
          )}

          <div className="mt-6">
            {camsBusy && (
              <p className="text-sm text-white/50 flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-[#D4AF37]" />
                Looking for live cameras along the way…
              </p>
            )}
            {camError && (
              <p className="text-sm text-white/50">
                The live-camera layer couldn&apos;t be loaded for this trip — the directions
                above are unaffected.
              </p>
            )}
            {cams && direction && (
              <>
                <p className="text-sm text-white/60" role="status">
                  <Navigation className="w-4 h-4 inline-block mr-1.5 -mt-0.5 text-[#D4AF37]" />
                  {cams.total === 0 ? (
                    <>
                      No live cameras sit within {(cams.corridorM / 1000).toFixed(1)} km of
                      this trip yet — the walk to {stopHit.stop.name} and the ride{' '}
                      {alight ? `to ${alight.stop.name}` : `toward ${direction.headsign}`}
                      {alight && dest && !destStop ? ' and the final walk' : ''} are
                      camera-free for now.
                    </>
                  ) : (
                    <>
                      <strong className="text-white/85">{cams.total}</strong> live camera
                      {cams.total === 1 ? '' : 's'} within {(cams.corridorM / 1000).toFixed(1)} km
                      of your walk and the ride{' '}
                      {alight ? `to ${alight.stop.name}` : `toward ${direction.headsign}`}
                      {alight && dest && !destStop ? ' and your final walk' : ''}
                      {cams.shown < cams.total
                        ? ` — showing the first ${cams.shown} in trip order`
                        : ''}
                      .
                    </>
                  )}
                </p>
                {cams.cameras.length > 0 && (
                  <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {cams.cameras.map(cam => (
                      <CameraFeedCard
                        key={cam.id}
                        cam={cam}
                        onOpen={setActive}
                        caption={fmtAlong(cam.alongRouteM)}
                      />
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      <p className="mt-4 text-[11px] text-white/30 leading-relaxed">
        Place search © OpenStreetMap contributors; walking directions are the same routing
        service the live map uses. Stops and the route line are {agencyName}&apos;s published
        GTFS. Your addresses are only used to find your stops and draw the route —
        WorldEye doesn&apos;t save them. Cameras are the public feeds in the WorldEye index — a
        camera shows here only when it has a feed the preview can actually play.
      </p>

      {active && <LazyCameraViewer camera={active} onClose={() => setActive(null)} />}
    </div>
  );
}
