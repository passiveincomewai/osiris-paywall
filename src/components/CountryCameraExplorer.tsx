'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { Camera, Loader2, MapPin, PlayCircle, RefreshCw, Search } from 'lucide-react';
import { trackAnalyticsEvent } from '@/components/AnalyticsTracker';
import { freshen, previewMedia, refreshInterval } from '@/lib/camera-preview';
import {
  cameraMediaKind,
  clean,
  youtubePosterUrl,
  type CameraArea,
  type CountryCamera,
} from '@/lib/country-cameras';

/* The viewer (hls.js and all) loads only when a visitor actually opens a
   camera — the same lazy mount the globe uses, so a country page's initial
   bundle carries none of it. */
const CameraViewer = dynamic(() => import('@/components/CameraViewer'), { ssr: false });

const KIND_LABEL: Record<string, string> = {
  video: 'Live video',
  snapshot: 'Live snapshot',
  embed: 'Live embed',
  link: 'At source',
};

/** Cameras per batch — the landing gallery's grid scale, and small enough
 *  that a batch response stays a few tens of KB even for long-named feeds. */
const PAGE_SIZE = 48;
/** Area chips shown; the rest are reachable through the search box. */
const MAX_AREA_CHIPS = 24;
/** Simultaneously decoding video cards. The map's preview tiles budget 4
 *  (CctvPreviews MAX_VIDEO_TILES); a grid card is bigger, so the same
 *  discipline applies — video cameras past the budget wait with their
 *  labelled card and play as slots free up. */
const MAX_LIVE_VIDEO_CARDS = 4;

/* ── A tiny FIFO budget for live video cards ─────────────────────────────
   Module-level because the budget is per page, not per card: a card asks
   for a slot when it scrolls into view and gives it back when it leaves
   or unmounts. Granting is a setState on the waiting card, so it happens
   through the callback the card registered. */
interface VideoWaiter {
  granted: boolean;
  cancelled: boolean;
  grant: () => void;
}
let liveVideoSlots = 0;
const videoQueue: VideoWaiter[] = [];

function pumpVideoQueue() {
  while (liveVideoSlots < MAX_LIVE_VIDEO_CARDS && videoQueue.length > 0) {
    const next = videoQueue.shift() as VideoWaiter;
    if (next.cancelled) continue;
    next.granted = true;
    liveVideoSlots += 1;
    next.grant();
  }
}

function acquireVideoSlot(grant: () => void): () => void {
  const waiter: VideoWaiter = { granted: false, cancelled: false, grant };
  videoQueue.push(waiter);
  pumpVideoQueue();
  return () => {
    if (waiter.cancelled) return;
    waiter.cancelled = true;
    const i = videoQueue.indexOf(waiter);
    if (i >= 0) videoQueue.splice(i, 1);
    if (waiter.granted) {
      liveVideoSlots -= 1;
      pumpVideoQueue();
    }
  };
}

/** Whether an element is near the viewport — media starts only then, so a
 *  deep grid never fires hundreds of feed requests for cards nobody has
 *  scrolled to, and snapshot refresh pauses off-screen. */
function useInView<T extends HTMLElement>(rootMargin = '240px') {
  const ref = useRef<T | null>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === 'undefined') {
      setInView(true);
      return;
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
 * A snapshot or MJPEG card: the camera's actual current frame, requested
 * only while the card is on screen. Snapshots re-request on the preview
 * machinery's cadence (lib/camera-preview — the same one the landing
 * gallery and the map tiles use); MJPEG is one continuous response and is
 * never cache-busted. The LIVE badge renders only after a frame has
 * verifiably loaded — earned, never assumed, as on the landing page.
 */
function LiveImage({ cam, kind, url }: { cam: CountryCamera; kind: 'jpg' | 'mjpeg'; url: string }) {
  const { ref, inView } = useInView<HTMLDivElement>();
  const [src, setSrc] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const retried = useRef(false);

  useEffect(() => {
    if (!inView || failed) return;
    if (!src) setSrc(kind === 'jpg' ? freshen(url) : url);
    if (kind !== 'jpg') return;
    const every = refreshInterval('jpg');
    let interval: ReturnType<typeof setInterval> | undefined;
    const first = setTimeout(
      () => {
        setSrc(freshen(url));
        interval = setInterval(() => setSrc(freshen(url)), every);
      },
      every + Math.random() * 2000,
    );
    return () => {
      clearTimeout(first);
      if (interval) clearInterval(interval);
    };
  }, [inView, kind, url, src, failed]);

  return (
    <div ref={ref} className="absolute inset-0">
      {src && !failed ? (
        // eslint-disable-next-line @next/next/no-img-element -- remote camera frames, no loader
        <img
          src={src}
          alt={cam.name}
          loading="lazy"
          className="absolute inset-0 w-full h-full object-cover"
          onLoad={() => setReady(true)}
          onError={() => {
            if (!retried.current && kind === 'jpg') {
              retried.current = true;
              setTimeout(() => setSrc(freshen(url)), 2500);
            } else {
              setFailed(true);
            }
          }}
          draggable={false}
        />
      ) : null}
      {ready && !failed && (
        <span className="absolute bottom-2 right-2 inline-flex items-center gap-1.5 rounded bg-black/55 px-2 py-0.5 text-[10px] font-bold tracking-widest text-white">
          <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse motion-reduce:animate-none" aria-hidden />
          LIVE
        </span>
      )}
      {failed && <FeedUnavailable label="Live feed unavailable right now" />}
    </div>
  );
}

/**
 * An HLS or MP4 card: the real stream, muted and inline, mounted only
 * while the card is on screen AND holds one of the page's few video slots
 * (see MAX_LIVE_VIDEO_CARDS). hls.js loads lazily, only for a card that
 * actually plays — the same arrangement as the map's video tiles. Before
 * its slot arrives the card shows its labelled state, never a fake frame.
 */
function LiveVideo({ cam, kind, url }: { cam: CountryCamera; kind: 'hls' | 'mp4'; url: string }) {
  const { ref: holderRef, inView } = useInView<HTMLDivElement>();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [hasSlot, setHasSlot] = useState(false);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  /* MP4 clips are short and loop, so they go stale; re-pointing the
     element on the preview cadence is what refreshes them. */
  const [cacheBust, setCacheBust] = useState(0);
  const onFail = useCallback(() => setFailed(true), []);

  useEffect(() => {
    if (!inView || failed) return;
    const release = acquireVideoSlot(() => setHasSlot(true));
    return () => {
      release();
      setHasSlot(false);
    };
  }, [inView, failed]);

  const every = refreshInterval(kind);
  useEffect(() => {
    if (!hasSlot || !every) return;
    const t = setInterval(() => setCacheBust(n => n + 1), every + Math.random() * 4000);
    return () => clearInterval(t);
  }, [hasSlot, every]);

  useEffect(() => {
    if (!hasSlot) return;
    const el = videoRef.current;
    if (!el) return;
    if (kind === 'mp4') {
      el.src = cacheBust ? freshen(url) : url;
      el.play().catch(() => { /* autoplay refused: the loaded frame still shows */ });
      return;
    }
    /* HLS: the decoder first, native playback only as the fallback — the
       order the full viewer and the map tiles use. */
    let cancelled = false;
    let hls: { destroy: () => void } | null = null;
    import('hls.js')
      .then(({ default: Hls }) => {
        if (cancelled || !videoRef.current) return;
        if (!Hls.isSupported()) {
          if (videoRef.current.canPlayType('application/vnd.apple.mpegurl')) {
            videoRef.current.src = url;
            videoRef.current.play().catch(() => {});
          } else {
            onFail();
          }
          return;
        }
        const instance = new Hls({ enableWorker: false, maxBufferLength: 6 });
        hls = instance;
        instance.on(Hls.Events.ERROR, (_e, data) => {
          if (data.fatal) onFail();
        });
        instance.loadSource(url);
        instance.attachMedia(videoRef.current);
        videoRef.current.play().catch(() => {});
      })
      .catch(onFail);
    return () => {
      cancelled = true;
      hls?.destroy();
    };
  }, [hasSlot, kind, url, cacheBust, onFail]);

  return (
    <div ref={holderRef} className="absolute inset-0">
      {hasSlot && !failed ? (
        <video
          ref={videoRef}
          muted
          playsInline
          loop
          preload="metadata"
          className="absolute inset-0 w-full h-full object-cover"
          onLoadedData={() => setReady(true)}
          onError={onFail}
        />
      ) : !failed ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-gradient-to-b from-white/[0.04] to-black/60 text-white/35">
          <PlayCircle className="w-9 h-9" />
          <span className="text-[10px] font-mono uppercase tracking-[0.2em]">Live video</span>
        </div>
      ) : null}
      {ready && !failed && (
        <span className="absolute bottom-2 right-2 inline-flex items-center gap-1.5 rounded bg-black/55 px-2 py-0.5 text-[10px] font-bold tracking-widest text-white">
          <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse motion-reduce:animate-none" aria-hidden />
          LIVE
        </span>
      )}
      {failed && <FeedUnavailable label="Live feed unavailable right now" />}
    </div>
  );
}

function FeedUnavailable({ label }: { label: string }) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-gradient-to-b from-white/[0.04] to-black/60 text-white/40 px-3 text-center">
      <Camera className="w-8 h-8" />
      <span className="text-[10px] font-mono uppercase tracking-[0.18em]">{label}</span>
    </div>
  );
}

/**
 * A card's live media, by what the camera actually is:
 *  - snapshot / MJPEG → its current frame, refreshing (LiveImage)
 *  - HLS / MP4        → the stream itself, playing muted in the card (LiveVideo)
 *  - embed (YouTube…) → the video's own poster; embeds cannot be frame-
 *    grabbed and a wall of third-party iframes is not a grid — the live
 *    embed itself plays in the viewer on open, labelled as such
 *  - no playable URL   → an honest listing card; the viewer's resolver may
 *    still find a feed at open time
 * A feed that fails to load keeps its card with an "unavailable" state:
 * the page's stated count is the number of cards, and silently vanishing
 * cards would make it a lie.
 */
function CardPreview({ cam }: { cam: CountryCamera }) {
  const kind = cameraMediaKind(cam);
  const media = useMemo(() => previewMedia(cam), [cam]);
  const poster = useMemo(() => (media ? null : youtubePosterUrl(cam)), [cam, media]);

  return (
    <div className="relative aspect-video bg-black/70 overflow-hidden">
      {media && (media.kind === 'jpg' || media.kind === 'mjpeg') ? (
        <LiveImage cam={cam} kind={media.kind} url={media.url} />
      ) : media ? (
        /* Reaching this branch means the kind is hls or mp4 — the two
           video kinds previewMedia can return. */
        <LiveVideo cam={cam} kind={media.kind === 'mp4' ? 'mp4' : 'hls'} url={media.url} />
      ) : poster ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element -- the video's own poster */}
          <img
            src={poster}
            alt={cam.name}
            loading="lazy"
            className="absolute inset-0 w-full h-full object-cover"
          />
          <span className="absolute bottom-2 right-2 inline-flex items-center gap-1.5 rounded bg-black/55 px-2 py-0.5 text-[10px] font-bold tracking-widest text-white">
            <PlayCircle className="w-3 h-3" aria-hidden /> EMBED
          </span>
        </>
      ) : (
        <FeedUnavailable label={kind === 'link' ? 'Listing only' : 'Tap to watch'} />
      )}
      <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-black/70 border border-white/15 text-[10px] font-mono uppercase tracking-wider text-white/80">
        {KIND_LABEL[kind]}
      </span>
    </div>
  );
}

function CameraCard({ cam, onOpen }: { cam: CountryCamera; onOpen: (cam: CountryCamera) => void }) {
  return (
    <button
      type="button"
      onClick={() => onOpen(cam)}
      className="group text-left rounded-2xl border border-white/10 bg-white/[0.03] overflow-hidden hover:border-[#D4AF37]/50 hover:bg-white/[0.05] transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D4AF37]"
      aria-label={`Watch ${cam.name}`}
    >
      <CardPreview cam={cam} />
      <div className="p-3.5">
        <div className="font-semibold text-sm leading-snug line-clamp-2 min-h-[2.5em]">{cam.name}</div>
        <div className="mt-1.5 flex items-center gap-1.5 text-xs text-white/45">
          <MapPin className="w-3.5 h-3.5 text-[#00E5FF] shrink-0" />
          <span className="truncate">{cam.city || '—'}</span>
        </div>
        {cam.source && <div className="mt-1 text-[11px] text-white/30 truncate">{cam.source}</div>}
      </div>
    </button>
  );
}

interface CountryBatch {
  total: number;
  cities: CameraArea[];
  cameras: CountryCamera[];
}

/**
 * The playable camera grid for a country page, for ANY country in the
 * catalogue: the records arrive in batches of 48 from
 * /api/cctv/country/<slug> (the generated per-country data), so the
 * United States' forty thousand cameras cost the same first paint as
 * Thailand's hundred and eighteen. Search and area filters run server-
 * side over the whole country; scrolling (or the button) loads the next
 * batch until every camera is reachable. Unfiltered, the records arrive
 * grouped by city, biggest first, and the grid draws a header where each
 * group begins. Every card is the camera's real live feed (see
 * CardPreview); opening one mounts the globe's own CameraViewer.
 */
export default function CountryCameraExplorer({
  country,
  countryName,
}: {
  country: string;
  countryName: string;
}) {
  const [cameras, setCameras] = useState<CountryCamera[]>([]);
  const [total, setTotal] = useState<number | null>(null);
  const [cities, setCities] = useState<CameraArea[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(false);
  const [runId, setRunId] = useState(0);
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [area, setArea] = useState<string | null>(null);
  const [active, setActive] = useState<CountryCamera | null>(null);
  const requestRef = useRef(0);
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query.trim()), 300);
    return () => clearTimeout(t);
  }, [query]);

  const fetchBatch = useCallback(
    async (offset: number): Promise<CountryBatch | null> => {
      const qs = new URLSearchParams({ offset: String(offset), limit: String(PAGE_SIZE) });
      if (area) qs.set('city', area);
      if (debouncedQuery) qs.set('q', debouncedQuery);
      const r = await fetch(`/api/cctv/country/${country}?${qs.toString()}`);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return (await r.json()) as CountryBatch;
    },
    [country, area, debouncedQuery],
  );

  /* First batch for the current filter set (and on retry). */
  useEffect(() => {
    const req = ++requestRef.current;
    setLoading(true);
    setError(false);
    setCameras([]);
    setTotal(null);
    fetchBatch(0)
      .then(batch => {
        if (requestRef.current !== req || !batch) return;
        setCameras(batch.cameras);
        setTotal(batch.total);
        setCities(batch.cities);
        setLoading(false);
      })
      .catch(() => {
        if (requestRef.current !== req) return;
        setError(true);
        setLoading(false);
      });
  }, [fetchBatch, runId]);

  const hasMore = total !== null && cameras.length < total;

  const loadMore = useCallback(() => {
    if (loadingMore || total === null || cameras.length >= total) return;
    const req = requestRef.current;
    setLoadingMore(true);
    fetchBatch(cameras.length)
      .then(batch => {
        if (requestRef.current !== req || !batch) return;
        setCameras(prev => [...prev, ...batch.cameras]);
        setTotal(batch.total);
      })
      .catch(() => {
        /* A failed batch leaves the sentinel/button in place to retry. */
      })
      .finally(() => {
        if (requestRef.current === req) setLoadingMore(false);
      });
  }, [fetchBatch, cameras.length, total, loadingMore]);

  /* Load-on-scroll: the sentinel sits right after the grid. */
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

  /* Hero stat sync: the page's hero count is rendered from the generated
     index, which is rebuilt only with the catalogue; the explorer's first
     unfiltered total is the same derivation, so keep the tile honest if
     the two ever drift. Tile absent → no-op. */
  useEffect(() => {
    if (total === null || area !== null || debouncedQuery !== '') return;
    const el = document.querySelector('[data-country-live-cameras]');
    if (el) el.textContent = total.toLocaleString('en-US');
  }, [total, area, debouncedQuery]);

  const openCamera = (cam: CountryCamera) => {
    trackAnalyticsEvent('camera_open');
    setActive(cam);
  };

  const filtering = area !== null || debouncedQuery !== '';
  const cityCounts = useMemo(() => new Map(cities.map(c => [c.name, c.count])), [cities]);

  /* Group headers, only while browsing unfiltered: records arrive grouped
     by city (biggest first), so a header belongs wherever the city value
     changes. The count rides along when the API's chip list knows it
     (the largest groups — the ones a visitor reaches first). */
  const rows = useMemo(() => {
    if (filtering) return null;
    const out: Array<{ header: string; count?: number; key: string } | { cam: CountryCamera }> = [];
    let lastCity: string | null = null;
    let started = false;
    for (const cam of cameras) {
      const city = clean(cam.city);
      if (!started || city !== lastCity) {
        out.push({
          header: city === '' ? 'Other locations' : city,
          count: city === '' ? undefined : cityCounts.get(city),
          key: `h:${city}`,
        });
        lastCity = city;
        started = true;
      }
      out.push({ cam });
    }
    return out;
  }, [cameras, filtering, cityCounts]);

  return (
    <div>
      {/* Search — server-side over the whole country */}
      <div className="relative">
        <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-white/35 pointer-events-none" />
        <input
          type="search"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder={`Search ${countryName} cameras — a beach, a road, a district…`}
          aria-label={`Search ${countryName} cameras`}
          className="w-full rounded-xl border border-white/10 bg-white/[0.03] pl-10 pr-4 py-3 text-sm placeholder:text-white/30 focus:outline-none focus:border-[#D4AF37]/60 focus:ring-1 focus:ring-[#D4AF37]/40"
        />
      </div>

      {/* Area filters — the country's real city values, biggest first */}
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
        </div>
      )}

      {/* Count line */}
      {total !== null && !loading && (
        <p className="mt-4 text-xs text-white/40" role="status">
          {filtering
            ? `Showing ${cameras.length} of ${total} matching cameras.`
            : `${total} cameras in the live WorldEye index for ${countryName} — the same catalogue that powers the globe.`}
        </p>
      )}

      {/* Grid / states */}
      {loading ? (
        <div className="mt-4" aria-busy="true">
          <p className="flex items-center gap-2.5 text-sm text-white/70" role="status">
            <Loader2 className="w-4 h-4 animate-spin text-[#D4AF37] shrink-0" />
            Loading live cameras…
            <span className="text-white/35">Fetching the live index for {countryName}.</span>
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
            {filtering ? 'No cameras match that search.' : `No cameras for ${countryName} are in the live index right now.`}
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
              <CameraCard key={row.cam.id} cam={row.cam} onOpen={openCamera} />
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
            <CameraCard key={cam.id} cam={cam} onOpen={openCamera} />
          ))}
        </div>
      )}

      {/* More of the country: scroll loads the next batch automatically;
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

      {/* The globe's own viewer, unchanged: one active player at a time. */}
      {active && <CameraViewer camera={active} onClose={() => setActive(null)} />}
    </div>
  );
}
