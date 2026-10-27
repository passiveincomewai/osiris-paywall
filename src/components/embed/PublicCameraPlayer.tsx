"use client";

/**
 * The public single-camera embed player: one rights-cleared camera in
 * a chrome-light frame for a partner's or blogger's page. Snapshot
 * cameras refresh their still on a 20s tick (one camera = 3 frame
 * requests/min, far inside the frame route's per-IP budget); HLS
 * cameras without a still play muted via hls.js; anything else links
 * out to its stream. Agency attribution rides the caption, the camera
 * name links back to the camera on WorldEye, and the "Powered by
 * WorldEye" mark is part of the player — the free embed is never
 * white-label.
 */
import { useEffect, useRef, useState } from "react";
import { watchOnWorldEyeUrl } from "@/lib/embed/snippet";
import type { PublicEmbedCamera } from "@/lib/embed/public";

const REFRESH_MS = 20_000;

function HlsVideo({ cam }: { cam: PublicEmbedCamera }) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const video = ref.current;
    if (!video || !cam.streamUrl) return;
    let hls: { destroy: () => void } | null = null;
    let cancelled = false;
    if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = cam.streamUrl;
    } else {
      import("hls.js")
        .then(({ default: Hls }) => {
          if (cancelled || !ref.current || !cam.streamUrl) return;
          if (Hls.isSupported()) {
            const instance = new Hls({ maxBufferLength: 10 });
            instance.loadSource(cam.streamUrl);
            instance.attachMedia(ref.current);
            hls = instance;
          }
        })
        .catch(() => undefined);
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

export default function PublicCameraPlayer({ cam }: { cam: PublicEmbedCamera }) {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (!cam.snapshotUrl) return;
    const id = setInterval(() => setTick((t) => t + 1), REFRESH_MS);
    return () => clearInterval(id);
  }, [cam.snapshotUrl]);

  const sep = cam.snapshotUrl?.includes("?") ? "&" : "?";
  return (
    <figure className="relative w-full h-full bg-black overflow-hidden">
      {cam.snapshotUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={`${cam.snapshotUrl}${sep}t=${tick}`}
          alt={cam.name}
          className="absolute inset-0 w-full h-full object-cover"
        />
      ) : cam.streamUrl && cam.streamType === "hls" ? (
        <HlsVideo cam={cam} />
      ) : cam.streamUrl ? (
        <a
          href={cam.streamUrl}
          target="_blank"
          rel="noreferrer"
          className="absolute inset-0 flex items-center justify-center text-sm text-white/70 hover:text-white"
        >
          Open live stream ↗
        </a>
      ) : null}
      <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent px-3 pt-8 pb-2.5 flex items-end justify-between gap-3 pointer-events-none">
        <span className="min-w-0">
          <a
            href={watchOnWorldEyeUrl(cam.id)}
            target="_top"
            rel="noreferrer"
            title="Watch on WorldEye"
            className="pointer-events-auto block text-[13px] font-semibold text-white truncate hover:underline"
          >
            {cam.name}
          </a>
          <span className="block text-[11px] text-white/60 truncate">
            {[cam.city, cam.country].filter(Boolean).join(", ")} · {cam.attribution}
          </span>
        </span>
        <a
          href="https://worldeye.app"
          target="_top"
          rel="noreferrer"
          className="pointer-events-auto shrink-0 text-[10px] font-mono tracking-[0.18em] text-white/70 hover:text-white"
        >
          POWERED BY <span className="text-[#D4AF37] font-bold">WORLDEYE</span>
        </a>
      </figcaption>
    </figure>
  );
}
