'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { Camera, Loader2, MapPin, PlayCircle, RefreshCw, Search } from 'lucide-react';
import { trackAnalyticsEvent } from '@/components/AnalyticsTracker';
import { freshen, previewMedia, refreshInterval } from '@/lib/camera-preview';
import {
  cameraAreas,
  cameraMediaKind,
  filterCameras,
  selectCountryCameras,
  youtubePosterUrl,
  type CountryCamera,
  type CountryExplorerConfig,
} from '@/lib/country-cameras';

/* The viewer (hls.js and all) loads only when a visitor actually opens a
   camera — the same lazy mount the globe uses, so a country page's initial
   bundle carries none of it. */
const CameraViewer = dynamic(() => import('@/components/CameraViewer'), { ssr: false });

type LoadState =
  | { status: 'loading' }
  | { status: 'ready'; cameras: CountryCamera[] }
  | { status: 'error' };

const KIND_LABEL: Record<string, string> = {
  video: 'Live video',
  snapshot: 'Live snapshot',
  embed: 'Live embed',
  link: 'At source',
};

/**
 * A card's still preview. Snapshot feeds only: a tile that re-requests its
 * frame on the preview machinery's cadence, and only once it has scrolled
 * into view, so a 70-camera grid does not fire 70 requests on page load.
 * Video and embed cameras never autoplay in a card — they show a labelled
 * poster/placeholder and play when opened.
 */
function CardPreview({ cam }: { cam: CountryCamera }) {
  const kind = cameraMediaKind(cam);
  const media = useMemo(() => previewMedia(cam), [cam]);
  const poster = useMemo(() => youtubePosterUrl(cam), [cam]);
  const holderRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [src, setSrc] = useState<string | null>(null);
  const [imgFailed, setImgFailed] = useState(false);

  useEffect(() => {
    const el = holderRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      entries => {
        if (entries.some(e => e.isIntersecting)) {
          setVisible(true);
          io.disconnect();
        }
      },
      { rootMargin: '200px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const isSnapshot = media !== null && (media.kind === 'jpg' || media.kind === 'mjpeg');
  useEffect(() => {
    if (!visible || !isSnapshot || !media) return;
    setSrc(freshen(media.url));
    const iv = refreshInterval(media.kind);
    if (!iv) return;
    const t = setInterval(() => setSrc(freshen(media.url)), iv);
    return () => clearInterval(t);
  }, [visible, isSnapshot, media]);

  return (
    <div ref={holderRef} className="relative aspect-video bg-black/70 overflow-hidden">
      {isSnapshot && src && !imgFailed ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={cam.name}
          loading="lazy"
          className="absolute inset-0 w-full h-full object-cover"
          onError={() => setImgFailed(true)}
        />
      ) : kind === 'embed' && poster ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={poster}
          alt={cam.name}
          loading="lazy"
          className="absolute inset-0 w-full h-full object-cover"
          onError={() => setImgFailed(true)}
        />
      ) : (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-gradient-to-b from-white/[0.04] to-black/60 text-white/35">
          {kind === 'video' || kind === 'embed' ? (
            <PlayCircle className="w-9 h-9" />
          ) : (
            <Camera className="w-9 h-9" />
          )}
          <span className="text-[10px] font-mono uppercase tracking-[0.2em]">
            {kind === 'link' ? 'Listing only' : 'Tap to watch'}
          </span>
        </div>
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

/**
 * The playable camera grid for a country page: search, area filters and a
 * card per camera in the live catalogue, each opening in the same
 * CameraViewer the globe uses. Reusable for any country — the page passes
 * the country's entry from COUNTRY_CAMERA_EXPLORERS and nothing else.
 */
/**
 * Retry backoff for a cold catalogue, in milliseconds between attempts:
 * after a deploy each serverless instance warms its own /api/cctv catalogue
 * region by region, so an early answer can come back with regions still
 * pending — or no cameras yet — for far longer than a single 4s retry ever
 * covered. Total window ≈ 82s of waits plus fetch time (~90s).
 */
const RETRY_DELAYS_MS = [2000, 5000, 10000, 15000, 20000, 30000];

export default function CountryCameraExplorer({ config }: { config: CountryExplorerConfig }) {
  const [load, setLoad] = useState<LoadState>({ status: 'loading' });
  const [runId, setRunId] = useState(0);
  const [query, setQuery] = useState('');
  const [area, setArea] = useState<string | null>(null);
  const [active, setActive] = useState<CountryCamera | null>(null);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    setLoad({ status: 'loading' });

    const wait = (ms: number) =>
      new Promise<void>(resolve => {
        timer = setTimeout(resolve, ms);
      });

    void (async () => {
      /* The latest selection from any attempt this run. If the schedule runs
         out after a failure, cameras we already hold beat an error wall. */
      let latest: CountryCamera[] = [];
      let everSucceeded = false;
      for (let attempt = 0; ; attempt++) {
        let settled = false;
        try {
          const r = await fetch(`/api/cctv?region=${config.regions.join(',')}`);
          if (!r.ok) throw new Error(`HTTP ${r.status}`);
          const data = await r.json();
          if (cancelled) return;
          everSucceeded = true;
          latest = selectCountryCameras(
            Array.isArray(data?.cameras) ? data.cameras : [],
            config,
          );
          /* Settled only when this country actually has cameras and no
             region is still pending — anything else can be a cold
             catalogue mid-warm-up, so stay in the loop below. */
          settled = latest.length > 0 && (data?.pendingRegions?.length ?? 0) === 0;
        } catch {
          /* A failed fetch stays in the loop below: with 6 scheduled
             retries it is retried well past the 3-attempt minimum before
             the error state can be reached. */
          if (cancelled) return;
        }
        if (settled) {
          setLoad({ status: 'ready', cameras: latest });
          return;
        }
        if (attempt >= RETRY_DELAYS_MS.length) {
          /* Schedule exhausted (≈90s): show what an earlier attempt found,
             the honest empty state when a warm catalogue truly has none,
             or the error state when every attempt failed. */
          if (everSucceeded || latest.length > 0) setLoad({ status: 'ready', cameras: latest });
          else setLoad({ status: 'error' });
          return;
        }
        await wait(RETRY_DELAYS_MS[attempt]);
        if (cancelled) return;
      }
    })();

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [config, runId]);

  /* Hero stat sync: the country page's hero "live cameras" tile is rendered
     from the directory snapshot, whose count goes stale between snapshot
     rebuilds and visibly contradicts this explorer's live count on the same
     page. Once the live selection settles, overwrite the tile (targeted by
     the data attribute the page template carries) with the live number.
     Tile absent → no-op. */
  useEffect(() => {
    if (load.status !== 'ready') return;
    const el = document.querySelector('[data-country-live-cameras]');
    if (el) el.textContent = load.cameras.length.toLocaleString('en-US');
  }, [load]);

  const cameras = load.status === 'ready' ? load.cameras : [];
  const areas = useMemo(() => cameraAreas(cameras), [cameras]);
  const shown = useMemo(() => filterCameras(cameras, { query, area }), [cameras, query, area]);

  const openCamera = (cam: CountryCamera) => {
    trackAnalyticsEvent('camera_open');
    setActive(cam);
  };

  return (
    <div>
      {/* Search */}
      <div className="relative">
        <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-white/35 pointer-events-none" />
        <input
          type="search"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder={`Search ${config.country} cameras — a beach, a road, a district…`}
          aria-label={`Search ${config.country} cameras`}
          className="w-full rounded-xl border border-white/10 bg-white/[0.03] pl-10 pr-4 py-3 text-sm placeholder:text-white/30 focus:outline-none focus:border-[#D4AF37]/60 focus:ring-1 focus:ring-[#D4AF37]/40"
        />
      </div>

      {/* Area filters — real city values from the records, counts included */}
      {areas.length > 1 && (
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
            All areas · {cameras.length}
          </button>
          {areas.map(a => (
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
      {load.status === 'ready' && (
        <p className="mt-4 text-xs text-white/40" role="status">
          {shown.length === cameras.length
            ? `${cameras.length} cameras in the live WorldEye index for ${config.country} — the same catalogue that powers the globe.`
            : `Showing ${shown.length} of ${cameras.length} cameras.`}
        </p>
      )}

      {/* Grid / states */}
      {load.status === 'loading' ? (
        <div className="mt-4" aria-busy="true">
          {/* Unmissable loading signal: the section must never read as an
              empty void while the catalogue is still warming up. This state
              is the component's initial state, so it is part of the server
              render — visible before hydration, not only after it. */}
          <p className="flex items-center gap-2.5 text-sm text-white/70" role="status">
            <Loader2 className="w-4 h-4 animate-spin text-[#D4AF37] shrink-0" />
            Loading live cameras…
            <span className="text-white/35">
              Fetching the live index for {config.country} — right after an update this can take a little while.
            </span>
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
      ) : load.status === 'error' ? (
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
      ) : shown.length === 0 ? (
        <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-center">
          <p className="text-sm text-white/70">
            {cameras.length === 0
              ? `No cameras for ${config.country} are in the live index right now.`
              : 'No cameras match that search.'}
          </p>
          <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
            {cameras.length > 0 && (
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
      ) : (
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {shown.map(cam => (
            <CameraCard key={cam.id} cam={cam} onOpen={openCamera} />
          ))}
        </div>
      )}

      <p className="mt-4 text-[11px] text-white/30 leading-relaxed">
        Feeds are provided by their operators and public sources; a camera whose stream has gone
        off air shows as unavailable rather than playing a recording. Snapshot cards refresh about
        every 15 seconds — video plays when you open a camera.
      </p>

      {/* The globe's own viewer, unchanged: one active player at a time. */}
      {active && <CameraViewer camera={active} onClose={() => setActive(null)} />}
    </div>
  );
}
