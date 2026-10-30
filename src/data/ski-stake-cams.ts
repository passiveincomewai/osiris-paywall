/**
 * Powder #5 (rescoped 2026-10-30): operator-labelled snow stake cameras.
 *
 * Every entry here was verified on 2026-10-30: the resort OPERATOR's own
 * site labels the camera a snow stake (the verbatim label is kept in
 * `label`) AND a direct still from the feed loads (HTTP 200, JPEG bytes
 * confirmed). Full census incl. near-misses and the four verified resorts
 * that have no ski-directory page yet (Grand Targhee, Timberline Lodge,
 * Mt. Hood Meadows, Taos Ski Valley): powder-features/f5/CENSUS.md.
 *
 * Only resorts in the ski directory appear here — a stake section renders
 * on the resort's own page, and only where it can be truthful. Never add
 * a camera the operator does not itself label a snow stake.
 *
 * Note (Mt. Bachelor): the operator's cam API returns the JPEG without a
 * Content-Type header; the feed is a genuine live JPEG (magic bytes
 * verified) and the capture pipeline validates image bytes itself.
 */
export interface SkiStakeCam {
  /** Ski directory slug — the resort page the section renders on. */
  resortSlug: string;
  resortName: string;
  /** The operator's own name for the camera, verbatim. */
  label: string;
  operator: string;
  /** Direct still-image URL on the operator's site / its cam host. */
  feedUrl: string;
  /** Operator page the label + feed were verified on. */
  sourcePage: string;
  /** ISO date the label + feed were last verified. */
  verifiedOn: string;
}

export const SKI_STAKE_CAMS: SkiStakeCam[] = [
  {
    resortSlug: "alta",
    resortName: "Alta",
    label: "Snow Stake",
    operator: "Alta Ski Area",
    feedUrl:
      "https://alta-webcams.sfo3.cdn.digitaloceanspaces.com/Collins_Snow_Stake.jpg",
    sourcePage: "https://www.alta.com/weather",
    verifiedOn: "2026-10-30",
  },
  {
    resortSlug: "snowbird",
    resortName: "Snowbird",
    label: "Snowstake",
    operator: "Snowbird",
    feedUrl:
      "https://manage.hdrelay.com/snapshot/8611e276-7ee5-42c0-b8cd-d9e1890e1cd4",
    sourcePage:
      "https://www.snowbird.com/the-mountain/webcams/view-all-webcams/snowstake-webcam/",
    verifiedOn: "2026-10-30",
  },
  {
    resortSlug: "mt-bachelor",
    resortName: "Mt. Bachelor",
    label: "Snow Stake",
    operator: "Mt. Bachelor",
    feedUrl: "https://api.mtbachelor.com/api/v1/cams/mtn/14",
    sourcePage: "https://www.mtbachelor.com/the-mountain/webcams/",
    verifiedOn: "2026-10-30",
  },
];

export function stakeCamForResort(slug: string): SkiStakeCam | undefined {
  return SKI_STAKE_CAMS.find(c => c.resortSlug === slug);
}
