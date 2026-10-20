"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  freshen,
  refreshInterval,
  type PreviewKind,
} from "@/lib/camera-preview";

/**
 * Live proof strip for /gods-eye-view.
 *
 * A GEV searcher arrives wanting to use a live globe, so this page shows
 * the product instead of describing it: real stills from the live
 * catalogue, resolved through the same showcase route the homepage
 * gallery uses (curated manifest → /api/cctv/showcase). Stills only —
 * no video machinery — and the same honesty contract as the gallery:
 * the LIVE badge renders only after a frame has verifiably loaded in
 * this session, a camera whose frame fails hides its card, and if the
 * strip can't fill, the whole section quietly omits itself. Tapping a
 * card opens that exact camera on the globe (/?camera=<id>).
 */

interface ShowcaseCam {
  id: string;
  name: string;
  city: string;
  country: string;
  source: string;
  media: { kind: string; url: string };
}

const STILL_KINDS = new Set(["jpg", "mjpeg"]);
const MAX_CARDS = 6;
const MIN_CARDS = 3;

const reduceMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function StillCard({
  cam,
  onFail,
}: {
  cam: ShowcaseCam;
  onFail: (id: string) => void;
}) {
  const [ready, setReady] = useState(false);
  const every = reduceMotion()
    ? 0
    : refreshInterval(cam.media.kind as PreviewKind);
  const [src, setSrc] = useState(() =>
    every ? freshen(cam.media.url) : cam.media.url,
  );
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

  const location = [cam.city, cam.country].filter(Boolean).join(", ");
  return (
    <Link
      href={`/?camera=${encodeURIComponent(cam.id)}&utm_source=gods-eye-view&utm_medium=live-strip`}
      className="group relative block overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] hover:border-[#00E5FF]/50 transition"
    >
      <div className="relative w-full aspect-video overflow-hidden bg-black/40">
        {/* eslint-disable-next-line @next/next/no-img-element -- remote camera frames, no loader */}
        <img
          src={src}
          alt={`${cam.name} — live camera`}
          loading="lazy"
          className="absolute inset-0 h-full w-full object-cover"
          onLoad={() => setReady(true)}
          onError={() => onFail(cam.id)}
          draggable={false}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-black/10 pointer-events-none" />
        {ready && (
          <span className="absolute top-3 left-3 inline-flex items-center gap-1.5 rounded bg-black/55 px-2 py-0.5 text-[10px] font-bold tracking-widest text-white">
            <span
              className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse motion-reduce:animate-none"
              aria-hidden
            />
            LIVE
          </span>
        )}
        <div className="absolute bottom-0 left-0 right-0 p-3 pointer-events-none">
          <p className="font-semibold text-white text-sm leading-snug drop-shadow">
            {cam.name}
          </p>
          <p className="text-xs text-white/60 mt-0.5">
            {[location, cam.source].filter(Boolean).join(" · ")}
          </p>
        </div>
      </div>
    </Link>
  );
}

export default function GodsEyeLiveStrip() {
  const [cams, setCams] = useState<ShowcaseCam[] | null>(null);
  const [failedIds, setFailedIds] = useState<ReadonlySet<string>>(new Set());
  const [dead, setDead] = useState(false);
  const rootRef = useRef<HTMLElement>(null);
  const fetchedRef = useRef(false);

  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const load = () => {
      if (fetchedRef.current) return;
      fetchedRef.current = true;
      fetch("/api/cctv/showcase?category=featured")
        .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
        .then((json: { cameras?: ShowcaseCam[] }) => {
          const stills = (json.cameras ?? [])
            .filter((c) => STILL_KINDS.has(c.media.kind))
            .slice(0, MAX_CARDS);
          if (stills.length >= MIN_CARDS) setCams(stills);
          else setDead(true);
        })
        .catch(() => setDead(true));
    };
    if (typeof IntersectionObserver === "undefined") {
      load();
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          load();
          io.disconnect();
        }
      },
      { rootMargin: "300px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const visible = (cams ?? []).filter((c) => !failedIds.has(c.id));
  if (dead || (cams && visible.length < MIN_CARDS)) return null;

  return (
    <section ref={rootRef} className="mt-14 max-w-5xl mx-auto" aria-label="Live cameras right now">
      <div className="flex items-end justify-between gap-4 px-1">
        <div>
          <h2 className="text-xl md:text-2xl font-bold">
            Live <span className="text-[#00E5FF]">right now</span>
          </h2>
          <p className="text-white/50 text-sm mt-1">
            Real cameras from the live catalogue — tap one to open it on the globe.
          </p>
        </div>
        <Link
          href="/cameras"
          className="hidden sm:inline-block shrink-0 text-sm font-semibold text-[#00E5FF] hover:text-[#4deeff] transition"
        >
          Browse all 74,229 →
        </Link>
      </div>
      {cams ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-5">
          {visible.map((cam) => (
            <StillCard
              key={cam.id}
              cam={cam}
              onFail={(id) =>
                setFailedIds((prev) => new Set(prev).add(id))
              }
            />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-5" aria-hidden>
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="rounded-2xl border border-white/5 bg-white/[0.03] animate-pulse motion-reduce:animate-none aspect-video"
            />
          ))}
        </div>
      )}
    </section>
  );
}
