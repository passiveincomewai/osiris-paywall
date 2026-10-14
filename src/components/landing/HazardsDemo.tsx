"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Play } from "lucide-react";
import { claimPlayback, releasePlayback } from "./playback";

/**
 * Section 3 island — weather stage + live hazards panel.
 *
 * The stage is a labeled recording of the real globe's hazards layers.
 * The side panel is NOT a mock: it renders the app's own live feeds
 * (/api/earthquakes — USGS, /api/fires — NASA FIRMS + EONET volcanoes,
 * /api/weather — EONET events) fetched on mount and refreshed every few
 * minutes. Counts shown are the feeds' own totals. If every feed fails,
 * the panel says so plainly instead of inventing data.
 */

interface Quake { id: string; magnitude: number; place: string; time: number }
interface FirePoint { type?: string; title?: string }
interface WeatherEvent { id: string; title: string; type: string; severity?: string; date: string }

interface PanelData {
  quakes: Quake[];
  quakeTotal: number;
  fireTotal: number;
  volcanoes: FirePoint[];
  storm: WeatherEvent | null;
}

function ago(ts: number): string {
  const mins = Math.max(0, Math.round((Date.now() - ts) / 60000));
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.round(hrs / 24)}d ago`;
}

async function loadPanel(): Promise<PanelData | null> {
  const [q, f, w] = await Promise.allSettled([
    fetch("/api/earthquakes").then((r) => (r.ok ? r.json() : Promise.reject(new Error()))),
    fetch("/api/fires").then((r) => (r.ok ? r.json() : Promise.reject(new Error()))),
    fetch("/api/weather").then((r) => (r.ok ? r.json() : Promise.reject(new Error()))),
  ]);
  if (q.status !== "fulfilled" && f.status !== "fulfilled" && w.status !== "fulfilled") return null;
  const quakes = q.status === "fulfilled" ? (q.value.earthquakes ?? []) : [];
  const fires = f.status === "fulfilled" ? (f.value.fires ?? []) : [];
  const events = w.status === "fulfilled" ? (w.value.events ?? []) : [];
  const storms = events.filter((e: WeatherEvent) => e.type === "Severe Storm");
  return {
    quakes: quakes.slice(0, 3),
    quakeTotal: q.status === "fulfilled" ? (q.value.total ?? quakes.length) : 0,
    fireTotal: f.status === "fulfilled" ? (f.value.total ?? fires.length) : 0,
    volcanoes: fires.filter((x: FirePoint) => x.type && x.type !== "fire" && x.title).slice(0, 2),
    storm: storms[0] ?? events[0] ?? null,
  };
}

export default function HazardsDemo() {
  const [data, setData] = useState<PanelData | null>(null);
  const [failed, setFailed] = useState(false);
  const [inView, setInView] = useState(false);
  const [wantPlay, setWantPlay] = useState(false);
  const [videoOk, setVideoOk] = useState(true);
  const rootRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const reduced =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  useEffect(() => {
    let live = true;
    const load = () =>
      loadPanel().then((d) => {
        if (!live) return;
        if (d) {
          setData(d);
          setFailed(false);
        } else setFailed(true);
      });
    load();
    const t = setInterval(load, 5 * 60 * 1000);
    return () => {
      live = false;
      clearInterval(t);
    };
  }, []);

  useEffect(() => {
    const el = rootRef.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      setInView(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => setInView(entries.some((e) => e.isIntersecting)),
      { threshold: 0.25 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (inView && (wantPlay || !reduced)) {
      claimPlayback(video);
      video.play().catch(() => {});
    } else {
      video.pause();
      releasePlayback(video);
    }
    return () => {
      video.pause();
      releasePlayback(video);
    };
  }, [inView, wantPlay, reduced]);

  return (
    <div ref={rootRef} className="grid gap-5 lg:grid-cols-[1fr_320px]">
      <figure className="relative rounded-2xl border border-white/10 overflow-hidden bg-black/40">
        {videoOk ? (
          <video
            ref={videoRef}
            className="w-full aspect-video object-cover"
            muted
            loop
            playsInline
            preload="metadata"
            poster="/landing/hazard-weather.jpg"
            onError={() => setVideoOk(false)}
            aria-label="Recorded view of the WorldEye globe with fire, earthquake and disaster alert layers"
          >
            <source src="/landing/hazard-weather.webm" type="video/webm" />
            <source src="/landing/hazard-weather.mp4" type="video/mp4" />
          </video>
        ) : (
          /* eslint-disable-next-line @next/next/no-img-element -- recorded frame from the app's own globe capture */
          <img
            src="/landing/hazard-weather.jpg"
            alt="Recorded view of the WorldEye globe with fire, earthquake and disaster alert layers"
            className="w-full aspect-video object-cover"
            loading="lazy"
          />
        )}
        {reduced && !wantPlay && videoOk && (
          <button
            onClick={() => setWantPlay(true)}
            className="absolute inset-0 flex items-center justify-center bg-black/35 text-white"
            aria-label="Play the hazards recording"
          >
            <span className="flex items-center gap-2 rounded-full bg-[#0096FF] px-5 py-3 text-sm font-semibold">
              <Play className="w-4 h-4" aria-hidden /> Play recording
            </span>
          </button>
        )}
        <figcaption className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent px-4 pt-8 pb-3 text-xs text-white/60">
          Recorded from the live WorldEye globe.
        </figcaption>
      </figure>

      <div className="rounded-2xl border border-white/10 bg-[rgba(8,10,20,0.88)] backdrop-blur p-5">
        <p className="flex items-center gap-2 text-[11px] font-bold tracking-[0.2em] text-white/50 uppercase">
          {data && (
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse motion-reduce:animate-none" aria-hidden />
          )}
          Live now
        </p>

        {!data && !failed && (
          <div className="mt-4 space-y-3" aria-hidden>
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-4 rounded bg-white/[0.05] animate-pulse motion-reduce:animate-none" />
            ))}
          </div>
        )}
        {failed && (
          <p className="text-sm text-white/55 leading-relaxed mt-4">
            Live data is unavailable right now —{" "}
            <Link href="/weather-tracker" className="text-[#0096FF] font-semibold">
              open the weather tracker
            </Link>{" "}
            to explore the globe.
          </p>
        )}

        {data && (
          <div className="mt-4 space-y-5">
            <div>
              <p className="text-xs font-bold tracking-wider text-white/40 uppercase">
                Earthquakes · {data.quakeTotal} today
              </p>
              <ul className="mt-2 space-y-2">
                {data.quakes.map((q) => (
                  <li key={q.id} className="flex items-baseline gap-2.5 text-sm">
                    <span className="font-mono font-bold text-[#D4AF37] shrink-0">
                      M{q.magnitude.toFixed(1)}
                    </span>
                    <span className="text-white/75 leading-snug">{q.place}</span>
                    <span className="text-white/35 text-xs shrink-0 ml-auto">{ago(q.time)}</span>
                  </li>
                ))}
              </ul>
              <Link href="/earthquake-tracker" className="text-xs font-semibold text-[#0096FF] mt-2 inline-block">
                Earthquake tracker →
              </Link>
            </div>

            <div>
              <p className="text-xs font-bold tracking-wider text-white/40 uppercase">
                Fire detections · {data.fireTotal.toLocaleString()}
              </p>
              {data.volcanoes.length > 0 && (
                <ul className="mt-2 space-y-1.5">
                  {data.volcanoes.map((v, i) => (
                    <li key={i} className="flex items-baseline gap-2 text-sm text-white/75 leading-snug">
                      <span className="w-1.5 h-1.5 rounded-full bg-orange-400 shrink-0" aria-hidden />
                      {(v.title ?? "").replace(/^\[VOLCANO\]\s*/, "")}
                    </li>
                  ))}
                </ul>
              )}
              <Link href="/wildfire-tracker" className="text-xs font-semibold text-[#0096FF] mt-2 inline-block">
                Wildfire tracker →
              </Link>
            </div>

            {data.storm && (
              <div>
                <p className="text-xs font-bold tracking-wider text-white/40 uppercase">Storms & events</p>
                <p className="text-sm text-white/75 leading-snug mt-2">
                  {data.storm.title} · {data.storm.type}
                </p>
                <Link href="/weather-tracker" className="text-xs font-semibold text-[#0096FF] mt-2 inline-block">
                  Weather tracker →
                </Link>
              </div>
            )}

            <p className="text-[11px] text-white/35">Live USGS · NASA FIRMS · EONET feeds</p>
          </div>
        )}
      </div>
    </div>
  );
}
