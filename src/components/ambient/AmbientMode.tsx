"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ChevronLeft,
  ChevronRight,
  CloudRain,
  Maximize,
  Moon,
  Pause,
  Play,
  Sparkles,
  TreePalm,
  MountainSnow,
  Volume2,
  VolumeX,
  X,
  MonitorPlay,
} from "lucide-react";
import {
  freshen,
  refreshInterval,
  type PreviewKind,
} from "@/lib/camera-preview";
import {
  FREE_DEMO_LIMIT_MS,
  PlaytimeAccumulator,
  demoSecondsLeft,
  shouldGate,
} from "@/lib/ambient/gate";
import { MOODS, isMoodSlug, type MoodSlug } from "@/lib/ambient/moods";
import { startHostedCheckout } from "@/lib/billing/trial-checkout";
import { CheckoutError } from "@/lib/billing/checkout-error";
import { trackAnalyticsEvent } from "@/components/AnalyticsTracker";

/**
 * WorldEye Ambient — the Slow TV player (/ambient).
 *
 * One live camera at a time, full-screen, crossfading on a slow
 * rotation fed by /api/ambient/feed (mood collections resolved from
 * the real catalogue). Media machinery — two stacked layers, the
 * incoming layer's 1 s fade, hls.js-then-native playback, snapshot
 * freshening, load timeouts, free skips for dead feeds — is adapted
 * from the staged WorldEye TV build (#28's components/TvMode.tsx).
 * Playback loads every stream DIRECTLY from its source URL in the
 * browser; WorldEye serves only the playlist JSON.
 *
 * THE GATE (owner's spec, 2026-10-26): viewers without Ambient
 * access get exactly 180 s of PLAYING time per session
 * (lib/ambient/gate's accumulator counts only while a scene is
 * actually playing — paused, buffering and failed scenes don't
 * burn the demo). At the limit the show freezes, the picture blurs,
 * and a non-dismissible paywall offers the Ambient plan. Members
 * with the Ambient subscription or any Pro/VIP tier never see it.
 *
 * Chrome (top bar, caption, controls) hides after 3 s without a
 * pointer move, cursor included; a tiny location line stays, as
 * specified. Keyboard: space pause, ←/→ step, F fullscreen,
 * Esc exit (dead while the paywall is up — it is non-dismissible).
 */

export interface AmbientSceneData {
  id: string;
  name: string;
  city: string;
  country: string;
  media: { kind: PreviewKind; url: string };
}

const CHROME_HIDE_MS = 3_000;
const CROSSFADE_MS = 1_000;
const SCENE_LOAD_TIMEOUT_MS = 12_000;
const INTERVAL_OPTIONS = [30, 60, 90, 180] as const;
const INTERVAL_STORAGE_KEY = "we_ambient_interval_s";

/* Copyright-free audio playlist: two 10-minute excerpts from Moby's
 * "Long Ambients" — released by the artist for free use and held by
 * Wikimedia Commons as public domain (see REPORT.md for the file
 * pages). Bundled locally so the toggle never depends on a third
 * party's stream staying up. */
const AUDIO_TRACKS = [
  { src: "/audio/ambient-long-1.mp3", title: "Long Ambients 1 — Moby" },
  { src: "/audio/ambient-long-2.mp3", title: "Long Ambients 2 — Moby" },
];

const MOOD_ICONS: Record<MoodSlug, typeof Sparkles> = {
  all: Sparkles,
  "rainy-cities": CloudRain,
  "snowy-mountains": MountainSnow,
  "tropical-beaches": TreePalm,
  "night-views": Moon,
};

type Phase = "poster" | "playing";
type AccessState = "unknown" | "yes" | "no";

interface Layer {
  scene: AmbientSceneData;
  instance: number;
}

/* ── Scene media (adapted from #28 TvMode) ─────────────────────────── */

function SceneMedia({
  scene,
  frozen,
  onReady,
  onFail,
  onPlayback,
}: {
  scene: AmbientSceneData;
  frozen: boolean;
  onReady: () => void;
  onFail: () => void;
  onPlayback: (playing: boolean) => void;
}) {
  const { kind, url } = scene.media;
  const readyRef = useRef(false);
  const callbacksRef = useRef({ onReady, onFail, onPlayback });
  callbacksRef.current = { onReady, onFail, onPlayback };

  const markReady = useCallback(() => {
    if (readyRef.current) return;
    readyRef.current = true;
    callbacksRef.current.onReady();
  }, []);
  const markFail = useCallback(() => {
    if (readyRef.current) return;
    callbacksRef.current.onPlayback(false);
    callbacksRef.current.onFail();
  }, []);
  const reportPlayback = useCallback((playing: boolean) => {
    callbacksRef.current.onPlayback(playing);
  }, []);

  useEffect(() => {
    const t = setTimeout(markFail, SCENE_LOAD_TIMEOUT_MS);
    return () => clearTimeout(t);
  }, [markFail]);

  if (kind === "mp4" || kind === "hls") {
    return (
      <VideoScene
        url={url}
        kind={kind}
        frozen={frozen}
        markReady={markReady}
        markFail={markFail}
        reportPlayback={reportPlayback}
      />
    );
  }
  return (
    <ImageScene
      url={url}
      kind={kind}
      frozen={frozen}
      markReady={markReady}
      markFail={markFail}
      reportPlayback={reportPlayback}
    />
  );
}

function ImageScene({
  url,
  kind,
  frozen,
  markReady,
  markFail,
  reportPlayback,
}: {
  url: string;
  kind: PreviewKind;
  frozen: boolean;
  markReady: () => void;
  markFail: () => void;
  reportPlayback: (playing: boolean) => void;
}) {
  const every = kind === "jpg" ? refreshInterval("jpg") : 0;
  const [src, setSrc] = useState(() => (every ? freshen(url) : url));

  useEffect(() => {
    if (!every || frozen) return;
    const iv = setInterval(() => setSrc(freshen(url)), every);
    return () => clearInterval(iv);
  }, [url, every, frozen]);

  /* A snapshot/mjpeg scene "plays" while it is on screen unfrozen —
     its frames keep arriving on the refresh cadence. */
  useEffect(() => {
    if (!frozen) reportPlayback(true);
    return () => reportPlayback(false);
  }, [frozen, reportPlayback]);

  return (
    /* eslint-disable-next-line @next/next/no-img-element -- remote camera frames, no loader */
    <img
      src={src}
      alt=""
      className="h-full w-full object-cover"
      onLoad={markReady}
      onError={markFail}
      draggable={false}
    />
  );
}

function VideoScene({
  url,
  kind,
  frozen,
  markReady,
  markFail,
  reportPlayback,
}: {
  url: string;
  kind: PreviewKind;
  frozen: boolean;
  markReady: () => void;
  markFail: () => void;
  reportPlayback: (playing: boolean) => void;
}) {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let cancelled = false;
    let hls: { destroy: () => void } | null = null;

    if (kind === "mp4") {
      el.src = url;
      el.loop = true;
    } else {
      /* HLS: hls.js first, native only as fallback — the full
         viewer's order (canPlayType answers "maybe" on builds that
         cannot actually decode HLS). */
      void import("hls.js")
        .then(({ default: Hls }) => {
          if (cancelled || !ref.current) return;
          if (Hls.isSupported()) {
            const instance = new Hls();
            instance.loadSource(url);
            instance.attachMedia(ref.current);
            hls = instance;
          } else if (ref.current.canPlayType("application/vnd.apple.mpegurl")) {
            ref.current.src = url;
          } else {
            markFail();
          }
        })
        .catch(() => {
          if (!cancelled && ref.current?.canPlayType("application/vnd.apple.mpegurl")) {
            ref.current.src = url;
          } else if (!cancelled) {
            markFail();
          }
        });
    }
    return () => {
      cancelled = true;
      hls?.destroy();
      reportPlayback(false);
    };
  }, [url, kind, markFail, reportPlayback]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (frozen) {
      el.pause();
      reportPlayback(false);
    } else {
      el.play().catch(() => { /* autoplay refused: the frame still shows */ });
    }
  }, [frozen, reportPlayback]);

  return (
    <video
      ref={ref}
      className="h-full w-full object-cover"
      muted
      playsInline
      autoPlay
      onPlaying={() => {
        markReady();
        reportPlayback(true);
      }}
      onLoadedData={markReady}
      onPause={() => reportPlayback(false)}
      onWaiting={() => reportPlayback(false)}
      onError={markFail}
    />
  );
}

/* ── The Ambient surface ───────────────────────────────────────────── */

export default function AmbientMode() {
  const [phase, setPhase] = useState<Phase>("poster");
  const [mood, setMood] = useState<MoodSlug>("all");
  const [scenes, setScenes] = useState<AmbientSceneData[] | null>(null);
  const [scenesError, setScenesError] = useState(false);
  const [current, setCurrent] = useState<Layer | null>(null);
  const [outgoing, setOutgoing] = useState<Layer | null>(null);
  const [paused, setPaused] = useState(false);
  const [chromeVisible, setChromeVisible] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [intervalSec, setIntervalSec] = useState<number>(90);
  const [audioOn, setAudioOn] = useState(false);
  const [trackIndex, setTrackIndex] = useState(0);
  const [access, setAccess] = useState<AccessState>("unknown");
  const [signedIn, setSignedIn] = useState(false);
  const [gateOpen, setGateOpen] = useState(false);
  const [demoLeft, setDemoLeft] = useState(FREE_DEMO_LIMIT_MS / 1000);
  const [deadRotation, setDeadRotation] = useState(false);
  const [checkoutBusy, setCheckoutBusy] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [alreadySubscribed, setAlreadySubscribed] = useState(false);

  const rootRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const instanceRef = useRef(0);
  const advanceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const chromeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fadeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const failStreakRef = useRef(0);
  const recordedInstanceRef = useRef(-1);
  const mediaPlayingRef = useRef(false);
  const accumulatorRef = useRef(new PlaytimeAccumulator());
  const healedRef = useRef(false);
  const gateFiredRef = useRef(false);
  const stateRef = useRef({ scenes, current, paused, gateOpen, access, intervalSec, mood });
  stateRef.current = { scenes, current, paused, gateOpen, access, intervalSec, mood };

  /* Saved rotation interval. */
  useEffect(() => {
    try {
      const saved = Number(window.localStorage.getItem(INTERVAL_STORAGE_KEY));
      if ((INTERVAL_OPTIONS as readonly number[]).includes(saved)) {
        setIntervalSec(saved);
      }
    } catch { /* private mode — the default stands */ }
  }, []);

  const fetchAccess = useCallback(async (): Promise<AccessState> => {
    try {
      const r = await fetch("/api/ambient/access", { cache: "no-store" });
      if (!r.ok) return "unknown";
      const j = (await r.json()) as { signedIn?: boolean; access?: boolean };
      setSignedIn(!!j.signedIn);
      const state: AccessState = j.access ? "yes" : "no";
      setAccess(state);
      return state;
    } catch {
      return "unknown";
    }
  }, []);

  useEffect(() => {
    void fetchAccess();
  }, [fetchAccess]);

  const loadScenes = useCallback(async (forMood: MoodSlug) => {
    setScenes(null);
    setScenesError(false);
    try {
      const r = await fetch(`/api/ambient/feed?mood=${forMood}&count=24`);
      const j = r.ok ? await r.json() : null;
      const list = (j?.cameras ?? []) as AmbientSceneData[];
      setScenes(list);
      if (list.length === 0) setScenesError(true);
      return list;
    } catch {
      setScenesError(true);
      return [];
    }
  }, []);

  /* First load: honour a ?mood= deep link (the marketing pages link
     the moods individually), else Everywhere. */
  useEffect(() => {
    const param = new URLSearchParams(window.location.search).get("mood");
    const initial: MoodSlug = isMoodSlug(param) ? param : "all";
    setMood(initial);
    void loadScenes(initial);
    // Mount-only: loadScenes is stable.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const clearAdvanceTimer = useCallback(() => {
    if (advanceTimerRef.current) {
      clearTimeout(advanceTimerRef.current);
      advanceTimerRef.current = null;
    }
  }, []);

  const exitAmbient = useCallback(() => {
    if (stateRef.current.gateOpen) return; // the paywall is non-dismissible
    clearAdvanceTimer();
    setCurrent(null);
    setOutgoing(null);
    setPaused(false);
    setSidebarOpen(false);
    setPhase("poster");
    if (typeof document !== "undefined" && document.fullscreenElement) {
      void document.exitFullscreen().catch(() => {});
    }
  }, [clearAdvanceTimer]);

  const scheduleAdvance = useCallback(() => {
    clearAdvanceTimer();
    advanceTimerRef.current = setTimeout(() => {
      const cur = stateRef.current.current;
      const list = stateRef.current.scenes;
      if (cur && list) {
        const idx = list.findIndex((s) => s.id === cur.scene.id);
        startSceneRef.current((idx + 1 + list.length) % list.length);
      }
    }, stateRef.current.intervalSec * 1000);
  }, [clearAdvanceTimer]);

  const startScene = useCallback(
    (index: number) => {
      const list = stateRef.current.scenes;
      if (!list || list.length === 0) return;
      const scene = list[((index % list.length) + list.length) % list.length];
      instanceRef.current += 1;
      const instance = instanceRef.current;
      mediaPlayingRef.current = false;
      setOutgoing(stateRef.current.current);
      setCurrent({ scene, instance });
      setPaused(false);
      if (fadeTimerRef.current) clearTimeout(fadeTimerRef.current);
      fadeTimerRef.current = setTimeout(() => setOutgoing(null), CROSSFADE_MS + 150);
    },
    [],
  );
  const startSceneRef = useRef(startScene);
  startSceneRef.current = startScene;

  /* First frame of the current scene: reset the fail streak and start
     the rotation clock. */
  const handleSceneReady = useCallback(
    (instance: number) => {
      if (recordedInstanceRef.current === instance) return;
      recordedInstanceRef.current = instance;
      failStreakRef.current = 0;
      if (!stateRef.current.paused && !stateRef.current.gateOpen) {
        scheduleAdvance();
      }
    },
    [scheduleAdvance],
  );

  /* A scene that never produced a frame costs the viewer nothing —
     skip ahead; a whole dead rotation stops with an honest message. */
  const handleSceneFail = useCallback(
    (instance: number) => {
      if (stateRef.current.current?.instance !== instance) return;
      if (recordedInstanceRef.current === instance) return;
      failStreakRef.current += 1;
      const list = stateRef.current.scenes;
      if (!list || failStreakRef.current >= list.length) {
        clearAdvanceTimer();
        setDeadRotation(true);
        return;
      }
      const idx = list.findIndex((s) => s.id === stateRef.current.current?.scene.id);
      startSceneRef.current(idx + 1);
    },
    [clearAdvanceTimer],
  );

  const togglePaused = useCallback(() => {
    if (stateRef.current.gateOpen) return;
    setPaused((p) => {
      const next = !p;
      clearAdvanceTimer();
      if (!next) scheduleAdvance();
      return next;
    });
  }, [clearAdvanceTimer, scheduleAdvance]);

  const stepScene = useCallback(
    (delta: number) => {
      if (stateRef.current.gateOpen) return;
      const cur = stateRef.current.current;
      const list = stateRef.current.scenes;
      if (!cur || !list) return;
      clearAdvanceTimer();
      failStreakRef.current = 0;
      const idx = list.findIndex((s) => s.id === cur.scene.id);
      startSceneRef.current(idx + delta);
    },
    [clearAdvanceTimer],
  );

  const startShow = useCallback(async () => {
    const list = stateRef.current.scenes ?? (await loadScenes(stateRef.current.mood));
    if (!list || list.length === 0) return;
    setDeadRotation(false);
    failStreakRef.current = 0;
    setPhase("playing");
    trackAnalyticsEvent("ambient_start", stateRef.current.mood);
    const el = rootRef.current;
    if (el?.requestFullscreen) {
      el.requestFullscreen().catch(() => { /* fullscreen is a nicety, never a gate */ });
    }
    startSceneRef.current(0);
  }, [loadScenes]);

  const changeMood = useCallback(
    async (next: MoodSlug) => {
      setMood(next);
      setSidebarOpen(false);
      if (stateRef.current.gateOpen) return;
      const list = await loadScenes(next);
      if (phase === "playing" && list.length > 0) {
        setDeadRotation(false);
        failStreakRef.current = 0;
        startSceneRef.current(0);
      }
    },
    [loadScenes, phase],
  );

  /* ── The demo clock ─────────────────────────────────────────────── */
  useEffect(() => {
    if (phase !== "playing") return;
    const iv = setInterval(() => {
      const s = stateRef.current;
      const playing =
        mediaPlayingRef.current && !s.paused && !s.gateOpen && !!s.current;
      const total = accumulatorRef.current.observe(Date.now(), playing);
      const left = demoSecondsLeft(total);
      setDemoLeft((prev) => (prev === left ? prev : left));
      if (shouldGate({ hasAccess: s.access === "yes", accumulatedMs: total })) {
        if (gateFiredRef.current) return;
        if (s.access === "unknown" && !healedRef.current) {
          /* Heal once at the moment of decision — the access fetch
             can race a fresh checkout's session. */
          healedRef.current = true;
          void fetchAccess().then((fresh) => {
            if (fresh !== "yes" && !gateFiredRef.current) {
              gateFiredRef.current = true;
              setGateOpen(true);
              trackAnalyticsEvent("ambient_demo_ended");
            }
          });
          return;
        }
        gateFiredRef.current = true;
        setGateOpen(true);
        trackAnalyticsEvent("ambient_demo_ended");
      }
    }, 250);
    return () => clearInterval(iv);
  }, [phase, fetchAccess]);

  /* Gate up: freeze the rotation clock (layers freeze via `frozen`). */
  useEffect(() => {
    if (gateOpen) clearAdvanceTimer();
  }, [gateOpen, clearAdvanceTimer]);

  /* ── Audio ──────────────────────────────────────────────────────── */
  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    if (audioOn) {
      el.play().catch(() => setAudioOn(false));
    } else {
      el.pause();
    }
  }, [audioOn, trackIndex]);

  /* ── Chrome auto-hide (3 s, cursor included) ────────────────────── */
  const pokeChrome = useCallback(() => {
    setChromeVisible(true);
    if (chromeTimerRef.current) clearTimeout(chromeTimerRef.current);
    chromeTimerRef.current = setTimeout(() => setChromeVisible(false), CHROME_HIDE_MS);
  }, []);

  useEffect(() => {
    if (phase === "playing" && !gateOpen && !sidebarOpen) pokeChrome();
  }, [phase, gateOpen, sidebarOpen, pokeChrome]);

  /* ── Keyboard ───────────────────────────────────────────────────── */
  useEffect(() => {
    if (phase !== "playing") return;
    const onKey = (e: KeyboardEvent) => {
      if (stateRef.current.gateOpen) return; // Esc included: non-dismissible
      if (e.key === "Escape") {
        if (sidebarOpen) setSidebarOpen(false);
        else exitAmbient();
      } else if (e.key === "ArrowRight") {
        stepScene(1);
      } else if (e.key === "ArrowLeft") {
        stepScene(-1);
      } else if (e.key === " ") {
        e.preventDefault();
        togglePaused();
      } else if (e.key.toLowerCase() === "f") {
        const el = rootRef.current;
        if (document.fullscreenElement) void document.exitFullscreen().catch(() => {});
        else if (el?.requestFullscreen) el.requestFullscreen().catch(() => {});
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase, sidebarOpen, exitAmbient, stepScene, togglePaused]);

  useEffect(
    () => () => {
      clearAdvanceTimer();
      if (chromeTimerRef.current) clearTimeout(chromeTimerRef.current);
      if (fadeTimerRef.current) clearTimeout(fadeTimerRef.current);
    },
    [clearAdvanceTimer],
  );

  const startCheckout = useCallback(async () => {
    setCheckoutBusy(true);
    setCheckoutError(null);
    try {
      await startHostedCheckout("ambient");
    } catch (err) {
      setCheckoutBusy(false);
      if (err instanceof CheckoutError && err.code === "already_subscribed") {
        setAlreadySubscribed(true);
      }
      setCheckoutError(
        err instanceof Error ? err.message : "Checkout could not start — please try again.",
      );
    }
  }, []);

  const sceneIndex =
    current && scenes ? scenes.findIndex((s) => s.id === current.scene.id) : -1;
  const chromeShown = chromeVisible || gateOpen || sidebarOpen;
  const frozen = paused || gateOpen;
  const locationLine = current
    ? [current.scene.city, current.scene.country].filter(Boolean).join(", ")
    : "";

  return (
    <div
      ref={rootRef}
      className={`relative h-[100dvh] w-full overflow-hidden bg-black text-white select-none ${
        phase === "playing" && !chromeShown ? "cursor-none" : ""
      }`}
      onPointerMove={phase === "playing" ? pokeChrome : undefined}
      onPointerDown={phase === "playing" ? pokeChrome : undefined}
    >
      {/* Ambient audio (bundled public-domain tracks; toggle-driven). */}
      <audio
        ref={audioRef}
        src={AUDIO_TRACKS[trackIndex].src}
        preload="none"
        onEnded={() => setTrackIndex((i) => (i + 1) % AUDIO_TRACKS.length)}
      />

      {/* ── Layers ── */}
      {phase === "playing" && (
        <div
          className="absolute inset-0 transition-[filter] duration-700"
          style={
            gateOpen
              ? { filter: "blur(20px) brightness(0.55) saturate(0.8)", transform: "scale(1.06)" }
              : undefined
          }
        >
          {outgoing && (
            <div key={`out-${outgoing.instance}`} className="absolute inset-0" aria-hidden>
              <SceneMedia
                scene={outgoing.scene}
                frozen
                onReady={() => {}}
                onFail={() => {}}
                onPlayback={() => {}}
              />
            </div>
          )}
          {current && (
            <div key={`in-${current.instance}`} className="absolute inset-0 animate-[ambientfadein_1s_ease-out]">
              <SceneMedia
                scene={current.scene}
                frozen={frozen}
                onReady={() => handleSceneReady(current.instance)}
                onFail={() => handleSceneFail(current.instance)}
                onPlayback={(p) => {
                  mediaPlayingRef.current = p;
                }}
              />
            </div>
          )}
        </div>
      )}

      {/* Legibility gradients. */}
      {phase === "playing" && (
        <>
          <div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-black/70 to-transparent" />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-black/75 to-transparent" />
        </>
      )}

      {/* Tiny always-on location line (visible while chrome sleeps). */}
      {phase === "playing" && current && !chromeShown && !gateOpen && (
        <div className="pointer-events-none absolute bottom-4 left-5 font-mono text-[11px] tracking-wide text-white/55">
          {current.scene.name}
          {locationLine ? ` — ${locationLine}` : ""}
        </div>
      )}

      {/* ── Chrome ── */}
      {phase === "playing" && current && (
        <div
          className={`absolute inset-0 transition-opacity duration-500 ${
            chromeShown ? "opacity-100" : "pointer-events-none opacity-0"
          }`}
        >
          {/* Top bar */}
          <div className="absolute inset-x-0 top-0 flex items-start justify-between p-5">
            <div className="flex items-center gap-2.5">
              {/* eslint-disable-next-line @next/next/no-img-element -- static brand asset */}
              <img src="/worldeye-eye.png" alt="WorldEye" className="h-8 w-8" draggable={false} />
              <span className="font-mono text-sm font-bold tracking-[0.3em]">WORLDEYE</span>
              <span className="rounded bg-[#0096FF] px-1.5 py-0.5 font-mono text-[10px] font-bold tracking-widest">
                AMBIENT
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setSidebarOpen(true)}
                className="rounded-full bg-black/50 px-4 py-2 font-mono text-[11px] font-bold tracking-widest backdrop-blur transition hover:bg-black/80"
              >
                MOOD · {MOODS.find((m) => m.slug === mood)?.label.toUpperCase()}
              </button>
              <button
                type="button"
                onClick={() => setAudioOn((v) => !v)}
                aria-label={audioOn ? "Mute ambient music" : "Play ambient music"}
                title={audioOn ? `Music: ${AUDIO_TRACKS[trackIndex].title}` : "Ambient music"}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-black/50 backdrop-blur transition hover:bg-black/80"
              >
                {audioOn ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
              </button>
              <button
                type="button"
                onClick={exitAmbient}
                aria-label="Exit Ambient"
                className="flex h-10 w-10 items-center justify-center rounded-full bg-black/50 text-white/90 backdrop-blur transition hover:bg-black/80 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Caption */}
          <div className="absolute bottom-24 left-5 max-w-[70vw]">
            <div className="mb-1.5 flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
              </span>
              <span className="font-mono text-[10px] font-bold tracking-[0.25em] text-white/80">
                LIVE
              </span>
            </div>
            <h2 className="text-2xl font-semibold leading-tight drop-shadow md:text-4xl">
              {current.scene.name}
            </h2>
            <p className="mt-1 font-mono text-xs text-white/75 md:text-sm">{locationLine}</p>
          </div>

          {/* Controls */}
          <div className="absolute bottom-5 right-5 flex items-center gap-2">
            {access !== "yes" && (
              <span className="mr-1 hidden font-mono text-[11px] text-white/70 sm:block">
                DEMO · {Math.floor(demoLeft / 60)}:{String(demoLeft % 60).padStart(2, "0")} LEFT
              </span>
            )}
            <span className="mr-1 font-mono text-[11px] text-white/70">
              {sceneIndex + 1} / {scenes?.length ?? 0}
            </span>
            <label className="mr-1 hidden items-center gap-1.5 font-mono text-[11px] text-white/70 md:flex">
              EVERY
              <select
                value={intervalSec}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  setIntervalSec(v);
                  try {
                    window.localStorage.setItem(INTERVAL_STORAGE_KEY, String(v));
                  } catch { /* ignore */ }
                }}
                className="rounded bg-black/60 px-1.5 py-1 text-white outline-none"
                aria-label="Seconds per camera"
              >
                {INTERVAL_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {s}s
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              onClick={() => stepScene(-1)}
              aria-label="Previous camera"
              className="flex h-10 w-10 items-center justify-center rounded-full bg-black/50 backdrop-blur transition hover:bg-black/80"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={togglePaused}
              aria-label={paused ? "Resume" : "Pause"}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-black/50 backdrop-blur transition hover:bg-black/80"
            >
              {paused ? <Play className="h-5 w-5" /> : <Pause className="h-5 w-5" />}
            </button>
            <button
              type="button"
              onClick={() => stepScene(1)}
              aria-label="Next camera"
              className="flex h-10 w-10 items-center justify-center rounded-full bg-black/50 backdrop-blur transition hover:bg-black/80"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={() => {
                const el = rootRef.current;
                if (document.fullscreenElement) void document.exitFullscreen().catch(() => {});
                else if (el?.requestFullscreen) el.requestFullscreen().catch(() => {});
              }}
              aria-label="Toggle fullscreen"
              className="flex h-10 w-10 items-center justify-center rounded-full bg-black/50 backdrop-blur transition hover:bg-black/80"
            >
              <Maximize className="h-5 w-5" />
            </button>
          </div>

          {paused && !gateOpen && (
            <div className="absolute bottom-5 left-5 font-mono text-[11px] tracking-widest text-white/60">
              PAUSED
            </div>
          )}

          {deadRotation && !gateOpen && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/70 px-6 text-center">
              <div>
                <p className="text-lg font-medium">These cameras aren&apos;t responding right now.</p>
                <p className="mt-2 text-sm text-white/70">
                  Nothing was counted against your demo. Try another mood, or again in a little while.
                </p>
                <button
                  type="button"
                  onClick={exitAmbient}
                  className="mt-5 rounded-full bg-white px-5 py-2 text-sm font-semibold text-black transition hover:bg-white/85"
                >
                  Back
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Mood sidebar ── */}
      {phase === "playing" && sidebarOpen && (
        <div className="absolute inset-0 z-30">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setSidebarOpen(false)}
            aria-hidden
          />
          <aside className="absolute inset-y-0 left-0 w-80 max-w-[85vw] overflow-y-auto bg-[#070b14]/95 p-6 backdrop-blur">
            <div className="mb-1 flex items-center justify-between">
              <h3 className="font-mono text-xs font-bold tracking-[0.25em] text-white/80">
                MOODS
              </h3>
              <button
                type="button"
                onClick={() => setSidebarOpen(false)}
                aria-label="Close moods"
                className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 transition hover:bg-white/20"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="mb-5 text-xs leading-relaxed text-white/50">
              Curated collections from the live catalogue — scenes picked by
              place and view, not by a weather feed. Night Views is the
              exception: it is computed from where the sun is down right now.
            </p>
            <ul className="space-y-2">
              {MOODS.map((m) => {
                const Icon = MOOD_ICONS[m.slug];
                const active = m.slug === mood;
                return (
                  <li key={m.slug}>
                    <button
                      type="button"
                      onClick={() => void changeMood(m.slug)}
                      className={`flex w-full items-start gap-3 rounded-xl border p-3.5 text-left transition ${
                        active
                          ? "border-[#0096FF]/60 bg-[#0096FF]/15"
                          : "border-white/10 bg-white/[0.03] hover:bg-white/[0.07]"
                      }`}
                    >
                      <Icon className="mt-0.5 h-5 w-5 shrink-0 text-[#7cc4ff]" />
                      <span>
                        <span className="block text-sm font-semibold">{m.label}</span>
                        <span className="mt-0.5 block text-xs leading-relaxed text-white/55">
                          {m.blurb}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
            <div className="mt-6 border-t border-white/10 pt-5">
              <Link
                href="/ambient/stream"
                className="flex items-center gap-2.5 rounded-xl border border-white/10 bg-white/[0.03] p-3.5 transition hover:bg-white/[0.07]"
              >
                <MonitorPlay className="h-5 w-5 shrink-0 text-red-400" />
                <span>
                  <span className="block text-sm font-semibold">Stream to YouTube</span>
                  <span className="mt-0.5 block text-xs text-white/55">
                    Run these scenes on your own channel, around the clock.
                  </span>
                </span>
              </Link>
            </div>
          </aside>
        </div>
      )}

      {/* ── The paywall (non-dismissible) ── */}
      {gateOpen && (
        <div
          className="absolute inset-0 z-40 flex items-center justify-center px-6"
          role="dialog"
          aria-modal="true"
          aria-label="Your free Ambient demo has ended"
        >
          <div className="w-full max-w-md rounded-3xl border border-white/15 bg-[#070b14]/90 p-8 text-center shadow-2xl backdrop-blur-xl">
            {/* eslint-disable-next-line @next/next/no-img-element -- static brand asset */}
            <img src="/worldeye-eye.png" alt="WorldEye" className="mx-auto mb-4 h-12 w-12" draggable={false} />
            <h2 className="text-2xl font-bold">Your free demo has ended</h2>
            <p className="mt-3 text-sm leading-relaxed text-white/65">
              That was three minutes of WorldEye Ambient — the planet, one
              live camera at a time. Ambient members stream unlimited Slow
              TV: every mood, no timer, on as many screens as you like.
            </p>
            <p className="mt-5 font-mono text-sm text-white/85">
              $4.99/month · <span className="text-[#7cc4ff]">10-day free trial</span> · cancel anytime
            </p>
            {alreadySubscribed ? (
              <Link
                href="/settings/subscription"
                className="mt-6 block rounded-full bg-white px-6 py-3 text-sm font-semibold text-black transition hover:bg-white/85"
              >
                Manage your subscription
              </Link>
            ) : (
              <button
                type="button"
                onClick={() => void startCheckout()}
                disabled={checkoutBusy}
                className="mt-6 w-full rounded-full bg-gradient-to-b from-[#e8c55a] to-[#D4AF37] px-6 py-3 text-sm font-bold text-black transition hover:brightness-110 disabled:opacity-60"
              >
                {checkoutBusy ? "Opening checkout…" : "Start 10-day free trial"}
              </button>
            )}
            {checkoutError && !alreadySubscribed && (
              <p className="mt-3 text-xs text-red-300">{checkoutError}</p>
            )}
            {!signedIn && (
              <p className="mt-5 text-xs text-white/50">
                Already an Ambient or Pro member?{" "}
                <Link href="/signin?callbackUrl=%2Fambient" className="text-[#7cc4ff] underline underline-offset-2">
                  Sign in
                </Link>{" "}
                and keep watching.
              </p>
            )}
            <p className="mt-4 text-[11px] leading-relaxed text-white/35">
              Ambient is separate from WorldEye Pro — and every Pro or VIP
              plan already includes it.
            </p>
          </div>
        </div>
      )}

      {/* ── Poster / start ── */}
      {phase === "poster" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center">
          {/* eslint-disable-next-line @next/next/no-img-element -- static brand asset */}
          <img src="/worldeye-eye.png" alt="WorldEye" className="mb-5 h-16 w-16" draggable={false} />
          <div className="mb-3 flex items-center gap-2.5">
            <h1 className="font-mono text-2xl font-bold tracking-[0.3em] md:text-3xl">WORLDEYE</h1>
            <span className="rounded bg-[#0096FF] px-2 py-0.5 font-mono text-xs font-bold tracking-widest">
              AMBIENT
            </span>
          </div>
          <p className="max-w-xl text-balance text-base text-white/80 md:text-lg">
            Slow TV from the real planet — rainy cities, snowy mountains,
            tropical beaches and places where night is falling, one live
            camera at a time.
          </p>

          <div className="mt-7 flex flex-wrap items-center justify-center gap-2">
            {MOODS.map((m) => {
              const Icon = MOOD_ICONS[m.slug];
              const active = m.slug === mood;
              return (
                <button
                  key={m.slug}
                  type="button"
                  onClick={() => void changeMood(m.slug)}
                  className={`flex items-center gap-2 rounded-full border px-4 py-2 text-sm transition ${
                    active
                      ? "border-[#0096FF]/70 bg-[#0096FF]/20 text-white"
                      : "border-white/15 bg-white/[0.03] text-white/70 hover:bg-white/[0.08]"
                  }`}
                >
                  <Icon className="h-4 w-4" /> {m.label}
                </button>
              );
            })}
          </div>

          {scenes === null && !scenesError && (
            <p className="mt-8 font-mono text-sm text-white/60">Loading cameras…</p>
          )}
          {scenesError && (
            <p className="mt-8 max-w-md text-sm text-white/70">
              The camera catalogue isn&apos;t answering right now, so Ambient
              can&apos;t start. Please try again in a little while.
            </p>
          )}
          {scenes && scenes.length > 0 && (
            <>
              <button
                type="button"
                onClick={() => void startShow()}
                className="mt-8 flex items-center gap-2 rounded-full bg-white px-7 py-3 text-base font-semibold text-black transition hover:bg-white/85"
              >
                <Play className="h-5 w-5" /> Start Ambient
              </button>
              <p className="mt-5 max-w-md text-xs leading-relaxed text-white/55">
                {access === "yes"
                  ? "Your plan includes unlimited Ambient — the show runs as long as you like."
                  : "Free demo: 3 minutes of streaming, no signup. Ambient members ($4.99/mo, 10-day free trial) and every Pro plan stream unlimited."}
              </p>
            </>
          )}
          <div className="mt-8 flex items-center gap-5 font-mono text-xs tracking-widest text-white/50">
            <Link href="/ambient-mode" className="underline-offset-4 transition hover:text-white hover:underline">
              ABOUT AMBIENT
            </Link>
            <Link href="/" className="underline-offset-4 transition hover:text-white hover:underline">
              ← BACK TO THE GLOBE
            </Link>
          </div>
        </div>
      )}

      <style jsx global>{`
        @keyframes ambientfadein {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
    </div>
  );
}
