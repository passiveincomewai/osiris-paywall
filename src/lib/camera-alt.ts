/**
 * Descriptive alt text for camera stills (image-SEO audit, 2026-10-26).
 *
 * The camera walls and explorers rendered the bare catalogue name as
 * alt text. Catalogue names are functional ("I-15 @ 9000 S", "US-89
 * MP 392.7") — the place lives in the record's city/country fields.
 * This builds the house-style alt ("{name} — live camera") enriched
 * with the place parts the data actually carries. A part is skipped
 * when the name already contains it, and nothing is ever invented:
 * no city/country in the record, no place in the alt.
 */
export interface AltCamera {
  name: string;
  city?: string | null;
  country?: string | null;
}

export function cameraAlt(cam: AltCamera): string {
  const name = (cam.name ?? "").trim();
  const lower = name.toLowerCase();
  const place = [cam.city, cam.country]
    .map((p) => (p ?? "").trim())
    .filter((p) => p.length > 0 && !lower.includes(p.toLowerCase()));
  const base = name ? `${name} — live camera` : "Live camera";
  return place.length > 0 ? `${base} in ${place.join(", ")}` : base;
}
