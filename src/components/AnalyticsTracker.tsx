"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

function sessionId(): string {
  try {
    let s = sessionStorage.getItem("we_sid");
    if (!s) {
      s = Math.random().toString(36).slice(2) + Date.now().toString(36);
      sessionStorage.setItem("we_sid", s);
    }
    return s;
  } catch {
    return "nosession";
  }
}

/** Fire a named interaction event (e.g. "camera_open", "upgrade_gate_shown"). */
export function trackAnalyticsEvent(event: string) {
  try {
    const sid = sessionId();
    fetch("/api/analytics/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path: window.location.pathname, sessionId: sid, event }),
      keepalive: true,
    }).catch(() => {});
  } catch {}
}

/** Lightweight first-party analytics: page view + visible seconds. Powers /admin. */
export default function AnalyticsTracker() {
  const path = usePathname();
  const startRef = useRef(0);

  useEffect(() => {
    const sid = sessionId();
    startRef.current = Date.now();
    const payload = JSON.stringify({
      path,
      sessionId: sid,
      referrer: document.referrer || null,
    });
    // Page view ping (keepalive so it survives navigation)
    try {
      fetch("/api/analytics/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: payload,
        keepalive: true,
      }).catch(() => {});
    } catch {}

    const reportDuration = () => {
      const secs = Math.round((Date.now() - startRef.current) / 1000);
      if (secs < 2) return;
      const body = JSON.stringify({ path, sessionId: sid, durationSec: secs });
      try {
        if (navigator.sendBeacon) {
          navigator.sendBeacon("/api/analytics/track", new Blob([body], { type: "application/json" }));
        } else {
          fetch("/api/analytics/track", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body,
            keepalive: true,
          }).catch(() => {});
        }
      } catch {}
    };
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") reportDuration();
    });
    window.addEventListener("pagehide", reportDuration);

    // Scroll-depth: fire once per session when the visitor actually reaches the globe.
    let fired = false;
    let observer: IntersectionObserver | null = null;
    if (path === "/") {
      try { fired = sessionStorage.getItem("we_globe_reached") === "1"; } catch {}
      if (!fired) {
        const fire = () => {
          fired = true;
          try { sessionStorage.setItem("we_globe_reached", "1"); } catch {}
          fetch("/api/analytics/track", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ path, sessionId: sid, event: "globe_reached" }),
            keepalive: true,
          }).catch(() => {});
          observer?.disconnect();
        };
        const target = document.querySelector("[data-globe-section]");
        if (target && "IntersectionObserver" in window) {
          observer = new IntersectionObserver((entries) => {
            if (entries.some((e) => e.isIntersecting)) fire();
          }, { threshold: 0.15 });
          observer.observe(target);
        }
      }
    }
    return () => {
      window.removeEventListener("pagehide", reportDuration);
      observer?.disconnect();
    };
  }, [path]);

  return null;
}
