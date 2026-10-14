"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Play } from "lucide-react";
import { claimPlayback, releasePlayback } from "./playback";

/**
 * Section 2 island — tracking demo stage.
 *
 * The stage plays short recordings of the REAL globe captured from this
 * app (flights / satellites layers), one at a time, only while the
 * section is on screen. Reduced-motion visitors get the poster frame and
 * an explicit play button. Maritime is a Pro layer end to end: the app's
 * vessel feed (/api/maritime) returns premium_required to signed-out
 * visitors, so no honest recording of ship traffic can be captured
 * without a Pro session — per the design plan's fallback rule, that tab
 * shows the labeled SVG schematic instead of footage. Its tab carries
 * the PRO chip and its call to action goes to /pricing, exactly as the
 * product gates it.
 *
 * The side panel is representative sample data — it is labeled as such,
 * always. Nothing in it is presented as a live entity.
 */

interface DemoTab {
  slug: string;
  label: string;
  pro?: boolean;
  schematic?: boolean;
  webm?: string;
  mp4?: string;
  poster?: string;
  posterAlt: string;
  entity: string;
  entityKind: string;
  rows: Array<[string, string]>;
  cta: { label: string; href: string };
}

const TABS: DemoTab[] = [
  {
    slug: "flights",
    label: "Flights",
    webm: "/landing/track-flights.webm",
    mp4: "/landing/track-flights.mp4",
    poster: "/landing/track-flights.jpg",
    posterAlt: "Recorded view of the WorldEye globe with live flight tracking over Europe",
    entity: "UAL842",
    entityKind: "Chicago ORD → London LHR",
    rows: [
      ["Aircraft", "Boeing 777-200"],
      ["Altitude", "38,000 ft"],
      ["Ground speed", "512 kt"],
      ["Heading", "068°"],
    ],
    cta: { label: "Open the flight tracker", href: "/live-flight-tracker" },
  },
  {
    slug: "satellites",
    label: "Satellites",
    webm: "/landing/track-satellites.webm",
    mp4: "/landing/track-satellites.mp4",
    poster: "/landing/track-satellites.jpg",
    posterAlt: "Recorded view of the WorldEye globe with satellites in orbit",
    entity: "STARLINK-3012",
    entityKind: "Communications satellite",
    rows: [
      ["Orbit", "LEO · 550 km"],
      ["Velocity", "7.6 km/s"],
      ["Inclination", "53.2°"],
      ["Period", "95 min"],
    ],
    cta: { label: "Open the satellite tracker", href: "/satellite-tracker" },
  },
  {
    slug: "maritime",
    label: "Maritime",
    pro: true,
    schematic: true,
    posterAlt: "Schematic of global shipping lanes between major ports",
    entity: "MV AURORA",
    entityKind: "Container ship",
    rows: [
      ["Course", "112°"],
      ["Speed", "14.2 kn"],
      ["Destination", "Singapore"],
      ["Status", "Underway"],
    ],
    cta: { label: "See Pro plans", href: "/pricing" },
  },
];

/**
 * Schematic shipping-lane view for the maritime tab (see the header
 * comment for why this is a schematic and not footage). Drawn in the
 * site's HUD language — graticule, dotted great-circle lanes, port
 * markers — and captioned as a schematic wherever it appears.
 */
function MaritimeSchematic() {
  return (
    <svg
      viewBox="0 0 1280 640"
      className="w-full aspect-video"
      role="img"
      aria-label="Schematic of global shipping lanes between major ports"
    >
      <rect width="1280" height="640" fill="#070B16" />
      {Array.from({ length: 8 }).map((_, i) => (
        <line key={`v${i}`} x1={160 * i} y1="0" x2={160 * i} y2="640" stroke="#0096FF" strokeOpacity="0.07" />
      ))}
      {Array.from({ length: 4 }).map((_, i) => (
        <line key={`h${i}`} x1="0" y1={160 * i} x2="1280" y2={160 * i} stroke="#0096FF" strokeOpacity="0.07" />
      ))}
      <path d="M180 420 Q 480 240 760 330 T 1180 210" fill="none" stroke="#00E5FF" strokeWidth="2" strokeDasharray="3 9" strokeLinecap="round" />
      <path d="M180 420 Q 420 540 700 500 T 1150 470" fill="none" stroke="#0096FF" strokeWidth="2" strokeDasharray="3 9" strokeLinecap="round" opacity="0.7" />
      <path d="M760 330 Q 900 200 1180 210" fill="none" stroke="#00E5FF" strokeWidth="2" strokeDasharray="3 9" strokeLinecap="round" opacity="0.55" />
      {[
        { x: 180, y: 420, label: "SINGAPORE" },
        { x: 760, y: 330, label: "SUEZ" },
        { x: 1180, y: 210, label: "ROTTERDAM" },
        { x: 1150, y: 470, label: "NEW YORK" },
      ].map((p) => (
        <g key={p.label}>
          <circle cx={p.x} cy={p.y} r="16" fill="none" stroke="#00E5FF" strokeOpacity="0.35" />
          <circle cx={p.x} cy={p.y} r="5" fill="#00E5FF" />
          <text x={p.x + 14} y={p.y - 12} fill="#9fd8ef" fontSize="17" fontFamily="monospace" letterSpacing="2">
            {p.label}
          </text>
        </g>
      ))}
      <g transform="translate(505 268) rotate(24)">
        <path d="M-16 0 L10 -6 L16 0 L10 6 Z" fill="#D4AF37" />
        <circle r="3" fill="#06060C" />
      </g>
      <text x="36" y="600" fill="#5b7a8c" fontSize="16" fontFamily="monospace" letterSpacing="3">
        AIS VESSEL TRACKING · PORTS · CHOKEPOINTS
      </text>
    </svg>
  );
}

export default function TrackingDemo() {
  const [active, setActive] = useState(TABS[0].slug);
  const [inView, setInView] = useState(false);
  const [wantPlay, setWantPlay] = useState(false);
  const [videoOk, setVideoOk] = useState(true);
  const rootRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const tab = TABS.find((t) => t.slug === active) ?? TABS[0];
  const reduced =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

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
  }, [inView, active, wantPlay, reduced]);

  return (
    <div ref={rootRef}>
      <div role="tablist" aria-label="Tracking layers" className="flex gap-2 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {TABS.map((t) => (
          <button
            key={t.slug}
            role="tab"
            aria-selected={active === t.slug}
            data-landing-event={`track_tab:${t.slug}`}
            onClick={() => {
              setActive(t.slug);
              setVideoOk(true);
            }}
            className={`shrink-0 inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition border ${
              active === t.slug
                ? "bg-[#0096FF] border-[#0096FF] text-white"
                : "border-white/15 text-white/65 hover:text-white hover:border-white/35"
            }`}
          >
            {t.label}
            {t.pro && (
              <span className="text-[9px] font-bold tracking-widest text-[#D4AF37] border border-[#D4AF37]/50 rounded px-1 py-px">
                PRO
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_320px] mt-3">
        <figure className="relative rounded-2xl border border-white/10 overflow-hidden bg-black/40">
          {tab.schematic ? (
            <MaritimeSchematic />
          ) : videoOk ? (
            <video
              ref={videoRef}
              key={tab.slug}
              className="w-full aspect-video object-cover"
              muted
              loop
              playsInline
              preload="metadata"
              poster={tab.poster}
              onError={() => setVideoOk(false)}
              aria-label={tab.posterAlt}
            >
              <source src={tab.webm} type="video/webm" />
              <source src={tab.mp4} type="video/mp4" />
            </video>
          ) : (
            /* eslint-disable-next-line @next/next/no-img-element -- recorded frame from the app's own globe capture */
            <img src={tab.poster} alt={tab.posterAlt} className="w-full aspect-video object-cover" loading="lazy" />
          )}
          {reduced && !wantPlay && videoOk && !tab.schematic && (
            <button
              onClick={() => setWantPlay(true)}
              className="absolute inset-0 flex items-center justify-center bg-black/35 text-white"
              aria-label={`Play the ${tab.label} recording`}
            >
              <span className="flex items-center gap-2 rounded-full bg-[#0096FF] px-5 py-3 text-sm font-semibold">
                <Play className="w-4 h-4" aria-hidden /> Play recording
              </span>
            </button>
          )}
          <figcaption className="absolute bottom-0 left-0 right-0 flex items-center justify-between gap-3 bg-gradient-to-t from-black/80 to-transparent px-4 pt-8 pb-3 text-xs text-white/60">
            {tab.schematic ? (
              <span>Schematic — the live maritime layer is part of Pro.</span>
            ) : (
              <span>Recorded from the live WorldEye globe.</span>
            )}
          </figcaption>
        </figure>

        <div className="rounded-2xl border border-white/10 bg-[rgba(8,10,20,0.88)] backdrop-blur p-5 flex flex-col">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-mono text-lg font-bold text-white leading-tight">{tab.entity}</p>
              <p className="text-xs text-white/50 mt-0.5">{tab.entityKind}</p>
            </div>
            <span className="shrink-0 text-[10px] font-bold tracking-widest text-[#D4AF37] border border-[#D4AF37]/40 rounded px-1.5 py-0.5">
              SAMPLE DATA
            </span>
          </div>
          <dl className="mt-4 space-y-2.5">
            {tab.rows.map(([k, v]) => (
              <div key={k} className="flex items-baseline justify-between gap-3 border-b border-white/5 pb-2">
                <dt className="text-xs uppercase tracking-wider text-white/40">{k}</dt>
                <dd className="font-mono text-sm text-white/90">{v}</dd>
              </div>
            ))}
          </dl>
          <p className="text-xs text-white/40 leading-relaxed mt-4">
            Sample data — open the live globe for real-time tracking.
          </p>
          <Link
            href={tab.cta.href}
            data-landing-event={`track_cta:${tab.slug}`}
            className="mt-auto pt-5 inline-flex items-center gap-2 text-sm font-semibold text-[#0096FF] hover:text-[#0aa5ff] transition"
          >
            {tab.cta.label} →
          </Link>
        </div>
      </div>
    </div>
  );
}
