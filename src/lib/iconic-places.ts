/**
 * OSIRIS — the iconic crossings & streets registry (Menu #2 Wave A
 * part 2, Oct 2026).
 *
 * One row per famous crossing or street with its own page under
 * /iconic-places. A place qualifies only where a camera in the
 * catalogue genuinely frames it — its own name is the place
 * (a scramble-crossing feed, a camera standing on the boulevard),
 * or it stands at the place's own intersection. A camera merely in
 * the same city NEVER qualifies: that single rule is why Times
 * Square, Bourbon Street and Abbey Road have no page here (see
 * ICONIC_GAPS — their absence is measured, pinned in
 * src/lib/iconic-places.test.ts, and printed on the hub).
 *
 * Because the qualifying sets are defined by the cameras' own
 * names, the scopes behind these pages (src/lib/explore-data.ts,
 * keys `iconic-*`) are NAME rules, not radius walls — the same
 * discipline as the 'rail-named' wall: exactly the records whose
 * name is the place, with a geo bound only where the name is shared
 * (Duval is a street name in several states; Las Vegas Boulevard
 * runs far beyond the Strip). Every count a page quotes is the
 * rule's computed yield over the same catalogue chunks the explorer
 * serves; iconic-places.test.ts recomputes each rule from the raw
 * chunks with its own matcher.
 *
 * Facts discipline: this registry carries what the catalogue itself
 * proves — camera names, sources, positions — plus the framing the
 * place is known by. Nothing here asserts a view a camera does not
 * have: the Strip's cameras are traffic cameras and are called
 * traffic cameras; Duval's single camera is stated as one.
 */

export interface IconicPlace {
  slug: string;
  /** Full name, e.g. "Shibuya Scramble Crossing". */
  name: string;
  /** Short name for titles and cards. */
  short: string;
  /** What kind of place it is — used in copy, never as a claim. */
  kind: 'crossing' | 'street' | 'avenue';
  /** City display, e.g. "Tokyo". */
  city: string;
  /** Region/state display for schema.org addressRegion. */
  region: string;
  /** Country display. */
  country: string;
  /** Catalogue/country-page slug (/cameras/countries/<slug>). */
  countrySlug: string;
  /** EXPLORE_SCOPES key of this place's camera set. */
  scopeKey: string;
  /** The place's own point (the crossing; the named corner). */
  lat: number;
  lng: number;
  /** Radius for the globe deep link (metres). */
  geoRadiusM: number;
  /** IANA timezone of the place. */
  tz: string;
  /** The set's rule, stated the way the page states it. */
  setRule: string;
  /** Named cameras verified in the set (audit, Oct 2026). */
  highlights: string[];
  /** Two intro paragraphs: what the set is, honestly. */
  intro: [string, string];
  /** Best-time-to-watch note. */
  watch: string;
  faqs: Array<{ q: string; a: string }>;
  /** Place-specific links (city page, sibling families). */
  links: Array<{ label: string; href: string }>;
}

export const ICONIC_PLACES: IconicPlace[] = [
  {
    slug: 'shibuya-crossing',
    name: 'Shibuya Scramble Crossing',
    short: 'Shibuya Crossing',
    kind: 'crossing',
    city: 'Tokyo',
    region: 'Tokyo',
    country: 'Japan',
    countrySlug: 'japan',
    scopeKey: 'iconic-shibuya-crossing',
    lat: 35.6595,
    lng: 139.7005,
    geoRadiusM: 600,
    tz: 'Asia/Tokyo',
    setRule: 'every catalogue camera whose own name is the crossing',
    highlights: [
      'Shibuya Scramble Crossing (ANN News)',
      'Tokyo - Shibuya Scramble Crossing (SkylineWebcams)',
    ],
    intro: [
      "The scramble outside Shibuya Station is the most famous pedestrian crossing on Earth — every light turns red, and the whole intersection becomes a plaza for a minute at a time. This page holds the directory's entire Shibuya Crossing set: the two feeds that carry the crossing in their own name, one of them registered at the crossing itself, in front of the station.",
      "Two feeds is the honest count, and the rule behind it matters more than the number: Tokyo's vast traffic grid surrounds Shibuya, but a camera in the same city is not a camera on the crossing. Rather than dress up a neighbourhood wall as the scramble, the page keeps exactly the feeds that name it — and says so.",
    ],
    watch:
      "The scramble's great hours are the evening peak, when the crowds are densest and the screens and signs come up around them, and any rainy evening, when the intersection fills with umbrellas and reflects every light it has. Early morning is the quiet version: the same geometry with a handful of people in it, which has its own fascination.",
    faqs: [
      {
        q: 'Are both cameras really pointed at the crossing?',
        a: "Both feeds carry the crossing in their own name — that is the set's rule, and it is stated rather than padded. The ANN News feed is registered at the crossing's own coordinates in front of Shibuya Station; the SkylineWebcams feed is the provider's named Shibuya Scramble Crossing camera. A third Shibuya feed, 'Streets of Shibuya', shows the district's streets generally and is deliberately not in this set.",
      },
      {
        q: 'Why does Tokyo have thousands of cameras but only two here?',
        a: "Because this page is the crossing, not the city. Tokyo's road and river networks are in the directory under the Tokyo city page; this set is only the feeds that name the scramble itself. A page that quietly widened the rule would be quoting a bigger number for a worse page.",
      },
    ],
    links: [
      { label: 'Tokyo cameras — the city page', href: '/city-webcams/tokyo' },
      { label: 'Japan cameras — the country index', href: '/cameras/countries/japan' },
    ],
  },
  {
    slug: 'las-vegas-strip',
    name: 'The Las Vegas Strip',
    short: 'Las Vegas Strip',
    kind: 'street',
    city: 'Las Vegas',
    region: 'Nevada',
    country: 'United States',
    countrySlug: 'united-states',
    scopeKey: 'iconic-las-vegas-strip',
    lat: 36.1123,
    lng: -115.17,
    geoRadiusM: 1500,
    tz: 'America/Los_Angeles',
    setRule:
      'every catalogue camera on Las Vegas Boulevard between Sahara Avenue and the Welcome Sign',
    highlights: [
      'Las Vegas Blvd & Bellagio F1 (NDOT)',
      'Las Vegas Blvd & Paris F1 (NDOT)',
      'Las Vegas Blvd & Welcome Sign (NDOT)',
    ],
    intro: [
      "The Strip is Las Vegas Boulevard's resort corridor — Sahara Avenue at the north end, the Welcome to Fabulous Las Vegas sign at the south — and Nevada's DOT keeps a camera at nearly every corner of it. This page is that set: every catalogue camera standing on the boulevard itself along the corridor, named for the frontages they watch — Bellagio, Paris, Caesars, the Mirage-Venetian, Wynn, Aria, Luxor, Mandalay Bay.",
      "They are traffic cameras, and the page calls them that. What a traffic camera on the Strip frames is the Strip as it actually runs: the boulevard, the medians, the casino frontages and the crowds crossing between them — including the 'F1' cameras NDOT names for the Grand Prix circuit that takes the boulevard over each year. No casino runs these feeds; the state does, which is why they never look away.",
    ],
    watch:
      "The Strip is a night subject. After dark the boulevard becomes the thing the postcards promise — signs lit, fountains' crowds, the whole corridor in motion — and the cameras at the Bellagio and Paris corners are the front row. New Year's Eve is the extreme version, when the boulevard closes to traffic and fills with people instead; race weeks are the other, when the F1-named cameras earn their tags.",
    faqs: [
      {
        q: 'Are these the casinos’ own webcams?',
        a: "No — every camera in this set is a Nevada DOT traffic camera standing on Las Vegas Boulevard; the resort names in their titles are the intersections and frontages they watch. That is also why the set is complete in a way a casino collection never is: it runs the whole corridor, corner by corner, whether the corner is famous or not.",
      },
      {
        q: 'Where does this page’s Strip start and end?',
        a: "Sahara Avenue in the north — the boulevard's traditional top — to the Welcome Sign in the south, about 6.4 km of Las Vegas Boulevard. Cameras on the same boulevard north of Sahara, downtown and toward the airport, are in the directory under Nevada's traffic pages; they are the same street but not the Strip, and the set's rule keeps them out.",
      },
    ],
    links: [
      {
        label: 'Las Vegas airport (LAS) cameras',
        href: '/airport-webcams/las-harry-reid-las-vegas',
      },
      { label: 'Nevada traffic cameras', href: '/us-traffic-cameras/nevada' },
    ],
  },
  {
    slug: 'duval-street',
    name: 'Duval Street',
    short: 'Duval Street',
    kind: 'street',
    city: 'Key West',
    region: 'Florida',
    country: 'United States',
    countrySlug: 'united-states',
    scopeKey: 'iconic-duval-street',
    lat: 24.5511,
    lng: -81.7992,
    geoRadiusM: 600,
    tz: 'America/New_York',
    setRule: 'the one catalogue camera standing on Duval Street itself',
    highlights: ['SE corner of Duval and Truman Ave (FDOT)'],
    intro: [
      "Duval Street runs the length of old Key West — Mallory Square and the sunset crowd at one end, the Southernmost Point at the other — and the directory holds exactly one camera standing on it: Florida DOT's camera at Duval's corner with Truman Avenue, mid-island. One feed, stated plainly, like the one-camera volcanoes elsewhere in this directory.",
      "The island is not short of cameras — FDOT watches Truman Avenue and Roosevelt Boulevard at a dozen corners — but those are US-1's cameras, not Duval's, and a page that borrowed them would be quoting a Duval count for streets that are not Duval. What the one camera shows is the real thing at its working end: the intersection where the island's main street crosses its highway, with Duval running away in both directions.",
    ],
    watch:
      "Duval's famous hour — the sunset celebration — happens at Mallory Square, which has no camera in this directory; this page will not pretend otherwise. The Truman corner's own rhythm is the street's everyday one: mornings quiet and local, afternoons filling, and festival weeks (Fantasy Fest fills Duval end to end each October) when the corner becomes a grandstand.",
    faqs: [
      {
        q: 'Only one camera on all of Duval Street?',
        a: "In this catalogue, yes — one, at the Truman Avenue corner. Key West's other public cameras stand on Truman Avenue (US-1) and Roosevelt Boulevard. The set's rule is the street itself, so the count is one; if a Mallory Square or Southernmost feed is ever published openly and enters the catalogue, it joins this page by the same rule.",
      },
      {
        q: 'Can I watch the Mallory Square sunset from here?',
        a: "Not from this camera — it stands about 1.5 km inland at Truman Avenue, facing its intersection. The honest answer is that the directory has no Mallory Square feed. What this camera does give you is Duval Street itself, live, at the corner where the island crosses it.",
      },
    ],
    links: [
      { label: 'Florida traffic cameras', href: '/us-traffic-cameras/florida' },
      {
        label: 'United States cameras — the country index',
        href: '/cameras/countries/united-states',
      },
    ],
  },
  {
    slug: 'kalakaua-avenue',
    name: 'Kalākaua Avenue',
    short: 'Kalākaua Avenue',
    kind: 'avenue',
    city: 'Waikiki, Honolulu',
    region: 'Hawaii',
    country: 'United States',
    countrySlug: 'united-states',
    scopeKey: 'iconic-kalakaua-avenue',
    lat: 21.2801,
    lng: -157.8298,
    geoRadiusM: 900,
    tz: 'Pacific/Honolulu',
    setRule: 'every catalogue camera at a Kalākaua Avenue intersection',
    highlights: [
      'KALAKAUA & KAPAHULU',
      'KALAKAUA & LEWERS',
      'KING & KALAKAUA',
    ],
    intro: [
      "Kalākaua Avenue is Waikiki: the beachfront boulevard that runs from downtown Honolulu's edge along the sand to the zoo at Kapahulu, with the beach on one side and the hotels on the other. Honolulu's traffic cameras stand at its intersections the whole way, and this page is exactly that set — every catalogue camera whose corner is on Kalākaua itself.",
      "They are traffic cameras facing the avenue, stated as such. Their subject is the boulevard's own life — the crossing crowds, the parade closures, the evening build toward sunset — with the beach a few steps from most of their corners. For the sand and the break itself, the Waikiki surf wall is the companion page; this one is the street the surf checks start from.",
    ],
    watch:
      "Sunset is the avenue's hour: the light comes down the boulevard's length, the beach side fills, and the Kapahulu-end cameras watch the zoo corner turn gold. Mornings are the local version — surf racks on cars, the avenue nearly empty — and parade days (Kalākaua is Honolulu's parade route) turn every camera in the set toward the crowd.",
    faqs: [
      {
        q: 'Do these cameras show Waikiki Beach?',
        a: "They stand on the avenue that fronts the beach, facing their intersections — the beach is across the street from most of them, and some frames catch its edge, but this set is the boulevard, honestly labelled. The directory's Waikiki surf page holds the beach-facing wall; the two pages are companions, and each states which side of the street it is on.",
      },
      {
        q: 'Which corners does the set cover?',
        a: "Six of the avenue's intersections, from King Street at the downtown end to Kapahulu Avenue by the zoo — the full Waikiki run of Kalākaua, at the corners where Honolulu publishes a camera. The count is the rule's yield, not a selection: every catalogue camera naming a Kalākaua intersection is in the set.",
      },
    ],
    links: [
      { label: 'Waikiki surf & beach cameras', href: '/surf-webcams/waikiki' },
      { label: 'Hawaii traffic cameras', href: '/us-traffic-cameras/hawaii' },
    ],
  },
];

/**
 * The famous absences — measured, not assumed. Each was checked
 * against the raw catalogue by name and by radius; the hub prints
 * them because "is there a live cam of X?" deserves a true answer
 * even when the answer is no.
 */
export const ICONIC_GAPS: Array<{ name: string; note: string }> = [
  {
    name: 'Times Square, New York',
    note: 'No camera within 1 km in the catalogue — the nearest are West Side Highway feeds 1.4 km away, and the famous billboards feeds are not published into this directory.',
  },
  {
    name: 'Abbey Road, London',
    note: 'No camera stands on Abbey Road. The nearest London traffic cameras are on Finchley Road and Wellington Road, half a kilometre and one famous zebra crossing away.',
  },
  {
    name: 'Bourbon Street, New Orleans',
    note: 'The French Quarter has no camera in the catalogue at all — the nearest feeds are Interstate 10, over a kilometre from Bourbon Street.',
  },
  {
    name: 'Ocean Drive, Miami Beach',
    note: 'No camera on Ocean Drive; Miami Beach’s catalogue coverage is the causeways and the interstate, not the Art Deco strip.',
  },
  {
    name: 'Pier 39, San Francisco',
    note: 'No camera within 2 km — San Francisco’s northern waterfront, Fisherman’s Wharf included, is a blank in the catalogue.',
  },
  {
    name: 'Lombard Street, San Francisco',
    note: 'The crooked block has no camera in the catalogue; the Lombard Avenues that do appear are in Portland and Richmond.',
  },
  {
    name: 'Rodeo Drive, Beverly Hills',
    note: 'No camera within 2 km. The Rodeos in the catalogue are a Houston subdivision and a town in Arizona.',
  },
];

const BY_SLUG = new Map(ICONIC_PLACES.map((p) => [p.slug, p]));

export function iconicPlaceBySlug(slug: string): IconicPlace | null {
  return BY_SLUG.get(slug) ?? null;
}
