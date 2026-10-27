/**
 * OSIRIS — border crossing registry for the /border-crossings pages.
 *
 * One row per crossing page: the CBP port record(s) that make up the
 * crossing (lib/border/wait-times), the point its camera wall is
 * measured from, and the handful of facts the page states. The set is
 * data-driven, chosen 2026-10-26 by three tests every row had to
 * pass: (1) the crossing exists in CBP's live Border Wait Times feed
 * under the port_number(s) named here; (2) the catalogue holds real
 * cameras within the stated radius of the crossing point — the count
 * each page quotes is countForDef over exactly this rule, recomputed
 * from the raw chunks in border-pages.test.ts; (3) the crossing is
 * one travellers actually search for by name.
 *
 * Crossings that failed the camera test and were left out, honestly:
 * San Luis (AZ), Lukeville, Douglas, Naco, Presidio, Columbus and
 * Sweetgrass all have real CBP wait-time data but zero catalogue
 * cameras within 25 km — they get no page rather than a page dressed
 * in unrelated feeds. Rio Grande City (2), Roma (1) and Ogdensburg
 * (1) fell below the same bar. If the catalogue grows into those
 * corridors, the rows can be added on the same rule.
 *
 * Facts discipline: every `facts` line is checkable public record —
 * port composition, bridge names and years, the highways that meet at
 * the crossing. No traffic volumes, no "busiest" superlatives beyond
 * the hedged, commonly documented ones, and nothing about a crossing
 * the feed itself doesn't support.
 */

export interface BorderCrossing {
  slug: string;
  /** "San Ysidro" — the name travellers search. */
  name: string;
  /** CBP port_number values that make up this crossing, in the
   *  order the page presents them (primary first). */
  portNumbers: string[];
  border: 'Mexican Border' | 'Canadian Border';
  usCity: string;
  usState: string;
  /** Foreign city across the line. */
  foreignCity: string;
  foreignRegion: string;
  /** Crossing point the camera wall is measured from. */
  lat: number;
  lng: number;
  /** Stated wall radius — quoted on the page and in its scope key. */
  radiusKm: number;
  /** Short bridge/facility names, for headings and facts. */
  bridges: string[];
  /** Verifiable facts, one line each. */
  facts: string[];
  /** Existing /city-webcams/<slug> page for the US city, if any. */
  cityPageSlug?: string;
  /** Existing /us-traffic-cameras/<slug> state page. */
  statePageSlug: string;
}

export const BORDER_CROSSINGS: BorderCrossing[] = [
  /* ── Mexican border ──────────────────────────────────────────── */
  {
    slug: 'san-ysidro',
    name: 'San Ysidro',
    portNumbers: ['250401', '250407', '250409'],
    border: 'Mexican Border',
    usCity: 'San Diego (San Ysidro)',
    usState: 'California',
    foreignCity: 'Tijuana',
    foreignRegion: 'Baja California',
    lat: 32.542,
    lng: -117.03,
    radiusKm: 10,
    bridges: ['San Ysidro Port of Entry', 'PedWest', 'Cross Border Xpress (CBX)'],
    facts: [
      'San Ysidro, where I-5 and I-805 meet the line, is among the busiest land border crossings in the world — the main port (CBP 250401) runs passenger vehicles and pedestrians around the clock.',
      'PedWest (250407) is the pedestrian-focused port a few blocks west, by the Virginia Avenue transit centre.',
      'Cross Border Xpress (250409) is the enclosed bridge from a dedicated Otay Mesa terminal straight into Tijuana International Airport — usable only with an airline ticket.',
    ],
    cityPageSlug: 'san-diego',
    statePageSlug: 'california',
  },
  {
    slug: 'otay-mesa',
    name: 'Otay Mesa',
    portNumbers: ['250601', '250602'],
    border: 'Mexican Border',
    usCity: 'San Diego (Otay Mesa)',
    usState: 'California',
    foreignCity: 'Tijuana',
    foreignRegion: 'Baja California',
    lat: 32.5503,
    lng: -116.9728,
    radiusKm: 10,
    bridges: ['Otay Mesa Passenger', 'Otay Mesa Commercial'],
    facts: [
      'Otay Mesa is San Diego\u2019s second Tijuana crossing, east of San Ysidro on SR-905 — the passenger port (250601) and the region\u2019s commercial truck port (250602) sit side by side.',
      'Trucks crossing here feed the Otay Mesa warehouse and logistics district on the US side and Tijuana\u2019s industrial east.',
    ],
    cityPageSlug: 'san-diego',
    statePageSlug: 'california',
  },
  {
    slug: 'calexico',
    name: 'Calexico',
    portNumbers: ['250302', '250301'],
    border: 'Mexican Border',
    usCity: 'Calexico',
    usState: 'California',
    foreignCity: 'Mexicali',
    foreignRegion: 'Baja California',
    lat: 32.6649,
    lng: -115.4955,
    radiusKm: 15,
    bridges: ['Calexico West', 'Calexico East'],
    facts: [
      'Calexico faces Mexicali, the capital of Baja California — the two downtowns touch, and the West port (250302) lands in the middle of both.',
      'The East port (250301) carries the commercial traffic a few miles east, by the Imperial Valley\u2019s farmland.',
    ],
    statePageSlug: 'california',
  },
  {
    slug: 'nogales',
    name: 'Nogales',
    portNumbers: ['260401', '260402', '260403'],
    border: 'Mexican Border',
    usCity: 'Nogales',
    usState: 'Arizona',
    foreignCity: 'Nogales',
    foreignRegion: 'Sonora',
    lat: 31.3334,
    lng: -110.9457,
    radiusKm: 10,
    bridges: ['DeConcini', 'Mariposa', 'Morley Gate'],
    facts: [
      'The twin cities — Ambos Nogales — share a main street divided by the border fence. The DeConcini port (260401) is the downtown crossing; Morley Gate (260403) is its pedestrian neighbour.',
      'Mariposa (260402), west of downtown, is the modern commercial port — the produce corridor that makes Nogales one of the main winter-vegetable gateways into the US.',
    ],
    statePageSlug: 'arizona',
  },
  {
    slug: 'el-paso',
    name: 'El Paso',
    portNumbers: ['240202', '240201', '240203', '240204'],
    border: 'Mexican Border',
    usCity: 'El Paso',
    usState: 'Texas',
    foreignCity: 'Ciudad Juárez',
    foreignRegion: 'Chihuahua',
    lat: 31.7577,
    lng: -106.4889,
    radiusKm: 12,
    bridges: ['Paso del Norte', 'Bridge of the Americas', 'Ysleta–Zaragoza', 'Stanton Street'],
    facts: [
      'El Paso and Ciudad Juárez are one metro split by the Rio Grande, joined by four crossings in the feed: Paso del Norte downtown (240202), the Bridge of the Americas (240201), Ysleta–Zaragoza in the southeast (240203) and the Stanton Street dedicated commuter lanes (240204).',
      'Paso del Norte lands at El Paso\u2019s Santa Fe Street, a short walk from downtown — its pedestrian lanes are a daily commute for thousands.',
      'CBP\u2019s feed also carries a second Paso del Norte record (202401) and a second Ysleta record ("YSLETA", 240104) — agency duplicates of the ports above, not separate crossings.',
    ],
    cityPageSlug: 'el-paso',
    statePageSlug: 'texas',
  },
  {
    slug: 'del-rio',
    name: 'Del Rio',
    portNumbers: ['230201'],
    border: 'Mexican Border',
    usCity: 'Del Rio',
    usState: 'Texas',
    foreignCity: 'Ciudad Acuña',
    foreignRegion: 'Coahuila',
    lat: 29.357,
    lng: -100.92,
    radiusKm: 10,
    bridges: ['Del Rio–Ciudad Acuña International Bridge'],
    facts: [
      'One bridge joins Del Rio and Ciudad Acuña across the Rio Grande, below the Amistad Dam — the reservoir upriver is shared by both countries.',
    ],
    statePageSlug: 'texas',
  },
  {
    slug: 'eagle-pass',
    name: 'Eagle Pass',
    portNumbers: ['230301', '230302'],
    border: 'Mexican Border',
    usCity: 'Eagle Pass',
    usState: 'Texas',
    foreignCity: 'Piedras Negras',
    foreignRegion: 'Coahuila',
    lat: 28.707,
    lng: -100.51,
    radiusKm: 10,
    bridges: ['Eagle Pass Bridge I', 'Camino Real International Bridge (Bridge II)'],
    facts: [
      'Bridge I (230301) is the downtown crossing into Piedras Negras; Bridge II (230302), the Camino Real International Bridge, carries the commercial traffic just south of it.',
    ],
    statePageSlug: 'texas',
  },
  {
    slug: 'laredo',
    name: 'Laredo',
    portNumbers: ['230401', '230402', '230404', '230403'],
    border: 'Mexican Border',
    usCity: 'Laredo',
    usState: 'Texas',
    foreignCity: 'Nuevo Laredo',
    foreignRegion: 'Tamaulipas',
    lat: 27.4966,
    lng: -99.509,
    radiusKm: 12,
    bridges: [
      'Gateway to the Americas (Bridge I)',
      'Juárez–Lincoln (Bridge II)',
      'World Trade Bridge',
      'Colombia Solidarity Bridge',
    ],
    facts: [
      'Laredo is the busiest inland port in the United States by trade value — four crossings in the feed serve it, from the downtown Gateway to the Americas (Bridge I, 230401) and Juárez–Lincoln (Bridge II, 230402) to the World Trade Bridge (230404), one of the busiest truck crossings in North America.',
      'The Colombia Solidarity Bridge (230403) sits about 20 miles upriver at Colombia, Nuevo León — the only Texas crossing into Nuevo León state; the downtown bridges face Tamaulipas.',
      'I-35 runs from the bridges through Laredo to Dallas and the Midwest — the truck queue on a bad afternoon is the NAFTA/USMCA corridor made visible.',
    ],
    cityPageSlug: 'laredo',
    statePageSlug: 'texas',
  },
  {
    slug: 'hidalgo-pharr',
    name: 'Hidalgo & Pharr',
    portNumbers: ['230501', '230502', '230503'],
    border: 'Mexican Border',
    usCity: 'Hidalgo / Pharr (McAllen)',
    usState: 'Texas',
    foreignCity: 'Reynosa',
    foreignRegion: 'Tamaulipas',
    lat: 26.0947,
    lng: -98.2668,
    radiusKm: 15,
    bridges: ['McAllen–Hidalgo–Reynosa Bridge', 'Pharr–Reynosa Bridge', 'Anzaldúas International Bridge'],
    facts: [
      'Three bridges tie the McAllen metro to Reynosa: the Hidalgo bridge (230501) downtown, the Pharr bridge (230502) — the valley\u2019s produce and commercial gateway — and Anzaldúas (230503), opened in 2009 on the west side by Mission.',
    ],
    statePageSlug: 'texas',
  },
  {
    slug: 'progreso',
    name: 'Progreso',
    portNumbers: ['230901', '230902'],
    border: 'Mexican Border',
    usCity: 'Progreso / Donna',
    usState: 'Texas',
    foreignCity: 'Nuevo Progreso',
    foreignRegion: 'Tamaulipas',
    lat: 26.087,
    lng: -97.955,
    radiusKm: 15,
    bridges: ['Progreso International Bridge', 'Donna International Bridge'],
    facts: [
      'Nuevo Progreso is the Rio Grande Valley\u2019s walk-across town — the Progreso bridge (230901) lands in its shopping district, and most crossers park on the US side and stroll over.',
      'The Donna International Bridge (230902), a few miles west, opened in 2010 and takes the through traffic.',
    ],
    statePageSlug: 'texas',
  },
  {
    slug: 'brownsville',
    name: 'Brownsville',
    portNumbers: ['535504', '535502', '535501', '535503'],
    border: 'Mexican Border',
    usCity: 'Brownsville',
    usState: 'Texas',
    foreignCity: 'Matamoros',
    foreignRegion: 'Tamaulipas',
    lat: 25.899,
    lng: -97.499,
    radiusKm: 15,
    bridges: [
      'Gateway International Bridge',
      'Veterans International Bridge',
      'B&M Bridge',
      'Los Indios Bridge',
    ],
    facts: [
      'Four crossings fan out along the river at the Gulf end of the border: Gateway (535504) downtown, the B&M Bridge (535501) — the Brownsville & Matamoros crossing whose predecessor dates to 1909 — Veterans International at Los Tomates (535502) to the east, and Los Indios (535503) upriver toward Harlingen.',
    ],
    statePageSlug: 'texas',
  },

  /* ── Canadian border ─────────────────────────────────────────── */
  {
    slug: 'blaine',
    name: 'Blaine',
    portNumbers: ['300402', '300401'],
    border: 'Canadian Border',
    usCity: 'Blaine',
    usState: 'Washington',
    foreignCity: 'Surrey',
    foreignRegion: 'British Columbia',
    lat: 49.0022,
    lng: -122.7567,
    radiusKm: 12,
    bridges: ['Peace Arch', 'Pacific Highway'],
    facts: [
      'I-5 meets the line at the Peace Arch (300402) — the 1921 concrete arch that straddles the border between Blaine and Surrey, inscribed "Children of a common mother".',
      'Trucks use the Pacific Highway crossing (300401) a mile east on SR-543, which is why the feed lists Blaine twice: two crossings, one port town.',
    ],
    statePageSlug: 'washington',
  },
  {
    slug: 'lynden',
    name: 'Lynden',
    portNumbers: ['302301'],
    border: 'Canadian Border',
    usCity: 'Lynden',
    usState: 'Washington',
    foreignCity: 'Aldergrove',
    foreignRegion: 'British Columbia',
    lat: 49.0,
    lng: -122.485,
    radiusKm: 12,
    bridges: ['Lynden–Aldergrove'],
    facts: [
      'SR-539 climbs from Bellingham through Lynden\u2019s Dutch-heritage main street to the Aldergrove crossing — the quiet alternative when Blaine backs up.',
    ],
    statePageSlug: 'washington',
  },
  {
    slug: 'sumas',
    name: 'Sumas',
    portNumbers: ['300901'],
    border: 'Canadian Border',
    usCity: 'Sumas',
    usState: 'Washington',
    foreignCity: 'Abbotsford (Huntingdon)',
    foreignRegion: 'British Columbia',
    lat: 49.0023,
    lng: -122.2657,
    radiusKm: 12,
    bridges: ['Sumas–Huntingdon'],
    facts: [
      'Sumas is the Fraser Valley\u2019s crossing — SR-9 on the US side, into Abbotsford\u2019s Huntingdon port. The two towns flooded together in November 2021 when the Nooksack River overtopped the shared plain.',
    ],
    statePageSlug: 'washington',
  },
  {
    slug: 'pembina',
    name: 'Pembina',
    portNumbers: ['340101'],
    border: 'Canadian Border',
    usCity: 'Pembina',
    usState: 'North Dakota',
    foreignCity: 'Emerson',
    foreignRegion: 'Manitoba',
    lat: 49.0,
    lng: -97.237,
    radiusKm: 10,
    bridges: ['Pembina–Emerson'],
    facts: [
      'I-29\u2019s northern end: the Pembina–Emerson crossing is the principal Manitoba–North Dakota gateway, carrying Winnipeg\u2019s truck traffic to Grand Forks, Fargo and the Midwest.',
    ],
    statePageSlug: 'north-dakota',
  },
  {
    slug: 'international-falls',
    name: 'International Falls',
    portNumbers: ['360401'],
    border: 'Canadian Border',
    usCity: 'International Falls',
    usState: 'Minnesota',
    foreignCity: 'Fort Frances',
    foreignRegion: 'Ontario',
    lat: 48.6,
    lng: -93.41,
    radiusKm: 12,
    bridges: ['International Falls–Fort Frances Bridge'],
    facts: [
      'The bridge crosses the Rainy River between two paper-mill towns — and International Falls, gateway to Voyageurs National Park, brands itself the Icebox of the Nation for its winters.',
    ],
    statePageSlug: 'minnesota',
  },
  {
    slug: 'sault-ste-marie',
    name: 'Sault Ste. Marie',
    portNumbers: ['380301'],
    border: 'Canadian Border',
    usCity: 'Sault Ste. Marie',
    usState: 'Michigan',
    foreignCity: 'Sault Ste. Marie',
    foreignRegion: 'Ontario',
    lat: 46.5067,
    lng: -84.36,
    radiusKm: 25,
    bridges: ['Sault Ste. Marie International Bridge'],
    facts: [
      'One bridge over the St. Marys River joins the twin Sault Ste. Maries, beside the Soo Locks that lift shipping between Lake Superior and the lower lakes.',
    ],
    statePageSlug: 'michigan',
  },
  {
    slug: 'port-huron',
    name: 'Port Huron',
    portNumbers: ['380201'],
    border: 'Canadian Border',
    usCity: 'Port Huron',
    usState: 'Michigan',
    foreignCity: 'Sarnia (Point Edward)',
    foreignRegion: 'Ontario',
    lat: 42.9987,
    lng: -82.4235,
    radiusKm: 12,
    bridges: ['Blue Water Bridge'],
    facts: [
      'The Blue Water Bridge — twin spans, 1938 and 1997 — carries I-94/I-69 over the St. Clair River where Lake Huron drains south, into Sarnia, Ontario.',
    ],
    statePageSlug: 'michigan',
  },
  {
    slug: 'detroit',
    name: 'Detroit–Windsor',
    portNumbers: ['380001', '380002', '380102'],
    border: 'Canadian Border',
    usCity: 'Detroit',
    usState: 'Michigan',
    foreignCity: 'Windsor',
    foreignRegion: 'Ontario',
    lat: 42.3119,
    lng: -83.0739,
    radiusKm: 12,
    bridges: ['Ambassador Bridge', 'Windsor Tunnel', 'Gordie Howe International Bridge'],
    facts: [
      'The Detroit River carries one of the busiest commercial crossings in North America — a large share of US–Canada trade passes between Detroit and Windsor, much of it auto parts crossing the river more than once on the way to becoming a car.',
      'The Ambassador Bridge (380001, 1929) and the Windsor Tunnel (380002, 1930) are joined in the feed by the Gordie Howe International Bridge (380102), the new six-lane crossing downriver — three Detroit River crossings, one port.',
    ],
    statePageSlug: 'michigan',
  },
  {
    slug: 'buffalo',
    name: 'Buffalo (Peace Bridge)',
    portNumbers: ['090101'],
    border: 'Canadian Border',
    usCity: 'Buffalo',
    usState: 'New York',
    foreignCity: 'Fort Erie',
    foreignRegion: 'Ontario',
    lat: 42.9069,
    lng: -78.9056,
    radiusKm: 12,
    bridges: ['Peace Bridge'],
    facts: [
      'The Peace Bridge (1927) crosses the head of the Niagara River where Lake Erie drains — Buffalo on one shore, Fort Erie, Ontario on the other, with I-90 traffic bound for Toronto on the QEW.',
    ],
    cityPageSlug: 'buffalo',
    statePageSlug: 'new-york',
  },
  {
    slug: 'niagara-falls',
    name: 'Niagara Falls',
    portNumbers: ['090102', '090103', '090104'],
    border: 'Canadian Border',
    usCity: 'Niagara Falls',
    usState: 'New York',
    foreignCity: 'Niagara Falls',
    foreignRegion: 'Ontario',
    lat: 43.09,
    lng: -79.07,
    radiusKm: 12,
    bridges: ['Rainbow Bridge', 'Whirlpool Rapids Bridge', 'Lewiston–Queenston Bridge'],
    facts: [
      'Three bridges cross the Niagara gorge: the Rainbow Bridge (090102, 1941) in sight of the falls, the Whirlpool Rapids Bridge (090103) — reserved for NEXUS members — and the Lewiston–Queenston Bridge (090104) on I-190 to the north.',
    ],
    statePageSlug: 'new-york',
  },
  {
    slug: 'alexandria-bay',
    name: 'Alexandria Bay (Thousand Islands)',
    portNumbers: ['070801'],
    border: 'Canadian Border',
    usCity: 'Alexandria Bay',
    usState: 'New York',
    foreignCity: 'Lansdowne',
    foreignRegion: 'Ontario',
    lat: 44.3474,
    lng: -75.9887,
    radiusKm: 10,
    bridges: ['Thousand Islands Bridge'],
    facts: [
      'The Thousand Islands Bridge (1938) hops island to island across the St. Lawrence — I-81\u2019s northern end, meeting Ontario\u2019s Highway 401, the Toronto–Montreal corridor.',
    ],
    statePageSlug: 'new-york',
  },
  {
    slug: 'champlain',
    name: 'Champlain',
    portNumbers: ['071201'],
    border: 'Canadian Border',
    usCity: 'Champlain',
    usState: 'New York',
    foreignCity: 'Saint-Bernard-de-Lacolle',
    foreignRegion: 'Quebec',
    lat: 45.0,
    lng: -73.45,
    radiusKm: 10,
    bridges: ['Champlain–Lacolle'],
    facts: [
      'I-87 becomes Autoroute 15 at Champlain — the Montreal–New York City corridor crossing, one of the busiest passenger gateways on the eastern border.',
    ],
    statePageSlug: 'new-york',
  },
  {
    slug: 'derby-line',
    name: 'Derby Line',
    portNumbers: ['020901'],
    border: 'Canadian Border',
    usCity: 'Derby Line',
    usState: 'Vermont',
    foreignCity: 'Stanstead',
    foreignRegion: 'Quebec',
    lat: 45.0055,
    lng: -72.11,
    radiusKm: 10,
    bridges: ['Derby Line (I-91)'],
    facts: [
      'Derby Line and Stanstead are the famous straddle villages — the Haskell Free Library and Opera House was built on the line in 1904, its stage in Canada and its seats in the US. The working crossing is the I-91 port (020901) east of the villages.',
    ],
    statePageSlug: 'vermont',
  },
  {
    slug: 'houlton',
    name: 'Houlton',
    portNumbers: ['010601'],
    border: 'Canadian Border',
    usCity: 'Houlton',
    usState: 'Maine',
    foreignCity: 'Woodstock',
    foreignRegion: 'New Brunswick',
    lat: 47.12,
    lng: -67.79,
    radiusKm: 15,
    bridges: ['Houlton–Woodstock'],
    facts: [
      'I-95 ends here: the Houlton crossing is the interstate\u2019s northern terminus, meeting New Brunswick\u2019s Route 95 toward Woodstock and the Trans-Canada Highway.',
    ],
    statePageSlug: 'maine',
  },
];

export const BORDER_CROSSING_BY_SLUG = new Map(BORDER_CROSSINGS.map((c) => [c.slug, c]));

/** Explore-scope key for a crossing's camera wall (registered in
 *  lib/explore-data under the same centre + radius). */
export function borderScopeKey(crossing: BorderCrossing): string {
  return `border-${crossing.slug}`;
}
