/**
 * Compass-point conversions for camera facing direction.
 *
 * A small number of camera sources publish the direction a camera faces
 * (the FAA WeatherCams API's per-camera `cameraDirection` is the one in
 * the catalogue today). They publish it as a compass point — "NorthWest",
 * "NE" — never as degrees, so displaying it means converting the source's
 * own words into a bearing and back. That is all this module does: it
 * never estimates a direction from a road, a name, or anything else.
 * A value that is not a recognisable compass point parses to null and the
 * camera simply shows no direction.
 */

/** The sixteen compass points, clockwise from north, by sector centre. */
const POINTS: ReadonlyArray<{ deg: number; label: string; abbr: string }> = [
  { deg: 0, label: 'north', abbr: 'N' },
  { deg: 22.5, label: 'north-northeast', abbr: 'NNE' },
  { deg: 45, label: 'northeast', abbr: 'NE' },
  { deg: 67.5, label: 'east-northeast', abbr: 'ENE' },
  { deg: 90, label: 'east', abbr: 'E' },
  { deg: 112.5, label: 'east-southeast', abbr: 'ESE' },
  { deg: 135, label: 'southeast', abbr: 'SE' },
  { deg: 157.5, label: 'south-southeast', abbr: 'SSE' },
  { deg: 180, label: 'south', abbr: 'S' },
  { deg: 202.5, label: 'south-southwest', abbr: 'SSW' },
  { deg: 225, label: 'southwest', abbr: 'SW' },
  { deg: 247.5, label: 'west-southwest', abbr: 'WSW' },
  { deg: 270, label: 'west', abbr: 'W' },
  { deg: 292.5, label: 'west-northwest', abbr: 'WNW' },
  { deg: 315, label: 'northwest', abbr: 'NW' },
  { deg: 337.5, label: 'north-northwest', abbr: 'NNW' },
];

/**
 * Every written form of a point, keyed by its normalised spelling
 * (lowercase, separators removed): "northwest", "north-west" and
 * "North West" all land on "northwest"; "NNE" lands on "nne".
 */
const FORMS = new Map<string, number>();
for (const p of POINTS) {
  FORMS.set(p.abbr.toLowerCase(), p.deg);
  FORMS.set(p.label.replace(/[-\s]+/g, ''), p.deg);
}

/**
 * Parse a source-published compass direction into degrees clockwise from
 * north, or null when the value is not a compass point. Accepts full words
 * in any casing/separation ("NorthWest", "north-west", "North West"),
 * abbreviations ("NW", "NNE"), and — for sources that publish one — a
 * plain number or numeric string already in degrees.
 */
export function parseCompassDirection(value: unknown): number | null {
  if (typeof value === 'number') {
    return Number.isFinite(value) && value >= 0 && value < 360 ? value : null;
  }
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (/^-?\d+(\.\d+)?$/.test(trimmed)) {
    const deg = Number(trimmed);
    return deg >= 0 && deg < 360 ? deg : null;
  }
  const key = trimmed.toLowerCase().replace(/[\s-]+/g, '');
  const deg = FORMS.get(key);
  return deg === undefined ? null : deg;
}

/** The sixteen-point label for a bearing ("northeast"), for readouts. */
export function compassLabel(deg: number): string {
  const idx = Math.round((((deg % 360) + 360) % 360) / 22.5) % 16;
  return POINTS[idx].label;
}

/** The sixteen-point abbreviation for a bearing ("NE"). */
export function compassAbbr(deg: number): string {
  const idx = Math.round((((deg % 360) + 360) % 360) / 22.5) % 16;
  return POINTS[idx].abbr;
}
