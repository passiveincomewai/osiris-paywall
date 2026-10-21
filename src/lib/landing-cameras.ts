/**
 * Curated camera manifest for the homepage gallery (Section 1).
 *
 * The catalogue carries no thumbnails and no category field, so the
 * gallery's categories are curated by camera ID — every ID below is a real
 * entry in the live catalogue (verified against /api/cctv data when the
 * manifest was built), grouped by hand into the brief's tab categories.
 * Picks must carry playable preview media (a snapshot feed or an
 * mp4/hls stream): much of the catalogue — including the generated
 * SkylineWebcams sets — is embed-only (external_url, no feed), and the
 * showcase route drops those, so an embed-only pick silently shrinks
 * its tab. Ski picks are resort-area feeds, the same framing the site's
 * own /ski-webcams page uses.
 * The showcase route (src/app/api/cctv/showcase) resolves these IDs
 * against the catalogue snapshot and drops any that have rotated out, so
 * a dead pick degrades the tab quietly instead of breaking it.
 *
 * Card destinations are the site's real category pages — the catalogue
 * has no per-camera deep link; cameras open in the globe viewer, which
 * the section's primary CTA reaches.
 */

export interface LandingCategory {
  slug: string;
  label: string;
  href: string;
  /** Curated catalogue IDs, in display order. First entry is the tab's lead card. */
  cameraIds: string[];
}

export const LANDING_CATEGORIES: LandingCategory[] = [
  {
    slug: "featured",
    label: "Featured",
    href: "/cameras",
    cameraIds: [
      "sky-it-trevi",
      "occ-biodic-43",
      "sky-es-las-vistas",
      "tfl-JamCams_00001.07450",
      "occ-windy-1735649734",
      "sky-it-amalfi",
      "sky-it-vesuvio",
      "sky-fr-calanques",
    ],
  },
  {
    slug: "cities",
    label: "Cities",
    href: "/world-city-webcams",
    cameraIds: [
      "sky-it-trevi",
      "tfl-JamCams_00001.07450",
      "sky-it-signoria",
      "sky-it-sanbabila",
      "sky-it-navona",
      "tor-open-8004",
    ],
  },
  {
    slug: "ski",
    label: "Ski Resorts",
    href: "/ski-webcams",
    cameraIds: [
      "occ-windy-1735649734",
      "cal-223",
      "cal-296",
      "udot-154500",
      "cal-272",
      "asfinag-BRENNERO-Cam-1",
    ],
  },
  {
    slug: "beaches",
    label: "Beaches",
    href: "/beach-webcams",
    cameraIds: [
      "sky-es-las-vistas",
      "sky-fr-frejus",
      "sky-fr-royan",
      "sky-fr-porto-vecchio",
      "sky-es-los-cristianos",
      "sky-es-canteras-g",
    ],
  },
  {
    slug: "highways",
    label: "Highways",
    href: "/live-traffic-cameras",
    cameraIds: [
      "asfinag-BRENNERO-Cam-1",
      "cal-1142",
      "anzac-bridge-eastbound",
      "tfl-JamCams_00002.00865",
      "gdot-14968",
      "tor-open-8001",
    ],
  },
  {
    slug: "mountains",
    label: "Mountains",
    href: "/ski-webcams",
    cameraIds: [
      "occ-biodic-43",
      "sky-it-vesuvio",
      "occ-jma-volcam-50602",
      "sky-es-masca",
      "sky-fr-bourget",
      "sky-fr-menton",
    ],
  },
  {
    slug: "airports",
    label: "Airports",
    href: "/airport-webcams",
    cameraIds: [
      "occ-airportwebcams-targovishte-airport-1",
      "occ-openwebcamdb-nagoya-airport-runway-action",
      "cal-177",
      "ottawa-muni-229",
      "cal-634",
      "ndot-7570",
    ],
  },
];

export function landingCategory(slug: string | null): LandingCategory {
  return (
    LANDING_CATEGORIES.find((c) => c.slug === slug) ??
    LANDING_CATEGORIES[0]
  );
}
