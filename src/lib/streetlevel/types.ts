/**
 * OSIRIS — Street Level: shared types for community street-level imagery.
 *
 * One normalized shape for a street-level picture, produced server-side
 * from a provider's STAC payload (today: Panoramax — see panoramax.ts)
 * and consumed by the globe layer and the viewer panel. The provider
 * seam lives in the types on purpose: a second provider (Mapillary, if
 * it is ever licensed/configured) implements the same shape without the
 * UI changing.
 *
 * Honesty rules baked into the shape:
 *   • `capturedAt` is the picture's real capture time. Street-level
 *     imagery is months-to-years old and is NEVER presented as live —
 *     the viewer always renders the capture date beside the photo.
 *   • `license` / `licenseUrl` / `producer` travel with every picture so
 *     per-picture attribution is shown wherever the image is shown.
 *   • Fields a provider does not publish stay null — never backfilled.
 */

export const STREET_LEVEL_SOURCE_LABEL = 'Panoramax';
export const STREET_LEVEL_SOURCE_URL = 'https://panoramax.xyz';
export const STREET_LEVEL_ATTRIBUTION =
  'Street-level imagery via Panoramax — © the picture’s producer, per-picture licence applies';

/** Below this zoom the layer loads nothing: coverage dots at city scale
 *  only — no imagery machinery is spun up for a global view. */
export const STREET_LEVEL_MIN_ZOOM = 15;
/** Hard cap on pictures returned for one viewport. Dense streets carry
 *  thousands; the payload says `truncated` when the cap is what stopped
 *  the list, never silently. */
export const STREET_LEVEL_MAX_RESULTS = 300;
/** Viewport span guard for /api/streetlevel (degrees, either axis).
 *  Street-level queries are street-scale by design; the guard exists so
 *  a hand-crafted request can't turn the route into a catalogue dump. */
export const STREET_LEVEL_MAX_SPAN_DEG = 2;

export interface StreetPicture {
  id: string;
  lng: number;
  lat: number;
  /** Capture time (ISO 8601) as the provider publishes it. */
  capturedAt: string | null;
  /** The sequence (STAC collection) this picture belongs to. */
  sequenceId: string | null;
  /** Who produced the picture (Panoramax `geovisio:producer`). */
  producer: string | null;
  /** Per-picture licence id, e.g. "CC-BY-SA-4.0" or "LO-2.0". */
  license: string | null;
  licenseUrl: string | null;
  thumbUrl: string | null;
  /** Display-resolution image (the provider's "visual" asset). */
  imageUrl: string | null;
  hdUrl: string | null;
  /** Camera facing, degrees clockwise from north, when published. */
  azimuthDeg: number | null;
  rankInSequence: number | null;
  /** Neighbouring pictures along the same sequence (prev/next). */
  nextId: string | null;
  prevId: string | null;
}

export interface StreetLevelBboxPayload {
  pictures: StreetPicture[];
  /** True when the result cap, not the area, is what ended the list. */
  truncated: boolean;
  source: string;
  provider: string;
  /** When the served data was actually fetched upstream (stale copies
   *  keep their original fetch time so the age is never disguised). */
  fetchedAt: number;
  /** True when this is a last-good copy served because the provider
   *  did not answer. */
  stale: boolean;
}

export interface StreetPicturePayload {
  picture: StreetPicture;
  source: string;
  provider: string;
  fetchedAt: number;
  stale: boolean;
}
