/**
 * Snowy Mountains context: the place names the ski catalogue knows.
 * Towns + resort names from src/data/ski-resorts.json (the same data
 * behind /ski-webcams), lowercased for the mood matcher. Imported
 * lazily by the feed route so the JSON only loads in that function.
 */
import resortsData from "@/data/ski-resorts.json";

export const SKI_TOWNS: ReadonlySet<string> = (() => {
  const out = new Set<string>();
  const resorts = (resortsData as { resorts?: { name?: string; town?: string }[] })
    .resorts ?? [];
  for (const r of resorts) {
    if (r.town) out.add(r.town.trim().toLowerCase());
    if (r.name) out.add(r.name.trim().toLowerCase());
  }
  return out;
})();
