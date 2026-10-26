/**
 * Live event walls — camera resolution (server-side).
 *
 * Turns a wall's configured camera IDs into catalogue records, the
 * same way the ski pages do it: country chunks via loadCountryChunk
 * (src/data/countries/<slug>.json), plus — for the USGS CoastCam
 * picks — the station map built by src/app/api/cctv/coastcams.ts,
 * which is where those records are constructed. There is no second
 * camera database here: a pick that no longer resolves is dropped
 * from the render, and the integrity tests in
 * src/lib/event-walls.test.ts fail the suite when that happens, so a
 * wall cannot silently shrink in production.
 */

import { loadCountryChunk } from "@/lib/ski-resorts";
import { COASTCAM_STATIONS, mapStations } from "@/app/api/cctv/coastcams";
import type { CountryCamera } from "@/lib/country-cameras";
import type { EventWall } from "@/data/event-walls";

export const USGS_COASTCAM_SOURCE = "usgs-coastcams";

/** Records for a wall, in configuration order. */
export async function resolveEventWallCameras(
  wall: EventWall,
): Promise<CountryCamera[]> {
  const byId = new Map<string, CountryCamera>();

  const chunkSlugs = [
    ...new Set(
      wall.cameras
        .filter((c) => c.from !== USGS_COASTCAM_SOURCE)
        .map((c) => c.from),
    ),
  ];
  await Promise.all(
    chunkSlugs.map(async (slug) => {
      const records = await loadCountryChunk(slug).catch(
        () => [] as CountryCamera[],
      );
      for (const record of records) {
        if (record && typeof record.id === "string" && !byId.has(record.id)) {
          byId.set(record.id, record);
        }
      }
    }),
  );

  if (wall.cameras.some((c) => c.from === USGS_COASTCAM_SOURCE)) {
    const stations = mapStations(COASTCAM_STATIONS) as unknown as CountryCamera[];
    for (const record of stations) byId.set(record.id, record);
  }

  const out: CountryCamera[] = [];
  for (const pick of wall.cameras) {
    const record = byId.get(pick.id);
    if (record) out.push(record);
  }
  return out;
}

/** SkiCameraGrid captions, keyed by camera id, from the config notes. */
export function eventWallCaptions(wall: EventWall): Record<string, string> {
  const captions: Record<string, string> = {};
  for (const pick of wall.cameras) captions[pick.id] = pick.note;
  return captions;
}
