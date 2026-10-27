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

/**
 * First-touch UTM capture. If the landing URL carries utm_* params, persist
 * them (30 days) in localStorage + a we_utm cookie so server routes (signup,
 * checkout, growth webhooks) can attribute the conversion to the campaign.
 * First touch wins: an existing capture is never overwritten.
 */
export function captureUtm(): Record<string, string> {
  try {
    const stored = localStorage.getItem("we_utm");
    if (stored) return JSON.parse(stored) as Record<string, string>;
    const q = new URLSearchParams(window.location.search);
    const utm: Record<string, string> = {};
    // Keep only the characters legitimate UTM values use; cap at 120 chars.
    const clean = (v: string | null) => (v ? v.replace(/[^A-Za-z0-9\-_./ ]/g, "").slice(0, 120) : "");
    const s = clean(q.get("utm_source")), m = clean(q.get("utm_medium")), c = clean(q.get("utm_campaign")), ct = clean(q.get("utm_content"));
    if (s) utm.s = s;
    if (m) utm.m = m;
    if (c) utm.c = c;
    if (ct) utm.ct = ct;
    if (Object.keys(utm).length > 0) {
      const json = JSON.stringify(utm);
      localStorage.setItem("we_utm", json);
      document.cookie = `we_utm=${encodeURIComponent(json)}; Max-Age=${30 * 86400}; Path=/; SameSite=Lax`;
    }
    return utm;
  } catch {
    return {};
  }
}

/**
 * Fire a named interaction event (e.g. "camera_open", "upgrade_gate_shown").
 * `detail` is one machine token ([a-z0-9_], ≤24 chars) stored as
 * `event:detail` — see lib/analytics/ingest-fields.
 */
export function trackAnalyticsEvent(event: string, detail?: string) {
  try {
    const sid = sessionId();
    fetch("/api/analytics/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        path: window.location.pathname,
        sessionId: sid,
        event,
        ...(detail ? { detail } : {}),
      }),
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
    const utm = captureUtm();
    const payload = JSON.stringify({
      path,
      sessionId: sid,
      referrer: document.referrer || null,
      utmSource: utm.s ?? null,
      utmMedium: utm.m ?? null,
      utmCampaign: utm.c ?? null,
      utmContent: utm.ct ?? null,
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
    let targetWaiter: MutationObserver | null = null;
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
        const watchTarget = (target: Element) => {
          if (!("IntersectionObserver" in window)) return;
          observer = new IntersectionObserver((entries) => {
            if (entries.some((e) => e.isIntersecting)) fire();
          }, { threshold: 0.15 });
          observer.observe(target);
        };
        const target = document.querySelector("[data-globe-section]");
        if (target) {
          watchTarget(target);
        } else if ("MutationObserver" in window) {
          // The globe section can mount late: during the time-boxed
          // account gate (lib/account-gate) the root page renders the
          // sign-up wall first, and the shell — this section included —
          // appears only once the visitor's session passes the gate.
          // Wait for it (bounded: 60 s) so a signed-in visitor's
          // globe_reached still fires; a walled visitor never gets the
          // section, so nothing fires for them.
          let stopWait: ReturnType<typeof setTimeout> | undefined;
          targetWaiter = new MutationObserver(() => {
            const t = document.querySelector("[data-globe-section]");
            if (t) {
              targetWaiter?.disconnect();
              if (stopWait) clearTimeout(stopWait);
              watchTarget(t);
            }
          });
          targetWaiter.observe(document.body, { childList: true, subtree: true });
          stopWait = setTimeout(() => targetWaiter?.disconnect(), 60_000);
        }
      }
    }
    return () => {
      window.removeEventListener("pagehide", reportDuration);
      observer?.disconnect();
      targetWaiter?.disconnect();
    };
  }, [path]);

  return null;
}
