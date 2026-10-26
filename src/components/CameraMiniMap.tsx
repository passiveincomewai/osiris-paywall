'use client';

import { useEffect, useRef } from 'react';
import 'maplibre-gl/dist/maplibre-gl.css';

/**
 * The camera viewer's built-in location map: where this camera sits,
 * shown on the site's own dark basemap without sending the visitor off
 * to an external maps site. Mounted only when the viewer asks for it
 * (the MAP TARGET toggle), and MapLibre itself loads lazily inside the
 * effect, so a camera view that never opens the map never pays for the
 * library.
 */

const BASEMAP_STYLE = 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json';

export default function CameraMiniMap({ lat, lng, name }: { lat: number; lng: number; name?: string }) {
  const holderRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const holder = holderRef.current;
    if (!holder) return;
    let cancelled = false;
    let map: { remove: () => void } | null = null;

    import('maplibre-gl')
      .then(maplibregl => {
        if (cancelled || !holderRef.current) return;
        const m = new maplibregl.Map({
          container: holderRef.current,
          style: BASEMAP_STYLE,
          center: [lng, lat],
          zoom: 14,
          attributionControl: { compact: true },
        });
        map = m;
        m.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');

        const pin = document.createElement('div');
        pin.style.cssText =
          'width:14px;height:14px;border-radius:9999px;background:var(--gold-primary);border:2px solid rgba(0,0,0,0.85);box-shadow:0 0 10px rgba(0,0,0,0.8)';
        pin.title = name || 'Camera location';
        new maplibregl.Marker({ element: pin }).setLngLat([lng, lat]).addTo(m);

        // The panel animates open around the map; settle the size once it has.
        const t = setTimeout(() => { if (!cancelled) m.resize(); }, 60);
        m.on('remove', () => clearTimeout(t));
      })
      .catch(() => { /* A map that cannot load leaves the coordinates line below. */ });

    return () => {
      cancelled = true;
      map?.remove();
    };
  }, [lat, lng, name]);

  return (
    <div className="border-t border-white/5">
      <div
        ref={holderRef}
        className="w-full h-48 bg-black"
        role="img"
        aria-label={name ? `Map showing the location of ${name}` : 'Map showing the camera location'}
      />
      <div className="px-3 py-1 text-[9px] font-mono tracking-widest text-[var(--text-muted)]">
        {lat.toFixed(5)}, {lng.toFixed(5)}
      </div>
    </div>
  );
}
