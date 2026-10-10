'use client';
// Cinematic scroll hero: a 10s video scrubbed by page scroll (Apple-style).
// Tall scroll track (350vh) with a sticky 100vh stage; scroll progress maps
// to video time, eased in rAF for buttery scrubbing forward AND backward.
// The existing app below is untouched — it sits fixed behind this section
// and is revealed when the track scrolls away.
//
// Robustness notes:
// - Progress is derived from layout inside the rAF loop (not from scroll
//   events), so scrubbing works even if scroll events are missed or the
//   scroller isn't window.
// - iOS Safari won't render programmatic seeks on a video that has never
//   played: the media pipeline is unlocked with play()->pause() on the first
//   user gesture.
import { useEffect, useRef, useState } from 'react';

const TRACK_VH = 350;

export default function CinematicHero() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const progressRef = useRef(0);
  const unlocked = useRef(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const video = videoRef.current;
    const section = sectionRef.current;
    if (!video || !section) return;

    let raf = 0;
    let visible = true;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const unlock = () => {
      if (unlocked.current) return;
      unlocked.current = true;
      video.play().then(() => video.pause()).catch(() => {});
    };
    window.addEventListener('pointerdown', unlock);
    window.addEventListener('touchstart', unlock);

    const tick = () => {
      // Derive scroll progress from live layout every frame.
      const total = section.offsetHeight - window.innerHeight;
      const p = Math.min(1, Math.max(0, -section.getBoundingClientRect().top / Math.max(1, total)));
      if (p !== progressRef.current) {
        progressRef.current = p;
        setProgress(p);
      }
      const target = p * (video.duration || 10);
      if (visible && video.readyState >= 1) {
        const diff = target - video.currentTime;
        if (Math.abs(diff) > 0.0008) {
          video.currentTime = reduceMotion || Math.abs(diff) < 0.04
            ? target
            : video.currentTime + diff * 0.16;
        }
      }
      raf = requestAnimationFrame(tick);
    };

    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; }, { threshold: 0 });
    io.observe(section);

    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('touchstart', unlock);
    };
  }, []);

  const hintOpacity = Math.max(0, 1 - progress * 8);

  return (
    <div ref={sectionRef} className="cinematic-root relative z-[1000]" style={{ height: `${TRACK_VH}vh` }}>
      <div className="sticky top-0 h-screen w-full overflow-hidden bg-black" style={{ height: '100svh' }}>
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
    </div>
  );
}
