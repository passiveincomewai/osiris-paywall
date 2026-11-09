"use client";

/**
 * Support WorldEye — the /gods-eye-view timed triggers (spec §5):
 * show the popup ONCE at the FIRST of 60% scroll depth, 45 seconds on
 * the page, or desktop exit intent. Firing only REQUESTS the prompt —
 * DonateProvider applies every suppression rule (paid, supporter,
 * dismissed <14d, upgrade mutual exclusion, another dialog open)
 * before anything appears.
 */
import { useEffect, useRef } from "react";
import { requestTimedDonate } from "./donate-client";

export default function DonateTrigger() {
  const firedRef = useRef(false);

  useEffect(() => {
    const fire = () => {
      if (firedRef.current) return;
      firedRef.current = true;
      cleanup();
      requestTimedDonate("gods_eye_view");
    };
    const timer = window.setTimeout(fire, 45_000);
    const onScroll = () => {
      const doc = document.documentElement;
      const max = doc.scrollHeight - window.innerHeight;
      if (max > 0 && window.scrollY / max >= 0.6) fire();
    };
    const onMouseOut = (e: MouseEvent) => {
      // Exit intent: the pointer leaves through the top of the viewport.
      if (!e.relatedTarget && e.clientY <= 8) fire();
    };
    const fine = window.matchMedia("(pointer: fine)").matches;
    window.addEventListener("scroll", onScroll, { passive: true });
    if (fine) document.addEventListener("mouseout", onMouseOut);
    function cleanup() {
      window.clearTimeout(timer);
      window.removeEventListener("scroll", onScroll);
      document.removeEventListener("mouseout", onMouseOut);
    }
    return cleanup;
  }, []);

  return null;
}
