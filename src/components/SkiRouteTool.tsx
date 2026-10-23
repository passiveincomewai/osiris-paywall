'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { Loader2, MapPin, Navigation, Route as RouteIcon } from 'lucide-react';
import SkiCameraGrid from '@/components/SkiCameraGrid';
import type { CountryCamera } from '@/lib/country-cameras';
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

      setState({
        kind: 'done',
        distanceKm: (dir.distance ?? 0) / 1000,
        durationMin: Math.round((dir.duration ?? 0) / 60),
        total: camJson.total,
        cameras: camJson.cameras,
        route: coords,
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
              <div className="mt-4">
                <SkiCameraGrid cameras={state.cameras} initial={12} captions={routeCaptions} />
              </div>
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
