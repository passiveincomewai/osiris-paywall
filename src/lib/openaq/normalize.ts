/**
 * OSIRIS — OpenAQ v3 payload normalization (pure, defensive).
 *
 * Shapes follow the v3 API: `GET /v3/locations` returns
 * `{ results: [{ id, name, locality, country: { code, name },
 *    coordinates: { latitude, longitude }, parameters: [{ name }] }] }`
 * and `GET /v3/locations/{id}/latest` returns
 * `{ results: [{ value, datetime: { utc }, parameter: { name, units } }] }`.
 * Anything unrecognised is dropped rather than guessed at.
 */
import type { OpenAqLocation, OpenAqMeasurement, OpenAqReading } from './types';

type Rec = Record<string, unknown>;

function rec(v: unknown): Rec | null {
  return typeof v === 'object' && v !== null ? (v as Rec) : null;
}
function str(v: unknown): string | null {
  return typeof v === 'string' && v.trim() !== '' ? v : null;
}
function num(v: unknown): number | null {
  return typeof v === 'number' && Number.isFinite(v) ? v : null;
}
function results(v: unknown): unknown[] {
  const root = rec(v);
  return Array.isArray(root?.results) ? (root.results as unknown[]) : [];
}

export function normalizeOpenAqLocation(v: unknown): OpenAqLocation | null {
  const l = rec(v);
  if (!l) return null;
  const id = num(l.id);
  const name = str(l.name);
  if (id === null || !name) return null;
  const coords = rec(l.coordinates);
  const country = rec(l.country);
  const paramsRaw = Array.isArray(l.parameters) ? (l.parameters as unknown[]) : [];
  return {
    id,
    name,
    locality: str(l.locality),
    countryCode: country ? str(country.code) : null,
    countryName: country ? str(country.name) : null,
    lat: coords ? num(coords.latitude) : null,
    lng: coords ? num(coords.longitude) : null,
    parameters: paramsRaw.flatMap((p) => {
      const name2 = str(rec(p)?.name);
      return name2 ? [name2.toLowerCase()] : [];
    }),
  };
}

export function normalizeOpenAqLocations(raw: unknown): OpenAqLocation[] {
  return results(raw).flatMap((l) => {
    const n = normalizeOpenAqLocation(l);
    return n ? [n] : [];
  });
}

export function normalizeOpenAqLatest(raw: unknown): OpenAqMeasurement[] {
  return results(raw).flatMap((m) => {
    const r = rec(m);
    if (!r) return [];
    const value = num(r.value);
    const param = rec(r.parameter);
    const name = param ? str(param.name) : null;
    if (value === null || !name) return [];
    const dt = rec(r.datetime);
    return [
      {
        parameter: name.toLowerCase(),
        value,
        units: param ? str(param.units) : null,
        measuredAt: dt ? str(dt.utc) : null,
      },
    ];
  });
}

export function buildOpenAqReading(
  location: OpenAqLocation,
  measurements: OpenAqMeasurement[],
  fetchedAt: number,
): OpenAqReading | null {
  if (measurements.length === 0) return null;
  const byParam = new Map(measurements.map((m) => [m.parameter, m]));
  const get = (p: string) => byParam.get(p)?.value ?? null;
  return {
    location,
    measurements,
    pm25: get('pm25'),
    pm10: get('pm10'),
    o3: get('o3'),
    no2: get('no2'),
    so2: get('so2'),
    co: get('co'),
    measuredAt: measurements.find((m) => m.measuredAt)?.measuredAt ?? null,
    fetchedAt,
    stale: false,
    attribution: 'OpenAQ',
  };
}
