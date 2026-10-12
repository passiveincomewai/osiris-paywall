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

const TRACK_VH = 350;
const EXIT_START = 0.85; // stage starts sliding away at 85% of the track
const EXIT_END = 0.97; // fully dismissed just before the absolute bottom
// (browsers don't always report scroll progress reaching exactly 1.0)

export default function CinematicHero() {
  const trackRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const progressRef = useRef(0);
  const unlocked = useRef(false);
  const globeLocked = useRef(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const video = videoRef.current;
    const track = trackRef.current;
    const stage = stageRef.current;
    if (!video || !track || !stage) return;

    let raf = 0;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const unlock = () => {
      if (unlocked.current) return;
      unlocked.current = true;
      video.play().then(() => video.pause()).catch(() => {});
    };
    window.addEventListener('pointerdown', unlock);
    window.addEventListener('touchstart', unlock);
    video.load();

    const tick = () => {
      const total = track.offsetHeight - window.innerHeight;
      const p = Math.min(1, Math.max(0, -track.getBoundingClientRect().top / Math.max(1, total)));
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
      const exit = Math.min(1, Math.max(0, (p - EXIT_START) / (EXIT_END - EXIT_START)));
      stage.style.transform = `translate3d(0,${(-exit * 100).toFixed(3)}%,0)`;
      stage.style.visibility = exit >= 1 ? 'hidden' : 'visible';
      // One-way globe lock: once the stage has fully exited the visitor is
      // on the globe — freeze document scroll so they can't scroll back up.
      if (exit >= 1 && !globeLocked.current) {
        globeLocked.current = true;
        document.documentElement.classList.add('globe-locked');
      }
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('touchstart', unlock);
    };
  }, []);

  const hintOpacity = Math.max(0, 1 - progress * 8);

  return (
    <>
      {/* Scroll track: empty 350vh spacer that provides the scroll distance. */}
      <div ref={trackRef} className="cinematic-root" style={{ height: `${TRACK_VH}vh` }} />
      {/* Pinned stage: fixed viewport, fully transform-driven. */}
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
        {/* Ambient blurred fill — portrait only, drifts in sync behind the main video */}
        <video
          aria-hidden
          tabIndex={-1}
          className="cine-vid-bg"
          src="/worldeye-cinematic.mp4"
          muted
          playsInline
          preload="auto"
          autoPlay
          loop
          disablePictureInPicture
        />
        <video
          ref={videoRef}
          className="cine-vid"
          src="/worldeye-cinematic.mp4"
          poster="/worldeye-cinematic-poster.jpg"
          muted
          playsInline
          preload="auto"
          disablePictureInPicture
          aria-label="WorldEye cinematic intro — scroll to explore"
        />
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
    </>
  );
}
