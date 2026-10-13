"use client";

import Link from "next/link";
import type { ReactNode, MouseEvent } from "react";

// A link home to "/" — with one correction. Rendered ON the homepage
// itself (the content shell's "Explore the live globe" CTA, the header
// logo, the footer), a plain <Link href="/"> performs a same-route client
// navigation: the page does not scroll, nothing visibly happens, and the
// app's ?layers=… state is silently stripped from the URL. The visitor's
// intent in that spot is unambiguous — "take me to the globe" — so when
// we are already on "/", suppress the navigation and smooth-scroll to
// the globe instead: the end of the cinematic scroll track, where the
// live app sits. Off the homepage it behaves as an ordinary home link,
// and the real href="/" stays in the markup for crawlers and no-JS.
export default function GlobeHomeLink({
  children,
  className,
  ariaLabel,
}: {
  children: ReactNode;
  className?: string;
  ariaLabel?: string;
}) {
  const onClick = (e: MouseEvent<HTMLAnchorElement>) => {
    if (typeof window === "undefined") return;
    if (window.location.pathname !== "/") return; // ordinary navigation
    e.preventDefault();
    const track = document.querySelector<HTMLElement>(".cinematic-root");
    let target = 0;
    if (track) {
      // Globe zone = the scroll position where the cinematic hands over
      // to the app: the bottom of the track's scrollable range. Matches
      // the progress math in CinematicHero exactly.
      const trackTop = track.getBoundingClientRect().top + window.scrollY;
      target = Math.max(0, trackTop + track.offsetHeight - window.innerHeight);
    }
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: target, behavior: reduceMotion ? "auto" : "smooth" });
  };
  return (
    <Link href="/" onClick={onClick} className={className} aria-label={ariaLabel}>
      {children}
    </Link>
  );
}
