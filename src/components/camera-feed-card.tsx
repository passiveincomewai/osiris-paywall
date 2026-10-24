'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { Camera, MapPin, PlayCircle } from 'lucide-react';
import ViewOnGlobeButton from '@/components/ViewOnGlobeButton';
import { cameraViewSeed, freshen, previewMedia, refreshInterval } from '@/lib/camera-preview';
import {
  cameraMediaKind,
  youtubePosterUrl,
  type CountryCamera,
} from '@/lib/country-cameras';

/**
 * The directory pages' live camera card, shared by every explorer
 * (country pages first; the region / category / traffic / city
 * explorers in DirectoryExplorer reuse it unchanged). Extracted from
 * CountryCameraExplorer so there is exactly one implementation of
 * the feed discipline: a card shows the camera's real current frame
 * or stream, the LIVE badge is earned on load, video decoding is
 * budgeted page-wide, and a dead feed keeps its card with an honest
 * unavailable state instead of vanishing.
 */

/* The viewer (hls.js and all) loads only when a visitor actually opens a
   camera — the same lazy mount the globe uses, so a directory page's
   initial bundle carries none of it. */
export const LazyCameraViewer = dynamic(() => import('@/components/CameraViewer'), { ssr: false });

const KIND_LABEL: Record<string, string> = {
  video: 'Live video',
  snapshot: 'Live snapshot',
  embed: 'Live embed',
  link: 'At source',
};

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
 * A snapshot or MJPEG card: the camera's actual current frame, requested
 * only while the card is on screen. Snapshots re-request on the preview
 * machinery's cadence (lib/camera-preview — the same one the landing
 * gallery and the map tiles use); MJPEG is one continuous response and is
 * never cache-busted. The LIVE badge renders only after a frame has
 * verifiably loaded — earned, never assumed, as on the landing page.
 */
function LiveImage({ cam, kind, url }: { cam: CountryCamera; kind: 'jpg' | 'mjpeg'; url: string }) {
  const { ref, inView } = useInView<HTMLDivElement>();
  const [src, setSrc] = useState<string>(() => (kind === 'jpg' ? freshen(url) : url));
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const retried = useRef(false);

  useEffect(() => {
    if (!inView || failed || kind !== 'jpg') return;
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
  }, [inView, kind, url, failed]);

  return (
    <div ref={ref} className="absolute inset-0">
      {inView && !failed ? (
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
function LiveVideo({ kind, url }: { kind: 'hls' | 'mp4'; url: string }) {
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
    // Autoplay off (settings item 12): never take a video slot — the
    // card keeps its labelled still state instead of playing.
    if (!inView || failed || !cameraViewSeed().autoplay) return;
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
        <LiveVideo kind={media.kind === 'mp4' ? 'mp4' : 'hls'} url={media.url} />
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

export function CameraFeedCard({ cam, onOpen, caption }: { cam: CountryCamera; onOpen: (cam: CountryCamera) => void; caption?: string }) {
  return (
    /* The card is a container, not one big button: the preview + info
       area keeps the open-in-viewer action, and the footer carries the
       "View on globe" deep link as its sibling (a link nested inside
       the button would be invalid HTML, and its click would open the
       viewer instead of navigating to the globe). */
    <div className="group flex flex-col rounded-2xl border border-white/10 bg-white/[0.03] overflow-hidden hover:border-[#D4AF37]/50 hover:bg-white/[0.05] transition">
      <button
        type="button"
        onClick={() => onOpen(cam)}
        className="block w-full text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D4AF37]"
        aria-label={`Watch ${cam.name}`}
      >
        <CardPreview cam={cam} />
        <div className="p-3.5 pb-2">
          <div className="font-semibold text-sm leading-snug line-clamp-2 min-h-[2.5em]">{cam.name}</div>
          <div className="mt-1.5 flex items-center gap-1.5 text-xs text-white/45">
            <MapPin className="w-3.5 h-3.5 text-[#00E5FF] shrink-0" />
            <span className="truncate">{cam.city || '—'}</span>
          </div>
          {cam.source && <div className="mt-1 text-[11px] text-white/30 truncate">{cam.source}</div>}
        </div>
      </button>
      <div className="px-3.5 pb-3.5 pt-1 mt-auto flex items-center justify-between gap-2">
        <ViewOnGlobeButton cameraId={cam.id} cameraName={cam.name} />
        {caption && <span className="text-[11px] text-white/40 text-right">{caption}</span>}
      </div>
    </div>
  );
}
