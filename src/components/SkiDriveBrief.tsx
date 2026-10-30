'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Car, Loader2, Trash2 } from 'lucide-react';
import SkiCameraGrid from '@/components/SkiCameraGrid';
import SkiRoadConditions from '@/components/SkiRoadConditions';
import type { CountryCamera } from '@/lib/country-cameras';
import {
  loadSavedRoutes,
  removeSavedRoute,
  storeSavedRoutes,
  type SavedSkiRoute,
} from '@/lib/ski/saved-routes';
import {
  briefWeatherPoints,
  followedNearDestination,
  playableCameraCount,
  type BriefResort,
} from '@/lib/ski/drive-brief';

/**
 * The drive-up brief, composed in the browser: saved routes live in
 * this browser's localStorage (the route tool on any resort page
 * saves them there), so the brief is assembled client-side from the
 * same live signals the route tool uses — Open-Meteo weather at the
 * start / midway / destination, the route-corridor camera index, and
 * OpenStreetMap stops. Every section degrades on its own: a service
 * that cannot be reached shows an honest unavailable note for that
 * section only, and nothing is ever invented to fill the gap.
 */

type PoiCategory = 'fuel' | 'ev' | 'food' | 'lodging' | 'parking';

interface RoutePoi {
  id: string;
  category: PoiCategory;
  name: string;
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

interface RouteCameraRecord extends CountryCamera {
  alongKm: number;
  offKm: number;
}

interface WeatherPointResult {
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

interface BriefData {
  weather: WeatherPointResult[] | null;
  fetchedAt: string;
  cameras: RouteCameraRecord[] | null;
  pois: RoutePoi[] | null;
  /** Today's forecast snowfall (cm) per followed resort slug near the destination. */
  nearbySnow: Record<string, number | null>;
}

async function fetchPointWeather(
  points: Array<{ label: string; lat: number; lng: number }>,
): Promise<WeatherPointResult[] | null> {
  try {
    return await Promise.all(
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
        } as WeatherPointResult;
      }),
    );
  } catch {
    return null;
  }
}

async function fetchTodaySnowfallCm(lat: number, lng: number): Promise<number | null> {
  try {
    const qs = new URLSearchParams({
      latitude: String(lat),
      longitude: String(lng),
      daily: 'snowfall_sum',
      forecast_days: '1',
      timezone: 'auto',
    });
    const res = await fetch(`https://api.open-meteo.com/v1/forecast?${qs.toString()}`);
    if (!res.ok) return null;
    const j = (await res.json()) as { daily?: { snowfall_sum?: (number | null)[] } };
    const v = j.daily?.snowfall_sum?.[0];
    return typeof v === 'number' ? v : null;
  } catch {
    return null;
  }
}

async function composeBrief(
  route: SavedSkiRoute,
  followed: BriefResort[],
): Promise<BriefData> {
  const nearby = followedNearDestination(followed, route);
  const [weather, cameras, pois, nearbySnowEntries] = await Promise.all([
    fetchPointWeather(briefWeatherPoints(route)),
    fetch('/api/ski/route-cameras', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ countries: [route.countrySlug], route: route.route }),
    })
      .then(async (r) => {
        if (!r.ok) return null;
        const j = (await r.json()) as { cameras?: RouteCameraRecord[] };
        return j.cameras ?? null;
      })
      .catch(() => null),
    fetch('/api/ski/route-pois', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ route: route.route }),
    })
      .then(async (r) => {
        if (!r.ok) return null;
        const j = (await r.json()) as { pois?: RoutePoi[] };
        return j.pois ?? null;
      })
      .catch(() => null),
    Promise.all(
      nearby.map(
        async (r) => [r.slug, await fetchTodaySnowfallCm(r.lat, r.lng)] as const,
      ),
    ),
  ]);
  return {
    weather,
    fetchedAt: new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }),
    cameras,
    pois,
    nearbySnow: Object.fromEntries(nearbySnowEntries),
  };
}

function RouteBriefCard({
  route,
  followed,
  onRemove,
}: {
  route: SavedSkiRoute;
  followed: BriefResort[];
  onRemove: (id: string) => void;
}) {
  const [data, setData] = useState<BriefData | null>(null);

  useEffect(() => {
    let cancelled = false;
    composeBrief(route, followed).then((d) => {
      if (!cancelled) setData(d);
    });
    return () => {
      cancelled = true;
    };
    // followed is a stable server-passed list for the page's lifetime
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [route]);

  const nearby = followedNearDestination(followed, route);
  const captions: Record<string, string> = {};
  if (data?.cameras) {
    for (const c of data.cameras) captions[c.id] = `${c.alongKm.toFixed(1)} km into your drive`;
  }

  return (
    <section className="rounded-3xl border border-white/10 bg-white/[0.02] p-6 md:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">
            {route.start.label} → {route.dest.label}
          </h2>
          <p className="mt-1 text-sm text-white/55">
            {route.distanceKm > 0 && (
              <>
                {route.distanceKm.toFixed(0)} km
                {route.durationMin > 0 && (
                  <>
                    {' '}
                    · about {Math.floor(route.durationMin / 60) > 0
                      ? `${Math.floor(route.durationMin / 60)} h `
                      : ''}
                    {route.durationMin % 60} min of driving
                  </>
                )}{' '}
                ·{' '}
              </>
            )}
            saved {new Date(route.savedAt).toLocaleDateString()}
          </p>
        </div>
        <button
          type="button"
          onClick={() => onRemove(route.id)}
          className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 text-xs font-medium text-white/55 hover:border-white/25 hover:text-white transition"
        >
          <Trash2 className="w-3.5 h-3.5" /> Remove route
        </button>
      </div>

      {!data ? (
        <p className="mt-6 flex items-center gap-2 text-sm text-white/60" role="status">
          <Loader2 className="w-4 h-4 animate-spin text-[#D4AF37]" /> Putting this
          morning&apos;s brief together…
        </p>
      ) : (
        <div className="mt-6 space-y-8">
          {/* (1) Route weather */}
          <div>
            <h3 className="text-sm font-semibold text-white/85">Route weather</h3>
            {data.weather ? (
              <ul className="mt-2.5 space-y-1.5 text-sm text-white/65">
                {data.weather.map((w) => (
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
              <p className="mt-2.5 text-sm text-white/55">
                Route weather is unavailable right now — the cameras below are the live
                picture.
              </p>
            )}
            <p className="mt-2 text-[11px] leading-relaxed text-white/30">
              Weather: Open-Meteo (modelled, not measured), fetched at {data.fetchedAt}.
            </p>
          </div>

          {/* (2) Cameras along the route */}
          <div>
            <h3 className="text-sm font-semibold text-white/85">Cameras on this drive</h3>
            {data.cameras === null ? (
              <p className="mt-2.5 text-sm text-white/55">
                The camera index could not be reached just now — try again in a moment.
              </p>
            ) : data.cameras.length === 0 ? (
              <p className="mt-2.5 text-sm text-white/55">
                No cameras in the live index sit along this route.
              </p>
            ) : (
              <>
                <p className="mt-2.5 text-sm text-white/65">
                  {data.cameras.length} camera{data.cameras.length === 1 ? '' : 's'} along
                  this route — {playableCameraCount(data.cameras)} stream
                  {playableCameraCount(data.cameras) === 1 ? 's' : ''} directly in the
                  browser, the rest open as embedded or external feeds. First few, in
                  driving order:
                </p>
                <div className="mt-3">
                  <SkiCameraGrid cameras={data.cameras} initial={3} captions={captions} />
                </div>
                <p className="mt-3 text-sm">
                  <Link
                    href={`/ski-webcams/${route.resortSlug}#drive`}
                    className="font-semibold text-[#00E5FF] hover:underline"
                  >
                    See every camera on this route
                  </Link>
                </p>
              </>
            )}
          </div>

          {/* (3) Stops along the route */}
          <div>
            <h3 className="text-sm font-semibold text-white/85">Stops along your route</h3>
            {data.pois === null ? (
              <p className="mt-2.5 text-sm text-white/55">
                Stops unavailable right now — the stops service (OpenStreetMap) could not
                be reached for this route. The weather and cameras above are unaffected.
              </p>
            ) : data.pois.length === 0 ? (
              <p className="mt-2.5 text-sm text-white/55">
                No stops are mapped within 1.5 km of this route in OpenStreetMap.
              </p>
            ) : (
              <>
                <ul className="mt-2.5 space-y-1.5 text-sm text-white/65">
                  {data.pois.slice(0, 10).map((p) => (
                    <li key={p.id} className="flex flex-wrap gap-x-2">
                      <span className="font-medium text-white/85">{p.name}</span>
                      <span className="text-white/40">
                        {POI_CATEGORY_LABELS[p.category]} · {p.alongKm.toFixed(1)} km into
                        your drive · {p.offKm.toFixed(1)} km off the route
                      </span>
                    </li>
                  ))}
                </ul>
                {data.pois.length > 10 && (
                  <p className="mt-2 text-xs text-white/40">
                    …and {data.pois.length - 10} more stops along this route.
                  </p>
                )}
                <p className="mt-2 text-[11px] leading-relaxed text-white/30">
                  Stops: OpenStreetMap contributors, via the Overpass API. A stop being
                  mapped does not promise it is open; check hours before you count on it.
                </p>
              </>
            )}
          </div>

          {/* (4) Followed resorts near the destination — omitted when none */}
          {nearby.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-white/85">
                Resorts you follow near {route.dest.label.split(',')[0]}
              </h3>
              <ul className="mt-2.5 space-y-1.5 text-sm text-white/65">
                {nearby.map((r) => (
                  <li key={r.slug} className="flex flex-wrap gap-x-2">
                    <Link
                      href={`/ski-webcams/${r.slug}`}
                      className="font-medium text-white/85 hover:text-[#e8c55a] transition"
                    >
                      {r.name}
                    </Link>
                    <span className="text-white/40">
                      {data.nearbySnow[r.slug] != null && (data.nearbySnow[r.slug] as number) > 0
                        ? `· about ${(data.nearbySnow[r.slug] as number).toFixed(0)} cm of snow in today's forecast (modelled)`
                        : data.nearbySnow[r.slug] === 0
                          ? '· no snowfall in today\u2019s forecast (modelled)'
                          : '· today\u2019s forecast unavailable'}
                    </span>
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-[11px] leading-relaxed text-white/30">
                Forecast snowfall: Open-Meteo (modelled), fetched at {data.fetchedAt}.
              </p>
            </div>
          )}
        </div>
      )}

      {/* (5) Road conditions — state DOT feeds, matched to this route */}
      <div className="mt-8">
        <SkiRoadConditions route={route} />
      </div>
    </section>
  );
}

export default function SkiDriveBrief({ followed }: { followed: BriefResort[] }) {
  const [routes, setRoutes] = useState<SavedSkiRoute[] | null>(null);

  useEffect(() => {
    setRoutes(loadSavedRoutes());
  }, []);

  const onRemove = (id: string) => {
    setRoutes((prev) => {
      const next = removeSavedRoute(prev ?? [], id);
      storeSavedRoutes(next);
      return next;
    });
  };

  if (routes === null) {
    return (
      <p className="mt-10 flex items-center justify-center gap-2 text-sm text-white/60" role="status">
        <Loader2 className="w-4 h-4 animate-spin text-[#D4AF37]" /> Loading your saved
        routes…
      </p>
    );
  }

  if (routes.length === 0) {
    return (
      <div className="mt-10 max-w-2xl mx-auto rounded-3xl border border-white/10 bg-white/[0.03] p-6 md:p-8 text-center">
        <Car className="w-8 h-8 mx-auto text-[#D4AF37]" />
        <p className="mt-4 text-white/70 leading-relaxed">
          No saved routes in this browser yet, so there is no brief to build. Open any
          resort page, plan your drive with the route tool —{' '}
          <strong className="text-white">Cameras on your route</strong> — and tap{' '}
          <strong className="text-white">Save this route for your morning brief</strong>.
          Your brief will appear here: route weather, the playable cameras along the
          drive, and the stops on the way.
        </p>
        <p className="mt-3 text-sm text-white/45 leading-relaxed">
          Saved routes live in this browser only — a route saved on another device or
          browser will not show here.
        </p>
        <Link
          href="/ski-webcams"
          className="mt-5 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-b from-[#e8c55a] to-[#D4AF37] text-black text-sm font-bold hover:brightness-110 transition"
        >
          Browse the ski resort directory
        </Link>
      </div>
    );
  }

  return (
    <div className="mt-12 space-y-14">
      {routes.map((route) => (
        <RouteBriefCard key={route.id} route={route} followed={followed} onRemove={onRemove} />
      ))}
    </div>
  );
}
