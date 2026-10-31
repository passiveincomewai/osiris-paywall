/**
 * Shared event JSON-LD builder (site-audit R67, Wave 3).
 *
 * Before this module every event page hand-wrote its own schema.org
 * block, and the family drifted: a marathon shipped as plain `Event`,
 * a dated marathon hub had no `endDate`, and the World Series page
 * carried no event schema at all. The standard this builder enforces:
 *
 *   - sporting events are `SportsEvent`, everything else is `Event`;
 *   - `startDate`, `endDate` and `location` are ALWAYS present —
 *     they are required fields here, not options. A single-day event
 *     passes the same date for start and end (the convention the
 *     seasonal-editions table already uses).
 *
 * Dates and venues are NOT defaulted or invented by this module:
 * every caller supplies the dates its own page copy states.
 */
export interface EventSchemaInput {
  /** True for sporting events (→ `SportsEvent`), false otherwise (→ `Event`). */
  sport: boolean;
  name: string;
  /** ISO date (or datetime) the event starts, as stated on the page. */
  startDate: string;
  /** ISO date (or datetime) the event ends; same as startDate for single-day events. */
  endDate: string;
  locationName: string;
  locationAddress?: string;
  /** Canonical URL of the venue/place, when the page states one. */
  locationSameAs?: string;
  /** Geo coordinates, when the page already carries them for its location. */
  locationGeo?: { latitude: number; longitude: number };
  /** Canonical URL of the event page itself. */
  url: string;
  description?: string;
}

export function buildEventSchema(input: EventSchemaInput) {
  const location: Record<string, unknown> = {
    "@type": "Place",
    name: input.locationName,
  };
  if (input.locationAddress) location.address = input.locationAddress;
  if (input.locationGeo) {
    location.geo = {
      "@type": "GeoCoordinates",
      latitude: input.locationGeo.latitude,
      longitude: input.locationGeo.longitude,
    };
  }
  if (input.locationSameAs) location.sameAs = input.locationSameAs;

  return {
    "@context": "https://schema.org",
    "@type": input.sport ? "SportsEvent" : "Event",
    name: input.name,
    startDate: input.startDate,
    endDate: input.endDate,
    location,
    url: input.url,
    ...(input.description ? { description: input.description } : {}),
  };
}
