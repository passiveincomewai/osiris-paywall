'use client';

import { useEffect, useRef, useState } from 'react';
import { Loader2, MapPin, Navigation, Route } from 'lucide-react';
import { trackAnalyticsEvent } from '@/components/AnalyticsTracker';
import { CameraFeedCard, LazyCameraViewer } from '@/components/camera-feed-card';
import type { CountryCamera } from '@/lib/country-cameras';

/**
 * Route cameras for the public directory pages: a starting address
 * and a destination go in, the cameras the drive passes come out —
 * as live feed cards in the order the driver meets them.
 *
 * The pieces are the site's own, reused rather than rebuilt:
 *  - place search is /api/geosearch (the globe directions panel's
 *    geocoder door — server-side Nominatim, © OpenStreetMap
 *    contributors, attributed below);
 *  - routing is /api/directions (the same Valhalla/OSRM service the
 *    globe's route planner plots);
 *  - the corridor selection is lib/route-cameras (1.5 km corridor,
 *    along-route order, playable feeds only), run server-side by
 *    /api/cctv/route-cameras over the generated catalogue, because a
 *    directory page doesn't carry the catalogue in the browser.
 *
 * Unlike the globe's in-panel strip (a Pro feature of the map), this
 * finder is part of the public directory pages and is free to use —
 * the feeds themselves are the free public ones every card shows.
 */

export interface FinderPlace {
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
  initial,
  onPick,
}: {
  label: string;
  placeholder: string;
  initial?: FinderPlace | null;
  onPick: (place: FinderPlace | null) => void;
}) {
  const [text, setText] = useState(initial?.label ?? '');
  const [results, setResults] = useState<GeoHit[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const abort = useRef<AbortController | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (initial && text === '') {
      setText(initial.label);
      onPick(initial);
    }
    // Only the initial mount matters; later edits are the visitor's.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const search = (q: string) => {
    if (timer.current) clearTimeout(timer.current);
    if (q.trim().length < 2) {
      setResults([]);
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
        setOpen(true);
      } catch {
        if (!ctrl.signal.aborted) setResults([]);
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
                    const place = { label: r.name, lat: r.lat, lng: r.lng };
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
    </div>
  );
}

interface RouteCamHit extends CountryCamera {
  alongRouteM: number;
  distanceFromRouteM: number;
}

interface FinderResult {
  total: number;
  shown: number;
  corridorM: number;
  cameras: RouteCamHit[];
  distanceM: number;
  durationS: number;
}

function fmtAlong(m: number): string {
  if (m < 1000) return `${Math.round(m)} m along`;
  return `${(m / 1000).toFixed(1)} km along`;
}

function fmtDistance(m: number): string {
  if (m < 1000) return `${Math.round(m)} m`;
  return `${(m / 1000).toFixed(1)} km`;
}

function fmtDuration(s: number): string {
  const mins = Math.round(s / 60);
  if (mins < 60) return `${mins} min`;
  return `${Math.floor(mins / 60)} h ${mins % 60} min`;
}

export default function RouteCameraFinder({
  defaultDestination,
  heading = 'Cameras on your route',
  intro = 'Enter a starting address and a destination — every live camera within 1.5 km of the road, in the order you pass them.',
}: {
  defaultDestination?: FinderPlace | null;
  heading?: string;
  intro?: string;
}) {
  const [from, setFrom] = useState<FinderPlace | null>(null);
  const [to, setTo] = useState<FinderPlace | null>(defaultDestination ?? null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<FinderResult | null>(null);
  const [active, setActive] = useState<CountryCamera | null>(null);

  const run = async () => {
    if (!from || !to) {
      setError('Pick a starting place and a destination from the suggestions so the route is exact.');
      return;
    }
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const dirRes = await fetch(
        `/api/directions?from=${from.lat},${from.lng}&to=${to.lat},${to.lng}&mode=auto`,
      );
      const dir = await dirRes.json();
      if (!dirRes.ok || dir.error) throw new Error(dir.error || 'No route found between those places');
      const route = (dir.routes?.length ? dir.routes[0] : dir) as {
        distance: number;
        duration: number;
        geometry: { coordinates: [number, number][] };
      };
      const camRes = await fetch('/api/cctv/route-cameras', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ coordinates: route.geometry.coordinates }),
      });
      const cams = await camRes.json();
      if (!camRes.ok || cams.error) throw new Error(cams.error || 'The route cameras could not be loaded');
      trackAnalyticsEvent('route_cameras_search');
      setResult({
        total: cams.total,
        shown: cams.shown,
        corridorM: cams.corridorM,
        cameras: cams.cameras,
        distanceM: route.distance,
        durationS: route.duration,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong finding that route');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <h2 className="text-xl md:text-2xl font-bold">{heading}</h2>
      <p className="mt-2 text-sm text-white/55 leading-relaxed max-w-3xl">{intro}</p>

      <div className="mt-5 flex flex-wrap items-end gap-3">
        <PlaceField label="Starting address" placeholder="Start — a city, address or place" onPick={setFrom} />
        <PlaceField
          label="Destination"
          placeholder="Destination — a city, address or place"
          initial={defaultDestination}
          onPick={setTo}
        />
        <button
          type="button"
          onClick={run}
          disabled={busy}
          className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-b from-[#e8c55a] to-[#D4AF37] text-black text-sm font-bold hover:brightness-110 transition disabled:opacity-60"
        >
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Route className="w-4 h-4" />}
          {busy ? 'Finding cameras…' : 'Find cameras on this route'}
        </button>
      </div>

      {error && (
        <p className="mt-4 rounded-xl border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-200" role="alert">
          {error}
        </p>
      )}

      {result && (
        <div className="mt-6">
          <p className="text-sm text-white/60" role="status">
            <Navigation className="w-4 h-4 inline-block mr-1.5 -mt-0.5 text-[#D4AF37]" />
            {fmtDistance(result.distanceM)} drive · about {fmtDuration(result.durationS)} ·{' '}
            {result.total === 0 ? (
              <>no cameras with a playable feed sit within {(result.corridorM / 1000).toFixed(1)} km of this route yet.</>
            ) : (
              <>
                <strong className="text-white/85">{result.total}</strong> camera{result.total === 1 ? '' : 's'} with a live feed
                within {(result.corridorM / 1000).toFixed(1)} km of the road
                {result.shown < result.total ? ` — showing the first ${result.shown} in driving order` : ''}.
              </>
            )}
          </p>
          {result.cameras.length > 0 && (
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {result.cameras.map(cam => (
                <CameraFeedCard
                  key={cam.id}
                  cam={cam}
                  onOpen={setActive}
                  caption={fmtAlong(cam.alongRouteM)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      <p className="mt-4 text-[11px] text-white/30 leading-relaxed">
        Place search © OpenStreetMap contributors; routing is the same directions service the live
        map uses. Cameras are the public feeds in the WorldEye index — a camera shows here only
        when it has a feed the preview can actually play.
      </p>

      {active && <LazyCameraViewer camera={active} onClose={() => setActive(null)} />}
    </div>
  );
}
