"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  freshen,
  refreshInterval,
  type PreviewKind,
} from "@/lib/camera-preview";

/**
 * Featured live cameras for the competitor head-to-head pages (the
 * /compare/<a>-vs-<b> family). The pair JSON curates catalogue IDs from
 * the same landing manifest the homepage gallery uses; resolution goes
 * through the same showcase route (curated manifest → /api/cctv/
 * showcase), so a camera appears only if the catalogue still carries
 * it AND the site's own preview machinery can play it.
 *
 * The honesty contract is the gallery's: stills only, the LIVE badge
 * renders only after a frame has verifiably loaded in this session, a
 * camera whose frame fails hides its card, and if fewer than three
 * cameras survive, the whole strip omits itself rather than showing a
 * broken promise. Tapping a card opens that exact camera on the globe
 * (/?camera=<id>).
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
  pairSlug,
  onFail,
}: {
  cam: ShowcaseCam;
  pairSlug: string;
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
      href={`/?camera=${encodeURIComponent(cam.id)}&utm_source=compare-${pairSlug}&utm_medium=live-cams`}
      className="group relative block overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] hover:border-[#0096FF]/50 transition"
    >
      <div className="relative w-full aspect-video overflow-hidden bg-black/40">
        {/* eslint-disable-next-line @next/next/no-img-element -- remote camera frames, no loader */}
        <img
          src={src}
          alt={`${cam.name} — live camera on WorldEye`}
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

export default function PairLiveCams({
  categories,
  ids,
  title,
  blurb,
  pairSlug,
}: {
  categories: string[];
  ids: string[];
  title: string;
  blurb: string;
  pairSlug: string;
}) {
  const [cams, setCams] = useState<ShowcaseCam[] | null>(null);
  const [failedIds, setFailedIds] = useState<ReadonlySet<string>>(new Set());
  const [dead, setDead] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const fetchedRef = useRef(false);

  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const load = () => {
      if (fetchedRef.current) return;
      fetchedRef.current = true;
      Promise.all(
        categories.map((category) =>
          fetch(`/api/cctv/showcase?category=${encodeURIComponent(category)}`)
            .then((r) =>
              r.ok ? r.json() : Promise.reject(new Error(String(r.status))),
            )
            .then((json: { cameras?: ShowcaseCam[] }) => json.cameras ?? [])
            .catch(() => [] as ShowcaseCam[]),
        ),
      )
        .then((lists) => {
          const byId = new Map<string, ShowcaseCam>();
          for (const list of lists) {
            for (const cam of list) {
              if (!byId.has(cam.id)) byId.set(cam.id, cam);
            }
          }
          const ordered = ids
            .map((id) => byId.get(id))
            .filter((c): c is ShowcaseCam => !!c)
            .filter((c) => STILL_KINDS.has(c.media.kind))
            .slice(0, MAX_CARDS);
          if (ordered.length >= MIN_CARDS) setCams(ordered);
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
  }, [categories, ids]);

  const visible = (cams ?? []).filter((c) => !failedIds.has(c.id));
  if (dead || (cams && visible.length < MIN_CARDS)) return null;

  return (
    <div ref={rootRef} className="mt-8">
      <h3 className="text-lg font-bold text-white">{title}</h3>
      <p className="text-sm text-white/50 mt-1.5 leading-relaxed">{blurb}</p>
      {cams ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-5">
          {visible.map((cam) => (
            <StillCard
              key={cam.id}
              cam={cam}
              pairSlug={pairSlug}
              onFail={(id) => setFailedIds((prev) => new Set(prev).add(id))}
            />
          ))}
        </div>
      ) : (
        <div
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-5"
          aria-hidden
        >
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="rounded-2xl border border-white/5 bg-white/[0.03] animate-pulse motion-reduce:animate-none aspect-video"
            />
          ))}
        </div>
      )}
    </div>
  );
}
