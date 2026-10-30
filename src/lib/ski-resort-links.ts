/**
 * OSIRIS — per-resort official outbound links (lift tickets, trail map,
 * lodging) for the ski resort pages' "Resort information" section and
 * the resort compare tool.
 *
 * The dataset (src/data/ski-resort-links.json) holds ONLY verified
 * links. Every URL was resolved from the resort's verified official
 * domain — the domain recorded in src/data/ski-logos.json by the logo
 * pass, or one of EXTRA_VERIFIED_DOMAINS below — the target page was
 * fetched, and its title/content confirmed it is that resort's own
 * tickets / trail-map / lodging page. A link that could not be verified
 * to that standard is simply absent: a resort with no entry renders no
 * link buttons, never a guessed URL.
 *
 * Off-domain URLs appear only where the resort's own site sends its
 * visitors there (a redirect or a direct link from the verified domain —
 * pass stores and booking engines); each one is an enumerated exception
 * in ski-resort-links.test.ts with its evidence, and in the build
 * report's audit table.
 */
import linksData from "@/data/ski-resort-links.json";
import logosData from "@/data/ski-logos.json";

export interface SkiResortLinks {
  /** The resort's official lift-ticket / pass sales page. */
  tickets?: string;
  /** The resort's official trail / piste map page (or the map PDF). */
  trailMap?: string;
  /** The resort's official lodging / accommodation page. */
  lodging?: string;
  /** The resort's official ski / snowboard lessons page. */
  lessons?: string;
  /** The resort's official gear rental page. */
  rentals?: string;
  /** The resort's official parking / getting-here page. */
  parking?: string;
}

export type SkiLinkKind = keyof SkiResortLinks;

export const SKI_LINK_KINDS: SkiLinkKind[] = [
  "tickets",
  "trailMap",
  "lodging",
  "lessons",
  "rentals",
  "parking",
];

export const SKI_LINK_LABELS: Record<SkiLinkKind, string> = {
  tickets: "Buy lift tickets",
  trailMap: "Trail map",
  lodging: "Lodging",
  lessons: "Ski lessons",
  rentals: "Gear rentals",
  parking: "Parking",
};

const LINKS = linksData as Record<string, SkiResortLinks>;

export function getSkiResortLinks(slug: string): SkiResortLinks | null {
  return LINKS[slug] ?? null;
}

/**
 * Verified official domains that are NOT in ski-logos.json. The logo
 * pass verified these domains against the resorts' own homepages but
 * could not fetch an icon from them (they render monogram tiles in the
 * directory); the evidence for each is in the ski-hub build report's
 * audit table. Domains verified for the first time by the links pass
 * are added here with their evidence recorded in the links build
 * report's audit table.
 */
export const EXTRA_VERIFIED_DOMAINS: Record<string, string> = {
  "grouse-mountain": "grousemountain.com",
  "hli-arfjall": "hlidarfjall.is",
  "tomamu": "snowtomamu.jp",
  "arapahoe-basin": "arapahoebasin.com",
  "telluride": "tellurideskiresort.com",
  "whitefish-mountain": "skiwhitefish.com",
  // Verified by the links pass (the logo pass rejected these on icon /
  // title grounds; fetching for this build confirmed each homepage
  // names the resort itself — evidence in the links build report):
  "rusutsu": "rusutsu.com",
  "appi-kogen": "appi.co.jp",
  "shiga-kogen": "shigakogen.co.jp",
  // Verified by the links pass, Phase 2: zaomountainresort.com
  // self-describes as the Zao Onsen official site across its fetched
  // ticket / piste-map / stay pages; Naeba's official ski and hotel
  // pages live on princehotels.co.jp (Prince Snow Resort / Naeba
  // Prince Hotel official site). Evidence in the build report.
  "zao-onsen": "zaomountainresort.com",
  "naeba": "princehotels.co.jp",
  // Verified by the links pass, Vail Resorts platform batch: each
  // domain's own indexed pages carry titles naming the resort (e.g.
  // "Vail Lift Tickets | Vail Mountain" fetched from vail.com; the
  // platform bot-walls direct fetches, so several domains rest on
  // their own search-indexed page titles — evidence in the report).
  "vail": "vail.com",
  "beaver-creek": "beavercreek.com",
  "park-city": "parkcitymountain.com",
  "mount-snow": "mountsnow.com",
  "stevens-pass": "stevenspass.com",
  "crested-butte": "skicb.com",
};

/** A resort's verified official domain, or null when none is verified. */
export function getVerifiedResortDomain(slug: string): string | null {
  const logo = (logosData as Record<string, { domain?: string }>)[slug];
  return logo?.domain ?? EXTRA_VERIFIED_DOMAINS[slug] ?? null;
}

/** The resort's official website URL, when its domain is verified. */
export function getResortWebsiteUrl(slug: string): string | null {
  const domain = getVerifiedResortDomain(slug);
  return domain ? `https://${domain}` : null;
}

/** True when a stored URL lives on (or under) the given domain. */
export function urlHostMatchesDomain(url: string, domain: string): boolean {
  try {
    const host = new URL(url).hostname.toLowerCase();
    const d = domain.toLowerCase();
    return host === d || host === `www.${d}` || host.endsWith(`.${d}`);
  } catch {
    return false;
  }
}
