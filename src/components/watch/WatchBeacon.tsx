"use client";
import { useEffect, useRef } from "react";

/**
 * Fires the watch-page visit beacon once per browser session per clip:
 * counts the view and drops the sharer's referral attribution cookie
 * (server side, /api/watch/<slug>/view — same mechanics as /ref/<code>).
 * Session-scoped so remounts and player interactions never double-count.
 */
export default function WatchBeacon({ slug }: { slug: string }) {
  const fired = useRef(false);
  useEffect(() => {
    if (fired.current) return;
    fired.current = true;
    const key = `we_watch_seen:${slug}`;
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, "1");
    } catch {
      // Private mode: the ref guard above still dedupes this mount.
    }
    fetch(`/api/watch/${encodeURIComponent(slug)}/view`, { method: "POST" }).catch(() => null);
  }, [slug]);
  return null;
}
