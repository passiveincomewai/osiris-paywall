/**
 * Aurora alerts — the preset watch places.
 *
 * A deliberately small, curated set: the towns the northern-lights page
 * already sends readers to (Iceland, Tromsø and the Norwegian north,
 * Lapland, Fairbanks, the Canadian north). Coordinates are the towns'
 * real geographic positions; the geomagnetic latitude and the Kp level
 * each place needs are DERIVED from them in lib/aurora/logic — nothing
 * about a place's aurora odds is hand-asserted here.
 *
 * timeZone is the place's IANA zone: "tonight" for an alert means the
 * night where the watcher is, not the night at WorldEye HQ.
 */
export interface AuroraPlace {
  slug: string;
  name: string;
  /** Country / region label, for grouping in pickers. */
  area: string;
  lat: number;
  lng: number;
  timeZone: string;
}

export const AURORA_PLACES: AuroraPlace[] = [
  { slug: "reykjavik", name: "Reykjavík", area: "Iceland", lat: 64.1466, lng: -21.9426, timeZone: "Atlantic/Reykjavik" },
  { slug: "akureyri", name: "Akureyri", area: "Iceland", lat: 65.6885, lng: -18.1262, timeZone: "Atlantic/Reykjavik" },
  { slug: "tromso", name: "Tromsø", area: "Norway", lat: 69.6492, lng: 18.9553, timeZone: "Europe/Oslo" },
  { slug: "alta", name: "Alta", area: "Norway", lat: 69.9689, lng: 23.2717, timeZone: "Europe/Oslo" },
  { slug: "abisko", name: "Abisko", area: "Sweden", lat: 68.3498, lng: 18.8312, timeZone: "Europe/Stockholm" },
  { slug: "kiruna", name: "Kiruna", area: "Sweden", lat: 67.8558, lng: 20.2253, timeZone: "Europe/Stockholm" },
  { slug: "rovaniemi", name: "Rovaniemi", area: "Finland", lat: 66.5039, lng: 25.7294, timeZone: "Europe/Helsinki" },
  { slug: "inari", name: "Inari & Saariselkä", area: "Finland", lat: 68.9056, lng: 27.0289, timeZone: "Europe/Helsinki" },
  { slug: "fairbanks", name: "Fairbanks", area: "Alaska, USA", lat: 64.8378, lng: -147.7164, timeZone: "America/Anchorage" },
  { slug: "anchorage", name: "Anchorage", area: "Alaska, USA", lat: 61.2181, lng: -149.9003, timeZone: "America/Anchorage" },
  { slug: "yellowknife", name: "Yellowknife", area: "Canada", lat: 62.454, lng: -114.3718, timeZone: "America/Yellowknife" },
  { slug: "whitehorse", name: "Whitehorse", area: "Canada", lat: 60.7212, lng: -135.0568, timeZone: "America/Whitehorse" },
  { slug: "churchill", name: "Churchill", area: "Canada", lat: 58.7684, lng: -94.165, timeZone: "America/Winnipeg" },
];

export const AURORA_PLACE_BY_SLUG: ReadonlyMap<string, AuroraPlace> = new Map(
  AURORA_PLACES.map((p) => [p.slug, p]),
);

export function auroraPlace(slug: string): AuroraPlace | null {
  return AURORA_PLACE_BY_SLUG.get(slug) ?? null;
}
