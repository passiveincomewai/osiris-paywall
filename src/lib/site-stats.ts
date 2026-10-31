/**
 * Canonical public site statistics — the single source for every
 * camera count WorldEye publishes, so pages cannot drift apart.
 *
 * Three different numbers circulate because they measure three
 * different things. They are NOT interchangeable:
 *
 *  1. LIVE_CAMERA_COUNT (74,229) — the standing public headline:
 *     live public cameras on the WorldEye globe, the figure quoted
 *     across the site's pages, metadata and comparisons. Owner-set;
 *     change it only on the owner's explicit order.
 *  2. The Live Camera Index "served" count (91,266) — a dated
 *     research measurement: unique cameras in one all-regions
 *     response of the production catalogue API, deduplicated by
 *     camera ID. The live API assembly is wider than the committed
 *     directory (115 countries to the directory's 109, including
 *     cameras not yet attributed into it), so it runs higher than
 *     the headline. It belongs ONLY on /live-camera-index, always
 *     with its snapshot date and definition attached. The Index
 *     also publishes a PLAYABLE count (90,251 in the same snapshot):
 *     the served records carrying a feed the WorldEye player can
 *     open, derived with the player's own rule (lib/camera-preview
 *     previewMedia, mirrored in the Index generator). Playable is
 *     a feed-present, format-level count — records are not
 *     individually stream-tested, and it is never the headline.
 *  3. The indexed catalogue counts (77,376 unique records, 76,575
 *     of them attributed to a country) — the committed directory
 *     dataset behind the country and city pages
 *     (src/data/camera-countries.json, generated 2026-10-20, and
 *     src/data/live-camera-index.json). Plumbing figures; they
 *     surface publicly only inside the Index's methodology.
 *
 * If you need a camera number for a public page, import it from
 * here. If the number you need is not here, that is a decision to
 * surface — not a literal to type.
 */

/** Date the figures on this page were last reconciled site-wide. */
export const SITE_STATS_AS_OF = "2026-10-31";

/** The standing public headline: live public cameras on the globe. */
export const LIVE_CAMERA_COUNT = 74_229;
export const LIVE_CAMERA_COUNT_LABEL = "74,229";
export const LIVE_CAMERA_COUNT_DEFINITION =
  "Live public cameras on the WorldEye globe — the standing public count quoted across the site.";

/**
 * Countries with browsable directory pages in the indexed catalogue.
 * Since C10 threshold enforcement (2026-10-28), countries below the
 * §4.5 substance line are consolidated into their regional hubs and
 * no longer have standalone pages: 109 catalogue countries − 35
 * consolidated = 74 with pages. Derived (and pinned) in
 * src/lib/indexation-gates.ts (COUNTRY_PAGE_COUNT) — update both
 * together after a catalogue rebuild.
 */
export const DIRECTORY_COUNTRY_COUNT = 74;

/**
 * The Live Camera Index snapshot (October 2026 edition). The figures
 * are generated into src/data/live-camera-index.json by
 * tools/build-live-camera-index.mjs; they are mirrored here so other
 * surfaces can reference the Index precisely — with its date and
 * definition — without importing the whole dataset. If a new Index
 * edition is generated, update these to match it.
 */
export const CAMERA_INDEX_SNAPSHOT = {
  edition: "October 2026",
  snapshotDateLabel: "31 October 2026",
  servedUniqueCameras: 91_266,
  servedLabel: "91,266",
  servedCountries: 115,
  servedDefinition:
    "Unique cameras served by the production catalogue API in the 31 October 2026 snapshot (91,906 records deduplicated by camera ID) — the Live Camera Index's served measure, wider than the globe headline.",
  playableCameras: 90_251,
  playableLabel: "90,251",
  playableDefinition:
    "Served records in the same snapshot carrying a feed the WorldEye player can open — a JPEG still, HLS, MP4 or MJPEG feed with its URL present, by the player's own rule (lib/camera-preview previewMedia). A feed-present, format-level count: records are not individually stream-tested.",
  indexedRecords: 77_376,
  indexedAttributed: 76_575,
} as const;

/** en-US thousands formatting, matching the pages' local fmt helpers. */
export function formatSiteCount(n: number): string {
  return n.toLocaleString("en-US");
}
