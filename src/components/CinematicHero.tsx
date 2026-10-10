'use client';
// Cinematic scroll hero: a 10s video scrubbed by page scroll (Apple-style).
// Tall scroll track (350vh) with a sticky 100vh stage; scroll progress maps
// to video time, eased in rAF for buttery scrubbing forward AND backward.
// The existing app below is untouched — it sits fixed behind this section
// and is revealed when the track scrolls away.
import { useEffect, useRef, useState } from 'react';

const TRACK_VH = 350;

export default function CinematicHero() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const target = useRef(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const video = videoRef.current;
    const section = sectionRef.current;
    if (!video || !section) return;

    let raf = 0;
    let visible = true;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const computeTarget = () => {
      const total = section.offsetHeight - window.innerHeight;
      const p = Math.min(1, Math.max(0, -section.getBoundingClientRect().top / Math.max(1, total)));
      target.current = p * (video.duration || 10);
      setProgress(p);
    };

    const tick = () => {
      if (visible && video.readyState >= 1) {
        const diff = target.current - video.currentTime;
        if (Math.abs(diff) > 0.0008) {
          // Ease toward the target; snap when close. Instant if reduced motion.
          video.currentTime = reduceMotion || Math.abs(diff) < 0.04
            ? target.current
            : video.currentTime + diff * 0.16;
        }
      }
      raf = requestAnimationFrame(tick);
    };

    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; }, { threshold: 0 });
    io.observe(section);

    computeTarget();
    video.addEventListener('loadedmetadata', computeTarget);
    window.addEventListener('scroll', computeTarget, { passive: true });
    window.addEventListener('resize', computeTarget);
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      video.removeEventListener('loadedmetadata', computeTarget);
      window.removeEventListener('scroll', computeTarget);
      window.removeEventListener('resize', computeTarget);
    };
  }, []);

  const hintOpacity = Math.max(0, 1 - progress * 8);

  return (
    <div ref={sectionRef} className="relative z-[1000]" style={{ height: `${TRACK_VH}vh` }}>
      <div className="sticky top-0 h-[100svh] w-full overflow-hidden bg-black">
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
