"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import {
  freshen,
  refreshInterval,
  VIDEO_KINDS,
  type PreviewKind,
} from "@/lib/camera-preview";
import { LANDING_CATEGORIES } from "@/lib/landing-cameras";

/**
 * Section 1 island — the live camera gallery.
 *
 * Data comes from /api/cctv/showcase (the curated manifest resolved
 * against the real catalogue). Media renders through the app's own
 * preview contract (lib/camera-preview): snapshot feeds refresh on the
 * same cadence as the map tiles, video is muted/looped with hls.js
 * imported lazily, and at most one video plays — the lead card's.
 *
 * The LIVE badge is earned, never assumed: it renders only after that
 * card's media has verifiably loaded in this session. A card whose media
 * fails hides itself; if a whole tab fails, the section's static category
 * cards take over (they are the server-rendered fallback this island
 * replaces, passed back in by the shell if the fetch itself fails).
 */

interface ShowcaseCam {
  id: string;
  name: string;
  city: string;
  country: string;
  source: string;
  media: { kind: PreviewKind; url: string };
}

interface ShowcaseData {
  href: string;
  cameras: ShowcaseCam[];
}

const reduceMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function ImageMedia({
  cam,
  onReady,
  onFail,
}: {
  cam: ShowcaseCam;
  onReady: () => void;
  onFail: () => void;
}) {
  const every = reduceMotion() ? 0 : refreshInterval(cam.media.kind);
  const [src, setSrc] = useState(() => (every ? freshen(cam.media.url) : cam.media.url));
  useEffect(() => {
    if (!every) return;
    let interval: ReturnType<typeof setInterval> | undefined;
    const first = setTimeout(() => {
      setSrc(freshen(cam.media.url));
      interval = setInterval(() => setSrc(freshen(cam.media.url)), every);
    }, every + Math.random() * 2000);
    return () => {
      clearTimeout(first);
      if (interval) clearInterval(interval);
    };
  }, [cam.media.url, every]);
  return (
    /* eslint-disable-next-line @next/next/no-img-element -- remote camera frames, no loader */
    <img
      src={src}
      alt={`${cam.name} — live camera`}
      loading="lazy"
      className="absolute inset-0 h-full w-full object-cover"
      onLoad={onReady}
      onError={onFail}
      draggable={false}
    />
  );
}

function VideoMedia({
  cam,
  playing,
  onReady,
  onFail,
}: {
  cam: ShowcaseCam;
  playing: boolean;
  onReady: () => void;
  onFail: () => void;
}) {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    let hls: { destroy: () => void } | null = null;
    let dead = false;
    const fail = () => {
      if (!dead) onFail();
    };
    if (cam.media.kind === "hls") {
      if (video.canPlayType("application/vnd.apple.mpegurl")) {
        video.src = cam.media.url;
      } else {
        import("hls.js")
          .then(({ default: Hls }) => {
            if (dead) return;
            if (Hls.isSupported()) {
              const h = new Hls({ enableWorker: false, maxBufferLength: 6 });
              h.loadSource(cam.media.url);
              h.attachMedia(video);
              h.on(Hls.Events.ERROR, (_e, data) => {
                if (data.fatal) fail();
              });
              hls = h;
            } else {
              fail();
            }
          })
          .catch(fail);
      }
    } else {
      video.src = cam.media.url;
    }
    const onErr = () => fail();
    video.addEventListener("error", onErr);
    return () => {
      dead = true;
      video.removeEventListener("error", onErr);
      if (hls) hls.destroy();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cam.id]);

  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    if (playing && !reduceMotion()) {
      video.play().catch(() => {});
    } else {
      video.pause();
    }
  }, [playing]);

  return (
    <video
      ref={ref}
      muted
      loop
      playsInline
      preload="metadata"
      className="absolute inset-0 h-full w-full object-cover"
      onLoadedData={onReady}
    />
  );
}

function CameraCard({
  cam,
  href,
  lead,
  galleryVisible,
}: {
  cam: ShowcaseCam;
  href: string;
  lead: boolean;
  galleryVisible: boolean;
}) {
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  if (failed) return null;
  const isVideo = VIDEO_KINDS.has(cam.media.kind);
  const location = [cam.city, cam.country].filter(Boolean).join(", ");
  return (
    <Link
      href={href}
      data-landing-event={`camera_card:${cam.id}`}
      className={`group relative block overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] hover:border-[#0096FF]/50 transition ${lead ? "md:col-span-2" : ""}`}
    >
      <div className={`relative w-full overflow-hidden bg-black/40 ${lead ? "aspect-[2/1] md:aspect-auto md:h-full md:min-h-[220px]" : "aspect-video"}`}>
        {isVideo ? (
          <VideoMedia
            cam={cam}
            playing={lead && galleryVisible}
            onReady={() => setReady(true)}
            onFail={() => setFailed(true)}
          />
        ) : (
          <ImageMedia cam={cam} onReady={() => setReady(true)} onFail={() => setFailed(true)} />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-black/10 pointer-events-none" />
        {ready && (
          <span className="absolute top-3 left-3 inline-flex items-center gap-1.5 rounded bg-black/55 px-2 py-0.5 text-[10px] font-bold tracking-widest text-white">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse motion-reduce:animate-none" aria-hidden />
            LIVE
          </span>
        )}
        <div className="absolute bottom-0 left-0 right-0 p-3 pointer-events-none">
          <p className="font-semibold text-white text-sm leading-snug drop-shadow">{cam.name}</p>
          <p className="text-xs text-white/60 mt-0.5">
            {[location, cam.source].filter(Boolean).join(" · ")}
          </p>
        </div>
      </div>
    </Link>
  );
}

export default function CameraGallery() {
  const [active, setActive] = useState(LANDING_CATEGORIES[0].slug);
  const [data, setData] = useState<ShowcaseData | null>(null);
  const [fetchFailed, setFetchFailed] = useState(false);
  const [visible, setVisible] = useState(true);
  const cache = useRef(new Map<string, ShowcaseData>());
  const rootRef = useRef<HTMLDivElement>(null);
  const reqRef = useRef(0);

  useEffect(() => {
    const el = rootRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      (entries) => setVisible(entries.some((e) => e.isIntersecting)),
      { threshold: 0.05 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    const cached = cache.current.get(active);
    if (cached) {
      setData(cached);
      setFetchFailed(false);
      return;
    }
    const req = ++reqRef.current;
    setData(null);
    setFetchFailed(false);
    fetch(`/api/cctv/showcase?category=${active}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((json: ShowcaseData) => {
        cache.current.set(active, json);
        if (reqRef.current === req) setData(json);
      })
      .catch(() => {
        if (reqRef.current === req) setFetchFailed(true);
      });
  }, [active]);

  const activeCategory = LANDING_CATEGORIES.find((c) => c.slug === active) ?? LANDING_CATEGORIES[0];

  return (
    <div ref={rootRef} className="mt-10">
      <div role="tablist" aria-label="Camera categories" className="flex gap-2 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {LANDING_CATEGORIES.map((cat) => (
          <button
            key={cat.slug}
            role="tab"
            aria-selected={active === cat.slug}
            data-landing-event={`camera_tab:${cat.slug}`}
            onClick={() => setActive(cat.slug)}
            className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition border ${
              active === cat.slug
                ? "bg-[#0096FF] border-[#0096FF] text-white"
                : "border-white/15 text-white/65 hover:text-white hover:border-white/35"
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {fetchFailed || (data && data.cameras.length === 0) ? (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-4">
          {LANDING_CATEGORIES.slice(1).map((cat) => (
            <Link
              key={cat.slug}
              href={cat.href}
              className="rounded-2xl border border-white/10 bg-white/[0.03] hover:border-[#0096FF]/50 transition p-5 font-semibold text-white"
            >
              {cat.label}
            </Link>
          ))}
        </div>
      ) : data ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mt-4">
          {data.cameras.slice(0, 8).map((cam, i) => (
            <CameraCard key={cam.id} cam={cam} href={data.href} lead={i === 0} galleryVisible={visible} />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mt-4" aria-hidden>
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className={`rounded-2xl border border-white/5 bg-white/[0.03] animate-pulse motion-reduce:animate-none aspect-video ${i === 0 ? "md:col-span-2" : ""}`} />
          ))}
        </div>
      )}

      <Link
        href={activeCategory.href}
        data-landing-event="cta:cameras"
        className="inline-flex items-center gap-2 mt-6 text-sm font-semibold text-[#0096FF] hover:text-[#0aa5ff] transition"
      >
        Explore Live Cameras <ArrowRight className="w-4 h-4" aria-hidden />
      </Link>
    </div>
  );
}
