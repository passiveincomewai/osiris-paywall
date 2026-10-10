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
        <video
          ref={videoRef}
          className="absolute inset-0 h-full w-full object-cover"
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
          className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 pointer-events-none transition-opacity duration-300"
          style={{ opacity: hintOpacity }}
        >
          <span className="text-[10px] font-mono tracking-[0.35em] text-cyan-200/80">SCROLL</span>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" className="animate-bounce">
            <path d="M6 9l6 6 6-6" stroke="rgba(103,232,249,.9)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        {/* Subtle vignette so the video blends into the page */}
        <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-black/70 to-transparent pointer-events-none" />
      </div>
    </>
  );
}
