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
    return () => {
      window.removeEventListener("pagehide", reportDuration);
    };
  }, [path]);

  return null;
}
