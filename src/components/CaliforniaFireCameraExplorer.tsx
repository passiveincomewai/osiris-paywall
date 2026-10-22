'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Camera, ExternalLink, Loader2, MapPin, RefreshCw, Search, X } from 'lucide-react';
import { trackAnalyticsEvent } from '@/components/AnalyticsTracker';
import { freshen, refreshInterval } from '@/lib/camera-preview';
import {
  californiaCameras,
  countyDisplayName,
  countyGroups,
  countyKey,
  filterCameras,
  sortForGrid,
  type AlertCam,
} from '@/lib/alert-cameras';

/* Cameras per batch — the country grid's scale. The full set arrives in
   one /api/alert-cameras response (it is ~1,300 fixed records, cached
   upstream); batching is about DOM weight, not requests. */
const PAGE_SIZE = 48;
/** County chips shown; the rest are reachable through the search box. */
const MAX_COUNTY_CHIPS = 24;

/** Whether an element is near the viewport — frames load only then, so a
 *  deep grid never fires hundreds of frame requests for cards nobody has
 *  scrolled to, and refresh pauses off-screen. (The country explorer's
 *  hook, kept local so this component stands alone.) */
function useInView<T extends HTMLElement>(rootMargin = '240px') {
  const ref = useRef<T | null>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === 'undefined') {
      const t = setTimeout(() => setInView(true), 0);
      return () => clearTimeout(t);
    }
    const io = new IntersectionObserver(
      entries => {
        for (const e of entries) setInView(e.isIntersecting);
      },
      { rootMargin },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [rootMargin]);
  return { ref, inView };
}

/**
 * A fire camera's current frame. These cameras publish stills, not
 * streams: one frame URL that returns a new frame about every 15
 * seconds, re-requested on the snapshot cadence from lib/camera-preview
 * (the same machinery the map tiles use). The LIVE badge renders only
 * after a frame has verifiably loaded AND the network reports the
 * camera online — earned, never assumed. An offline camera keeps its
 * card and its last frame, labelled offline, never "live".
 */
function LiveFrame({ cam, large = false }: { cam: AlertCam; large?: boolean }) {
  const { ref, inView } = useInView<HTMLDivElement>();
  const [src, setSrc] = useState<string>(() => freshen(cam.img));
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const retried = useRef(false);

  useEffect(() => {
    if (!inView || failed) return;
    const every = refreshInterval('jpg');
    let interval: ReturnType<typeof setInterval> | undefined;
    const first = setTimeout(
      () => {
        setSrc(freshen(cam.img));
        interval = setInterval(() => setSrc(freshen(cam.img)), every);
      },
      every + Math.random() * 2000,
    );
    return () => {
      clearTimeout(first);
      if (interval) clearInterval(interval);
    };
  }, [inView, cam.img, failed]);

  return (
    <div ref={ref} className="absolute inset-0">
      {inView && !failed ? (
        // eslint-disable-next-line @next/next/no-img-element -- remote camera frames, no loader
        <img
          src={src}
          alt={`${cam.name} — latest frame`}
          loading="lazy"
          className="absolute inset-0 w-full h-full object-cover"
          onLoad={() => setReady(true)}
          onError={() => {
            if (!retried.current) {
              retried.current = true;
              setTimeout(() => setSrc(freshen(cam.img)), 2500);
            } else {
              setFailed(true);
            }
          }}
          draggable={false}
        />
      ) : null}
      {ready && !failed && cam.online && (
        <span className="absolute bottom-2 right-2 inline-flex items-center gap-1.5 rounded bg-black/55 px-2 py-0.5 text-[10px] font-bold tracking-widest text-white">
          <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse motion-reduce:animate-none" aria-hidden />
          LIVE
        </span>
      )}
      {ready && !failed && !cam.online && (
        <span className="absolute bottom-2 right-2 inline-flex items-center rounded bg-black/55 px-2 py-0.5 text-[10px] font-bold tracking-widest text-white/70">
          OFFLINE — LAST FRAME
        </span>
      )}
      {failed && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/60 px-4 text-center">
          <Camera className={`text-white/25 ${large ? 'w-8 h-8' : 'w-6 h-6'}`} aria-hidden />
          <p className="text-[11px] font-medium tracking-wide text-white/45">
            Live frame unavailable right now
          </p>
        </div>
      )}
    </div>
  );
}

function FireCameraCard({ cam, onOpen }: { cam: AlertCam; onOpen: (cam: AlertCam) => void }) {
  return (
    <button
      type="button"
      onClick={() => onOpen(cam)}
      className="group text-left rounded-2xl border border-white/10 bg-white/[0.03] overflow-hidden hover:border-[#D4AF37]/50 hover:bg-white/[0.05] transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D4AF37]"
      aria-label={`View ${cam.name}`}
    >
      <div className="relative aspect-video bg-black/70 overflow-hidden">
        <LiveFrame cam={cam} />
        <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-black/70 border border-white/15 text-[10px] font-mono uppercase tracking-wider text-white/80">
          Live snapshot
        </span>
      </div>
      <div className="p-3.5">
        <div className="font-semibold text-sm leading-snug line-clamp-2 min-h-[2.5em]">{cam.name}</div>
        <div className="mt-1.5 flex items-center gap-1.5 text-xs text-white/45">
          <MapPin className="w-3.5 h-3.5 text-[#00E5FF] shrink-0" />
          <span className="truncate">{countyDisplayName(cam.county)} County</span>
        </div>
        <div className="mt-1 text-[11px] text-white/30 truncate">ALERTCalifornia</div>
      </div>
    </button>
  );
}

/** The opened camera: its frame at full width, still refreshing on the
 *  same cadence, with the facts the feed itself carries and the way out
 *  to the camera's own ALERTCalifornia page. */
function CameraLightbox({ cam, onClose }: { cam: AlertCam; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm p-0 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label={cam.name}
      onClick={onClose}
    >
      <div
        className="w-full max-w-3xl max-h-[92vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl border border-white/10 bg-[#0a0d16] shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="relative aspect-video bg-black/70">
          <LiveFrame cam={cam} large />
          <span className="absolute top-3 left-3 px-2 py-0.5 rounded-full bg-black/70 border border-white/15 text-[10px] font-mono uppercase tracking-wider text-white/80">
            Live snapshot · refreshes ~15s
          </span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close camera"
            className="absolute top-3 right-3 w-9 h-9 rounded-full bg-black/70 border border-white/15 text-white/80 flex items-center justify-center hover:bg-black/90 transition"
          >
            <X className="w-4.5 h-4.5" />
          </button>
        </div>
        <div className="p-5 md:p-6">
          <h3 className="text-lg md:text-xl font-bold leading-snug">{cam.name}</h3>
          <p className="mt-1.5 flex items-center gap-1.5 text-sm text-white/50">
            <MapPin className="w-4 h-4 text-[#00E5FF] shrink-0" />
            {countyDisplayName(cam.county)} County, California
            <span className="text-white/30">
              · {cam.lat.toFixed(4)}, {cam.lng.toFixed(4)}
            </span>
          </p>
          <p className="mt-3 text-sm text-white/55 leading-relaxed">
            {cam.online
              ? 'This fire-watch camera is online. The frame above is its latest still, republished by ALERTCalifornia about every 15 seconds — a live snapshot, not a video stream.'
              : 'ALERTCalifornia currently reports this camera offline, so the frame above may be its last published still rather than a current one.'}
          </p>
          {cam.url && (
            <a
              href={cam.url}
              target="_blank"
              rel="noreferrer"
              className="mt-4 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-b from-[#e8c55a] to-[#D4AF37] text-black text-sm font-bold hover:brightness-110 transition"
            >
              Open at ALERTCalifornia <ExternalLink className="w-4 h-4" />
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

interface Payload {
  cameras: AlertCam[];
  error: boolean;
}

/**
 * The full California fire-camera grid: every California camera in the
 * ALERTCalifornia feed the site already serves (/api/alert-cameras,
 * filtered to California by lib/alert-cameras), grouped by county —
 * biggest first — with search and county filters, in the country
 * explorer's card style. Batches of 48 render as the visitor scrolls;
 * the whole set is already on the client, so filtering is instant.
 */
export default function CaliforniaFireCameraExplorer() {
  const [payload, setPayload] = useState<Payload | null>(null);
  const [runId, setRunId] = useState(0);
  const [query, setQuery] = useState('');
  const [county, setCounty] = useState<string | null>(null);
  const [visible, setVisible] = useState(PAGE_SIZE);
  const [active, setActive] = useState<AlertCam | null>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/alert-cameras')
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((data: { cameras?: AlertCam[] }) => {
        if (cancelled) return;
        const all = Array.isArray(data.cameras) ? data.cameras : [];
        setPayload({ cameras: californiaCameras(all), error: false });
      })
      .catch(() => {
        if (!cancelled) setPayload({ cameras: [], error: true });
      });
    return () => {
      cancelled = true;
    };
  }, [runId]);

  const all = payload?.cameras ?? [];
  const groups = useMemo(() => countyGroups(all), [all]);
  const filtering = county !== null || query.trim() !== '';

  const filtered = useMemo(() => {
    const hits = filterCameras(all, query, county);
    // Unfiltered browsing keeps the county-grouped order; a search reads
    // better name-sorted. County-only filtering keeps group order (one
    // group anyway).
    return query.trim() === '' ? sortForGrid(hits) : hits.sort((a, b) => a.name.localeCompare(b.name));
  }, [all, query, county]);

  // Any filter change restarts the batch window.
  useEffect(() => {
    setVisible(PAGE_SIZE);
  }, [query, county]);

  const shown = filtered.slice(0, visible);
  const hasMore = visible < filtered.length;

  /* Scroll loads the next batch automatically; the button below is the
     explicit path (and the retry after a failure). */
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !hasMore) return;
    if (typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(
      entries => {
        if (entries.some(e => e.isIntersecting)) setVisible(v => v + PAGE_SIZE);
      },
      { rootMargin: '600px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [hasMore, shown.length]);

  /* Hero stat sync: the page renders its stats from the same feed on
     the server; if the live read differs (network grew, a camera went
     offline), the tiles follow the numbers the grid is actually
     showing. Tiles absent → no-op. */
  useEffect(() => {
    if (!payload || payload.error) return;
    const set = (attr: string, value: number) => {
      const el = document.querySelector(`[${attr}]`);
      if (el) el.textContent = value.toLocaleString('en-US');
    };
    set('data-ca-fire-total', all.length);
    set('data-ca-fire-online', all.filter(c => c.online).length);
    set('data-ca-fire-counties', groups.length);
  }, [payload, all, groups]);

  /* Group headers, only while browsing unfiltered: the grid arrives
     grouped by county (biggest first), so a header belongs wherever the
     county changes. */
  const rows = useMemo(() => {
    if (filtering) return null;
    const counts = new Map(groups.map(g => [g.key, g.count]));
    const out: Array<{ header: string; count?: number; key: string } | { cam: AlertCam }> = [];
    let last: string | null = null;
    for (const cam of shown) {
      const key = countyKey(cam.county);
      if (key !== last) {
        out.push({
          header: `${countyDisplayName(cam.county)} County`,
          count: counts.get(key),
          key: `h:${key}`,
        });
        last = key;
      }
      out.push({ cam });
    }
    return out;
  }, [shown, filtering, groups]);

  const openCamera = (cam: AlertCam) => {
    trackAnalyticsEvent('camera_open');
    setActive(cam);
  };

  if (payload === null) {
    return (
      <div aria-busy="true">
        <p className="flex items-center gap-2.5 text-sm text-white/70" role="status">
          <Loader2 className="w-4 h-4 animate-spin text-[#D4AF37] shrink-0" />
          Loading live fire cameras…
          <span className="text-white/35">Fetching the ALERTCalifornia feed.</span>
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
    );
  }

  if (payload.error) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-center">
        <p className="text-sm text-white/70">The live fire-camera feed could not be loaded.</p>
        <button
          type="button"
          onClick={() => {
            setPayload(null);
            setRunId(id => id + 1);
          }}
          className="mt-3 inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-white/15 text-sm font-semibold text-white/80 hover:bg-white/5 transition"
        >
          <RefreshCw className="w-4 h-4" /> Try again
        </button>
      </div>
    );
  }

  return (
    <div>
      {/* Search — over the whole California set */}
      <div className="relative">
        <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-white/35 pointer-events-none" />
        <input
          type="search"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search fire cameras — a peak, a ridge, a county…"
          aria-label="Search California fire cameras"
          className="w-full rounded-xl border border-white/10 bg-white/[0.03] pl-10 pr-4 py-3 text-sm placeholder:text-white/30 focus:outline-none focus:border-[#D4AF37]/60 focus:ring-1 focus:ring-[#D4AF37]/40"
        />
      </div>

      {/* County filters — the feed's real counties, biggest first */}
      {groups.length > 1 && (
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1 -mx-1 px-1" role="group" aria-label="Filter by county">
          <button
            type="button"
            onClick={() => setCounty(null)}
            aria-pressed={county === null}
            className={`shrink-0 px-3.5 py-2 rounded-full border text-xs font-semibold transition ${
              county === null
                ? 'bg-[#D4AF37] text-black border-[#D4AF37]'
                : 'border-white/15 text-white/70 hover:bg-white/5'
            }`}
          >
            All counties{!filtering ? ` · ${all.length}` : ''}
          </button>
          {groups.slice(0, MAX_COUNTY_CHIPS).map(g => (
            <button
              key={g.key}
              type="button"
              onClick={() => setCounty(county === g.key ? null : g.key)}
              aria-pressed={county === g.key}
              className={`shrink-0 px-3.5 py-2 rounded-full border text-xs font-semibold transition ${
                county === g.key
                  ? 'bg-[#D4AF37] text-black border-[#D4AF37]'
                  : 'border-white/15 text-white/70 hover:bg-white/5'
              }`}
            >
              {g.name} · {g.count}
            </button>
          ))}
        </div>
      )}

      {/* Count line */}
      <p className="mt-4 text-xs text-white/40" role="status">
        {filtering
          ? `Showing ${shown.length} of ${filtered.length} matching cameras.`
          : `${all.length.toLocaleString('en-US')} California fire cameras in the live ALERTCalifornia feed — the same cameras the WorldEye globe shows.`}
      </p>

      {filtered.length === 0 ? (
        <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-center">
          <p className="text-sm text-white/70">No cameras match that search.</p>
          <button
            type="button"
            onClick={() => {
              setQuery('');
              setCounty(null);
            }}
            className="mt-3 px-4 py-2 rounded-xl border border-white/15 text-sm font-semibold text-white/80 hover:bg-white/5 transition"
          >
            Clear search &amp; filters
          </button>
        </div>
      ) : rows ? (
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {rows.map(row =>
            'cam' in row ? (
              <FireCameraCard key={row.cam.id} cam={row.cam} onOpen={openCamera} />
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
          {shown.map(cam => (
            <FireCameraCard key={cam.id} cam={cam} onOpen={openCamera} />
          ))}
        </div>
      )}

      {hasMore && (
        <div ref={sentinelRef} className="mt-6 text-center">
          <button
            type="button"
            onClick={() => setVisible(v => v + PAGE_SIZE)}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-white/15 text-sm font-semibold text-white/85 hover:bg-white/5 transition"
          >
            Load more cameras ({filtered.length - shown.length} remaining)
          </button>
        </div>
      )}

      <p className="mt-4 text-[11px] text-white/30 leading-relaxed">
        Every card is the camera&apos;s real current frame: ALERTCalifornia republishes each
        fire-watch camera&apos;s still about every 15 seconds, and cards on screen re-request on
        that cadence. These are live snapshots, not video streams. A camera the network reports
        offline keeps its card with its last frame, labelled — the count on this page is the
        number of cameras in the feed, not a promise that every one is transmitting right now.
      </p>

      {active && <CameraLightbox cam={active} onClose={() => setActive(null)} />}
    </div>
  );
}
