"use client";

/**
 * The embeddable live wall: a chrome-light grid of a collection's
 * cameras for the customer's own site. Snapshot cameras refresh their
 * still on a shared tick (the frame route's per-IP budget is 90/min —
 * a 20-camera wall at a 20s tick uses 60); HLS cameras without a still
 * play muted via hls.js; anything else links out to its stream. Agency
 * attribution rides every tile, "Powered by WorldEye" the footer.
 */
import { useEffect, useRef, useState } from "react";
import type { FeedCamera } from "@/lib/enterprise/payload";

const REFRESH_MS = 20_000;

function HlsTile({ cam }: { cam: FeedCamera }) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const video = ref.current;
    if (!video || !cam.streamUrl) return;
    let hls: { destroy: () => void } | null = null;
    let cancelled = false;
    if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = cam.streamUrl;
    } else {
      import("hls.js").then(({ default: Hls }) => {
        if (cancelled || !ref.current || !cam.streamUrl) return;
        if (Hls.isSupported()) {
          const instance = new Hls({ maxBufferLength: 10 });
          instance.loadSource(cam.streamUrl);
          instance.attachMedia(ref.current);
          hls = instance;
        }
      }).catch(() => undefined);
    }
    return () => {
      cancelled = true;
      hls?.destroy();
    };
  }, [cam.streamUrl]);
  return (
    <video
      ref={ref}
      muted
      autoPlay
      playsInline
      className="absolute inset-0 w-full h-full object-cover"
      aria-label={cam.name}
    />
  );
}

function Tile({ cam, tick }: { cam: FeedCamera; tick: number }) {
  const sep = cam.snapshotUrl?.includes("?") ? "&" : "?";
  return (
    <figure className="relative aspect-video bg-black/60 overflow-hidden rounded-lg">
      {cam.snapshotUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={`${cam.snapshotUrl}${sep}t=${tick}`}
          alt={cam.name}
          loading="lazy"
          className="absolute inset-0 w-full h-full object-cover"
        />
      ) : cam.streamUrl && cam.streamType === "hls" ? (
        <HlsTile cam={cam} />
      ) : cam.streamUrl ? (
        <a
          href={cam.streamUrl}
          target="_blank"
          rel="noreferrer"
          className="absolute inset-0 flex items-center justify-center text-xs text-white/70 hover:text-white"
        >
          Open live stream ↗
        </a>
      ) : null}
      <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 to-transparent px-2.5 pt-6 pb-2 pointer-events-none">
        <p className="text-xs font-semibold text-white truncate">{cam.name}</p>
        <p className="text-[10px] text-white/55 truncate">
          {[cam.city, cam.country].filter(Boolean).join(", ")} · {cam.attribution}
        </p>
      </figcaption>
    </figure>
  );
}

export default function EmbedGrid({
  name,
  cameras,
}: {
  name: string;
  cameras: FeedCamera[];
}) {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), REFRESH_MS);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="min-h-screen bg-[#05070d] text-white p-3 sm:p-4">
      <div className="flex items-baseline justify-between gap-3 mb-3">
        <h1 className="text-sm font-bold tracking-tight truncate">{name}</h1>
        <a
          href="https://worldeye.app"
          target="_blank"
          rel="noreferrer"
          className="text-[10px] uppercase tracking-widest text-white/40 hover:text-white/70 shrink-0"
        >
          Powered by WorldEye
        </a>
      </div>
      {cameras.length === 0 ? (
        <p className="text-sm text-white/45 py-10 text-center">
          This collection has no cameras available to show right now.
        </p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {cameras.map((cam) => (
            <Tile key={cam.id} cam={cam} tick={tick} />
          ))}
        </div>
      )}
    </div>
  );
}
