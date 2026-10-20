/**
 * Enterprise camera feed — the redistribution rights gate.
 *
 * The enterprise feed / embed / API may only carry cameras whose SOURCE is
 * cleared for redistribution to third-party customers. This module is that
 * allowlist, built from the existing licensing research:
 *
 *  - OpenCCTV-harvest cameras carry `source: "OpenCCTV / <family>"`. Their
 *    verdict comes from the per-family licensing registry
 *    (src/lib/camera-expansion/families.ts), which records the Stage A audit
 *    spot-checks (~/workspace/worldeye-camera-expansion/AUDIT.md §3.4):
 *    only families whose verdict is "clear" pass. "conditional" families
 *    (real upstreams, terms unreviewed for redistribution) and "excluded"
 *    families (Windy, EarthCam, SkylineWebcams, WeatherBug…) never pass.
 *  - Direct agency modules carry the agency's own label ("FDOT", "TfL"…).
 *    DIRECT_CLEAR below maps the labels whose basis is on file: US state
 *    DOT traveller-information feeds (audit §3.4: CLEAR, standard open-data
 *    posture), US federal sources (public domain), Canadian government
 *    511/municipal open data, and the European/Asia-Pacific national road
 *    and transport authorities the family registry already records as
 *    clear-by-direct-integration.
 *
 * DEFAULT IS EXCLUDED. A source with no basis on file — commercial webcam
 * networks, mixed "public webcam" scrapes, third-party broadcasts, private
 * motorway concessionaires, anything unreviewed — stays out of every
 * enterprise payload, and the dashboard surfaces it as excluded WITH this
 * reason rather than dropping it silently.
 *
 * See docs/enterprise-camera-feed.md for the full audit summary.
 */
import { familyInfo } from "@/lib/camera-expansion/families";

export interface FeedEligibility {
  eligible: boolean;
  /** The operating agency/network the payload attributes the camera to. */
  upstream: string;
  /** Why: the clearance basis when eligible, the exclusion reason when not. */
  basis: string;
}

const US_DOT_BASIS =
  "US public-agency traveller-information feed — Stage A audit §3.4 verdict: CLEAR (standard open-data posture).";
const FEDERAL_BASIS = "US federal public data (public domain).";
const CANADA_BASIS =
  "Canadian government traveller-information / municipal open data — same class the family registry records as clear (Alberta 511, Ontario 511, Toronto, Ottawa).";
const REGISTRY_BASIS =
  "National transport authority the family registry records as clear by direct integration (Stage B spot-check).";

interface DirectClear {
  upstream: string;
  basis: string;
}

const DIRECT_CLEAR: Record<string, DirectClear> = {
  /* ── US state DOTs (IBI-511 and direct agency modules) ─────────────── */
  FDOT: { upstream: "Florida Department of Transportation", basis: US_DOT_BASIS },
  TxDOT: { upstream: "Texas Department of Transportation", basis: US_DOT_BASIS },
  GDOT: { upstream: "Georgia Department of Transportation", basis: US_DOT_BASIS },
  UDOT: { upstream: "Utah Department of Transportation", basis: US_DOT_BASIS },
  Caltrans: { upstream: "Caltrans (California Department of Transportation)", basis: US_DOT_BASIS },
  "ODOT TripCheck": { upstream: "Oregon Department of Transportation (TripCheck)", basis: US_DOT_BASIS },
  NCDOT: { upstream: "North Carolina Department of Transportation", basis: US_DOT_BASIS },
  "MDOT MiDrive": { upstream: "Michigan Department of Transportation (MiDrive)", basis: US_DOT_BASIS },
  "INDOT TrafficWise": { upstream: "Indiana Department of Transportation (TrafficWise)", basis: US_DOT_BASIS },
  NDOT: { upstream: "Nevada Department of Transportation", basis: US_DOT_BASIS },
  ADOT: { upstream: "Arizona Department of Transportation", basis: US_DOT_BASIS },
  LADOTD: { upstream: "Louisiana Department of Transportation and Development", basis: US_DOT_BASIS },
  WSDOT: { upstream: "Washington State Department of Transportation", basis: US_DOT_BASIS },
  DriveBC: { upstream: "DriveBC (British Columbia Ministry of Transportation)", basis: CANADA_BASIS },
  /* ── US federal ────────────────────────────────────────────────────── */
  "FAA WeatherCams": { upstream: "US Federal Aviation Administration", basis: FEDERAL_BASIS },
  /* ── US municipal ──────────────────────────────────────────────────── */
  "Butler County, OH": { upstream: "Butler County, Ohio", basis: "US municipal open data — same class as registry-cleared US city DOT families." },
  "Cincinnati, OH": { upstream: "City of Cincinnati, Ohio", basis: "US municipal open data — same class as registry-cleared US city DOT families." },
  /* ── Canada: provincial 511 + municipal open data ──────────────────── */
  "Quebec 511": { upstream: "Québec 511 (Ministère des Transports du Québec)", basis: CANADA_BASIS },
  "511 Ontario": { upstream: "Ontario 511 (Ministry of Transportation)", basis: CANADA_BASIS },
  "Ontario 511": { upstream: "Ontario 511 (Ministry of Transportation)", basis: CANADA_BASIS },
  "Alberta 511": { upstream: "Alberta 511", basis: CANADA_BASIS },
  "City of Ottawa": { upstream: "City of Ottawa", basis: CANADA_BASIS },
  "City of Toronto": { upstream: "City of Toronto", basis: CANADA_BASIS },
  "City of Edmonton": { upstream: "City of Edmonton", basis: CANADA_BASIS },
  /* ── Europe / Asia-Pacific national authorities (registry: clear) ──── */
  DGT: { upstream: "Dirección General de Tráfico (Spain)", basis: REGISTRY_BASIS },
  ASFINAG: { upstream: "ASFINAG (Austria)", basis: REGISTRY_BASIS },
  "Autostrade per l'Italia": { upstream: "Autostrade per l'Italia", basis: REGISTRY_BASIS },
  Trafikverket: { upstream: "Swedish Transport Administration (Trafikverket)", basis: REGISTRY_BASIS },
  Fintraffic: { upstream: "Fintraffic (Finland)", basis: REGISTRY_BASIS },
  "Vegagerðin": { upstream: "Icelandic Road and Coastal Administration", basis: REGISTRY_BASIS },
  "Via Lietuva": { upstream: "Via Lietuva (Lithuania)", basis: REGISTRY_BASIS },
  Rijkswaterstaat: { upstream: "Rijkswaterstaat (Netherlands)", basis: REGISTRY_BASIS },
  TfL: { upstream: "Transport for London", basis: REGISTRY_BASIS },
  NZTA: { upstream: "NZ Transport Agency", basis: REGISTRY_BASIS },
  "LTA Singapore": { upstream: "Singapore Land Transport Authority", basis: REGISTRY_BASIS },
  "HK Transport Dept": { upstream: "Hong Kong Transport Department", basis: REGISTRY_BASIS },
  "THB Highway Bureau": {
    upstream: "Thailand Department of Highways",
    basis: "Government highway authority publishing traveller-information cameras as open data — same posture as the audit's DOT class.",
  },
  "MLIT river.go.jp": { upstream: "Japan MLIT river cameras", basis: REGISTRY_BASIS },
};

/** Known labels that are out, with the specific reason (default-exclude
 *  would catch them anyway — these exist so the dashboard can say why). */
const DIRECT_EXCLUDED: Record<string, string> = {
  SkylineWebcams:
    "Commercial aggregator — family registry verdict: excluded; its terms do not clear redistribution.",
  "Public Webcam":
    "Unreviewed mixed webcam scrape — no redistribution basis on file for its operators.",
  YouTube: "Third-party broadcast — the broadcaster's content, not ours to redistribute.",
  "YouTube Live": "Third-party broadcast — the broadcaster's content, not ours to redistribute.",
  CamStreamer:
    "Commercial streaming platform — family registry verdict: conditional (embed terms not spot-checked); held by default.",
};

const OCC_PREFIX = "OpenCCTV / ";

/** The redistribution verdict for one catalogue camera. */
export function feedEligibility(camera: { source?: string | null }): FeedEligibility {
  const source = (camera.source ?? "").trim();

  // Windy is structurally excluded whatever label it arrives under
  // (audit §3.4: its terms grant no commercial redistribution).
  if (/windy/i.test(source)) {
    return {
      eligible: false,
      upstream: "Windy Webcams",
      basis: "Windy Webcams — Windy's terms grant no commercial redistribution of its catalogue or feed URLs (audit §3.4). Structural exclusion.",
    };
  }

  if (source.startsWith(OCC_PREFIX)) {
    const family = source.slice(OCC_PREFIX.length).trim();
    const info = familyInfo(family);
    if (info.verdict === "clear") {
      return {
        eligible: true,
        upstream: info.upstream,
        basis: `OpenCCTV family "${family}" spot-checked CLEAR in the licensing registry: ${info.basis}`,
      };
    }
    if (info.verdict === "excluded") {
      return {
        eligible: false,
        upstream: info.upstream,
        basis: `OpenCCTV family "${family}" is EXCLUDED in the licensing registry: ${info.basis}`,
      };
    }
    return {
      eligible: false,
      upstream: info.upstream,
      basis: `OpenCCTV family "${family}" is CONDITIONAL in the licensing registry — its upstream's terms have not been cleared for redistribution, so it is held by default: ${info.basis}`,
    };
  }

  const direct = DIRECT_CLEAR[source];
  if (direct) return { eligible: true, upstream: direct.upstream, basis: direct.basis };

  const excludedReason = DIRECT_EXCLUDED[source];
  if (excludedReason) return { eligible: false, upstream: source, basis: excludedReason };

  return {
    eligible: false,
    upstream: source || "Unknown source",
    basis: `Source "${source || "unknown"}" has no redistribution clearance on file — excluded by default until its terms are reviewed.`,
  };
}

export function isFeedEligible(camera: { source?: string | null }): boolean {
  return feedEligibility(camera).eligible;
}

/** The attribution string payloads carry for a camera. */
export function feedAttribution(camera: { source?: string | null }): string {
  const { upstream } = feedEligibility(camera);
  return `${upstream} via WorldEye`;
}
