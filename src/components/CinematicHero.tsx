'use client';
// Cinematic scroll hero: a 10s video scrubbed by page scroll (Apple-style).
// A 350vh spacer provides the scroll distance; the stage itself is
// position:fixed and driven entirely from the rAF loop (no position:sticky,
// which proved fragile against the page's overflow rules). Scroll progress
// maps to video time with easing (reversible), and the stage slides away
// over the final stretch to reveal the app underneath.
//
// Robustness notes:
// - Progress is derived from layout inside rAF (not scroll events), so it
//   works even if scroll events are missed or the scroller isn't window.
// - iOS Safari won't render programmatic seeks on a video that has never
//   played: the media pipeline is unlocked with play()->pause() on the first
//   user gesture.
import { useEffect, useRef, useState } from 'react';
import { preload } from 'react-dom';

const TRACK_VH = 350;
const EXIT_START = 0.85; // stage starts sliding away at 85% of the track
const EXIT_END = 0.97; // fully dismissed just before the absolute bottom
// (browsers don't always report scroll progress reaching exactly 1.0)

// ── Dismissal model (exported for tests) ──
// Progress is a pure function of layout: how far the track's top has
// scrolled past, over the track's scrollable range.
export function heroTrackProgress(trackTop: number, trackHeight: number, innerHeight: number): number {
  const total = trackHeight - innerHeight;
  return Math.min(1, Math.max(0, -trackTop / Math.max(1, total)));
}

// How far the stage has slid away, BEFORE dismissal completes: 0 until
// EXIT_START, then linear to 1 at EXIT_END. This is the first-visit
// behaviour and must never change under a visitor who is still scrubbing.
export function heroExitAmount(p: number): number {
  return Math.min(1, Math.max(0, (p - EXIT_START) / (EXIT_END - EXIT_START)));
}

// THE RULE: dismissal is a one-way door. The moment progress completes
// the exit, the hero is dismissed for the rest of the session — no later
// progress value (a scroll back up, a viewport resize, a keyboard opening,
// an in-app browser's chrome swinging) can ever clear it. Only a fresh
// page load mounts the hero again, at the top, where it belongs.
export function heroDismissedAfter(dismissed: boolean, p: number): boolean {
  return dismissed || p >= EXIT_END;
}

// ── Kill switch (Jameson, 2026-10-20) ──
// The scroll-scrubbed hero is parked for now: visitors land directly on
// the globe. Nothing is deleted — flip this constant to true (or set
// NEXT_PUBLIC_CINEMATIC_HERO=on and rebuild) and the hero returns
// exactly as it was, one-way-door dismissal and all. While it is off,
// the component never mounts, so the poster and video are never
// downloaded either.
const heroEnvOverride = process.env.NEXT_PUBLIC_CINEMATIC_HERO;
export const CINEMATIC_HERO_ENABLED: boolean = heroEnvOverride
  ? heroEnvOverride === 'on'
  : false;

const AD_MEDIUMS = ['cpc', 'ppc', 'paid', 'paid-social', 'paidsocial', 'ad', 'ads', 'display', 'social-paid'];

/**
 * Should this visit skip the hero and land straight on the globe?
 *
 * True whenever the kill switch is off. With the hero enabled, the
 * long-standing skips still apply, keyed ONLY off URL params: paid-ad
 * mediums and the explicit skip flags (a referrer can't distinguish
 * paid from organic Instagram — link-in-bio and shares carry the same
 * one — so organic visitors keep the hero), and camera deep links,
 * whose viewer must not sit buried under the stage.
 */
export function heroSkippedForSearch(
  search: string,
  heroEnabled: boolean = CINEMATIC_HERO_ENABLED,
): boolean {
  if (!heroEnabled) return true;
  try {
    const q = new URLSearchParams(search);
    const medium = (q.get('utm_medium') || '').toLowerCase().trim();
    return (
      AD_MEDIUMS.includes(medium) ||
      q.get('skip_hero') === '1' ||
      q.get('ad') === '1' ||
      Boolean(q.get('camera'))
    );
  } catch {
    return false;
  }
}

export default function CinematicHero() {
  // The poster is the hero's first paint (and its largest early content):
  // ask for it at preload priority instead of letting it queue behind the
  // app's JS. React hoists this into <head> during SSR.
  preload('/worldeye-cinematic-poster.jpg', { as: 'image' });
  const trackRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const bgRef = useRef<HTMLVideoElement>(null);
  const progressRef = useRef(0);
  const unlocked = useRef(false);
  const globeLocked = useRef(false);
  const [progress, setProgress] = useState(0);
  // Session-permanent dismissal. Once true, the stage unmounts and can
  // never return within this page session — see heroDismissedAfter.
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // After dismissal the stage is unmounted (videoRef/stageRef are null)
    // and there is nothing left to animate: no loop, no listeners.
    if (dismissed) return;
    const video = videoRef.current;
    const track = trackRef.current;
    const stage = stageRef.current;
    if (!video || !track || !stage) return;

    let raf = 0;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // The hero file is heavy (8.5MB desktop / 1.9MB mobile variant), so it
    // is NOT fetched on page load: the poster paints first, and the video
    // starts loading the moment the visitor actually engages — a gesture,
    // a wheel/key scroll, or the scrub loop noticing movement. Visitors who
    // never engage never pay for the bytes.
    let loadRequested = false;
    const ensureLoaded = () => {
      if (loadRequested) return;
      loadRequested = true;
      video.load();
      // The ambient blurred backdrop only renders on portrait screens.
      const bg = bgRef.current;
      if (bg && window.matchMedia('(orientation: portrait)').matches) {
        bg.load();
        bg.play().catch(() => {});
      }
    };
    const unlock = () => {
      ensureLoaded();
      if (unlocked.current) return;
      unlocked.current = true;
      video.play().then(() => video.pause()).catch(() => {});
    };
    window.addEventListener('pointerdown', unlock);
    window.addEventListener('touchstart', unlock);
    window.addEventListener('wheel', ensureLoaded, { passive: true });
    window.addEventListener('keydown', ensureLoaded);

    const tick = () => {
      const p = heroTrackProgress(track.getBoundingClientRect().top, track.offsetHeight, window.innerHeight);
      // Dismissal is checked FIRST and is a one-way door. The previous
      // design kept the stage mounted forever and recomputed its hidden
      // state from live layout every frame, with a latch that RELEASED
      // when progress sagged below EXIT_START. That release is the bug
      // Jameson kept hitting: on the globe, an in-app browser's chrome
      // swinging (Instagram/WKWebView), a keyboard opening over the
      // search drawer, or any large viewport/scroll swing moves the
      // layout-derived progress far more than the small toolbar sag the
      // latch was hardened against — progress collapsed, the latch
      // released, and the intro slid back over the app. Now, the frame
      // progress completes the exit, the stage UNMOUNTS and the loop
      // stops: there is nothing left that any button, panel, resize or
      // scroll can resurrect. The intro exists again only on a fresh
      // page load, at the top, where it belongs.
      if (heroDismissedAfter(globeLocked.current, p)) {
        if (!globeLocked.current) {
          globeLocked.current = true;
          document.documentElement.classList.add('globe-locked');
          setDismissed(true);
        }
        return; // no next frame — this loop's work is done
      }
      if (p > 0.002) ensureLoaded();
      if (p !== progressRef.current) {
        progressRef.current = p;
        setProgress(p);
      }
      // Scrub the video to the scroll position.
      const target = p * (video.duration || 10);
      if (video.readyState >= 1) {
        const diff = target - video.currentTime;
        if (Math.abs(diff) > 0.0008) {
          video.currentTime = reduceMotion || Math.abs(diff) < 0.04
            ? target
            : video.currentTime + diff * 0.16;
        }
      }
      // Slide the stage up over the final stretch to reveal the app.
      // (p < EXIT_END here — dismissal above owns the completed state —
      // so exit is always < 1 and the stage is always visible mid-exit.)
      const exit = heroExitAmount(p);
      stage.style.transform = `translate3d(0,${(-exit * 100).toFixed(3)}%,0)`;
      stage.style.visibility = exit >= 1 ? 'hidden' : 'visible';
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('touchstart', unlock);
      window.removeEventListener('wheel', ensureLoaded);
      window.removeEventListener('keydown', ensureLoaded);
    };
  }, [dismissed]);

  const hintOpacity = Math.max(0, 1 - progress * 8);

  return (
    <>
      {/* Scroll track: empty 350vh spacer that provides the scroll distance. */}
      <div ref={trackRef} className="cinematic-root" style={{ height: `${TRACK_VH}vh` }} />
      {/* Pinned stage: fixed viewport, fully transform-driven. Rendered
          only until dismissal — after that it is out of the DOM for the
          rest of the session, so nothing can bring it back. */}
      {!dismissed && (
      <div ref={stageRef} className="fixed inset-0 z-[1000] bg-black overflow-hidden will-change-transform">
        <style>{`
          .cine-vid { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
          .cine-vid-bg { display: none; }
          @media (orientation: portrait) {
            /* Portrait phones: a 16:9 frame with object-cover would show only
               ~26% of the frame width, slicing the baked-in "WorldEye" title
               (it spans ~43% of the frame, x 29%-72%). Show the middle 50%
               instead — the full title fits centered with margin, and the
               video stays big and cinematic. Fill the screen behind it with
               a blurred, darkened copy of the video — no harsh letterbox. */
            .cine-vid-bg {
              display: block;
              position: absolute; inset: -5%;
              width: 110%; height: 110%;
              object-fit: cover;
              filter: blur(48px) brightness(0.45) saturate(1.2);
            }
            .cine-vid {
              inset: auto; top: 50%; left: 50%;
              width: 200vw; height: 112.5vw;
              transform: translate(-50%, -50%);
              box-shadow: 0 0 120px rgba(0, 0, 0, 0.8);
            }
          }
        `}</style>
        {/* Ambient blurred fill — portrait only, drifts in sync behind the main video.
            Loaded lazily by the effect (portrait only) — never autoplays on load. */}
        <video
          ref={bgRef}
          aria-hidden
          tabIndex={-1}
          className="cine-vid-bg"
          muted
          playsInline
          preload="none"
          loop
          disablePictureInPicture
        >
          <source src="/worldeye-cinematic-mobile.mp4" media="(max-width: 767px)" type="video/mp4" />
          <source src="/worldeye-cinematic.mp4" media="(min-width: 768px)" type="video/mp4" />
        </video>
        <video
          ref={videoRef}
          className="cine-vid"
          poster="/worldeye-cinematic-poster.jpg"
          muted
          playsInline
          preload="none"
          disablePictureInPicture
          aria-label="WorldEye cinematic intro — scroll to explore"
        >
          <source src="/worldeye-cinematic-mobile.mp4" media="(max-width: 767px)" type="video/mp4" />
          <source src="/worldeye-cinematic.mp4" media="(min-width: 768px)" type="video/mp4" />
        </video>
        {/* Scroll hint — fades as soon as you start scrolling */}
        <div
          className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-3 pointer-events-none transition-opacity duration-300"
          style={{ opacity: hintOpacity }}
        >
          <span className="text-sm font-semibold font-mono tracking-[0.4em] text-cyan-200/90">SCROLL</span>
          <svg width="34" height="34" viewBox="0 0 24 24" fill="none" className="animate-bounce">
            <path d="M6 9l6 6 6-6" stroke="rgba(103,232,249,.95)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        {/* Subtle vignette so the video blends into the page */}
        <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-black/70 to-transparent pointer-events-none" />
      </div>
      )}
    </>
  );
}
