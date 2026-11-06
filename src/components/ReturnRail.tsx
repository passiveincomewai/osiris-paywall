"use client";

/**
 * "Pick up where you left off" — the return-visit rail (Wave 2 item 7).
 *
 * A slim strip in the globe's bottom-centre prompt slot (shared with
 * NearYouStrip under Dashboard arbitration: a visitor WITH history gets
 * this rail, and the first-camera prompt yields) listing the cameras
 * this visitor has actually opened before, most recent first, so a
 * returning visitor is one tap from their places.
 *
 * Data, in merge order (lib/analytics/recent-cameras):
 *  1. Signed-in server history — GET /api/analytics/recent-cameras,
 *     the caller's own camera_open PageView rows (cameraId-stamped).
 *  2. This device's localStorage recents, recorded at open time by
 *     trackAnalyticsEvent — the only source for signed-out visitors,
 *     and the instant list while the server answer is in flight.
 * Every candidate id is then re-resolved against /api/cctv?id= and the
 * LIVE record's name/place is what renders; an id that no longer
 * resolves is dropped, never placeholdered. No history (or nothing
 * resolvable) → the rail does not render at all. History only exists
 * from the camera-id instrumentation onward — earlier opens were never
 * recorded with an id, so there is nothing to backfill and none is
 * faked.
 *
 * A tap dispatches `we:open-camera`, the same event onboarding's
 * first-camera assist uses: the open flows through the deep-link path
 * (free-camera gate, open counting, analytics) exactly like a map
 * click, and the fresh camera_open re-stamps the camera's recency.
 */

import { useEffect, useRef, useState } from "react";
import {
  mergeRecentCameras,
  readRecentCameras,
  type RecentCandidate,
} from "@/lib/analytics/recent-cameras";

const DISMISS_KEY = "we_return_rail_dismissed";
const RAIL_MAX = 8;

interface ResolvedCamera {
  id: string;
  name: string;
  place: string;
}

interface ReturnRailProps {
  /** Globe arrived: splash gone and no camera deep link owns the view. */
  active: boolean;
  /** Another proactive surface owns the stage, or a camera is open. */
  suppressed: boolean;
  /** Visibility reporting, so the first-camera prompt can yield. */
  onVisibilityChange?: (visible: boolean) => void;
}

async function fetchServerRecents(): Promise<RecentCandidate[]> {
  try {
    const r = await fetch("/api/analytics/recent-cameras", { cache: "no-store" });
    if (!r.ok) return [];
    const j = (await r.json().catch(() => null)) as { cameras?: unknown } | null;
    if (!j || !Array.isArray(j.cameras)) return [];
    return j.cameras.filter(
      (c): c is RecentCandidate =>
        typeof c === "object" &&
        c !== null &&
        typeof (c as { id?: unknown }).id === "string" &&
        typeof (c as { name?: unknown }).name === "string",
    );
  } catch {
    return [];
  }
}

async function resolveCamera(id: string): Promise<ResolvedCamera | null> {
  try {
    const r = await fetch(`/api/cctv?id=${encodeURIComponent(id)}`, { cache: "no-store" });
    if (!r.ok) return null;
    const j = (await r.json().catch(() => null)) as { cameras?: unknown } | null;
    const cam = Array.isArray(j?.cameras) ? (j.cameras[0] as Record<string, unknown> | undefined) : undefined;
    if (!cam || typeof cam.name !== "string" || !cam.name) return null;
    const place = [cam.city, cam.country].filter((v): v is string => typeof v === "string" && !!v).join(", ");
    return { id, name: cam.name, place };
  } catch {
    return null;
  }
}

export default function ReturnRail({ active, suppressed, onVisibilityChange }: ReturnRailProps) {
  // null = device storage not read yet: render nothing rather than
  // flash the rail at a visitor who already dismissed it this session.
  const [dismissed, setDismissed] = useState<boolean | null>(null);
  const [items, setItems] = useState<ResolvedCamera[] | null>(null);
  const [eligible, setEligible] = useState(false);
  const loadStarted = useRef(false);

  useEffect(() => {
    try {
      setDismissed(sessionStorage.getItem(DISMISS_KEY) === "1");
    } catch {
      setDismissed(false);
    }
  }, []);

  useEffect(() => {
    if (!active || dismissed !== false || loadStarted.current) return;
    loadStarted.current = true;
    let cancelled = false;
    void (async () => {
      const local = readRecentCameras();
      const server = await fetchServerRecents();
      if (cancelled) return;
      const candidates = mergeRecentCameras(server, local, RAIL_MAX);
      if (candidates.length === 0) return;
      // Candidates exist: claim the slot now (the first-camera prompt
      // yields) even while resolution is in flight.
      setEligible(true);
      const resolved = (await Promise.all(candidates.map((c) => resolveCamera(c.id)))).filter(
        (c): c is ResolvedCamera => c !== null,
      );
      if (cancelled) return;
      setItems(resolved);
      if (resolved.length === 0) setEligible(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [active, dismissed]);

  const visible = eligible && items !== null && items.length > 0 && !suppressed && dismissed === false;

  const notifyRef = useRef(onVisibilityChange);
  notifyRef.current = onVisibilityChange;
  useEffect(() => {
    notifyRef.current?.(visible);
  }, [visible]);

  if (!visible) return null;

  const dismiss = () => {
    try {
      sessionStorage.setItem(DISMISS_KEY, "1");
    } catch {
      /* storage blocked — dismissal lasts for this mount only */
    }
    setDismissed(true);
  };

  const open = (id: string) => {
    window.dispatchEvent(new CustomEvent("we:open-camera", { detail: { id } }));
  };

  return (
    <div
      className="absolute left-1/2 -translate-x-1/2 bottom-[118px] md:bottom-[84px] z-[315] w-[min(94vw,720px)] pointer-events-auto"
      role="region"
      aria-label="Pick up where you left off"
    >
      <div className="glass-panel rounded-2xl px-3 py-2.5">
        <div className="flex items-center gap-2">
          <span className="shrink-0 font-mono text-[8.5px] font-bold tracking-[0.14em] text-[var(--gold-primary)] uppercase">
            Pick up where you left off
          </span>
          <div className="flex min-w-0 flex-1 items-center gap-1.5 overflow-x-auto styled-scrollbar">
            {items.map((cam) => (
              <button
                key={cam.id}
                type="button"
                onClick={() => open(cam.id)}
                className="shrink-0 rounded-full bg-white/5 px-2.5 py-1 text-left transition hover:bg-white/15"
                title={cam.place || cam.name}
              >
                <span className="block max-w-[180px] truncate text-[11px] leading-tight text-white/90">{cam.name}</span>
                {cam.place && (
                  <span className="block max-w-[180px] truncate text-[9px] leading-tight text-white/40">{cam.place}</span>
                )}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={dismiss}
            aria-label="Dismiss"
            className="shrink-0 rounded-full p-1.5 text-white/40 transition hover:bg-white/10 hover:text-white"
          >
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden>
              <path d="M1 1l8 8M9 1L1 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
