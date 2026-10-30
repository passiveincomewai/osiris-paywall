"use client";

import { useEffect, useRef, useState } from "react";
import { ExternalLink, Pause, Play } from "lucide-react";

/**
 * Powder #5 (rescoped): one resort's operator-labelled snow stake —
 * the live still straight from the operator's feed (refreshed every
 * 5 minutes), and, once the overnight capture has frames, a frame-
 * sequence replay of the latest night so skiers can watch the snow
 * pile up. Labels and links come from the verified stake-cam data;
 * nothing here renames the operator's camera.
 */

interface StakeCamProps {
  resortSlug: string;
  resortName: string;
  label: string;
  operator: string;
  feedUrl: string;
  sourcePage: string;
}

interface NightFrame {
  t: string;
  url: string;
}

export default function SkiSnowStake({
  resortSlug,
  resortName,
  label,
  operator,
  feedUrl,
  sourcePage,
}: StakeCamProps) {
  const [bust, setBust] = useState(() => Date.now());
  const [night, setNight] = useState<{ nightKey: string; frames: NightFrame[] } | null>(null);
  const [idx, setIdx] = useState(0);
  const [playing, setPlaying] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  // The operator still refreshes in place — re-request it periodically.
  useEffect(() => {
    const id = setInterval(() => setBust(Date.now()), 5 * 60_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/ski/stake-frames?resort=${encodeURIComponent(resortSlug)}`)
      .then(r => (r.ok ? r.json() : null))
      .then(data => {
        if (cancelled || !data?.night) return;
        setNight(data.night);
        setIdx(0);
      })
      .catch(() => null);
    return () => {
      cancelled = true;
    };
  }, [resortSlug]);

  const frames = night?.frames ?? [];
  useEffect(() => {
    if (!playing || frames.length < 2) return;
    timer.current = setInterval(() => {
      setIdx(prev => {
        if (prev >= frames.length - 1) {
          setPlaying(false);
          return prev;
        }
        return prev + 1;
      });
    }, 900);
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [playing, frames.length]);

  const liveSrc = `${feedUrl}${feedUrl.includes("?") ? "&" : "?"}we_t=${bust}`;
  const frameTime = (iso: string) =>
    new Intl.DateTimeFormat("en-US", {
      timeZone: "America/Denver",
      hour: "numeric",
      minute: "2-digit",
    }).format(new Date(iso));

  return (
    <div>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={liveSrc}
        alt={`${resortName} — ${label} (live still from ${operator})`}
        className="w-full rounded-xl border border-white/10 bg-black/40 object-contain"
        loading="lazy"
      />
      <p className="mt-2 text-xs text-white/40">
        Live still from {operator}&apos;s own feed — the camera {operator} labels
        its &ldquo;{label}&rdquo;.{" "}
        <a
          href={sourcePage}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 text-amber-300/90 hover:text-amber-200"
        >
          Operator&apos;s cam page <ExternalLink size={11} />
        </a>
      </p>

      {frames.length >= 2 && night && (
        <div className="mt-5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={frames[Math.min(idx, frames.length - 1)].url}
            alt={`${resortName} ${label} — overnight frame ${idx + 1} of ${frames.length}`}
            className="w-full rounded-xl border border-white/10 bg-black/40 object-contain"
          />
          <div className="mt-3 flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                if (!playing && idx >= frames.length - 1) setIdx(0);
                setPlaying(!playing);
              }}
              className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/40 bg-amber-400/10 px-3 py-1.5 text-xs font-semibold text-amber-200 hover:bg-amber-400/20"
              aria-label={playing ? "Pause the overnight replay" : "Play the overnight replay"}
            >
              {playing ? <Pause size={13} /> : <Play size={13} />}
              {playing ? "Pause" : "Replay the night"}
            </button>
            <input
              type="range"
              min={0}
              max={frames.length - 1}
              value={Math.min(idx, frames.length - 1)}
              onChange={e => {
                setPlaying(false);
                setIdx(Number(e.target.value));
              }}
              className="we-slider flex-1"
              aria-label="Scrub the overnight frames"
            />
            <span className="shrink-0 text-xs text-white/50">
              {frameTime(frames[Math.min(idx, frames.length - 1)].t)} ·{" "}
              {Math.min(idx, frames.length - 1) + 1}/{frames.length}
            </span>
          </div>
          <p className="mt-2 text-xs text-white/40">
            Overnight at the stake — frames WorldEye captured from the operator
            feed through the night of {night.nightKey}, newest last. Snow depth
            is read off the stake in the picture, never estimated by WorldEye.
          </p>
        </div>
      )}
    </div>
  );
}
