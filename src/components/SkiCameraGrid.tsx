'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { CameraFeedCard } from '@/components/camera-feed-card';
import { trackAnalyticsEvent } from '@/components/AnalyticsTracker';
import type { CountryCamera } from '@/lib/country-cameras';

/* The viewer (hls.js and all) loads only when a visitor actually opens a
   camera — the same lazy mount the country explorer uses. */
const CameraViewer = dynamic(() => import('@/components/CameraViewer'), { ssr: false });

/**
 * A grid of live camera feed cards for a fixed, server-selected set —
 * a resort's own cameras, its nearby ring, or one route's corridor. The
 * cards are the shared feed cards (components/camera-feed-card — the
 * country explorer's cards, extracted by the page-pattern rollout;
 * same live media, same LIVE-badge discipline, same viewer on open);
 * this component only owns the grid,
 * an optional per-card caption (distance along a route), and the
 * show-more step for long lists.
 */
export default function SkiCameraGrid({
  cameras,
  initial = 24,
  captions,
  emptyNote,
}: {
  cameras: CountryCamera[];
  /** Cards rendered before "show more" — the rest mount on demand so a
   *  100-camera ring never fires 100 feed requests at first paint. */
  initial?: number;
  /** Small line under a card's location, keyed by camera id — e.g.
   *  "Snow stake", or "12.4 km into your drive". A precomputed record,
   *  not a callback: server components render this grid too, and
   *  functions cannot cross the server/client boundary. */
  captions?: Record<string, string>;
  emptyNote?: string;
}) {
  const [shown, setShown] = useState(initial);
  const [active, setActive] = useState<CountryCamera | null>(null);

  if (cameras.length === 0) {
    return emptyNote ? (
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-center">
        <p className="text-sm text-white/70">{emptyNote}</p>
      </div>
    ) : null;
  }

  const visible = cameras.slice(0, shown);
  return (
    <div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {visible.map(cam => {
          const note = captions?.[cam.id];
          return (
            <div key={cam.id}>
              <CameraFeedCard
                cam={cam}
                onOpen={c => {
                  trackAnalyticsEvent('camera_open');
                  setActive(c);
                }}
              />
              {note && <p className="mt-1.5 px-1 text-[11px] text-white/40">{note}</p>}
            </div>
          );
        })}
      </div>
      {shown < cameras.length && (
        <div className="mt-6 text-center">
          <button
            type="button"
            onClick={() => setShown(n => n + initial)}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-white/15 text-sm font-semibold text-white/85 hover:bg-white/5 transition"
          >
            Show more cameras ({cameras.length - shown} remaining)
          </button>
        </div>
      )}
      {active && <CameraViewer camera={active} onClose={() => setActive(null)} />}
    </div>
  );
}
