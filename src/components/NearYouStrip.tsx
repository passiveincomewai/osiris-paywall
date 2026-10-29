"use client";

/**
 * First-camera prompt — the globe-arrival camera shortlist (rules in
 * lib/near-you.ts, location in lib/visitor-geo.ts).
 *
 * Why this shape (DB-measured, Oct 2026): 57% of globe sessions leave
 * without opening a camera, and the previous text-chip strip converted
 * only ~21% of its "shown" count — a count that itself fired while the
 * group-B welcome panel covered the strip on mobile. So the prompt is
 * now:
 *
 *  - VISUAL: 3–4 real cameras nearest the current view centre (then
 *    the visitor's area, then the curated featured set), each with its
 *    real still resolved by lib/camera-preview — the same machinery
 *    the map tiles use. The first card is the primary action; tapping
 *    any card dispatches the shipped first-camera bridge
 *    (we:open-camera), so the open goes through findCameraById →
 *    handleEntityClick with the free-camera gate and counting
 *    unchanged.
 *  - SESSION-GOALED: it exists only while this session has not yet
 *    opened a camera (the parent's cameraEverOpened latch), and shows
 *    at most once per session.
 *  - NEVER STACKED: the parent suppresses it while any onboarding
 *    surface, the signup nudge, the share prompt or the timed trial
 *    popup is up, and it reports its own visibility back so the timed
 *    popup yields in return. If another surface takes over after the
 *    prompt was already seen, the prompt retires for the session
 *    rather than queueing behind it.
 *
 * The X retires the prompt on this device permanently (localStorage);
 * it never re-nags. Analytics, on the existing PageView event path:
 * first_camera_shown:<mode>, first_camera_open:<mode> and
 * first_camera_dismiss:<mode>, mode = centre|near|featured — the mode
 * only, never the place, so the funnel stays measurable without
 * logging where anyone is. (The old near_you_* series stopped here:
 * its shown count was not trustworthy — see REPORT.md.)
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { MapPin, Play, Sparkles, X } from "lucide-react";
import { trackAnalyticsEvent } from "@/components/AnalyticsTracker";
import { freshen, refreshInterval } from "@/lib/camera-preview";
import {
  dispatchOpenCamera,
  parseShowcaseCameras,
  type FirstCamera,
} from "@/lib/onboarding/first-camera";
import {
  dismissNearYou,
  isNearYouDismissed,
  planNearYou,
  type NearYouItem,
  type NearYouPlan,
} from "@/lib/near-you";
import type { CameraCandidate } from "@/lib/nearby-cameras";
import type { VisitorLocation } from "@/lib/visitor-geo";

type PromptMode = "centre" | "near" | "featured";

interface NearYouStripProps {
  /** Globe arrived: splash gone and no camera deep link owns the view. */
  active: boolean;
  location: VisitorLocation | null;
  /** Current map view centre — the prompt's first-choice search point. */
  centre: { lat: number; lng: number } | null;
  cameras: CameraCandidate[] | undefined;
  catalogueSettled: boolean;
  /** The session's first camera has opened (any path) — goal met. */
  cameraOpened: boolean;
  /** Another proactive surface owns the stage right now. */
  suppressed: boolean;
  /** Visibility reporting, so sibling prompts can yield (the
   *  TimedTrialPopup pattern). */
  onVisibilityChange?: (visible: boolean) => void;
}

/** One card's still. Image feeds refresh on the preview cadence (a
 *  snapshot URL re-requested, an MJPEG stream never cache-busted);
 *  MP4 plays natively, muted and looped, like the map tiles. A media
 *  error retires just this card. */
function StillThumb({ item, onFail }: { item: NearYouItem; onFail: (id: string) => void }) {
  const { kind, url } = item.media;
  const every = kind === "mp4" ? 0 : refreshInterval(kind);
  const [src, setSrc] = useState(() => (every ? freshen(url) : url));

  useEffect(() => {
    if (!every) return;
    const t = setInterval(() => setSrc(freshen(url)), every);
    return () => clearInterval(t);
  }, [url, every]);

  if (kind === "mp4") {
    return (
      <video
        src={url}
        muted
        autoPlay
        loop
        playsInline
        onError={() => onFail(item.id)}
        className="absolute inset-0 h-full w-full object-cover"
      />
    );
  }
  return (
    /* eslint-disable-next-line @next/next/no-img-element -- remote camera frames, no loader */
    <img
      src={src}
      alt=""
      aria-hidden
      draggable={false}
      onError={() => onFail(item.id)}
      className="absolute inset-0 h-full w-full object-cover"
    />
  );
}

export default function NearYouStrip({
  active,
  location,
  centre,
  cameras,
  catalogueSettled,
  cameraOpened,
  suppressed,
  onVisibilityChange,
}: NearYouStripProps) {
  // null = device storage not read yet: render nothing rather than
  // flash the prompt at a visitor who already retired it.
  const [dismissed, setDismissed] = useState<boolean | null>(null);
  const [showcase, setShowcase] = useState<FirstCamera[]>([]);
  const [failedIds, setFailedIds] = useState<ReadonlySet<string>>(new Set());
  // Retired for this session after a takeover (see header): once the
  // visitor's attention has been handed to another surface, the
  // prompt does not queue up behind it.
  const [retired, setRetired] = useState(false);
  const wasVisibleRef = useRef(false);
  const shownModeRef = useRef<PromptMode | null>(null);
  const visibilityCbRef = useRef(onVisibilityChange);
  visibilityCbRef.current = onVisibilityChange;

  useEffect(() => {
    setDismissed(isNearYouDismissed());
  }, []);

  /* The featured set is fetched lazily, only when the prompt is in
     play, and sanitized by the first-camera module's own parser —
     the same curated feed the welcome panel's offer uses. */
  useEffect(() => {
    if (!active || dismissed !== false) return;
    let cancelled = false;
    fetch("/api/cctv/showcase")
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => {
        if (!cancelled && json) setShowcase(parseShowcaseCameras(json));
      })
      .catch(() => { /* no featured set — the prompt just stays hidden */ });
    return () => { cancelled = true; };
  }, [active, dismissed]);

  const plan: NearYouPlan = useMemo(
    () => planNearYou({ location, centre, cameras, catalogueSettled, showcase }),
    [location, centre, cameras, catalogueSettled, showcase],
  );

  const mode: PromptMode | null =
    plan.kind === "centre" || plan.kind === "near" || plan.kind === "featured" ? plan.kind : null;
  const items = useMemo(
    () =>
      plan.kind === "centre" || plan.kind === "near" || plan.kind === "featured"
        ? plan.items.filter((item) => !failedIds.has(item.id))
        : [],
    [plan, failedIds],
  );

  const visible =
    active &&
    !cameraOpened &&
    dismissed === false &&
    !suppressed &&
    !retired &&
    mode !== null &&
    items.length > 0;

  /* Shown + visibility bookkeeping. first_camera_shown fires at the
     first genuinely-visible moment (never while suppressed/covered),
     once per session: the parent unmounts the goal the moment a
     camera opens, dismissal is permanent, and a takeover retires it —
     so this transition can happen at most once. */
  useEffect(() => {
    if (visible && !wasVisibleRef.current) {
      wasVisibleRef.current = true;
      shownModeRef.current = mode;
      if (mode) trackAnalyticsEvent("first_camera_shown", mode);
      visibilityCbRef.current?.(true);
    } else if (!visible && wasVisibleRef.current) {
      wasVisibleRef.current = false;
      visibilityCbRef.current?.(false);
      if (suppressed) setRetired(true);
    }
  }, [visible, mode, suppressed]);

  if (!visible || mode === null) return null;

  const title =
    plan.kind === "centre"
      ? `Live cameras — ${plan.areaLabel}`
      : plan.kind === "near"
        ? `Near you — ${plan.areaLabel}`
        : "Featured cameras";

  const dismiss = () => {
    trackAnalyticsEvent("first_camera_dismiss", shownModeRef.current ?? mode);
    dismissNearYou();
    setDismissed(true);
  };

  const open = (id: string) => {
    trackAnalyticsEvent("first_camera_open", shownModeRef.current ?? mode);
    dispatchOpenCamera(id);
  };

  const onThumbFail = (id: string) =>
    setFailedIds((prev) => {
      if (prev.has(id)) return prev;
      const next = new Set(prev);
      next.add(id);
      return next;
    });

  return (
    <div
      data-hud
      className="absolute left-1/2 -translate-x-1/2 bottom-[118px] md:bottom-[84px] z-[320] w-[min(94vw,720px)] pointer-events-auto"
    >
      <section
        aria-label={title}
        className="rounded-xl border border-[var(--border-primary)] bg-[rgba(10,12,22,0.9)] backdrop-blur-xl px-3 py-2.5 shadow-[0_8px_32px_rgba(0,0,0,0.6)]"
      >
        <div className="flex items-center gap-2 pr-6">
          {mode === "featured" ? (
            <Sparkles className="h-3.5 w-3.5 shrink-0 text-[var(--gold-primary)]" aria-hidden />
          ) : (
            <MapPin className="h-3.5 w-3.5 shrink-0 text-[var(--gold-primary)]" aria-hidden />
          )}
          <h2 className="font-mono text-[10px] font-bold tracking-[0.22em] text-[var(--text-heading)] uppercase truncate">
            {title}
          </h2>
          <span className="hidden sm:inline font-mono text-[9px] tracking-[0.14em] text-[var(--text-muted)] uppercase">
            Tap one to watch it live
          </span>
          <button
            type="button"
            onClick={dismiss}
            aria-label="Dismiss camera suggestions"
            className="absolute right-1.5 top-1.5 rounded-full p-1.5 text-white/40 transition hover:bg-white/10 hover:text-white"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="mt-2 flex gap-2 overflow-x-auto pb-0.5 styled-scrollbar">
          {items.map((item, i) => (
            <button
              key={item.id}
              type="button"
              onClick={() => open(item.id)}
              className={`group shrink-0 w-[148px] rounded-lg border bg-white/[0.04] p-1.5 text-left transition hover:bg-white/[0.08] focus:outline-none focus-visible:ring-1 focus-visible:ring-white/60 ${
                i === 0
                  ? "border-[var(--gold-primary)]/60 hover:border-[var(--gold-primary)]"
                  : "border-white/10 hover:border-[var(--gold-primary)]/60"
              }`}
            >
              <span className="relative block aspect-video w-full overflow-hidden rounded-md bg-white/5">
                <StillThumb item={item} onFail={onThumbFail} />
                {i === 0 && (
                  <span className="absolute left-1 top-1 flex items-center gap-1 rounded-full bg-[var(--gold-primary)] px-1.5 py-0.5 font-mono text-[8.5px] font-bold tracking-[0.14em] text-black uppercase">
                    <Play className="h-2.5 w-2.5" aria-hidden /> Watch
                  </span>
                )}
              </span>
              <span className="mt-1.5 block truncate text-[11.5px] font-medium leading-snug text-[var(--text-heading)]">
                {item.name}
              </span>
              <span className="mt-0.5 block truncate font-mono text-[9px] tracking-[0.14em] text-[var(--text-muted)] uppercase">
                {[item.city, item.distanceLabel].filter(Boolean).join(" · ")}
              </span>
            </button>
          ))}
        </div>

        {mode === "near" && (
          <p className="mt-1.5 text-[9.5px] leading-snug text-[var(--text-muted)]">
            Distances are approximate — measured from your general area, not your exact location.
          </p>
        )}
      </section>
    </div>
  );
}
