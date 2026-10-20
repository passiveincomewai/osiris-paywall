"use client";

/**
 * Cameras on this route — live feeds of the catalogue cameras the
 * plotted route passes (corridor maths in lib/route-cameras).
 *
 * A Pro feature. Subscribers get the feeds: stills that refresh on
 * the preview cadence (lib/camera-preview — video-kind cameras come
 * through the /api/cctv/frame stills pipeline instead), each card
 * earning its LIVE badge only once its media has actually loaded,
 * exactly like the landing gallery. Tapping a card opens the camera
 * through the shipped we:open-camera bridge, so the free-camera gate
 * and counting in handleEntityClick apply unchanged.
 *
 * Everyone else gets the lock: the route's camera count when the
 * corridor honestly produced one, and the trial picker the other Pro
 * locks use. An empty corridor says so plainly to subscribers; free
 * visitors keep the generic teaser rather than a borrowed count.
 */

import { useEffect, useMemo, useState } from "react";
import { Loader2, Lock, Video } from "lucide-react";
import {
  findRouteCameras,
  ROUTE_CAMERA_CAP,
  type RouteCamera,
  type RouteCameraCandidate,
} from "@/lib/route-cameras";
import { freshen, refreshInterval } from "@/lib/camera-preview";
import { dispatchOpenCamera } from "@/lib/onboarding/first-camera";
import { formatDistance } from "./DirectionsBar";
import TrialPicker from "./TrialPicker";

interface RouteCamerasProps {
  /** The plotted route's geometry; null hides the panel entirely. */
  geometry: { coordinates: [number, number][] } | null | undefined;
  /** The catalogue as currently loaded (it grows in region batches). */
  cameras: readonly RouteCameraCandidate[] | undefined;
  /** The catalogue's first load has settled — before that, an empty
   *  corridor means "not known yet", not "no cameras". */
  catalogueSettled: boolean;
  isPro: boolean;
  /** Ask the catalogue owner to complete the index (the corridor is
   *  only as honest as the catalogue behind it). */
  onNeedCatalog?: () => void;
}

/**
 * One feed card's media. Snapshot/MJPEG cameras render their feed
 * directly, refreshed on the preview cadence; video-kind cameras
 * (MP4/HLS) render a still from the frame pipeline instead of
 * decoding 24 videos inside a side panel. A card whose media fails
 * hides itself — the landing gallery's rule — and the LIVE badge is
 * earned on load, never assumed.
 */
function RouteCameraFeed({ cam }: { cam: RouteCamera }) {
  const isVideoKind = cam.media.kind === "mp4" || cam.media.kind === "hls";
  const stillSrc = isVideoKind
    ? `/api/cctv/frame?id=${encodeURIComponent(cam.id)}`
    : cam.media.url;
  const every = refreshInterval(isVideoKind ? "mp4" : cam.media.kind);
  const [src, setSrc] = useState(() => (every && !isVideoKind ? freshen(stillSrc) : stillSrc));
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!every) return;
    let interval: ReturnType<typeof setInterval> | undefined;
    const first = setTimeout(() => {
      setSrc(freshen(stillSrc));
      interval = setInterval(() => setSrc(freshen(stillSrc)), every);
    }, every + Math.random() * 2000);
    return () => {
      clearTimeout(first);
      if (interval) clearInterval(interval);
    };
  }, [stillSrc, every]);

  if (failed) return null;

  return (
    <button
      type="button"
      data-route-camera={cam.id}
      onClick={() => dispatchOpenCamera(cam.id)}
      aria-label={`Open live camera: ${cam.name}`}
      className="group relative block w-[176px] shrink-0 overflow-hidden rounded-xl border border-white/10 bg-black/40 text-left transition hover:border-[var(--gold-primary)]/60 focus:outline-none focus-visible:ring-1 focus-visible:ring-white/60"
    >
      <div className="relative aspect-video w-full overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element -- remote camera frames, no loader */}
        <img
          src={src}
          alt={`${cam.name} — live camera`}
          loading="lazy"
          draggable={false}
          onLoad={() => setReady(true)}
          onError={() => setFailed(true)}
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-black/10 pointer-events-none" />
        {ready && (
          <span className="absolute top-1.5 left-1.5 inline-flex items-center gap-1 rounded bg-black/55 px-1.5 py-0.5 text-[8.5px] font-bold tracking-widest text-white">
            <span className="w-1 h-1 rounded-full bg-red-500 animate-pulse motion-reduce:animate-none" aria-hidden />
            LIVE
          </span>
        )}
        <div className="absolute bottom-0 left-0 right-0 p-2 pointer-events-none">
          <p className="truncate text-[11px] font-semibold leading-snug text-white drop-shadow">{cam.name}</p>
          <p className="mt-0.5 truncate font-mono text-[8.5px] uppercase tracking-[0.12em] text-white/60">
            {[cam.city ?? cam.source, `${formatDistance(cam.alongRouteM)} along the route`]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </div>
      </div>
    </button>
  );
}

export default function RouteCameras({
  geometry,
  cameras,
  catalogueSettled,
  isPro,
  onNeedCatalog,
}: RouteCamerasProps) {
  const coords = geometry?.coordinates;
  const routeKey = useMemo(() => {
    if (!coords || coords.length < 2) return null;
    const first = coords[0];
    const last = coords[coords.length - 1];
    return `${coords.length}:${first[0]},${first[1]}:${last[0]},${last[1]}`;
  }, [coords]);

  /* A plotted route is a deliberate act: complete the catalogue for
     it, once per route. The sparse first-paint sample alone would
     miss most of the corridor. */
  useEffect(() => {
    if (routeKey) onNeedCatalog?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routeKey]);

  const matches = useMemo(
    () => (coords && coords.length >= 2 ? findRouteCameras(cameras, coords) : []),
    [cameras, coords],
  );
  const feeds = matches.slice(0, ROUTE_CAMERA_CAP);

  if (!routeKey) return null;

  return (
    <section
      aria-label="Cameras on this route"
      className="glass-panel tool-glass mt-1.5 px-3 py-2.5"
    >
      <div className="flex items-center gap-2">
        <Video className="h-3.5 w-3.5 shrink-0 text-[var(--gold-primary)]" aria-hidden />
        <h3 className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-[var(--text-heading)]">
          Cameras on this route
        </h3>
        {matches.length > 0 && (
          <span className="ml-auto font-mono text-[10px] tabular-nums text-[var(--text-muted)]">
            {matches.length}
          </span>
        )}
        {!isPro && <Lock className="h-3 w-3 shrink-0 text-[var(--gold-primary)]" aria-hidden />}
      </div>

      {isPro ? (
        feeds.length > 0 ? (
          <div className="mt-2 flex gap-2 overflow-x-auto pb-0.5 styled-scrollbar">
            {feeds.map((cam) => (
              <RouteCameraFeed key={cam.id} cam={cam} />
            ))}
          </div>
        ) : catalogueSettled ? (
          <p className="mt-1.5 text-[11.5px] leading-snug text-[var(--text-muted)]">
            No cameras along this route — the catalogue has none within 1.5 km of the line.
          </p>
        ) : (
          <p className="mt-1.5 flex items-center gap-2 text-[11.5px] text-[var(--text-muted)]">
            <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
            Looking for cameras along your route…
          </p>
        )
      ) : (
        <div className="mt-1.5">
          <p className="text-[11.5px] leading-snug text-[var(--text-secondary)]">
            {matches.length > 0 ? (
              <>
                <span className="font-semibold text-[var(--text-heading)]">{matches.length}</span>{" "}
                {matches.length === 1 ? "camera sits" : "cameras sit"} along this route. Live feeds
                for the drive are a Pro feature.
              </>
            ) : (
              <>Live camera feeds along your route are a Pro feature.</>
            )}
          </p>
          <div className="mt-2">
            <TrialPicker variant="compact" />
          </div>
        </div>
      )}
    </section>
  );
}
