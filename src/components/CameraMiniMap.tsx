'use client';

import { useEffect, useRef, useState } from 'react';
import type { MapOptions } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

/**
 * The camera viewer's built-in location map: where this camera sits,
 * shown on the site's own dark basemap without sending the visitor off
 * to an external maps site. Mounted only when the viewer asks for it
 * (the MAP TARGET toggle), and MapLibre itself loads lazily inside the
 * effect, so a camera view that never opens the map never pays for the
 * library.
 *
 * The initialisation mirrors the main globe (OsirisMap) and the route
 * maps (SkiRouteMap) rather than trusting MapLibre's defaults: the
 * worker is the site's self-hosted copy (the bundled default does not
 * resolve reliably in this app's chunk layout, and a lazy map cannot
 * count on the globe having configured the shared module first), CARTO
 * traffic goes through the tile proxy like the globe's, a refused
 * WebGL context walks down the same fallback ladder, and the canvas is
 * kept sized to its box by a ResizeObserver — the panel animates open
 * around the map, so a map sized once at construction can be left
 * rendering dark. Any failure before the style loads says so on the
 * panel instead of leaving a silent black rectangle; the map-app
 * links under the map remain the way out.
 */

const BASEMAP_STYLE = 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json';

/* Route CARTO CDN requests through the internal tile proxy, exactly
   as the globe's transformRequest does. */
function proxiedTiles(url: string) {
  if (url.includes('cartocdn.com')) {
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
    return { url: `${baseUrl}/api/proxy-tiles?url=${encodeURIComponent(url)}` };
  }
  return { url };
}

export default function CameraMiniMap({ lat, lng, name }: { lat: number; lng: number; name?: string }) {
  const holderRef = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const holder = holderRef.current;
    if (!holder) return;
    let cancelled = false;
    let map: { remove: () => void } | null = null;
    let observer: ResizeObserver | null = null;
    setFailed(false);

    import('maplibre-gl')
      .then(maplibregl => {
        if (cancelled || !holderRef.current) return;
        maplibregl.setWorkerUrl(`/vendor/maplibre/${maplibregl.getVersion()}/maplibre-gl-worker.mjs`);

        /* Same WebGL fallback ladder as the globe: MapLibre asks for a
           high-performance WebGL2 context and throws outright if it
           cannot get one; walk down to weaker requests before giving
           up, cleaning the container between attempts. */
        const attributeFallbacks: MapOptions['canvasContextAttributes'][] = [
          undefined,
          { powerPreference: 'low-power', failIfMajorPerformanceCaveat: false },
          { powerPreference: 'low-power', failIfMajorPerformanceCaveat: false, antialias: false },
        ];
        let m: InstanceType<typeof maplibregl.Map> | undefined;
        for (const canvasContextAttributes of attributeFallbacks) {
          try {
            m = new maplibregl.Map({
              container: holderRef.current,
              style: BASEMAP_STYLE,
              center: [lng, lat],
              zoom: 14,
              attributionControl: { compact: true },
              transformRequest: proxiedTiles,
              ...(canvasContextAttributes ? { canvasContextAttributes } : {}),
            });
            break;
          } catch {
            if (holderRef.current) holderRef.current.innerHTML = '';
            m = undefined;
          }
        }
        if (!m) {
          if (!cancelled) setFailed(true);
          return;
        }
        map = m;

        let loaded = false;
        m.on('error', () => {
          /* Errors before the style loads are fatal to the map (style
             unreachable, worker or WebGL failure); tile-level errors
             after load are transient and the map recovers on its own. */
          if (!loaded && !cancelled) setFailed(true);
        });
        m.on('load', () => {
          loaded = true;
          if (!cancelled) m.resize();
        });
        m.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');

        const pin = document.createElement('div');
        pin.style.cssText =
          'width:14px;height:14px;border-radius:9999px;background:var(--gold-primary);border:2px solid rgba(0,0,0,0.85);box-shadow:0 0 10px rgba(0,0,0,0.8)';
        pin.title = name || 'Camera location';
        new maplibregl.Marker({ element: pin }).setLngLat([lng, lat]).addTo(m);

        /* The holder may still be settling when the map is constructed
           (the panel animates open around it) — size the canvas now and
           keep it matched to its box, as the globe does. */
        m.resize();
        observer = new ResizeObserver(() => { if (!cancelled) m.resize(); });
        if (holderRef.current) observer.observe(holderRef.current);
      })
      .catch(() => { if (!cancelled) setFailed(true); });

    return () => {
      cancelled = true;
      observer?.disconnect();
      map?.remove();
    };
  }, [lat, lng, name]);

  return (
    <div className="border-t border-white/5">
      <div className="relative">
        <div
          ref={holderRef}
          className="w-full h-48 bg-black"
          role="img"
          aria-label={name ? `Map showing the location of ${name}` : 'Map showing the camera location'}
        />
        {failed && (
          <div className="absolute inset-0 flex items-center justify-center bg-black px-4 text-center text-[10px] font-mono tracking-widest text-[var(--text-muted)]">
            MAP UNAVAILABLE HERE — USE THE MAP APP LINKS BELOW
          </div>
        )}
      </div>
      <div className="px-3 py-1 text-[9px] font-mono tracking-widest text-[var(--text-muted)]">
        {lat.toFixed(5)}, {lng.toFixed(5)}
      </div>
    </div>
  );
}
