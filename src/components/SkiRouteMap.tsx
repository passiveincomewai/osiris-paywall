'use client';

import { useEffect, useRef } from 'react';
import 'maplibre-gl/dist/maplibre-gl.css';

/**
 * The route tool's result map: the planned drive drawn on the site's
 * dark basemap, with a marker for every camera the corridor search
 * found along it. Read-only by design — pan/zoom to inspect, click a
 * camera dot for its name and how far into the drive it sits; the
 * ordered camera list below the map is where feeds open.
 *
 * MapLibre loads lazily inside the effect: this component only mounts
 * once a route has actually been planned, so a resort page that never
 * runs the tool never pays for the library.
 */

export interface RouteMapCamera {
  id: string;
  name: string;
  lat: number;
  lng: number;
  alongKm: number;
}

const BASEMAP_STYLE = 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json';

export default function SkiRouteMap({
  route,
  cameras,
  start,
  destination,
}: {
  /** Route polyline as [lng, lat] pairs — the directions API's shape. */
  route: readonly (readonly [number, number])[];
  cameras: readonly RouteMapCamera[];
  start: { lat: number; lng: number; label: string };
  destination: { lat: number; lng: number; label: string };
}) {
  const holderRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const holder = holderRef.current;
    if (!holder || route.length < 2) return;
    let cancelled = false;
    let map: { remove: () => void } | null = null;

    import('maplibre-gl')
      .then(maplibregl => {
        if (cancelled || !holderRef.current) return;
        const m = new maplibregl.Map({
          container: holderRef.current,
          style: BASEMAP_STYLE,
          attributionControl: { compact: true },
        });
        map = m;
        m.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');

        m.on('load', () => {
          if (cancelled) return;
          m.addSource('ski-route', {
            type: 'geojson',
            data: {
              type: 'Feature',
              properties: {},
              geometry: { type: 'LineString', coordinates: route.map(p => [p[0], p[1]]) },
            },
          });
          /* Casing first so the gold line reads on any basemap tone. */
          m.addLayer({
            id: 'ski-route-casing',
            type: 'line',
            source: 'ski-route',
            layout: { 'line-cap': 'round', 'line-join': 'round' },
            paint: { 'line-color': '#05070d', 'line-width': 7, 'line-opacity': 0.65 },
          });
          m.addLayer({
            id: 'ski-route-line',
            type: 'line',
            source: 'ski-route',
            layout: { 'line-cap': 'round', 'line-join': 'round' },
            paint: { 'line-color': '#D4AF37', 'line-width': 3.5 },
          });

          m.addSource('ski-route-cameras', {
            type: 'geojson',
            data: {
              type: 'FeatureCollection',
              features: cameras.map(c => ({
                type: 'Feature' as const,
                properties: { name: c.name, alongKm: c.alongKm },
                geometry: { type: 'Point' as const, coordinates: [c.lng, c.lat] },
              })),
            },
          });
          m.addLayer({
            id: 'ski-route-camera-dots',
            type: 'circle',
            source: 'ski-route-cameras',
            paint: {
              'circle-radius': 5.5,
              'circle-color': '#00E5FF',
              'circle-stroke-color': '#05070d',
              'circle-stroke-width': 1.5,
            },
          });
          m.on('click', 'ski-route-camera-dots', e => {
            const f = e.features?.[0];
            if (!f) return;
            const props = f.properties as { name?: string; alongKm?: number };
            const coords = (f.geometry as unknown as { coordinates: [number, number] })
              .coordinates;
            /* Camera names arrive from third-party feeds — build the
               popup from text nodes, never interpolated HTML. */
            const box = document.createElement('div');
            box.style.cssText = 'font:13px/1.45 system-ui;color:#0b0f1a';
            const title = document.createElement('strong');
            title.textContent = props.name ?? 'Camera';
            box.append(title, document.createElement('br'));
            box.append(
              document.createTextNode(
                `${Number(props.alongKm ?? 0).toFixed(1)} km into your drive`,
              ),
            );
            new maplibregl.Popup({ closeButton: false, offset: 10 })
              .setLngLat(coords)
              .setDOMContent(box)
              .addTo(m);
          });
          m.on('mouseenter', 'ski-route-camera-dots', () => {
            m.getCanvas().style.cursor = 'pointer';
          });
          m.on('mouseleave', 'ski-route-camera-dots', () => {
            m.getCanvas().style.cursor = '';
          });

          const dot = (color: string, title: string) => {
            const el = document.createElement('div');
            el.title = title;
            el.style.cssText = `width:14px;height:14px;border-radius:9999px;background:${color};border:2.5px solid #05070d;box-shadow:0 0 0 1.5px ${color}`;
            return el;
          };
          new maplibregl.Marker({ element: dot('#4ade80', `Start — ${start.label}`) })
            .setLngLat([start.lng, start.lat])
            .addTo(m);
          new maplibregl.Marker({ element: dot('#D4AF37', `Destination — ${destination.label}`) })
            .setLngLat([destination.lng, destination.lat])
            .addTo(m);

          const bounds = new maplibregl.LngLatBounds();
          for (const p of route) bounds.extend([p[0], p[1]]);
          bounds.extend([start.lng, start.lat]);
          bounds.extend([destination.lng, destination.lat]);
          m.fitBounds(bounds, { padding: 44, maxZoom: 12, duration: 0 });
        });
      })
      .catch(() => {
        /* No map (WebGL unavailable, style unreachable): the ordered
           camera list below carries the result on its own. */
      });

    return () => {
      cancelled = true;
      map?.remove();
    };
  }, [route, cameras, start, destination]);

  if (route.length < 2) return null;
  return (
    <div
      ref={holderRef}
      className="h-[340px] md:h-[420px] w-full overflow-hidden rounded-xl border border-white/10 bg-[#0b0f1a]"
      role="img"
      aria-label="Map of your planned drive with the live cameras along it marked"
    />
  );
}
