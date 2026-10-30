'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { Loader2, MapPin, Navigation, Route as RouteIcon } from 'lucide-react';
import SkiCameraGrid from '@/components/SkiCameraGrid';
import { cameraFeedTier, type CountryCamera } from '@/lib/country-cameras';
import type { SkiResort } from '@/lib/ski-resorts';

/* The result map (MapLibre) loads only when a visitor actually plans a
   route — a resort page view that never runs the tool pays nothing. */
const SkiRouteMap = dynamic(() => import('@/components/SkiRouteMap'), { ssr: false });

/**
 * "Cameras on your route" — the drive-up tool on every resort page.
 *
 * Start address and destination are resolved with the site's own
 * geosearch (Photon + Nominatim, the globe route planner's index), the
 * drive is planned by /api/directions (Valhalla with an OSRM fallback —
 * keyless OSM services, no account needed), and the cameras come from
 * /api/ski/route-cameras: every catalogue camera within the corridor of
 * the chosen route, in the order the driver meets them.
 */

interface GeoResult {
  name: string;
  context: string;
  lat: number;
  lng: number;
}

interface Place {
  label: string;
  lat: number;
  lng: number;
}

interface RouteCameraRecord extends CountryCamera {
  alongKm: number;
  offKm: number;
  /** Set by /api/ski/route-cameras with the canonical name rule. */
  snowStake?: boolean;
}

/* ---- P7: stops (Overpass) + route weather (Open-Meteo) ---- */

type PoiCategory = 'fuel' | 'ev' | 'food' | 'lodging' | 'parking';

interface RoutePoi {
  id: string;
  category: PoiCategory;
  name: string;
  lat: number;
  lng: number;
  alongKm: number;
  offKm: number;
}

const POI_CATEGORY_LABELS: Record<PoiCategory, string> = {
  fuel: 'Fuel',
  ev: 'EV charging',
  food: 'Food',
  lodging: 'Lodging',
  parking: 'Parking',
};

interface RouteWeatherPoint {
  label: string;
  tempC: number | null;
  condition: string | null;
  windKmh: number | null;
  snowTodayCm: number | null;
}

/** WMO weather-code → plain words (the codes Open-Meteo returns). */
function wmoCondition(code: number | undefined): string | null {
  if (code === undefined || code === null) return null;
  if (code === 0) return 'Clear sky';
  if (code === 1) return 'Mainly clear';
  if (code === 2) return 'Partly cloudy';
  if (code === 3) return 'Overcast';
  if (code === 45 || code === 48) return 'Fog';
  if (code >= 51 && code <= 57) return 'Drizzle';
  if (code === 61 || code === 80) return 'Rain';
  if (code === 63 || code === 81) return 'Rain, heavier';
  if (code === 65 || code === 82) return 'Heavy rain';
  if (code === 66 || code === 67) return 'Freezing rain';
  if (code === 71 || code === 85) return 'Snowfall';
  if (code === 73) return 'Snowfall, moderate';
  if (code === 75 || code === 86) return 'Heavy snowfall';
  if (code === 77) return 'Snow grains';
  if (code >= 95) return 'Thunderstorm';
  return null;
}

async function fetchRouteWeather(
  points: Array<{ label: string; lat: number; lng: number }>,
): Promise<RouteWeatherPoint[] | null> {
  try {
    const out = await Promise.all(
      points.map(async (p) => {
        const qs = new URLSearchParams({
          latitude: String(p.lat),
          longitude: String(p.lng),
          current: 'temperature_2m,weather_code,wind_speed_10m',
          daily: 'snowfall_sum',
          forecast_days: '1',
          timezone: 'auto',
        });
        const res = await fetch(`https://api.open-meteo.com/v1/forecast?${qs.toString()}`);
        if (!res.ok) throw new Error(`Open-Meteo HTTP ${res.status}`);
        const j = (await res.json()) as {
          current?: { temperature_2m?: number; weather_code?: number; wind_speed_10m?: number };
          daily?: { snowfall_sum?: number[] };
        };
        return {
          label: p.label,
          tempC: typeof j.current?.temperature_2m === 'number' ? j.current.temperature_2m : null,
          condition: wmoCondition(j.current?.weather_code),
          windKmh: typeof j.current?.wind_speed_10m === 'number' ? j.current.wind_speed_10m : null,
          snowTodayCm:
            typeof j.daily?.snowfall_sum?.[0] === 'number' ? j.daily.snowfall_sum[0] : null,
        } as RouteWeatherPoint;
      }),
    );
    return out;
  } catch {
    return null;
  }
}

/* Mirrors RESORT_RADIUS_KM in lib/ski-resorts: cameras this close to
   the destination are "at the resort", not road cameras. Local copy —
   importing the lib would pull the server chunk loader into this
   client bundle. */
const DESTINATION_RADIUS_KM = 10;

function distanceKm(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const dLat = ((bLat - aLat) * Math.PI) / 180;
  const dLng = ((bLng - aLng) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((aLat * Math.PI) / 180) * Math.cos((bLat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(s));
}

type ToolState =
  | { kind: 'idle' }
  | { kind: 'working'; step: string }
  | {
      kind: 'done';
      distanceKm: number;
      durationMin: number;
      total: number;
      cameras: RouteCameraRecord[];
      /** The planned drive as [lng, lat] pairs — drawn on the result map. */
      route: [number, number][];
      /** P7 stops along the route (OpenStreetMap/Overpass); null when
       *  the stops service could not be reached. */
      pois: RoutePoi[] | null;
      /** P7 weather at start / midway / destination (Open-Meteo);
       *  null when the weather service could not be reached. */
      weather: RouteWeatherPoint[] | null;
      /** When the conditions above were fetched (display, local time). */
      fetchedAt: string;
    }
  | { kind: 'no-route'; message: string }
  | { kind: 'error'; message: string };

function PlaceInput({
  id,
  label,
  value,
  onText,
  onPick,
  bias,
  placeholder,
}: {
  id: string;
  label: string;
  value: string;
  onText: (text: string) => void;
  onPick: (place: Place) => void;
  bias: { lat: number; lng: number };
  placeholder: string;
}) {
  const [results, setResults] = useState<GeoResult[]>([]);
  const [open, setOpen] = useState(false);
  const [searching, setSearching] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const q = value.trim();
    if (q.length < 3) {
      setResults([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    const t = setTimeout(() => {
      const qs = new URLSearchParams({ q, lat: String(bias.lat), lng: String(bias.lng) });
      fetch(`/api/geosearch?${qs.toString()}`)
        .then(r => r.json())
        .then((j: { results?: GeoResult[] }) => {
          setResults(j.results ?? []);
          setOpen(true);
        })
        .catch(() => setResults([]))
        .finally(() => setSearching(false));
    }, 350);
    return () => clearTimeout(t);
  }, [value, bias]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  return (
    <div ref={boxRef} className="relative flex-1 min-w-[220px]">
      <label htmlFor={id} className="block text-xs font-semibold uppercase tracking-wider text-white/40 mb-1.5">
        {label}
      </label>
      <div className="relative">
        <MapPin className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-white/35 pointer-events-none" />
        <input
          id={id}
          type="text"
          value={value}
          onChange={e => onText(e.target.value)}
          placeholder={placeholder}
          autoComplete="off"
          className="w-full rounded-xl border border-white/10 bg-white/[0.03] pl-9 pr-9 py-3 text-sm placeholder:text-white/30 focus:outline-none focus:border-[#D4AF37]/60 focus:ring-1 focus:ring-[#D4AF37]/40"
        />
        {searching && <Loader2 className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-white/40" />}
      </div>
      {open && results.length > 0 && (
        <ul className="absolute z-20 mt-1.5 w-full rounded-xl border border-white/10 bg-[#0b0f1a] shadow-xl overflow-hidden">
          {results.map((r, i) => (
            <li key={i}>
              <button
                type="button"
                className="w-full text-left px-3.5 py-2.5 hover:bg-white/5 transition"
                onClick={() => {
                  onPick({ label: r.context ? `${r.name}, ${r.context}` : r.name, lat: r.lat, lng: r.lng });
                  setOpen(false);
                }}
              >
                <span className="block text-sm font-medium text-white/85">{r.name}</span>
                {r.context && <span className="block text-xs text-white/40">{r.context}</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/**
 * P7 route conditions: only readings a real signal backs. Weather is
 * Open-Meteo at three points on the route; camera coverage is counted
 * from the live index result itself. Traffic flow has no feed behind
 * it anywhere in the product, so the panel says exactly that instead
 * of inventing a score.
 */
function RouteConditions({
  weather,
  cameras,
  fetchedAt,
}: {
  weather: RouteWeatherPoint[] | null;
  cameras: RouteCameraRecord[];
  fetchedAt: string;
}) {
  const playable = cameras.filter((c) => cameraFeedTier(c) === 0).length;
  return (
    <div className="mt-6 rounded-xl border border-white/10 bg-white/[0.02] p-4">
      <h4 className="text-sm font-semibold text-white/85">Route conditions</h4>
      {weather ? (
        <ul className="mt-3 space-y-1.5 text-sm text-white/65">
          {weather.map((w) => (
            <li key={w.label} className="flex flex-wrap gap-x-2">
              <span className="font-medium text-white/85">{w.label}:</span>
              {w.condition ?? 'Conditions unavailable'}
              {w.tempC !== null && <> · {Math.round(w.tempC)} °C</>}
              {w.windKmh !== null && <> · wind {Math.round(w.windKmh)} km/h</>}
              {w.snowTodayCm !== null && w.snowTodayCm > 0 && (
                <> · about {w.snowTodayCm.toFixed(0)} cm of snow forecast today</>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-sm text-white/55">
          Live weather for this route is unavailable right now — the cameras below are the live
          picture.
        </p>
      )}
      {cameras.length > 0 && (
        <p className="mt-3 text-sm text-white/65">
          Cameras: {playable} of {cameras.length} cameras on this route stream directly in the
          browser; the rest open as embedded or external feeds.
        </p>
      )}
      <p className="mt-2 text-sm text-white/55">
        Traffic flow: insufficient data — WorldEye has no live traffic feed for this route, so
        there is no honest traffic reading to show. The road cameras below are the live picture.
      </p>
      <p className="mt-3 text-[11px] leading-relaxed text-white/30">
        Weather: Open-Meteo, fetched at {fetchedAt}. Camera playability counted from the live
        WorldEye index for this route just now.
      </p>
    </div>
  );
}

/** P7 stops along the route, with per-category toggles. */
function RouteStops({ pois }: { pois: RoutePoi[] | null }) {
  const [active, setActive] = useState<Set<PoiCategory>>(
    () => new Set(Object.keys(POI_CATEGORY_LABELS) as PoiCategory[]),
  );
  if (pois === null) {
    return (
      <div className="mt-6">
        <h4 className="text-sm font-semibold text-white/85">Stops along your route</h4>
        <p className="mt-1 text-sm text-white/55">
          Stops data (OpenStreetMap) could not be reached just now — try again in a moment.
        </p>
      </div>
    );
  }
  const counts = new Map<PoiCategory, number>();
  for (const p of pois) counts.set(p.category, (counts.get(p.category) ?? 0) + 1);
  const shown = pois.filter((p) => active.has(p.category));
  const toggle = (cat: PoiCategory) =>
    setActive((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  return (
    <div className="mt-6">
      <h4 className="text-sm font-semibold text-white/85">
        Stops along your route <span className="font-normal text-white/40">({pois.length})</span>
      </h4>
      <div className="mt-2.5 flex flex-wrap gap-1.5" role="group" aria-label="Filter stops by type">
        {(Object.keys(POI_CATEGORY_LABELS) as PoiCategory[]).map((cat) => {
          const on = active.has(cat);
          return (
            <button
              key={cat}
              type="button"
              aria-pressed={on}
              onClick={() => toggle(cat)}
              className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                on
                  ? 'border-[#D4AF37]/70 bg-[#D4AF37]/15 text-white'
                  : 'border-white/10 bg-white/[0.03] text-white/60 hover:border-white/25 hover:text-white'
              }`}
            >
              {POI_CATEGORY_LABELS[cat]}{' '}
              <span className={on ? 'text-[#D4AF37]' : 'text-white/35'}>{counts.get(cat) ?? 0}</span>
            </button>
          );
        })}
      </div>
      {pois.length === 0 ? (
        <p className="mt-3 text-sm text-white/55">
          No stops are mapped within 1.5 km of this route in OpenStreetMap.
        </p>
      ) : shown.length === 0 ? (
        <p className="mt-3 text-sm text-white/55">Turn a stop type back on to see its stops.</p>
      ) : (
        <>
          <ul className="mt-3 space-y-1.5 text-sm text-white/65">
            {shown.slice(0, 40).map((p) => (
              <li key={p.id} className="flex flex-wrap gap-x-2">
                <span className="font-medium text-white/85">{p.name}</span>
                <span className="text-white/40">
                  {POI_CATEGORY_LABELS[p.category]} · {p.alongKm.toFixed(1)} km into your drive ·{' '}
                  {p.offKm.toFixed(1)} km off the route
                </span>
              </li>
            ))}
          </ul>
          {shown.length > 40 && (
            <p className="mt-2 text-xs text-white/40">
              …and {shown.length - 40} more stops further along the same filters.
            </p>
          )}
        </>
      )}
      <p className="mt-3 text-[11px] leading-relaxed text-white/30">
        Stops: OpenStreetMap contributors, via the Overpass API — within 1.5 km of the route line.
        A stop being mapped does not promise it is open; check hours before you count on it.
      </p>
    </div>
  );
}

export default function SkiRouteTool({ resort }: { resort: SkiResort }) {
  const resortPlace: Place = {
    label: `${resort.name}, ${resort.town}, ${resort.region}`,
    lat: resort.lat,
    lng: resort.lng,
  };
  const [startText, setStartText] = useState('');
  const [start, setStart] = useState<Place | null>(null);
  const [destText, setDestText] = useState(resortPlace.label);
  const [dest, setDest] = useState<Place>(resortPlace);
  const [state, setState] = useState<ToolState>({ kind: 'idle' });

  const run = useCallback(async () => {
    if (!start) {
      setState({ kind: 'error', message: 'Pick your starting point from the suggestions so we know exactly where the drive begins.' });
      return;
    }
    try {
      setState({ kind: 'working', step: 'Planning your drive…' });
      const qs = new URLSearchParams({
        from: `${start.lat},${start.lng}`,
        to: `${dest.lat},${dest.lng}`,
        mode: 'auto',
      });
      const dirRes = await fetch(`/api/directions?${qs.toString()}`);
      if (!dirRes.ok) {
        setState({
          kind: 'no-route',
          message:
            'No driving route could be planned between those two points. Check the addresses are both reachable by road and try again.',
        });
        return;
      }
      const dir = (await dirRes.json()) as {
        distance?: number;
        duration?: number;
        geometry?: { coordinates?: [number, number][] };
      };
      const coords = dir.geometry?.coordinates ?? [];
      if (coords.length < 2) {
        setState({ kind: 'no-route', message: 'The route came back without a road path — try a more specific address.' });
        return;
      }

      setState({ kind: 'working', step: 'Finding the cameras along it…' });
      const camRes = await fetch('/api/ski/route-cameras', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ countries: [resort.countrySlug], route: coords }),
      });
      if (!camRes.ok) throw new Error(`HTTP ${camRes.status}`);
      const camJson = (await camRes.json()) as { total: number; cameras: RouteCameraRecord[] };

      /* P7: stops + weather ride along with the result. Each is
         best-effort — a failed stops or weather service degrades to
         an honest "unavailable" note, never a failed route. */
      setState({ kind: 'working', step: 'Checking stops and weather along it…' });
      const midCoord = coords[Math.floor(coords.length / 2)];
      const [pois, weather] = await Promise.all([
        fetch('/api/ski/route-pois', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ route: coords }),
        })
          .then(async (r) => {
            if (!r.ok) return null;
            const j = (await r.json()) as { pois?: RoutePoi[] };
            return j.pois ?? null;
          })
          .catch(() => null),
        fetchRouteWeather([
          { label: 'Start', lat: start.lat, lng: start.lng },
          { label: 'Midway', lat: midCoord[1], lng: midCoord[0] },
          { label: dest.label.split(',')[0] ?? 'Destination', lat: dest.lat, lng: dest.lng },
        ]),
      ]);

      setState({
        kind: 'done',
        distanceKm: (dir.distance ?? 0) / 1000,
        durationMin: Math.round((dir.duration ?? 0) / 60),
        total: camJson.total,
        cameras: camJson.cameras,
        route: coords,
        pois,
        weather,
        fetchedAt: new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }),
      });
    } catch {
      setState({ kind: 'error', message: 'Something went wrong planning that route. Try again in a moment.' });
    }
  }, [start, dest, resort.countrySlug]);

  /* The grid's per-camera captions ("12.4 km into your drive"), as a
     plain record keyed by camera id — SkiCameraGrid takes data, not a
     callback, so server-rendered grids can use it too. */
  const routeCaptions: Record<string, string> = {};
  if (state.kind === 'done')
    for (const c of state.cameras) routeCaptions[c.id] = `${c.alongKm.toFixed(1)} km into your drive`;

  /* The result map's inputs, memoised on the result itself: rebuilding
     them on every render (each keystroke in the inputs above) would
     tear the map down and rebuild it mid-edit. */
  const mapCameras = useMemo(
    () =>
      state.kind === 'done'
        ? state.cameras
            .filter(c => typeof c.lat === 'number' && typeof c.lng === 'number')
            .map(c => ({
              id: c.id,
              name: c.name,
              lat: c.lat as number,
              lng: c.lng as number,
              alongKm: c.alongKm,
            }))
        : [],
    [state],
  );
  const mapRoute = useMemo(
    () => (state.kind === 'done' ? state.route : []),
    [state],
  );

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
      <h3 className="flex items-center gap-2 font-semibold text-white/90">
        <RouteIcon className="w-4.5 h-4.5 text-[#D4AF37]" /> Cameras on your route to {resort.name}
      </h3>
      <p className="mt-2 text-sm text-white/55 leading-relaxed">
        Enter where you&apos;re driving from and we&apos;ll line up every live camera along the way — the
        passes, the canyon mouths and the valley roads — in the order you&apos;ll pass them. No account
        needed.
      </p>

      <div className="mt-5 flex flex-wrap items-end gap-3">
        <PlaceInput
          id="ski-route-start"
          label="Starting address"
          value={startText}
          onText={t => {
            setStartText(t);
            setStart(null);
          }}
          onPick={p => {
            setStart(p);
            setStartText(p.label);
          }}
          bias={resort}
          placeholder="e.g. Denver, CO — or your street address"
        />
        <PlaceInput
          id="ski-route-dest"
          label="Destination"
          value={destText}
          onText={t => {
            setDestText(t);
          }}
          onPick={p => {
            setDest(p);
            setDestText(p.label);
          }}
          bias={resort}
          placeholder={resort.name}
        />
        <button
          type="button"
          onClick={run}
          disabled={state.kind === 'working'}
          className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-b from-[#e8c55a] to-[#D4AF37] text-black text-sm font-bold hover:brightness-110 transition disabled:opacity-60"
        >
          {state.kind === 'working' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Navigation className="w-4 h-4" />}
          Show route cameras
        </button>
      </div>

      {state.kind === 'working' && (
        <p className="mt-4 flex items-center gap-2 text-sm text-white/60" role="status">
          <Loader2 className="w-4 h-4 animate-spin text-[#D4AF37]" /> {state.step}
        </p>
      )}
      {state.kind === 'error' && <p className="mt-4 text-sm text-amber-200/90" role="alert">{state.message}</p>}
      {state.kind === 'no-route' && <p className="mt-4 text-sm text-amber-200/90" role="alert">{state.message}</p>}

      {state.kind === 'done' && (
        <div className="mt-6">
          <p className="text-sm text-white/70" role="status">
            {state.distanceKm > 0 && (
              <>
                <strong className="text-white">{state.distanceKm.toFixed(0)} km</strong>
                {state.durationMin > 0 && <> · about {Math.floor(state.durationMin / 60) > 0 ? `${Math.floor(state.durationMin / 60)} h ` : ''}{state.durationMin % 60} min of driving</>}
                {' · '}
              </>
            )}
            {state.total === 0
              ? 'no cameras in the live index sit along this route.'
              : `${state.total} camera${state.total === 1 ? '' : 's'} along this route, in driving order:`}
          </p>
          <RouteConditions weather={state.weather} cameras={state.cameras} fetchedAt={state.fetchedAt} />
          <RouteStops pois={state.pois} />
          {state.total > 0 && (
            <>
              <div className="mt-4">
                <SkiRouteMap
                  route={mapRoute}
                  cameras={mapCameras}
                  start={start ?? resortPlace}
                  destination={dest}
                />
              </div>
              {(() => {
                /* Three labelled groups, in the order a driver thinks
                   about them: the snowfall answer (stakes), the cameras
                   waiting at the destination, then the road itself. */
                const stakes = state.cameras.filter(c => c.snowStake);
                const rest = state.cameras.filter(c => !c.snowStake);
                const atDestination = rest.filter(
                  c =>
                    typeof c.lat === 'number' &&
                    typeof c.lng === 'number' &&
                    distanceKm(c.lat, c.lng, dest.lat, dest.lng) <= DESTINATION_RADIUS_KM,
                );
                const onRoad = rest.filter(c => !atDestination.includes(c));
                const sections: Array<{
                  key: string;
                  title: string;
                  note?: string;
                  cameras: RouteCameraRecord[];
                }> = [
                  {
                    key: 'stakes',
                    title: 'Snow stakes on your route',
                    note: 'Open a snow stake camera to set a snowfall alert for it — the same camera alerts as everywhere on WorldEye.',
                    cameras: stakes,
                  },
                  {
                    key: 'destination',
                    title: 'Cameras at your destination',
                    cameras: atDestination,
                  },
                  {
                    key: 'road',
                    title: 'Road cameras along your route',
                    cameras: onRoad,
                  },
                ];
                return sections
                  .filter(s => s.cameras.length > 0)
                  .map(s => (
                    <div key={s.key} className="mt-6">
                      <h4 className="text-sm font-semibold text-white/85">
                        {s.title}{' '}
                        <span className="font-normal text-white/40">
                          ({s.cameras.length})
                        </span>
                      </h4>
                      {s.note && (
                        <p className="mt-1 text-xs leading-relaxed text-white/45">{s.note}</p>
                      )}
                      <div className="mt-3">
                        <SkiCameraGrid cameras={s.cameras} initial={12} captions={routeCaptions} />
                      </div>
                    </div>
                  ));
              })()}
            </>
          )}
          <p className="mt-4 text-[11px] text-white/30 leading-relaxed">
            Route planned with OpenStreetMap data (Valhalla/OSRM — the same routing the WorldEye globe
            uses). Cameras are the live WorldEye index for {resort.country}, within 2.5 km of the route
            line; a camera just off the road at an interchange still counts, because you&apos;ll see what
            it sees as you pass.
          </p>
        </div>
      )}
    </div>
  );
}
