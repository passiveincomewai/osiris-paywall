'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import FraudRadarGeoMap, {
  type GeoMapCell,
} from '@/components/fraud-radar/FraudRadarGeoMap';
import {
  GEO_LAYER_DEFS,
  layerDef,
  layersForEngine,
} from '@/lib/fraud-radar/geo-layers';

// Local formatters (this is a client component — the server data
// modules stay out of its bundle).
function formatCount(n: number): string {
  return n.toLocaleString('en-US');
}
function formatUsd(n: number): string {
  return n.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  });
}

/**
 * Fraud Radar geo explorer client (§6.4). Layer switching swaps
 * datasets, never blends them (§5.3); the layer's own semantics
 * sentence and the engine's coverage statement render with the
 * data, not in a footnote. Withheld cells render their withheld
 * state; no-record states render "no published records" — neither
 * is ever shown as zero. The full content (state table + county
 * table) is reachable without WebGL.
 */

interface StateCell {
  stateCode: string;
  stateName: string;
  territory: boolean;
  attribution: string;
  hasPublishedRecords: boolean;
  withheld?: boolean;
  withheldReason?: string;
  values: Record<string, number | string>;
}

interface LayerResponse {
  datasetVersion: string;
  layer: string;
  engine: string;
  geographyField: string;
  semantics: string;
  coverageStatement: string;
  states: StateCell[];
  error?: string;
}

interface CountyResponse {
  stateCode: string;
  stateName: string;
  note: string;
  layers: {
    layer: string;
    cells: { countyName: string; values: Record<string, number | string> }[];
  }[];
}

const ENGINES = ['grants', 'contracts', 'medicare', 'medicaid', 'care'];

function fmt(format: 'count' | 'usd', v: number | string | undefined): string {
  if (typeof v !== 'number') return typeof v === 'string' ? v : '—';
  return format === 'usd' ? formatUsd(v) : formatCount(v);
}

export default function GeoExplorer() {
  const [engine, setEngine] = useState('grants');
  const engineLayers = useMemo(() => layersForEngine(engine), [engine]);
  const [layer, setLayer] = useState('grants_recipient_state');
  const [measure, setMeasure] = useState('obligated_usd');
  const [data, setData] = useState<LayerResponse | null>(null);
  const [state, setState] = useState<string | null>(null);
  const [counties, setCounties] = useState<CountyResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const def = layerDef(layer) ?? GEO_LAYER_DEFS[0];
  const measureDef =
    def.measures.find((m) => m.key === measure) ?? def.measures[0];

  const loadLayer = useCallback(async (eng: string, lay: string) => {
    setError(null);
    setData(null);
    try {
      const res = await fetch(
        `/api/fraud-radar/geo/states?engine=${eng}&measure=${lay}`,
      );
      const body = (await res.json()) as LayerResponse;
      if (!res.ok) {
        setError(
          body.error === 'dataset_not_published'
            ? 'dataset_not_published'
            : `The published layer could not be loaded (${body.error ?? res.status}).`,
        );
        return;
      }
      setData(body);
    } catch {
      setError('The published layer could not be loaded.');
    }
  }, []);

  useEffect(() => {
    void loadLayer(engine, layer);
  }, [engine, layer, loadLayer]);

  useEffect(() => {
    if (!state) {
      setCounties(null);
      return;
    }
    let live = true;
    fetch(`/api/fraud-radar/geo/counties?state=${state}`)
      .then(async (r) => {
        if (!live) return;
        setCounties(r.ok ? ((await r.json()) as CountyResponse) : null);
      })
      .catch(() => live && setCounties(null));
    return () => {
      live = false;
    };
  }, [state]);

  const mapCells: GeoMapCell[] = (data?.states ?? []).map((s) => ({
    stateCode: s.stateCode,
    stateName: s.stateName,
    attribution: s.attribution,
    value:
      typeof s.values[measureDef.key] === 'number'
        ? (s.values[measureDef.key] as number)
        : null,
  }));

  const countyLayer = counties?.layers.find((l) => l.layer.startsWith(engine));

  return (
    <div>
      <div className="flex flex-wrap gap-3">
        <label className="text-sm">
          Dataset{' '}
          <select
            value={engine}
            onChange={(e) => {
              const eng = e.target.value;
              setEngine(eng);
              const first = layersForEngine(eng)[0];
              setLayer(first.layer);
              setMeasure(first.measures[0].key);
            }}
            className="ml-1 rounded bg-white/10 px-2 py-1"
          >
            {ENGINES.map((e) => (
              <option key={e} value={e}>
                {e}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          Layer{' '}
          <select
            value={layer}
            onChange={(e) => {
              setLayer(e.target.value);
              const d = layerDef(e.target.value);
              if (d) setMeasure(d.measures[0].key);
            }}
            className="ml-1 rounded bg-white/10 px-2 py-1"
          >
            {engineLayers.map((d) => (
              <option key={d.layer} value={d.layer}>
                {d.label}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          Measure{' '}
          <select
            value={measureDef.key}
            onChange={(e) => setMeasure(e.target.value)}
            className="ml-1 rounded bg-white/10 px-2 py-1"
          >
            {def.measures.map((m) => (
              <option key={m.key} value={m.key}>
                {m.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <p className="mt-3 text-sm text-slate-300">
        <strong>{def.geographyFieldLabel}.</strong> {def.semantics}
      </p>
      {data?.coverageStatement && (
        <p className="mt-2 text-sm text-slate-400">{data.coverageStatement}</p>
      )}

      {error === 'dataset_not_published' ? (
        <p className="mt-4 rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-sm text-slate-300">
          The geo dataset is not published on this deployment yet —
          no figures are shown rather than placeholder data.
        </p>
      ) : error ? (
        <p className="mt-4 text-sm text-amber-200">{error}</p>
      ) : !data ? (
        <p className="mt-4 text-sm text-slate-400">Loading published cells…</p>
      ) : (
        <>
          <div className="mt-4">
            <FraudRadarGeoMap
              cells={mapCells}
              measureLabel={`${def.label} — ${measureDef.label}`}
              onSelect={setState}
            />
          </div>
          <table className="mt-6 w-full text-sm">
            <thead>
              <tr className="text-left text-slate-400">
                <th className="py-1">State</th>
                {def.measures.map((m) => (
                  <th key={m.key} className="py-1 text-right">
                    {m.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.states.map((s) => (
                <tr
                  key={s.stateCode}
                  className="cursor-pointer border-t border-white/5 hover:bg-white/[0.03]"
                  onClick={() => setState(s.stateCode)}
                >
                  <td className="py-1">
                    {s.stateName} ({s.stateCode})
                  </td>
                  {s.withheld ? (
                    <td colSpan={def.measures.length} className="py-1 text-right text-slate-400">
                      fewer than 5 entities — value withheld
                    </td>
                  ) : !s.hasPublishedRecords ? (
                    <td colSpan={def.measures.length} className="py-1 text-right text-slate-400">
                      no published records
                    </td>
                  ) : (
                    def.measures.map((m) => (
                      <td key={m.key} className="py-1 text-right">
                        {fmt(m.format, s.values[m.key])}
                      </td>
                    ))
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      {state && counties && (
        <section className="mt-8">
          <h2 className="text-lg font-semibold">
            Counties in {counties.stateName} — as reported
          </h2>
          <p className="mt-1 text-sm text-slate-400">{counties.note}</p>
          {countyLayer ? (
            <table className="mt-3 w-full text-sm">
              <tbody>
                {countyLayer.cells.slice(0, 50).map((c) => (
                  <tr key={c.countyName} className="border-t border-white/5">
                    <td className="py-1">{c.countyName}</td>
                    {Object.entries(c.values).map(([k, v]) => (
                      <td key={k} className="py-1 text-right">
                        {typeof v === 'number' ? formatCount(v) : v}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="mt-2 text-sm text-slate-400">
              No county table is published for this dataset in{' '}
              {counties.stateName}.
            </p>
          )}
        </section>
      )}
    </div>
  );
}
