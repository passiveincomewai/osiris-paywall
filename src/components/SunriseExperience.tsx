"use client";

/**
 * Sunrise Around the World — the living stage.
 *
 * The server hands over a selection computed for the request moment
 * (lib/sunrise via /api/sunrise); this component keeps it alive: the
 * featured camera rotates every 20 seconds, snapshot frames freshen
 * every 15, and the whole selection is recomputed from the API every
 * minute — the line moves a quarter-degree of longitude a minute, so
 * anything slower would start lying. Sunrise/sunset is a toggle that
 * re-asks the API for the other side of the planet.
 *
 * Times shown are the event instant in the VIEWER's timezone (labelled
 * "your time") plus a relative "in 12 min / 6 min ago" — exact numbers
 * that need no guessing at the camera's civil timezone.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { freshen, previewMedia } from "@/lib/camera-preview";
import { buildCameraShareUrl } from "@/lib/camera-share";
import { proxiedImageUrl } from "@/app/api/cctv/types";
import type { SunMode, SunPick, SunriseSelection } from "@/lib/sunrise";

const ADVANCE_MS = 20_000;
const REFRESH_MS = 60_000;
const FRESHEN_MS = 15_000;
const LABEL_TICK_MS = 30_000;

function fmtDuration(min: number): string {
  const rounded = Math.round(min);
  if (rounded < 1) return "under a minute";
  if (rounded < 60) return `${rounded} min`;
  const h = Math.floor(rounded / 60);
  const m = rounded % 60;
  return m ? `${h} h ${m} min` : `${h} h`;
}

function eventLabel(pick: SunPick, mode: SunMode): string {
  const noun = mode === "sunrise" ? "Sunrise" : "Sunset";
  return pick.offsetMinutes >= 0
    ? `${noun} in ${fmtDuration(pick.offsetMinutes)}`
    : `${noun} ${fmtDuration(-pick.offsetMinutes)} ago`;
}

function viewerTime(iso: string): string {
  try {
    return new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(
      new Date(iso),
    );
  } catch {
    return "";
  }
}

function placeLabel(pick: SunPick): string {
  return [pick.city, pick.country].filter(Boolean).join(", ");
}

function lngLabel(lng: number): string {
  const abs = Math.abs(lng).toFixed(1);
  return lng === 0 ? "0.0°" : `${abs}° ${lng > 0 ? "E" : "W"}`;
}

/** Stage media: the real frame for the featured camera. */
function StageMedia({ pick, tick }: { pick: SunPick; tick: number }) {
  const media = previewMedia(pick);
  if (!media) {
    return (
      <div className="absolute inset-0 bg-gradient-to-br from-[#1a2340] via-[#0a0f22] to-black" />
    );
  }
  if (media.kind === "jpg") {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        key={tick}
        src={proxiedImageUrl(freshen(media.url))}
        alt={pick.name}
        className="absolute inset-0 h-full w-full object-cover"
      />
    );
  }
  if (media.kind === "mjpeg") {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={proxiedImageUrl(media.url)}
        alt={pick.name}
        className="absolute inset-0 h-full w-full object-cover"
      />
    );
  }
  return (
    <video
      src={media.url}
      autoPlay
      muted
      loop
      playsInline
      className="absolute inset-0 h-full w-full object-cover"
      aria-label={pick.name}
    />
  );
}

/** Strip thumbnail: stills only — a wall of live videos would melt the page. */
function ThumbMedia({ pick }: { pick: SunPick }) {
  const media = previewMedia(pick);
  if (media && (media.kind === "jpg" || media.kind === "mjpeg")) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={proxiedImageUrl(media.kind === "jpg" ? freshen(media.url) : media.url)}
        alt=""
        loading="lazy"
        className="absolute inset-0 h-full w-full object-cover"
      />
    );
  }
  return (
    <div className="absolute inset-0 bg-gradient-to-br from-[#232f52] to-[#0a0f22] flex items-center justify-center">
      <span className="text-[#D4AF37] text-lg" aria-hidden>
        ▶
      </span>
    </div>
  );
}

export default function SunriseExperience({ initial }: { initial: SunriseSelection }) {
  const [selection, setSelection] = useState<SunriseSelection>(initial);
  const [mode, setMode] = useState<SunMode>(initial.mode);
  const [featuredId, setFeaturedId] = useState<string | null>(initial.picks[0]?.id ?? null);
  const [tick, setTick] = useState(0);
  const [, setLabelTick] = useState(0);
  const [loading, setLoading] = useState(false);
  const modeRef = useRef(mode);
  modeRef.current = mode;

  const picks = selection.picks;
  const featured = useMemo(
    () => picks.find(p => p.id === featuredId) ?? picks[0] ?? null,
    [picks, featuredId],
  );

  const fetchSelection = useCallback(async (m: SunMode) => {
    try {
      const res = await fetch(`/api/sunrise?mode=${m}`, { cache: "no-store" });
      if (!res.ok) return;
      const data = (await res.json()) as SunriseSelection;
      if (modeRef.current !== m) return; // a slower answer for the old mode
      setSelection(data);
      setFeaturedId(prev =>
        prev && data.picks.some(p => p.id === prev) ? prev : (data.picks[0]?.id ?? null),
      );
    } catch {
      /* keep the last honest selection on screen */
    } finally {
      setLoading(false);
    }
  }, []);

  // Recompute the selection every minute — the line does not wait.
  useEffect(() => {
    const id = setInterval(() => void fetchSelection(modeRef.current), REFRESH_MS);
    return () => clearInterval(id);
  }, [fetchSelection]);

  // Freshen snapshot frames + keep relative labels truthful.
  useEffect(() => {
    const id = setInterval(() => {
      setTick(t => t + 1);
      setLabelTick(t => t + 1);
    }, FRESHEN_MS);
    const label = setInterval(() => setLabelTick(t => t + 1), LABEL_TICK_MS);
    return () => {
      clearInterval(id);
      clearInterval(label);
    };
  }, []);

  // Rotate the featured camera (unless the visitor prefers reduced motion).
  useEffect(() => {
    if (picks.length < 2) return;
    if (typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    const id = setInterval(() => {
      setFeaturedId(prev => {
        const idx = picks.findIndex(p => p.id === prev);
        return picks[(idx + 1) % picks.length]?.id ?? prev;
      });
    }, ADVANCE_MS);
    return () => clearInterval(id);
  }, [picks]);

  const switchMode = (m: SunMode) => {
    if (m === mode) return;
    setMode(m);
    modeRef.current = m;
    setLoading(true);
    void fetchSelection(m);
  };

  const watchUrl = featured ? buildCameraShareUrl(featured) : null;
  const noun = mode === "sunrise" ? "sunrise" : "sunset";

  return (
    <section className="mt-10" aria-label={`Live cameras on the ${noun} line`}>
      {/* Mode toggle + line position */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div
          className="inline-flex rounded-full border border-white/15 p-1"
          role="group"
          aria-label="Choose sunrise or sunset"
        >
          {(["sunrise", "sunset"] as SunMode[]).map(m => (
            <button
              key={m}
              type="button"
              onClick={() => switchMode(m)}
              aria-pressed={mode === m}
              className={`px-4 py-1.5 rounded-full text-sm font-semibold capitalize transition ${
                mode === m
                  ? "bg-gradient-to-b from-[#e8c55a] to-[#D4AF37] text-black"
                  : "text-white/60 hover:text-white"
              }`}
            >
              {m === "sunrise" ? "Sunrise" : "Sunset"}
            </button>
          ))}
        </div>
        <p className="text-xs text-white/45">
          The {noun} line is crossing{" "}
          <span className="text-white/75 font-semibold">{lngLabel(selection.bandCenterLng)}</span>{" "}
          longitude · updated every minute
        </p>
      </div>

      {picks.length === 0 ? (
        <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.03] p-8 text-center">
          <p className="text-lg font-semibold">The {noun} line is over open water right now</p>
          <p className="mt-2 text-sm text-white/55 leading-relaxed max-w-xl mx-auto">
            No camera in the catalogue sits inside the {noun} window at this moment — the line is
            crossing a stretch of the planet with few public cameras. It sweeps west at 15° an
            hour and this page rechecks every minute, so land is never far away. You can also
            flip to the other side of the day:
          </p>
          <button
            type="button"
            onClick={() => switchMode(mode === "sunrise" ? "sunset" : "sunrise")}
            className="mt-5 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-b from-[#e8c55a] to-[#D4AF37] text-black text-sm font-bold hover:brightness-110 transition"
          >
            Show {mode === "sunrise" ? "sunset" : "sunrise"} instead
          </button>
        </div>
      ) : (
        <>
          {/* Featured stage */}
          {featured && (
            <div className="mt-5 relative rounded-2xl overflow-hidden border border-white/10 bg-black aspect-video">
              <StageMedia pick={featured} tick={tick} />
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent p-5 md:p-6 pt-16">
                <p className="text-xs font-semibold tracking-[0.2em] text-[#D4AF37]">
                  {eventLabel(featured, mode).toUpperCase()} · {viewerTime(featured.eventTime)} YOUR
                  TIME
                </p>
                <h2 className="mt-1 text-xl md:text-2xl font-bold leading-snug">{featured.name}</h2>
                <p className="text-sm text-white/60">
                  {placeLabel(featured)}
                  {placeLabel(featured) ? " · " : ""}Sun elevation now{" "}
                  {featured.elevationDeg.toFixed(1)}°
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {watchUrl && (
                    <Link
                      href={watchUrl}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-b from-[#e8c55a] to-[#D4AF37] text-black text-sm font-bold hover:brightness-110 transition"
                    >
                      Watch live on the globe
                    </Link>
                  )}
                  {featured.external_url && (
                    <a
                      href={featured.external_url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-white/20 text-sm font-semibold text-white/80 hover:bg-white/5 transition"
                    >
                      Camera operator&apos;s page
                    </a>
                  )}
                </div>
              </div>
              <div className="absolute top-4 right-4 flex gap-2">
                <button
                  type="button"
                  aria-label="Previous camera"
                  onClick={() => {
                    const idx = picks.findIndex(p => p.id === featured.id);
                    setFeaturedId(picks[(idx - 1 + picks.length) % picks.length].id);
                  }}
                  className="w-9 h-9 rounded-full bg-black/55 border border-white/20 text-white/85 hover:bg-black/75 transition"
                >
                  ←
                </button>
                <button
                  type="button"
                  aria-label="Next camera"
                  onClick={() => {
                    const idx = picks.findIndex(p => p.id === featured.id);
                    setFeaturedId(picks[(idx + 1) % picks.length].id);
                  }}
                  className="w-9 h-9 rounded-full bg-black/55 border border-white/20 text-white/85 hover:bg-black/75 transition"
                >
                  →
                </button>
              </div>
            </div>
          )}

          {/* The strip: everything on the line, nearest the moment first */}
          <div className="mt-5 grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
            {picks.map(pick => {
              const active = featured?.id === pick.id;
              return (
                <button
                  key={pick.id}
                  type="button"
                  onClick={() => setFeaturedId(pick.id)}
                  aria-pressed={active}
                  className={`text-left rounded-xl overflow-hidden border transition ${
                    active
                      ? "border-[#D4AF37]/70 ring-1 ring-[#D4AF37]/50"
                      : "border-white/10 hover:border-white/30"
                  } bg-white/[0.02]`}
                >
                  <div className="relative aspect-video bg-black">
                    <ThumbMedia pick={pick} />
                  </div>
                  <div className="p-3">
                    <p className="text-sm font-semibold leading-snug line-clamp-2">{pick.name}</p>
                    <p className="text-xs text-white/45 mt-0.5">{placeLabel(pick) || "\u00A0"}</p>
                    <p className="text-xs text-[#D4AF37] mt-1.5 font-medium">
                      {eventLabel(pick, mode)} · {viewerTime(pick.eventTime)}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
          {loading && <p className="mt-3 text-xs text-white/35">Refreshing the line…</p>}
        </>
      )}
    </section>
  );
}
