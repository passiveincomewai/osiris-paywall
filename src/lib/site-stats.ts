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
 *  2. The Live Camera Index "served" count (83,795) — a dated
 *     research measurement: unique cameras in one all-regions
 *     response of the production catalogue API, deduplicated by
 *     camera ID. The live API assembly is wider than the committed
 *     directory (113 countries to the directory's 109, including
 *     cameras not yet attributed into it), so it runs higher than
 *     the headline. It belongs ONLY on /live-camera-index, always
 *     with its snapshot date and definition attached.
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
export const SITE_STATS_AS_OF = "2026-10-26";

/** The standing public headline: live public cameras on the globe. */
export const LIVE_CAMERA_COUNT = 74_229;
export const LIVE_CAMERA_COUNT_LABEL = "74,229";
export const LIVE_CAMERA_COUNT_DEFINITION =
  "Live public cameras on the WorldEye globe — the standing public count quoted across the site.";

/** Countries with browsable directory pages in the indexed catalogue. */
export const DIRECTORY_COUNTRY_COUNT = 109;

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
  snapshotDateLabel: "23 October 2026",
  servedUniqueCameras: 83_795,
  servedLabel: "83,795",
  servedCountries: 113,
  servedDefinition:
    "Unique cameras served by the production catalogue API in the 23 October 2026 snapshot (84,455 records deduplicated by camera ID) — the Live Camera Index's served measure, wider than the globe headline.",
  indexedRecords: 77_376,
  indexedAttributed: 76_575,
} as const;

/** en-US thousands formatting, matching the pages' local fmt helpers. */
export function formatSiteCount(n: number): string {
  return n.toLocaleString("en-US");
}
