'use client';

import { useEffect, useRef } from 'react';
import 'maplibre-gl/dist/maplibre-gl.css';
import { BASEMAP_STYLE } from '@/lib/basemap-style';

/**
 * The stop planner's result map: the walk to the stop drawn in
 * gold over the site's dark basemap, the ride from the stop in the
 * route's own colour underneath it, and a dot for every live
 * camera the corridor search found along the trip. When the plan
 * has a destination, the ride ends at the get-off stop (white
 * marker), the final walk is drawn dashed gold, and the
 * destination itself is marked red. Read-only by design — pan/zoom
 * to inspect, click a camera dot for its name and how far into the
 * trip it sits; the ordered camera list below the map is where
 * feeds open.
 *
 * Sibling of components/SkiRouteMap (the ski drive-up tool's map):
 * same lazy MapLibre load, same basemap, same marker language, so
 * a page that never runs the planner never pays for the library.
 */

export interface JourneyMapCamera {
  id: string;
  name: string;
  lat: number;
  lng: number;
  alongKm: number;
}

export default function StopJourneyMap({
  walk,
  ride,
  rideColor,
  cameras,
  start,
  stop,
  finalWalk,
  alight,
  end,
}: {
  /** Walking path as [lng, lat] pairs — the directions API's shape. */
  walk: readonly (readonly [number, number])[];
  /** Ride line from the stop toward the terminus, [lng, lat]. */
  ride: readonly (readonly [number, number])[];
  /** The route's GTFS colour, for the ride line. */
  rideColor: string;
  cameras: readonly JourneyMapCamera[];
  start: { lat: number; lng: number; label: string };
  stop: { lat: number; lng: number; label: string };
  /**
   * The destination side, when the visitor gave one: the final
   * walking leg from the alighting stop (drawn dashed so the two
   * walks read apart), the get-off stop marker, and the
   * destination marker. All absent on a start-only plan.
   */
  finalWalk?: readonly (readonly [number, number])[];
  alight?: { lat: number; lng: number; label: string };
  end?: { lat: number; lng: number; label: string };
}) {
  const holderRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const holder = holderRef.current;
    if (!holder || walk.length < 2) return;
    let cancelled = false;
    let map: { remove: () => void } | null = null;

    import('maplibre-gl')
      .then(maplibregl => {
        if (cancelled || !holderRef.current) return;
        /* Use the site's self-hosted worker copy: the bundled default
           does not resolve reliably in this app's chunk layout, and a
           lazy map cannot count on the globe having configured the
           shared module first. Without a worker the map never paints
           (black box, controls only). Same pattern as CameraMiniMap. */
        maplibregl.setWorkerUrl(`/vendor/maplibre/${maplibregl.getVersion()}/maplibre-gl-worker.mjs`);
        const m = new maplibregl.Map({
          container: holderRef.current,
          style: BASEMAP_STYLE,
          attributionControl: { compact: true },
        });
        map = m;
        m.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');

        m.on('load', () => {
          if (cancelled) return;

          if (ride.length >= 2) {
            m.addSource('journey-ride', {
              type: 'geojson',
              data: {
                type: 'Feature',
                properties: {},
                geometry: { type: 'LineString', coordinates: ride.map(p => [p[0], p[1]]) },
              },
            });
            m.addLayer({
              id: 'journey-ride-line',
              type: 'line',
              source: 'journey-ride',
              layout: { 'line-cap': 'round', 'line-join': 'round' },
              paint: { 'line-color': rideColor, 'line-width': 3, 'line-opacity': 0.75 },
            });
          }

          m.addSource('journey-walk', {
            type: 'geojson',
            data: {
              type: 'Feature',
              properties: {},
              geometry: { type: 'LineString', coordinates: walk.map(p => [p[0], p[1]]) },
            },
          });
          /* Casing first so the gold line reads on any basemap tone. */
          m.addLayer({
            id: 'journey-walk-casing',
            type: 'line',
            source: 'journey-walk',
            layout: { 'line-cap': 'round', 'line-join': 'round' },
            paint: { 'line-color': '#05070d', 'line-width': 7, 'line-opacity': 0.65 },
          });
          m.addLayer({
            id: 'journey-walk-line',
            type: 'line',
            source: 'journey-walk',
            layout: { 'line-cap': 'round', 'line-join': 'round' },
            paint: { 'line-color': '#D4AF37', 'line-width': 3.5 },
          });

          if (finalWalk && finalWalk.length >= 2) {
            m.addSource('journey-final', {
              type: 'geojson',
              data: {
                type: 'Feature',
                properties: {},
                geometry: {
                  type: 'LineString',
                  coordinates: finalWalk.map(p => [p[0], p[1]]),
                },
              },
            });
            m.addLayer({
              id: 'journey-final-casing',
              type: 'line',
              source: 'journey-final',
              layout: { 'line-cap': 'round', 'line-join': 'round' },
              paint: { 'line-color': '#05070d', 'line-width': 7, 'line-opacity': 0.65 },
            });
            m.addLayer({
              id: 'journey-final-line',
              type: 'line',
              source: 'journey-final',
              layout: { 'line-cap': 'round', 'line-join': 'round' },
              paint: {
                'line-color': '#D4AF37',
                'line-width': 3.5,
                'line-dasharray': [2, 1.6],
              },
            });
          }

          m.addSource('journey-cameras', {
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
            id: 'journey-camera-dots',
            type: 'circle',
            source: 'journey-cameras',
            paint: {
              'circle-radius': 5.5,
              'circle-color': '#00E5FF',
              'circle-stroke-color': '#05070d',
              'circle-stroke-width': 1.5,
            },
          });
          m.on('click', 'journey-camera-dots', e => {
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
                `${Number(props.alongKm ?? 0).toFixed(1)} km along your trip`,
              ),
            );
            new maplibregl.Popup({ closeButton: false, offset: 10 })
              .setLngLat(coords)
              .setDOMContent(box)
              .addTo(m);
          });
          m.on('mouseenter', 'journey-camera-dots', () => {
            m.getCanvas().style.cursor = 'pointer';
          });
          m.on('mouseleave', 'journey-camera-dots', () => {
            m.getCanvas().style.cursor = '';
          });

          const dot = (color: string, title: string, ring = color) => {
            const el = document.createElement('div');
            el.title = title;
            el.style.cssText = `width:14px;height:14px;border-radius:9999px;background:${color};border:2.5px solid #05070d;box-shadow:0 0 0 1.5px ${ring}`;
            return el;
          };
          new maplibregl.Marker({ element: dot('#4ade80', `Start — ${start.label}`) })
            .setLngLat([start.lng, start.lat])
            .addTo(m);
          new maplibregl.Marker({ element: dot('#D4AF37', `Your stop — ${stop.label}`) })
            .setLngLat([stop.lng, stop.lat])
            .addTo(m);
          if (alight) {
            new maplibregl.Marker({
              element: dot('#ffffff', `Get off here — ${alight.label}`, '#D4AF37'),
            })
              .setLngLat([alight.lng, alight.lat])
              .addTo(m);
          }
          if (end) {
            new maplibregl.Marker({ element: dot('#f87171', `Your destination — ${end.label}`) })
              .setLngLat([end.lng, end.lat])
              .addTo(m);
          }

          const bounds = new maplibregl.LngLatBounds();
          for (const p of walk) bounds.extend([p[0], p[1]]);
          for (const p of ride) bounds.extend([p[0], p[1]]);
          if (finalWalk) for (const p of finalWalk) bounds.extend([p[0], p[1]]);
          bounds.extend([start.lng, start.lat]);
          bounds.extend([stop.lng, stop.lat]);
          if (alight) bounds.extend([alight.lng, alight.lat]);
          if (end) bounds.extend([end.lng, end.lat]);
          m.fitBounds(bounds, { padding: 44, maxZoom: 15, duration: 0 });
        });
      })
      .catch(() => {
        /* No map (WebGL unavailable, style unreachable): the steps
           and the ordered camera list below carry the result. */
      });

    return () => {
      cancelled = true;
      map?.remove();
    };
  }, [walk, ride, rideColor, cameras, start, stop, finalWalk, alight, end]);

  if (walk.length < 2) return null;
  return (
    <div
      ref={holderRef}
      className="h-[340px] md:h-[420px] w-full overflow-hidden rounded-xl border border-white/10 bg-[#0b0f1a]"
      role="img"
      aria-label={
        end
          ? 'Map of your walk to the stop, the ride to your get-off stop, and the final walk to your destination, with the live cameras along the way marked'
          : 'Map of your walk to the stop and the route from there, with the live cameras along the way marked'
      }
    />
  );
}
