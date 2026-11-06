'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Loader2, MapPin, RefreshCw, Search } from 'lucide-react';
import { trackAnalyticsEvent } from '@/components/AnalyticsTracker';
import { CameraFeedCard, LazyCameraViewer } from '@/components/camera-feed-card';
import { DIRECTORY_FILTER_EVENT } from '@/components/DirectorySearch';
import { clean, type CameraArea, type CountryCamera } from '@/lib/country-cameras';

/**
 * The playable camera grid for the directory pages beyond the country
 * pages — regions (Asia, Europe), categories (beaches, airports),
 * the traffic family and single cities. Same contract as
 * CountryCameraExplorer (which keeps serving the country pages):
 * records arrive in batches of 48 from /api/cctv/explore, search and
 * area filters run server-side over the whole scope, every card is
 * the camera's real live feed with a "View on globe" button, and
 * opening a card mounts the globe's own CameraViewer.
 *
 * The scope is identified either by its registry key (lib/explore-
 * data) or by country + optional city/theme params (city pages).
 * Group headers follow the scope's shape: single-country scopes group
 * by city like the country pages; multi-country scopes group by
 * country.
 */

const PAGE_SIZE = 48;
/** Area chips shown; the rest are reachable through the search boxes. */
const MAX_AREA_CHIPS = 24;

interface ExploreBatch {
  total: number;
  cities: CameraArea[];
  cameras: CountryCamera[];
}

interface GridState {
  key: string;
  cameras: CountryCamera[];
  total: number | null;
  cities: CameraArea[];
  error: boolean;
}

const EMPTY_GRID: GridState = { key: '', cameras: [], total: null, cities: [], error: false };

export interface DirectoryExplorerProps {
  /** Registry scope key from lib/explore-data (e.g. "asia", "traffic-japan"). */
  scopeKey?: string;
  /** Param scope (city pages): a country slug… */
  country?: string;
  /** …with an exact city… */
  city?: string;
  /** …and/or a theme. */
  theme?: string;
  /** Human label for the scope, e.g. "Asia" or "Japan traffic". */
  scopeLabel: string;
  groupBy?: 'city' | 'country' | 'none';
  searchPlaceholder: string;
  /** Anchor id the top-of-page search scrolls to. */
  explorerId?: string;
}

export default function DirectoryExplorer({
  scopeKey,
  country,
  city,
  theme,
  scopeLabel,
  groupBy = 'city',
  searchPlaceholder,
  explorerId = 'directory-explorer',
}: DirectoryExplorerProps) {
  const [grid, setGrid] = useState<GridState>(EMPTY_GRID);
  const [loadingMore, setLoadingMore] = useState(false);
  const [runId, setRunId] = useState(0);
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [area, setArea] = useState<string | null>(null);
  const [active, setActive] = useState<CountryCamera | null>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query.trim()), 300);
    return () => clearTimeout(t);
  }, [query]);

  /* Top-of-page search (DirectorySearch): a picked area arrives on
     DIRECTORY_FILTER_EVENT and applies itself as the area filter,
     replacing any free-text query. The same choice rides the URL as
     ?area=, read once on load so a shared link lands pre-filtered. */
  useEffect(() => {
    const fromUrl = new URLSearchParams(window.location.search).get('area');
    if (fromUrl) setArea(fromUrl);
    const onPick = (e: Event) => {
      const name = (e as CustomEvent<string>).detail;
      if (!name) return;
      setQuery('');
      setDebouncedQuery('');
      setArea(name);
    };
    window.addEventListener(DIRECTORY_FILTER_EVENT, onPick);
    return () => window.removeEventListener(DIRECTORY_FILTER_EVENT, onPick);
  }, []);

  const scopeId = scopeKey ?? `${country ?? ''}|${city ?? ''}|${theme ?? ''}`;
  const filterKey = `${scopeId}|${area ?? ''}|${debouncedQuery}|${runId}`;
  const current: GridState = grid.key === filterKey ? grid : EMPTY_GRID;
  const loading = grid.key !== filterKey;
  const { cameras, total, cities, error } = current;

  const fetchBatch = useCallback(
    async (offset: number): Promise<ExploreBatch> => {
      const qs = new URLSearchParams({ offset: String(offset), limit: String(PAGE_SIZE) });
      if (scopeKey) qs.set('scope', scopeKey);
      if (country) qs.set('country', country);
      if (city) qs.set('city', city);
      if (theme) qs.set('theme', theme);
      if (area) qs.set('area', area);
      if (debouncedQuery) qs.set('q', debouncedQuery);
      const r = await fetch(`/api/cctv/explore?${qs.toString()}`);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return (await r.json()) as ExploreBatch;
    },
    [scopeKey, country, city, theme, area, debouncedQuery],
  );

  useEffect(() => {
    let cancelled = false;
    fetchBatch(0)
      .then(batch => {
        if (cancelled) return;
        setGrid({ key: filterKey, cameras: batch.cameras, total: batch.total, cities: batch.cities, error: false });
      })
      .catch(() => {
        if (cancelled) return;
        setGrid({ key: filterKey, cameras: [], total: null, cities: [], error: true });
      });
    return () => {
      cancelled = true;
    };
  }, [fetchBatch, filterKey]);

  const hasMore = total !== null && cameras.length < total;

  const loadMore = useCallback(() => {
    if (loadingMore || total === null || cameras.length >= total) return;
    setLoadingMore(true);
    fetchBatch(cameras.length)
      .then(batch => {
        setGrid(prev =>
          prev.key === filterKey
            ? { ...prev, cameras: [...prev.cameras, ...batch.cameras], total: batch.total }
            : prev,
        );
      })
      .catch(() => {
        /* A failed batch leaves the sentinel/button in place to retry. */
      })
      .finally(() => setLoadingMore(false));
  }, [fetchBatch, filterKey, cameras.length, total, loadingMore]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !hasMore || loading) return;
    if (typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(
      entries => {
        if (entries.some(e => e.isIntersecting)) loadMore();
      },
      { rootMargin: '600px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [hasMore, loading, loadMore]);

  const openCamera = (cam: CountryCamera) => {
    trackAnalyticsEvent('camera_open', undefined, { id: cam.id, name: cam.name });
    setActive(cam);
  };

  const filtering = area !== null || debouncedQuery !== '';
  const areaCounts = useMemo(() => new Map(cities.map(c => [c.name, c.count])), [cities]);

  /* Group headers, only while browsing unfiltered: records arrive
     grouped (by city, or by country for multi-country scopes), so a
     header belongs wherever the group value changes. */
  const rows = useMemo(() => {
    if (filtering || groupBy === 'none') return null;
    const out: Array<{ header: string; count?: number; key: string } | { cam: CountryCamera }> = [];
    let lastGroup: string | null = null;
    let started = false;
    for (const cam of cameras) {
      const group = groupBy === 'country' ? clean(cam.country) : clean(cam.city);
      if (!started || group !== lastGroup) {
        out.push({
          header: group === '' ? 'Other locations' : group,
          count: groupBy === 'city' && group !== '' ? areaCounts.get(group) : undefined,
          key: `h:${group}`,
        });
        lastGroup = group;
        started = true;
      }
      out.push({ cam });
    }
    return out;
  }, [cameras, filtering, groupBy, areaCounts]);

  return (
    <div id={explorerId} className="scroll-mt-6">
      {/* Search — server-side over the whole scope */}
      <div className="relative">
        <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-white/35 pointer-events-none" />
        <input
          type="search"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder={searchPlaceholder}
          aria-label={`Search ${scopeLabel} cameras`}
          className="w-full rounded-xl border border-white/10 bg-white/[0.03] pl-10 pr-4 py-3 text-sm placeholder:text-white/30 focus:outline-none focus:border-[#D4AF37]/60 focus:ring-1 focus:ring-[#D4AF37]/40"
        />
      </div>

      {/* Area filters — the scope's real city values, biggest first */}
      {cities.length > 1 && (
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1 -mx-1 px-1" role="group" aria-label="Filter by area">
          <button
            type="button"
            onClick={() => setArea(null)}
            aria-pressed={area === null}
            className={`shrink-0 px-3.5 py-2 rounded-full border text-xs font-semibold transition ${
              area === null
                ? 'bg-[#D4AF37] text-black border-[#D4AF37]'
                : 'border-white/15 text-white/70 hover:bg-white/5'
            }`}
          >
            All areas{total !== null && !filtering ? ` · ${total}` : ''}
          </button>
          {cities.slice(0, MAX_AREA_CHIPS).map(a => (
            <button
              key={a.name}
              type="button"
              onClick={() => setArea(area === a.name ? null : a.name)}
              aria-pressed={area === a.name}
              className={`shrink-0 px-3.5 py-2 rounded-full border text-xs font-semibold transition ${
                area === a.name
                  ? 'bg-[#D4AF37] text-black border-[#D4AF37]'
                  : 'border-white/15 text-white/70 hover:bg-white/5'
              }`}
            >
              {a.name} · {a.count}
            </button>
          ))}
          {area && !cities.slice(0, MAX_AREA_CHIPS).some(a => a.name === area) && (
            <button
              type="button"
              onClick={() => setArea(null)}
              aria-pressed={true}
              className="shrink-0 px-3.5 py-2 rounded-full border text-xs font-semibold transition bg-[#D4AF37] text-black border-[#D4AF37]"
            >
              {area}
              {total !== null ? ` · ${total}` : ''} ✕
            </button>
          )}
        </div>
      )}

      {/* Count line */}
      {total !== null && !loading && (
        <p className="mt-4 text-xs text-white/40" role="status">
          {filtering
            ? `Showing ${cameras.length} of ${total} matching cameras.`
            : `${total.toLocaleString('en-US')} cameras in the live WorldEye index for ${scopeLabel} — the same catalogue that powers the globe.`}
        </p>
      )}

      {/* Grid / states */}
      {loading ? (
        <div className="mt-4" aria-busy="true">
          <p className="flex items-center gap-2.5 text-sm text-white/70" role="status">
            <Loader2 className="w-4 h-4 animate-spin text-[#D4AF37] shrink-0" />
            Loading live cameras…
            <span className="text-white/35">Fetching the live index for {scopeLabel}.</span>
          </p>
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="rounded-2xl border border-white/10 bg-white/[0.04] overflow-hidden animate-pulse">
                <div className="aspect-video bg-white/[0.07]" />
                <div className="p-3.5 space-y-2">
                  <div className="h-3.5 rounded bg-white/[0.09] w-4/5" />
                  <div className="h-3 rounded bg-white/[0.06] w-2/5" />
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : error ? (
        <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-center">
          <p className="text-sm text-white/70">The live camera index could not be loaded.</p>
          <button
            type="button"
            onClick={() => setRunId(id => id + 1)}
            className="mt-3 inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-white/15 text-sm font-semibold text-white/80 hover:bg-white/5 transition"
          >
            <RefreshCw className="w-4 h-4" /> Try again
          </button>
        </div>
      ) : cameras.length === 0 ? (
        <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-center">
          <p className="text-sm text-white/70">
            {filtering ? 'No cameras match that search.' : `No cameras for ${scopeLabel} are in the live index right now.`}
          </p>
          <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
            {filtering && (
              <button
                type="button"
                onClick={() => {
                  setQuery('');
                  setArea(null);
                }}
                className="px-4 py-2 rounded-xl border border-white/15 text-sm font-semibold text-white/80 hover:bg-white/5 transition"
              >
                Clear search &amp; filters
              </button>
            )}
            <button
              type="button"
              onClick={() => setRunId(id => id + 1)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-white/15 text-sm font-semibold text-white/80 hover:bg-white/5 transition"
            >
              <RefreshCw className="w-4 h-4" /> Try again
            </button>
          </div>
        </div>
      ) : rows ? (
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {rows.map(row =>
            'cam' in row ? (
              <CameraFeedCard key={row.cam.id} cam={row.cam} onOpen={openCamera} />
            ) : (
              <h3
                key={row.key}
                className="col-span-full mt-3 first:mt-0 flex items-baseline gap-2 text-sm font-bold text-white/85"
              >
                <MapPin className="w-4 h-4 text-[#00E5FF] shrink-0 translate-y-0.5" />
                {row.header}
                {row.count !== undefined && (
                  <span className="text-xs font-medium text-white/40">
                    {row.count} camera{row.count === 1 ? '' : 's'}
                  </span>
                )}
              </h3>
            ),
          )}
        </div>
      ) : (
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {cameras.map(cam => (
            <CameraFeedCard key={cam.id} cam={cam} onOpen={openCamera} />
          ))}
        </div>
      )}

      {/* More of the scope: scroll loads the next batch automatically;
          the button is the explicit path (and the retry after a failure). */}
      {!loading && !error && hasMore && (
        <div ref={sentinelRef} className="mt-6 text-center">
          <button
            type="button"
            onClick={loadMore}
            disabled={loadingMore}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-white/15 text-sm font-semibold text-white/85 hover:bg-white/5 transition disabled:opacity-60"
          >
            {loadingMore && <Loader2 className="w-4 h-4 animate-spin" />}
            {loadingMore ? 'Loading…' : `Load more cameras (${(total ?? 0) - cameras.length} remaining)`}
          </button>
        </div>
      )}

      <p className="mt-4 text-[11px] text-white/30 leading-relaxed">
        Every card is the camera&apos;s real live feed: snapshot cards refresh about every 15 seconds,
        stream cards play live in the grid (a few at a time, the same budget the map tiles use) and in
        full when you open a camera. Feeds are provided by their operators and public sources; a camera
        whose stream has gone off air shows as unavailable rather than playing a recording.
      </p>

      {active && <LazyCameraViewer camera={active} onClose={() => setActive(null)} />}
    </div>
  );
}
