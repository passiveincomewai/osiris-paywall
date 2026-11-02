'use client';

import { useEffect, useRef, useState } from 'react';
import 'maplibre-gl/dist/maplibre-gl.css';

/**
 * Fraud Radar geo choropleth (§5.5) — the lightweight sibling
 * pattern (CameraMiniMap / SkiRouteMap), NOT OsirisMap: lazy
 * maplibre import inside the effect, the house CARTO Dark Matter
 * basemap, NavigationControl, and an honest failure state (a map
 * that cannot start says so — never a black rectangle).
 *
 * Geometry is the house-vendored /geo/us-boundaries.geojson
 * (state + territory polygons, properties.name). Cells join to
 * polygons by state NAME (the publisher's cross-check asserts the
 * join). The fill uses a single-hue opacity ramp over the
 * selected measure — a DATA expression only; no zoom-based
 * step/interpolate subexpression is used anywhere (the MapLibre
 * one-zoom-expression rule). Withheld and no-record states get
 * flat, distinct treatments — never a value colour.
 */

export interface GeoMapCell {
  stateCode: string;
  stateName: string;
  attribution: string;
  value: number | null;
}

export interface BoundaryFeature {
  type: string;
  properties: { name?: string } & Record<string, unknown>;
  geometry: unknown;
}

export function buildGeoJson(
  boundaries: { features: BoundaryFeature[] },
  cells: GeoMapCell[],
  maxValue: number,
): { type: "FeatureCollection"; features: BoundaryFeature[] } {
  const byName = new Map(cells.map((c) => [c.stateName, c]));
  return {
    type: "FeatureCollection",
    features: boundaries.features.map((f) => {
      const cell = byName.get(f.properties.name ?? "");
      return {
        ...f,
        properties: {
          ...f.properties,
          stateCode: cell?.stateCode ?? "",
          attribution: cell?.attribution ?? "no_published_records",
          // Normalised 0..1 share for the opacity ramp; withheld
          // and no-record cells carry -1 (flat treatment).
          share:
            cell && cell.value != null && maxValue > 0
              ? cell.value / maxValue
              : -1,
        },
      };
    }),
  };
}

const BASEMAP_STYLE =
  'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json';

export default function FraudRadarGeoMap({
  cells,
  measureLabel,
  onSelect,
}: {
  cells: GeoMapCell[];
  measureLabel: string;
  onSelect?: (stateCode: string) => void;
}) {
  const holderRef = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);
  const cellsRef = useRef(cells);
  cellsRef.current = cells;
  const selectRef = useRef(onSelect);
  selectRef.current = onSelect;

  useEffect(() => {
    const holder = holderRef.current;
    if (!holder) return;
    let cancelled = false;
    let map: { remove: () => void } | null = null;
    setFailed(false);
    (async () => {
      try {
        const [maplibregl, boundaries] = await Promise.all([
          import('maplibre-gl'),
          fetch('/geo/us-boundaries.geojson').then((r) => {
            if (!r.ok) throw new Error('boundaries');
            return r.json();
          }),
        ]);
        if (cancelled || !holderRef.current) return;
        const current = cellsRef.current;
        const maxValue = Math.max(
          0,
          ...current.map((c) => c.value ?? 0),
        );
        const m = new maplibregl.Map({
          container: holder,
          style: BASEMAP_STYLE,
          center: [-96, 38],
          zoom: 3,
        });
        map = m;
        m.addControl(new maplibregl.NavigationControl(), 'top-right');
        m.on('load', () => {
          if (cancelled) return;
          m.addSource('fr-geo-states', {
            type: 'geojson',
            data: buildGeoJson(boundaries, current, maxValue) as never,
          });
          m.addLayer({
            id: 'fr-geo-fill',
            type: 'fill',
            source: 'fr-geo-states',
            paint: {
              'fill-color': '#38bdf8',
              'fill-opacity': [
                'case',
                ['<', ['get', 'share'], 0],
                0.04,
                ['+', 0.12, ['*', 0.68, ['get', 'share']]],
              ] as never,
            },
          });
          m.addLayer({
            id: 'fr-geo-line',
            type: 'line',
            source: 'fr-geo-states',
            paint: { 'line-color': '#94a3b8', 'line-width': 0.6, 'line-opacity': 0.5 },
          });
          m.on('click', 'fr-geo-fill', (e) => {
            const code = e.features?.[0]?.properties?.stateCode;
            if (typeof code === 'string' && code) selectRef.current?.(code);
          });
        });
        m.on('error', () => setFailed(true));
      } catch {
        if (!cancelled) setFailed(true);
      }
    })();
    return () => {
      cancelled = true;
      map?.remove();
    };
  }, [cells]);

  if (failed) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-sm text-slate-300">
        The map could not start (WebGL or the basemap was unreachable).
        The full state and county tables below carry the same
        published figures — nothing is only on the map. Measure:{' '}
        {measureLabel}.
      </div>
    );
  }
  return (
    <div
      ref={holderRef}
      className="h-[420px] w-full overflow-hidden rounded-2xl border border-white/10"
      aria-label={`State choropleth: ${measureLabel}`}
    />
  );
}
