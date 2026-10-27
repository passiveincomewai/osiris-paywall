/**
 * Per-airport directory pages (keyword wave A, 2026-10-27) — the data
 * behind /airport-webcams/[airport].
 *
 * SELECTION RULE (stated on the hub and in REPORT.md): an airport
 * qualifies only if the camera catalogue holds real cameras near it.
 * Every page is a radius scope over the catalogue chunk of the
 * airport's country — 15 km from the airport's coordinates in
 * lib/airports.ts, with ONE exception: Denver (DEN) sits ~40 km from
 * its city on open plains and has no cameras within 15 km worth the
 * name (13, all corridor feeds), so its page uses 25 km and says so.
 * The set is the 50 airports with the highest 15 km yields (Atlanta
 * 534 down to Reno 77) plus DEN as the stated exception — 51 pages
 * in all. Airports below the cut (Charlotte 73; Chicago
 * O'Hare just 41) were skipped honestly rather than padded: a page
 * whose wall is a handful of distant freeway cameras serves nobody.
 *
 * Every number here — count, top source, nearest distance, the sample
 * cameras — is computed from the raw catalogue chunks
 * (src/data/countries/*.json, catalogue generated 2026-10-20) and is
 * reconciled by src/lib/airport-pages.test.ts, which recomputes each
 * yield independently and fails loudly if the catalogue moves.
 *
 * Flight honesty: the site's flight feed provides live aircraft
 * positions, not per-airport arrival/departure boards. These pages
 * therefore link the live flight tracker over the airport (globeUrl)
 * instead of inventing boards.
 */

export interface AirportSample {
  id: string;
  name: string;
  city?: string;
  /** Distance from the airport's coordinates, km (1 decimal). */
  km: number;
}

export interface AirportPageDef {
  iata: string;
  icao: string;
  /** Route slug: /airport-webcams/<slug>. */
  slug: string;
  /** EXPLORE_SCOPES registry key serving this page's wall. */
  scopeKey: string;
  /** Full display name, e.g. "Denver International Airport". */
  name: string;
  city: string;
  country: string;
  /** ISO 3166 alpha-2, for the Airport JSON-LD address. */
  countryCode: string;
  /** Catalogue chunk slug (lib/explore-data COUNTRY_INDEX). */
  countrySlug: string;
  lat: number;
  lng: number;
  radiusKm: number;
  /** Verified catalogue yield within radiusKm (test-pinned). */
  count: number;
  topSource: {
    /** Human label for copy, e.g. "Georgia DOT (GDOT)". */
    label: string;
    /** Raw catalogue source string (test-pinned). */
    raw: string;
    count: number;
  };
  /** FAA WeatherCams feeds within the radius (0 when none). */
  faaCount: number;
  /** Distance to the nearest FAA WeatherCam, km; null when none. */
  faaNearestKm: number | null;
  /** Distance to the nearest catalogue camera of any kind, km. */
  nearestKm: number;
  /** The six nearest cameras — real records, test-pinned by id. */
  samples: AirportSample[];
  /** Existing /city-webcams/<slug> page for the airport's city, if any. */
  cityPageSlug?: string;
  /** Airport-specific honest framing, rendered in the intro. */
  note?: string;
  /** Verified plane-spotting note — only where a spot is documented
   *  (LAX, LHR, SYD). Everywhere else the section is omitted. */
  spotting?: string;
}

export const AIRPORT_PAGES: AirportPageDef[] = [
  {
    iata: "ATL", icao: "KATL", slug: "atl-hartsfield-jackson", scopeKey: "airport-atl",
    name: "Hartsfield-Jackson Atlanta International Airport", city: "Atlanta", country: "United States", countryCode: "US", countrySlug: "united-states",
    lat: 33.6367, lng: -84.4281, radiusKm: 15, count: 534,
    topSource: { label: "Georgia DOT (GDOT)", raw: "GDOT", count: 534 },
    faaCount: 0, faaNearestKm: null, nearestKm: 1.3,
    samples: [{ id: "gdot-13534", name: "I-285 CW at SLoopRd MM 58.5 (Clayton)", city: "Georgia", km: 1.3 }, { id: "gdot-14255", name: "I-285 CW at SLoopRd MM 58.7 (Clayton)", city: "Georgia", km: 1.3 }, { id: "gdot-14254", name: "I-285 CW at AirportLoopRd MM 59.1 (Clayton)", city: "Georgia", km: 1.4 }, { id: "gdot-13112", name: "I-285 CCW at AirportloopRd MM 59.1 (Clayton)", city: "Georgia", km: 1.5 }, { id: "gdot-13111", name: "I-285 CW past I-75 MM 59.3 (Clayton)", city: "Georgia", km: 1.5 }, { id: "gdot-13535", name: "I-285 CW at SLoopRd MM 58.4 (Clayton)", city: "Georgia", km: 1.5 }],
  },
  {
    iata: "TPA", icao: "KTPA", slug: "tpa-tampa-international", scopeKey: "airport-tpa",
    name: "Tampa International Airport", city: "Tampa", country: "United States", countryCode: "US", countrySlug: "united-states",
    lat: 27.9755, lng: -82.5332, radiusKm: 15, count: 375,
    topSource: { label: "Florida DOT", raw: "FDOT", count: 374 },
    faaCount: 1, faaNearestKm: 10.4, nearestKm: 0.9,
    samples: [{ id: "fdot-2603", name: "Airport Service Rd at Bessie Coleman NB", city: "Hillsborough County", km: 0.9 }, { id: "fdot-5678", name: "Airport Service Rd at Economy Garage", city: "Hillsborough County", km: 1.0 }, { id: "fdot-3355", name: "SR-589 at MM 2.3 NB", city: "Hillsborough County", km: 1.3 }, { id: "fdot-2567", name: "Airport Service Rd at Conrac", city: "Hillsborough County", km: 1.3 }, { id: "fdot-2404", name: "SR-589 at Independence Pkwy", city: "Hillsborough County", km: 1.4 }, { id: "fdot-2390", name: "SR-589 at Exit to EB SR-60", city: "Hillsborough County", km: 1.5 }],
  },
  {
    iata: "YOW", icao: "CYOW", slug: "yow-ottawa", scopeKey: "airport-yow",
    name: "Ottawa Macdonald–Cartier International Airport", city: "Ottawa", country: "Canada", countryCode: "CA", countrySlug: "canada",
    lat: 45.3225, lng: -75.6692, radiusKm: 15, count: 374,
    topSource: { label: "the City of Ottawa", raw: "City of Ottawa", count: 357 },
    faaCount: 0, faaNearestKm: null, nearestKm: 1.3,
    samples: [{ id: "ottawa-muni-495", name: "Uplands & Research", city: "Ottawa", km: 1.3 }, { id: "ottawa-muni-229", name: "Airport & Lester / Uplands", city: "Ottawa", km: 1.4 }, { id: "ottawa-muni-129", name: "Limebank & River", city: "Ottawa", km: 1.5 }, { id: "ottawa-muni-80", name: "Hunt Club & Riverside", city: "Ottawa", km: 2.3 }, { id: "ottawa-muni-271", name: "Hunt Club & Uplands", city: "Ottawa", km: 2.5 }, { id: "ottawa-muni-81", name: "Hunt Club & Prince of Wales", city: "Ottawa", km: 2.8 }],
    cityPageSlug: "ottawa",
  },
  {
    iata: "DAL", icao: "KDAL", slug: "dal-dallas-love-field", scopeKey: "airport-dal",
    name: "Dallas Love Field", city: "Dallas", country: "United States", countryCode: "US", countrySlug: "united-states",
    lat: 32.8471, lng: -96.8518, radiusKm: 15, count: 318,
    topSource: { label: "Texas DOT (TxDOT)", raw: "TxDOT", count: 318 },
    faaCount: 0, faaNearestKm: null, nearestKm: 2.4,
    samples: [{ id: "txdot-DAL-IH35E @ Raceway", name: "IH35E @ Raceway", city: "Dallas", km: 2.4 }, { id: "txdot-DAL-IH35E @ Regal Row", name: "IH35E @ Regal Row", city: "Dallas", km: 2.5 }, { id: "txdot-DAL-IH35E @ Empire Central", name: "IH35E @ Empire Central", city: "Dallas", km: 3.0 }, { id: "txdot-DAL-IH35E @ Spur 482", name: "IH35E @ Spur 482", city: "Dallas", km: 3.2 }, { id: "txdot-DAL-Loop 12 @ Texas Plaza", name: "Loop 12 @ Texas Plaza", city: "Dallas", km: 3.4 }, { id: "txdot-DAL-IH635 @ IH35E South", name: "IH635 @ IH35E South", city: "Dallas", km: 3.5 }],
    cityPageSlug: "dallas",
  },
  {
    iata: "PDX", icao: "KPDX", slug: "pdx-portland-international", scopeKey: "airport-pdx",
    name: "Portland International Airport", city: "Portland", country: "United States", countryCode: "US", countrySlug: "united-states",
    lat: 45.5887, lng: -122.5975, radiusKm: 15, count: 307,
    topSource: { label: "Oregon DOT TripCheck", raw: "ODOT TripCheck", count: 228 },
    faaCount: 0, faaNearestKm: null, nearestKm: 2.1,
    samples: [{ id: "odot-1202", name: "Portland - NE Airport Way at 82nd", city: "CITY", km: 2.1 }, { id: "odot-1425", name: "Portland - NE Columbia at 60th", city: "City", km: 2.2 }, { id: "odot-1430", name: "Portland - NE Columbia at 42nd", city: "City", km: 2.6 }, { id: "occ-wsdot-9785", name: "SR 14 at MP 3.7: 73rd Ave", city: "Camas", km: 2.7 }, { id: "occ-wsdot-1354", name: "SR 14 at MP 4.3: Lieser Rd", city: "Vancouver", km: 2.7 }, { id: "occ-wsdot-9786", name: "SR 14 at MP 5: 97th Ave", city: "Camas", km: 2.9 }],
    note: "The wall spans both banks of the Columbia River: Oregon DOT TripCheck feeds on the Portland side, Washington State DOT cameras across the river in Vancouver, Washington.",
  },
  {
    iata: "MSP", icao: "KMSP", slug: "msp-minneapolis-saint-paul", scopeKey: "airport-msp",
    name: "Minneapolis–Saint Paul International Airport", city: "Minneapolis", country: "United States", countryCode: "US", countrySlug: "united-states",
    lat: 44.8848, lng: -93.2223, radiusKm: 15, count: 295,
    topSource: { label: "Minnesota's 511 traffic network", raw: "OpenCCTV / castlerock", count: 295 },
    faaCount: 0, faaNearestKm: null, nearestKm: 1.6,
    samples: [{ id: "occ-cr-eb2c39dfd2", name: "T.H.62 WB @ 28th Ave", city: "in Minneapolis", km: 1.6 }, { id: "occ-cr-d37833ad31", name: "T.H.62 WB @ 43rd Ave", city: "in Minneapolis", km: 1.7 }, { id: "occ-cr-f9c747aff5", name: "T.H.77 NB @ 66th St", city: "in Richfield", km: 1.9 }, { id: "occ-cr-19868c587b", name: "T.H.77 SB N of Diagonal Blvd", city: "near Richfield", km: 2.1 }, { id: "occ-cr-af1f6c9d79", name: "T.H.62 EB @ T.H.77", city: "in Minneapolis", km: 2.3 }, { id: "occ-cr-21b496c026", name: "T.H.62 WB @ T.H.55", city: "near Minneapolis", km: 2.4 }],
  },
  {
    iata: "FLL", icao: "KFLL", slug: "fll-fort-lauderdale", scopeKey: "airport-fll",
    name: "Fort Lauderdale–Hollywood International Airport", city: "Fort Lauderdale", country: "United States", countryCode: "US", countrySlug: "united-states",
    lat: 26.0726, lng: -80.1527, radiusKm: 15, count: 295,
    topSource: { label: "Florida DOT", raw: "FDOT", count: 293 },
    faaCount: 0, faaNearestKm: null, nearestKm: 1.1,
    samples: [{ id: "fdot-2026", name: "I-595 W of US-1", city: "Broward County", km: 1.1 }, { id: "fdot-2061", name: "I-95 NB By Dania Canal C-19", city: "Broward County", km: 1.3 }, { id: "fdot-2062", name: "I-95 NB By SW 42nd St South of I-595", city: "Broward County", km: 1.4 }, { id: "fdot-5867", name: "I-95 NB North of Griffin By Toll Plaza", city: "Broward County", km: 1.4 }, { id: "fdot-2063", name: "I-95 NB By SW 42nd St South of I-595", city: "Broward County", km: 1.4 }, { id: "fdot-2060", name: "I-95 SB North of Griffin", city: "Broward County", km: 1.5 }],
  },
  {
    iata: "SGN", icao: "VVTS", slug: "sgn-tan-son-nhat", scopeKey: "airport-sgn",
    name: "Tan Son Nhat International Airport", city: "Ho Chi Minh City", country: "Vietnam", countryCode: "VN", countrySlug: "vietnam",
    lat: 10.8188, lng: 106.652, radiusKm: 15, count: 286,
    topSource: { label: "Ho Chi Minh City traffic cameras", raw: "OpenCCTV / vietnam-traffic", count: 153 },
    faaCount: 0, faaNearestKm: null, nearestKm: 1.6,
    samples: [{ id: "occ-vietnam-hcmc-5b8b2323ca057700116405d0", name: "Trường Sơn - Ga Quốc Nội 2", city: "Ho Chi Minh City", km: 1.6 }, { id: "occ-windy-1670882682", name: "Ward 12", city: "Phường Bảy Hiền", km: 1.9 }, { id: "occ-vietnam-hcmc-58ad6214bd82540010390be2", name: "Cộng Hòa - Hoàng Hoa Thám", city: "Ho Chi Minh City", km: 2.0 }, { id: "occ-vietnam-hcmc-587476e3b807da0011e33cee", name: "Cộng Hòa - Út Tịch 1", city: "Ho Chi Minh City", km: 2.1 }, { id: "occ-windy-1670882404", name: "Ward 11", city: "Phường Thông Tây Hội", km: 2.1 }, { id: "occ-windy-1714684189", name: "Ward 13: Đường Cộng Hòa - Ấp Bắc", city: "Phường Tân Bình", km: 2.2 }],
    cityPageSlug: "ho-chi-minh-city",
    note: "Two networks make up this wall: 153 Ho Chi Minh City traffic cameras around the airport districts, and 132 public webcams carried in the catalogue — the densest airport coverage in Vietnam by a wide margin.",
  },
  {
    iata: "SLC", icao: "KSLC", slug: "slc-salt-lake-city", scopeKey: "airport-slc",
    name: "Salt Lake City International Airport", city: "Salt Lake City", country: "United States", countryCode: "US", countrySlug: "united-states",
    lat: 40.7884, lng: -111.9778, radiusKm: 15, count: 274,
    topSource: { label: "Utah DOT (UDOT)", raw: "UDOT", count: 270 },
    faaCount: 4, faaNearestKm: 1.1, nearestKm: 1.1,
    samples: [{ id: "faa-13677", name: "Salt Lake City ATCT — Camera 1 (North)", city: "Salt Lake City", km: 1.1 }, { id: "faa-13678", name: "Salt Lake City ATCT — Camera 2 (SouthEast)", city: "Salt Lake City", km: 1.1 }, { id: "faa-13679", name: "Salt Lake City ATCT — Camera 3 (South)", city: "Salt Lake City", km: 1.1 }, { id: "faa-13680", name: "Salt Lake City ATCT — Camera 4 (West)", city: "Salt Lake City", km: 1.1 }, { id: "udot-168178", name: "Bangerter Hwy / SR-154 @ SLC Airport / N of I-80 / MP 24.1, SLC", city: "Utah", km: 2.3 }, { id: "udot-168181", name: "I-215 W NB @ 700 N / MP 23.7, SLC", city: "Utah", km: 2.5 }],
    note: "Four of the nearest feeds are FAA WeatherCams tower cameras on the airfield itself, about 1.1 km from the airport centre — genuine on-field views alongside the UDOT freeway wall.",
  },
  {
    iata: "MIA", icao: "KMIA", slug: "mia-miami-international", scopeKey: "airport-mia",
    name: "Miami International Airport", city: "Miami", country: "United States", countryCode: "US", countrySlug: "united-states",
    lat: 25.7959, lng: -80.287, radiusKm: 15, count: 273,
    topSource: { label: "Florida DOT", raw: "FDOT", count: 273 },
    faaCount: 0, faaNearestKm: null, nearestKm: 1.4,
    samples: [{ id: "fdot-4184", name: "411A-836CE087 at NW 57Ave", city: "Miami-Dade County", km: 1.4 }, { id: "fdot-4204", name: "411-836CW083 at NW 57Ave", city: "Miami-Dade County", km: 1.4 }, { id: "fdot-4233", name: "VCAM836WB0800 After 57th Ave WB Ramp", city: "Miami-Dade County", km: 1.5 }, { id: "fdot-4185", name: "412-836CW094 at NW 55Ave", city: "Miami-Dade County", km: 1.5 }, { id: "fdot-4225", name: "VCAM836EB0800 at NW 60th Ave", city: "Miami-Dade County", km: 1.8 }, { id: "fdot-5911", name: "412A-SR836CW960 at NW45 AVE", city: "Miami-Dade County", km: 1.9 }],
  },
  {
    iata: "LAS", icao: "KLAS", slug: "las-harry-reid-las-vegas", scopeKey: "airport-las",
    name: "Harry Reid International Airport", city: "Las Vegas", country: "United States", countryCode: "US", countrySlug: "united-states",
    lat: 36.084, lng: -115.1537, radiusKm: 15, count: 259,
    topSource: { label: "Nevada DOT (NDOT)", raw: "NDOT", count: 259 },
    faaCount: 0, faaNearestKm: null, nearestKm: 0.9,
    samples: [{ id: "ndot-7501", name: "Russell Rd & Paradise Rd", city: "Nevada", km: 0.9 }, { id: "ndot-7571", name: "Airport Connector Grier (Tunnel)", city: "Nevada", km: 1.6 }, { id: "ndot-7570", name: "Airport Connector NB Grier", city: "Nevada", km: 1.7 }, { id: "ndot-7664", name: "Sunset Rd & Paradise Rd", city: "Nevada", km: 1.7 }, { id: "ndot-7514", name: "Las Vegas Blvd & Russell Rd Stadium", city: "Nevada", km: 1.8 }, { id: "ndot-7515", name: "Las Vegas Blvd & Welcome Sign", city: "Nevada", km: 1.8 }],
  },
  {
    iata: "MCO", icao: "KMCO", slug: "mco-orlando-international", scopeKey: "airport-mco",
    name: "Orlando International Airport", city: "Orlando", country: "United States", countryCode: "US", countrySlug: "united-states",
    lat: 28.4312, lng: -81.3081, radiusKm: 15, count: 242,
    topSource: { label: "Florida DOT", raw: "FDOT", count: 242 },
    faaCount: 0, faaNearestKm: null, nearestKm: 2.2,
    samples: [{ id: "fdot-5325", name: "SR-528 E of SR-436", city: "Orange County", km: 2.2 }, { id: "fdot-3967", name: "SR-528 at SR-436", city: "Orange County", km: 2.3 }, { id: "fdot-5321", name: "SR-528 W of SR-436", city: "Orange County", km: 2.3 }, { id: "fdot-4062", name: "SR-528 W of SR-436", city: "Orange County", km: 2.4 }, { id: "fdot-3889", name: "SR-528 W of Goldenrod Rd", city: "Orange County", km: 2.5 }, { id: "fdot-3980", name: "SR-528 E of Tradeport Dr", city: "Orange County", km: 2.7 }],
  },
  {
    iata: "PUS", icao: "RKPK", slug: "pus-busan-gimhae", scopeKey: "airport-pus",
    name: "Gimhae International Airport", city: "Busan", country: "South Korea", countryCode: "KR", countrySlug: "south-korea",
    lat: 35.1796, lng: 128.9382, radiusKm: 15, count: 219,
    topSource: { label: "Busan city traffic cameras", raw: "OpenCCTV / busan", count: 213 },
    faaCount: 0, faaNearestKm: null, nearestKm: 1.8,
    samples: [{ id: "occ-busan-CTV0000117", name: "Airport Entrance, Busan", city: "Busan", km: 1.8 }, { id: "occ-busan-CTV0000074", name: "Seobusan Interchange, Busan", city: "Busan", km: 3.0 }, { id: "occ-busan-CTV2026007", name: "Macdonald Village, Airport Road", city: "Busan", km: 3.4 }, { id: "occ-busan-CTV2026463", name: "Pyeonggang Bridge Area", city: "Busan", km: 4.0 }, { id: "occ-busan-CTV0000118", name: "Shindeok, Sports Park Road", city: "Busan", km: 4.2 }, { id: "occ-busan-CTV0000071", name: "Samnak Interchange, Busan", city: "Busan", km: 4.3 }],
    cityPageSlug: "busan",
  },
  {
    iata: "DFW", icao: "KDFW", slug: "dfw-dallas-fort-worth", scopeKey: "airport-dfw",
    name: "Dallas/Fort Worth International Airport", city: "Dallas", country: "United States", countryCode: "US", countrySlug: "united-states",
    lat: 32.8998, lng: -97.0403, radiusKm: 15, count: 216,
    topSource: { label: "Texas DOT (TxDOT)", raw: "TxDOT", count: 216 },
    faaCount: 0, faaNearestKm: null, nearestKm: 3.0,
    samples: [{ id: "txdot-DAL-SH114 @ Freeport Pkwy", name: "SH114 @ Freeport Pkwy", city: "Dallas", km: 3.0 }, { id: "txdot-DAL-SH114 @ Freeport West", name: "SH114 @ Freeport West", city: "Dallas", km: 3.0 }, { id: "txdot-DAL-SH114 @ Freeport East", name: "SH114 @ Freeport East", city: "Dallas", km: 3.1 }, { id: "txdot-FTW-SH114 @ Texan Trail", name: "SH114 @ Texan Trail", city: "Fort Worth", km: 3.2 }, { id: "txdot-DAL-SH114 @ Dallas-Tarrant CL", name: "SH114 @ Dallas-Tarrant CL", city: "Dallas", km: 3.2 }, { id: "txdot-FTW-SH114 @ North International", name: "SH114 @ North International", city: "Fort Worth", km: 3.3 }],
    cityPageSlug: "dallas",
    note: "DFW sits between its two namesake cities, and the wall reflects that: TxDOT freeway cameras from both the Dallas and Fort Worth sides of the metroplex, with the airport freeway ring in the middle.",
  },
  {
    iata: "LGA", icao: "KLGA", slug: "lga-laguardia-new-york", scopeKey: "airport-lga",
    name: "LaGuardia Airport", city: "New York", country: "United States", countryCode: "US", countrySlug: "united-states",
    lat: 40.7769, lng: -73.874, radiusKm: 15, count: 216,
    topSource: { label: "New York's 511NY network", raw: "OpenCCTV / ny511", count: 215 },
    faaCount: 0, faaNearestKm: null, nearestKm: 0.5,
    samples: [{ id: "occ-ny511-7ec91a8fe0", name: "907M at 94 Street", city: "Queens", km: 0.5 }, { id: "occ-ny511-9cec60010a", name: "907M at 102 Street", city: "Queens", km: 0.9 }, { id: "occ-ny511-8ba0baf11a", name: "907M at 86 St", city: "Queens", km: 1.3 }, { id: "occ-ny511-9bc8117e1f", name: "907M at 27th Avenue", city: "Queens", km: 1.5 }, { id: "occ-ny511-411eb512fb", name: "907M at W/B I-278/BQE Ramp", city: "Queens", km: 1.9 }, { id: "occ-ny511-a6b08a3ef1", name: "907M at 75th Street", city: "Queens", km: 2.1 }],
    cityPageSlug: "new-york-city",
    note: "The nearest camera is half a kilometre from the airport centre — LaGuardia is woven into the Queens street grid, and the 511NY wall shows the Grand Central Parkway approaches the airport lives on.",
  },
  {
    iata: "HKG", icao: "VHHH", slug: "hkg-hong-kong-international", scopeKey: "airport-hkg",
    name: "Hong Kong International Airport", city: "Hong Kong", country: "Hong Kong", countryCode: "HK", countrySlug: "hong-kong",
    lat: 22.3089, lng: 113.9144, radiusKm: 15, count: 195,
    topSource: { label: "the Hong Kong Transport Department", raw: "HK Transport Dept", count: 146 },
    faaCount: 0, faaNearestKm: null, nearestKm: 2.5,
    samples: [{ id: "hk-NL022F", name: "Tung Wing Road", city: "Islands", km: 2.5 }, { id: "occ-hongkong-NL022F", name: "Tung Wing Road [NL022F]", city: "Islands", km: 2.5 }, { id: "hk-AID08201", name: "North Lantau Highway near Tung Chung (N) - Eastbound (1)", city: "Islands", km: 2.9 }, { id: "hk-AID08202", name: "North Lantau Highway near Tung Chung (N) - Eastbound (2)", city: "Islands", km: 3.2 }, { id: "hk-AID08122", name: "North Lantau Highway near Tung Chung (N) - Westbound (2)", city: "Islands", km: 3.4 }, { id: "occ-hongkong-AID08122", name: "North Lantau Highway near Tung Chung (N) - Westbound (2) [AID08122]", city: "Islands", km: 3.4 }],
    note: "The airport sits on Lantau Island, so this wall is really the airport journey: Transport Department cameras along the Lantau Link, the Tsing Ma Bridge corridor and the Tuen Mun side — the roads every trip to the airport takes.",
  },
  {
    iata: "TSA", icao: "RCSS", slug: "tsa-taipei-songshan", scopeKey: "airport-tsa",
    name: "Taipei Songshan Airport", city: "Taipei", country: "Taiwan", countryCode: "TW", countrySlug: "taiwan",
    lat: 25.0694, lng: 121.5517, radiusKm: 15, count: 191,
    topSource: { label: "Taipei city traffic cameras", raw: "OpenCCTV / twipcam", count: 101 },
    faaCount: 0, faaNearestKm: null, nearestKm: 1.0,
    samples: [{ id: "occ-twipcam-tpe-000245", name: "Fuxing North Road Taipei Southbound", city: "Taipei", km: 1.0 }, { id: "occ-twipcam-tpe-000045", name: "Dazhi Bridge, Taipei", city: "Taipei", km: 1.1 }, { id: "occ-twipcam-tpe-000240", name: "Binjiang Street at Dajia Elementary School", city: "Taipei", km: 1.7 }, { id: "occ-twipcam-tpe-000020", name: "Jianguo Expressway at Minquan Road", city: "Taipei", km: 1.7 }, { id: "occ-twipcam-tpe-000202", name: "Ziqiang Tunnel towards Palace Museum", city: "Taipei", km: 2.4 }, { id: "occ-twipcam-tpe-000223", name: "Xinsheng Elevated Yuanshan Bridge, Taipei", city: "Taipei", km: 2.7 }],
    cityPageSlug: "taipei",
    note: "Songshan is a downtown airport, and the wall matches: dense Taipei city traffic cameras around the field, plus Taiwan highway cameras on the corridors out of the city.",
  },
  {
    iata: "SEA", icao: "KSEA", slug: "sea-seattle-tacoma", scopeKey: "airport-sea",
    name: "Seattle–Tacoma International Airport", city: "Seattle", country: "United States", countryCode: "US", countrySlug: "united-states",
    lat: 47.4502, lng: -122.3088, radiusKm: 15, count: 190,
    topSource: { label: "Washington State DOT", raw: "OpenCCTV / wsdot", count: 114 },
    faaCount: 0, faaNearestKm: null, nearestKm: 0.3,
    samples: [{ id: "pubcam-united-states-seattle-tacoma-international-airport-seatac-airport-mount-rainier", name: "SeaTac Airport (Mount Rainier)", city: "Seattle-Tacoma International Airport", km: 0.3 }, { id: "occ-wsdot-9086", name: "SR 518 at MP 1.6: S 154th St", city: "Seattle", km: 1.8 }, { id: "occ-wsdot-9087", name: "SR 518 at MP 2.2: Airport Dr", city: "Seattle", km: 1.8 }, { id: "occ-wsdot-1303", name: "SR 518 at MP 2.5: SR 99 Interchange", city: "Seattle", km: 2.1 }, { id: "occ-wsdot-9599", name: "SR 99 at MP 20.5: S 154th St", city: "Seattle", km: 2.2 }, { id: "occ-wsdot-9647", name: "SR 518 at MP 2.9: 42nd Ave S", city: "Seattle", km: 2.7 }],
    cityPageSlug: "seattle",
    note: "The single nearest camera, 0.3 km from the airport centre, is the airport's own Mount Rainier view; around it sit Washington State DOT, Seattle DOT and King County feeds on the I-5 and SR-518 corridors.",
  },
  {
    iata: "YQB", icao: "CYQB", slug: "yqb-quebec-city", scopeKey: "airport-yqb",
    name: "Québec City Jean Lesage International Airport", city: "Québec City", country: "Canada", countryCode: "CA", countrySlug: "canada",
    lat: 46.7911, lng: -71.3933, radiusKm: 15, count: 174,
    topSource: { label: "Québec 511", raw: "Quebec 511", count: 170 },
    faaCount: 4, faaNearestKm: 0.0, nearestKm: 0.0,
    samples: [{ id: "faa-11834", name: "Quebec / Jean Lesage Intl — Camera 1 (NorthEast)", city: "Quebec / Jean Lesage Intl", km: 0.0 }, { id: "faa-11835", name: "Quebec / Jean Lesage Intl — Camera 2 (SouthEast)", city: "Quebec / Jean Lesage Intl", km: 0.0 }, { id: "faa-11836", name: "Quebec / Jean Lesage Intl — Camera 3 (SouthWest)", city: "Quebec / Jean Lesage Intl", km: 0.0 }, { id: "faa-11837", name: "Quebec / Jean Lesage Intl — Camera 4 (NorthWest)", city: "Quebec / Jean Lesage Intl", km: 0.0 }, { id: "quebec511-3998", name: "Aut. 540 (westward) at boul. Wilfrid-Hamel", city: "Québec (Capitale-Nationale)", km: 2.9 }, { id: "quebec511-3480", name: "Aut. 40 (eastward) at ch. Jean-Gauvin in Québec City", city: "Québec (Capitale-Nationale)", km: 3.2 }],
    note: "Four FAA WeatherCams sit on the airfield itself — the nearest feeds in this wall are 0.0 km from the airport centre — with the Québec 511 highway network around them.",
  },
  {
    iata: "YYC", icao: "CYYC", slug: "yyc-calgary", scopeKey: "airport-yyc",
    name: "Calgary International Airport", city: "Calgary", country: "Canada", countryCode: "CA", countrySlug: "canada",
    lat: 51.1215, lng: -114.0076, radiusKm: 15, count: 166,
    topSource: { label: "Alberta 511", raw: "OpenCCTV / alberta", count: 137 },
    faaCount: 0, faaNearestKm: null, nearestKm: 2.0,
    samples: [{ id: "occ-alberta-349764713a", name: "Airport Trail / Barlow Trail NE", city: "Calgary", km: 2.0 }, { id: "occ-calgary-loc197", name: "80 Ave / Metis Tr NE (NE)", city: "Calgary", km: 2.6 }, { id: "occ-alberta-5a1f53af37", name: "Airport Trail / 36 St NE", city: "Calgary", km: 2.7 }, { id: "occ-alberta-062d43b3b3", name: "Airport Tr / Deerfoot Tr NE", city: "Calgary", km: 3.0 }, { id: "occ-alberta-961b4ebd8d", name: "64 Avenue / Deerfoot Trail NE", city: "Calgary", km: 3.1 }, { id: "occ-alberta-79c5126d42", name: "Beddington Tr and Beddington Blvd NE", city: "Calgary", km: 3.2 }],
    cityPageSlug: "calgary",
  },
  {
    iata: "YYZ", icao: "CYYZ", slug: "yyz-toronto-pearson", scopeKey: "airport-yyz",
    name: "Toronto Pearson International Airport", city: "Toronto", country: "Canada", countryCode: "CA", countrySlug: "canada",
    lat: 43.6777, lng: -79.6248, radiusKm: 15, count: 165,
    topSource: { label: "Ontario 511", raw: "OpenCCTV / ontario", count: 99 },
    faaCount: 0, faaNearestKm: null, nearestKm: 2.2,
    samples: [{ id: "occ-ontario-494", name: "Highway 427 North of Airport Road", city: "Toronto", km: 2.2 }, { id: "occ-ontario-319", name: "Highway 401 near Transfer (East of Dixie)", city: "Toronto", km: 2.3 }, { id: "occ-ontario-493", name: "Highway 427 near Airport Road", city: "Toronto", km: 2.3 }, { id: "occ-ontario-320", name: "Highway 401 West of Renforth Drive", city: "Toronto", km: 2.4 }, { id: "occ-ontario-495", name: "Highway 427 North of Highway 409", city: "Toronto", km: 2.7 }, { id: "occ-ontario-492", name: "Highway 427 North of Highway 401", city: "Toronto", km: 2.9 }],
    cityPageSlug: "toronto",
    note: "Two networks share this wall: Ontario 511 cameras on the 401/427 freeway ring, and City of Toronto cameras on the arterial roads below them.",
  },
  {
    iata: "SAT", icao: "KSAT", slug: "sat-san-antonio", scopeKey: "airport-sat",
    name: "San Antonio International Airport", city: "San Antonio", country: "United States", countryCode: "US", countrySlug: "united-states",
    lat: 29.5337, lng: -98.4698, radiusKm: 15, count: 158,
    topSource: { label: "Texas DOT (TxDOT)", raw: "TxDOT", count: 158 },
    faaCount: 0, faaNearestKm: null, nearestKm: 1.6,
    samples: [{ id: "txdot-SAT-Wurzbach Pkwy at Jones Maltsberger Rd", name: "Wurzbach Pkwy at Jones Maltsberger Rd", city: "San Antonio", km: 1.6 }, { id: "txdot-SAT-US 281 at Isom", name: "US 281 at Isom", city: "San Antonio", km: 1.6 }, { id: "txdot-SAT-US 281 at LP 410", name: "US 281 at LP 410", city: "San Antonio", km: 1.8 }, { id: "txdot-SAT-Wurzbach Pkwy at Starcrest Dr", name: "Wurzbach Pkwy at Starcrest Dr", city: "San Antonio", km: 1.8 }, { id: "txdot-SAT-LP 410 at Broadway", name: "LP 410 at Broadway", city: "San Antonio", km: 1.9 }, { id: "txdot-SAT-US 281 at San Pedro", name: "US 281 at San Pedro", city: "San Antonio", km: 2.1 }],
    cityPageSlug: "san-antonio",
  },
  {
    iata: "DCA", icao: "KDCA", slug: "dca-reagan-national-washington", scopeKey: "airport-dca",
    name: "Ronald Reagan Washington National Airport", city: "Washington", country: "United States", countryCode: "US", countrySlug: "united-states",
    lat: 38.8521, lng: -77.0377, radiusKm: 15, count: 157,
    topSource: { label: "Virginia DOT", raw: "OpenCCTV / virginia", count: 136 },
    faaCount: 0, faaNearestKm: null, nearestKm: 1.3,
    samples: [{ id: "occ-va511-3380", name: "Richmond Hwy at 23rd St", city: "Arlington County", km: 1.3 }, { id: "occ-va511-3492", name: "Richmond Hwy at Potomac Ave", city: "Arlington County", km: 1.4 }, { id: "occ-va511-3491", name: "S Glebe Rd at Potomac Rd", city: "Arlington County", km: 1.5 }, { id: "occ-va511-3389", name: "RT 1 AT 33RD ST.", city: "Arlington County", km: 1.5 }, { id: "occ-va511-3432", name: "12th St S at South Clark St", city: "Arlington County", km: 1.7 }, { id: "occ-va511-3443", name: "S. GLEBE RD. AT EADS ST.", city: "Arlington County", km: 1.8 }],
    note: "Reagan National sits on the Virginia bank of the Potomac, and its wall is the Virginia side: VDOT cameras on the George Washington Parkway and I-395 corridors, with the river crossings toward DC at the edge of the radius.",
  },
  {
    iata: "YVR", icao: "CYVR", slug: "yvr-vancouver", scopeKey: "airport-yvr",
    name: "Vancouver International Airport", city: "Vancouver", country: "Canada", countryCode: "CA", countrySlug: "canada",
    lat: 49.1947, lng: -123.179, radiusKm: 15, count: 154,
    topSource: { label: "the City of Vancouver", raw: "OpenCCTV / vancouver", count: 107 },
    faaCount: 6, faaNearestKm: 0.1, nearestKm: 0.1,
    samples: [{ id: "faa-11347", name: "Vancouver Intl — Camera 1 (NorthEast)", city: "Vancouver International Airport", km: 0.1 }, { id: "faa-11348", name: "Vancouver Intl — Camera 2 (SouthEast)", city: "Vancouver International Airport", km: 0.1 }, { id: "faa-11349", name: "Vancouver Intl — Camera 3 (SouthWest)", city: "Vancouver International Airport", km: 0.1 }, { id: "faa-11350", name: "Vancouver Intl — Camera 4 (NorthWest)", city: "Vancouver International Airport", km: 0.1 }, { id: "occ-vancouver-TCM141", name: "Angus Drive and SW Marine Drive", city: "Vancouver", km: 2.8 }, { id: "occ-vancouver-TCM092", name: "Cornish St and SW Marine drive", city: "Vancouver", km: 3.1 }],
    cityPageSlug: "vancouver",
    note: "Six FAA WeatherCams are in range, the nearest 0.1 km away on Sea Island, where the airport sits; the rest of the wall is City of Vancouver and DriveBC cameras on the Arthur Laing Bridge and Oak Street corridors.",
  },
  {
    iata: "HOU", icao: "KHOU", slug: "hou-houston-hobby", scopeKey: "airport-hou",
    name: "William P. Hobby Airport", city: "Houston", country: "United States", countryCode: "US", countrySlug: "united-states",
    lat: 29.6454, lng: -95.2789, radiusKm: 15, count: 153,
    topSource: { label: "Texas DOT (TxDOT)", raw: "TxDOT", count: 153 },
    faaCount: 0, faaNearestKm: null, nearestKm: 2.8,
    samples: [{ id: "txdot-HOU-IH-45 Gulf @ College-Airport", name: "IH-45 Gulf @ College-Airport", city: "Houston", km: 2.8 }, { id: "txdot-HOU-IH-45 Gulf @ Monroe P&R", name: "IH-45 Gulf @ Monroe P&R", city: "Houston", km: 2.8 }, { id: "txdot-HOU-IH-45 Gulf @ Monroe ", name: "IH-45 Gulf @ Monroe", city: "Houston", km: 3.0 }, { id: "txdot-HOU-IH-45 Gulf @ Howard", name: "IH-45 Gulf @ Howard", city: "Houston", km: 3.5 }, { id: "txdot-HOU-IH-45 Gulf @ Edgebrook", name: "IH-45 Gulf @ Edgebrook", city: "Houston", km: 3.5 }, { id: "txdot-HOU-IH-45 Gulf @ Broadway", name: "IH-45 Gulf @ Broadway", city: "Houston", km: 4.6 }],
    cityPageSlug: "houston",
  },
  {
    iata: "NCL", icao: "EGNT", slug: "ncl-newcastle", scopeKey: "airport-ncl",
    name: "Newcastle International Airport", city: "Newcastle", country: "United Kingdom", countryCode: "GB", countrySlug: "united-kingdom",
    lat: 55.0375, lng: -1.6917, radiusKm: 15, count: 153,
    topSource: { label: "the North East's NETravel network", raw: "OpenCCTV / netravel", count: 152 },
    faaCount: 0, faaNearestKm: null, nearestKm: 1.1,
    samples: [{ id: "occ-netravel-NC_B6918A1", name: "Newcastle - B6918 Ponteland Road / Callerton Lane / International Drive", city: "Newcastle", km: 1.1 }, { id: "occ-netravel-METCCTV00002", name: "Newcastle - B6918 Ponteland Road / Newcastle Airport Maintenance Access", city: "Newcastle", km: 1.3 }, { id: "occ-netravel-NC_KPRA1", name: "Newcastle - Kingston Park Road / Shoreswood Way", city: "Newcastle", km: 2.7 }, { id: "occ-netravel-NC_A167A1", name: "Newcastle - A167 Ponteland Road / A191 Kenton Lane / Etal Lane", city: "Newcastle", km: 4.3 }, { id: "occ-netravel-NC_A1056B1", name: "Newcastle - A1056 & B1318 Great North Road / A1056 Rotary Way", city: "Newcastle", km: 4.3 }, { id: "occ-netravel-NC_B6324A1", name: "Newcastle - B6324 Stamfordham Road / Queens Road", city: "Newcastle", km: 4.4 }],
    cityPageSlug: "newcastle",
  },
  {
    iata: "GMP", icao: "RKSS", slug: "gmp-seoul-gimpo", scopeKey: "airport-gmp",
    name: "Gimpo International Airport", city: "Seoul", country: "South Korea", countryCode: "KR", countrySlug: "south-korea",
    lat: 37.5586, lng: 126.7906, radiusKm: 15, count: 153,
    topSource: { label: "Seoul-area city traffic networks", raw: "OpenCCTV / incheon", count: 95 },
    faaCount: 0, faaNearestKm: null, nearestKm: 3.6,
    samples: [{ id: "occ-incheon-93", name: "Noooji Junction", city: "Incheon", km: 3.6 }, { id: "occ-topis-seoul-1027", name: "Seonam Water Treatment Center", city: "Seoul", km: 3.7 }, { id: "occ-incheon-89", name: "Gyeyang Interchange", city: "Incheon", km: 4.2 }, { id: "occ-topis-seoul-60", name: "Banghwa Bridge South, Olympic Boulevard", city: "Seoul", km: 4.2 }, { id: "occ-incheon-90", name: "Gyeyang Bridge", city: "Incheon", km: 4.9 }, { id: "occ-gimpo-51", name: "Dongil High-vill Bridge, Gochon, Gimpo", city: "Gimpo", km: 5.0 }],
    note: "Gimpo sits in western Seoul, and its wall spans three city networks — Gimpo's own cameras, Incheon's to the west and Goyang's to the north — the western Seoul corridor the airport serves.",
  },
  {
    iata: "ORF", icao: "KORF", slug: "orf-norfolk", scopeKey: "airport-orf",
    name: "Norfolk International Airport", city: "Norfolk", country: "United States", countryCode: "US", countrySlug: "united-states",
    lat: 36.8946, lng: -76.2012, radiusKm: 15, count: 150,
    topSource: { label: "Virginia DOT", raw: "OpenCCTV / virginia", count: 150 },
    faaCount: 0, faaNearestKm: null, nearestKm: 1.6,
    samples: [{ id: "occ-va511-1826", name: "I-64 / MM 282 / WB", city: "Norfolk", km: 1.6 }, { id: "occ-va511-2253", name: "I-64 / MM 282.5 / WB", city: "Norfolk", km: 2.3 }, { id: "occ-va511-832", name: "I-64 / MM 280.5 / EB", city: "Norfolk", km: 2.4 }, { id: "occ-va511-1116", name: "I-64 / MM 280.5 / EB", city: "Norfolk", km: 2.7 }, { id: "occ-va511-689", name: "I-64 / MM 283 / WB", city: "Norfolk", km: 3.3 }, { id: "occ-va511-974", name: "I-64 / MM 279.5 / WB", city: "Norfolk", km: 3.4 }],
    cityPageSlug: "norfolk",
  },
  {
    iata: "IAH", icao: "KIAH", slug: "iah-houston-intercontinental", scopeKey: "airport-iah",
    name: "George Bush Intercontinental Airport", city: "Houston", country: "United States", countryCode: "US", countrySlug: "united-states",
    lat: 29.9902, lng: -95.3368, radiusKm: 15, count: 142,
    topSource: { label: "Texas DOT (TxDOT)", raw: "TxDOT", count: 142 },
    faaCount: 0, faaNearestKm: null, nearestKm: 3.4,
    samples: [{ id: "txdot-HOU-Aldine Westfield @ Farrell Rd", name: "Aldine Westfield @ Farrell Rd", city: "Houston", km: 3.4 }, { id: "txdot-HOU-Aldine Westfield @ Rankin Rd", name: "Aldine Westfield @ Rankin Rd", city: "Houston", km: 3.8 }, { id: "txdot-HOU-Aldine Westfield @ W. W. Thorne Dr", name: "Aldine Westfield @ W. W. Thorne Dr", city: "Houston", km: 4.4 }, { id: "txdot-HOU-Aldine Westfield @ Greens Rd", name: "Aldine Westfield @ Greens Rd", city: "Houston", km: 4.8 }, { id: "txdot-HOU-HTR @ Rankin Rd (North)", name: "HTR @ Rankin Rd (North)", city: "Houston", km: 4.9 }, { id: "txdot-HOU-HTR @ Rankin Ramp Plaza (South)", name: "HTR @ Rankin Ramp Plaza (South)", city: "Houston", km: 5.1 }],
    cityPageSlug: "houston",
  },
  {
    iata: "SNA", icao: "KSNA", slug: "sna-john-wayne-orange-county", scopeKey: "airport-sna",
    name: "John Wayne Airport", city: "Orange County", country: "United States", countryCode: "US", countrySlug: "united-states",
    lat: 33.6757, lng: -117.8682, radiusKm: 15, count: 142,
    topSource: { label: "Caltrans", raw: "Caltrans", count: 119 },
    faaCount: 4, faaNearestKm: 9.5, nearestKm: 1.1,
    samples: [{ id: "cal-2821", name: "SR-55 : (241) North of Baker Street", city: "Costa Mesa", km: 1.1 }, { id: "cal-2671", name: "I-405 : North of MacArthur", city: "Santa Ana", km: 1.2 }, { id: "cal-2670", name: "SR-55 : (24) I-405 A", city: "Costa Mesa", km: 1.3 }, { id: "cal-2822", name: "SR-55 : (242) I-405 B", city: "Costa Mesa", km: 1.3 }, { id: "cal-2684", name: "SR-73 : North of Redhill Avenue Overcross", city: "Costa Mesa", km: 1.5 }, { id: "cal-2683", name: "SR-73 : North of Campus Drive Overcross", city: "Santa Ana", km: 1.5 }],
    note: "Four FAA WeatherCams are in range alongside the Caltrans freeway wall on the SR-55 and I-405 corridors through Orange County.",
  },
  {
    iata: "ITM", icao: "RJOO", slug: "itm-osaka-itami", scopeKey: "airport-itm",
    name: "Osaka Itami Airport", city: "Osaka", country: "Japan", countryCode: "JP", countrySlug: "japan",
    lat: 34.7855, lng: 135.438, radiusKm: 15, count: 135,
    topSource: { label: "Inagawa River monitoring cameras", raw: "OpenCCTV / rivergojp", count: 117 },
    faaCount: 0, faaNearestKm: null, nearestKm: 1.1,
    samples: [{ id: "occ-rivergojp-222070004", name: "Inagawa River at Kōzu Bridge, Itami", city: "Osaka", km: 1.1 }, { id: "occ-rivergojp-222070005", name: "Kozu Bridge, Itami", city: "Osaka", km: 1.2 }, { id: "occ-rivergojp-222070020", name: "Kuwatsu Bridge Upstream, Itami", city: "Osaka", km: 1.4 }, { id: "occ-rivergojp-222070021", name: "Inagawa Division Point", city: "Osaka", km: 1.4 }, { id: "occ-rivergojp-222070018", name: "Inagawa Bridge, Amagasaki", city: "Osaka", km: 1.7 }, { id: "occ-rivergojp-222070019", name: "Gunko Bridge Water Quality Station", city: "Osaka", km: 1.8 }],
    cityPageSlug: "osaka",
    note: "Honest framing: this wall is not airfield views. It is dominated by river-monitoring cameras along the Inagawa River, which runs past Itami, plus Osaka-area cameras — a flood-and-weather view of the airport's surroundings, and the reason this page leads with the river network rather than pretending otherwise.",
  },
  {
    iata: "OAK", icao: "KOAK", slug: "oak-oakland", scopeKey: "airport-oak",
    name: "San Francisco Bay Oakland International Airport", city: "Oakland", country: "United States", countryCode: "US", countrySlug: "united-states",
    lat: 37.7213, lng: -122.2208, radiusKm: 15, count: 121,
    topSource: { label: "Caltrans", raw: "Caltrans", count: 117 },
    faaCount: 0, faaNearestKm: null, nearestKm: 2.9,
    samples: [{ id: "cal-1007", name: "T283W -- I-880 : AT 98TH AV WB OR", city: "Oakland", km: 2.9 }, { id: "cal-1005", name: "T283E -- I-880 : AT 98TH AV EB OR", city: "Oakland", km: 2.9 }, { id: "cal-1006", name: "T283R -- I-880 : AT 98TH AV OFR", city: "Oakland", km: 2.9 }, { id: "cal-1035", name: "TVB30 -- I-880 : AT 98TH AV", city: "Oakland", km: 3.0 }, { id: "cal-1034", name: "TVA80 -- I-880 : AT 98TH AV LOOP OR", city: "Oakland", km: 3.1 }, { id: "cal-964", name: "TVB19 -- I-880 : AT HEGENBERGER RD", city: "Oakland", km: 3.1 }],
    cityPageSlug: "oakland",
  },
  {
    iata: "PHX", icao: "KPHX", slug: "phx-phoenix-sky-harbor", scopeKey: "airport-phx",
    name: "Phoenix Sky Harbor International Airport", city: "Phoenix", country: "United States", countryCode: "US", countrySlug: "united-states",
    lat: 33.4373, lng: -112.0078, radiusKm: 15, count: 118,
    topSource: { label: "Arizona DOT (ADOT)", raw: "ADOT", count: 118 },
    faaCount: 0, faaNearestKm: null, nearestKm: 2.1,
    samples: [{ id: "adot-1254", name: "I-10 @E of 24th St", city: "Phoenix", km: 2.1 }, { id: "adot-791", name: "I-10 @Salt River Bridge", city: "Phoenix", km: 2.2 }, { id: "adot-1017", name: "SR-202 @E of 32nd St", city: "Phoenix", km: 2.5 }, { id: "adot-1015", name: "SR-143 @Washington St", city: "Phoenix", km: 2.6 }, { id: "adot-1255", name: "I-10 @W of University Dr", city: "Phoenix", km: 2.7 }, { id: "adot-1014", name: "SR-143 @Sky Harbor Blvd", city: "Phoenix", km: 2.7 }],
    cityPageSlug: "phoenix",
  },
  {
    iata: "YUL", icao: "CYUL", slug: "yul-montreal-trudeau", scopeKey: "airport-yul",
    name: "Montréal–Trudeau International Airport", city: "Montréal", country: "Canada", countryCode: "CA", countrySlug: "canada",
    lat: 45.4706, lng: -73.7408, radiusKm: 15, count: 116,
    topSource: { label: "Québec 511", raw: "Quebec 511", count: 116 },
    faaCount: 0, faaNearestKm: null, nearestKm: 1.8,
    samples: [{ id: "quebec511-3394", name: "Aut. 13, north of boul. de la Côte-Vertu", city: "Montréal", km: 1.8 }, { id: "quebec511-3901", name: "Aut. 520, east of av. Marshall", city: "Montréal", km: 1.9 }, { id: "quebec511-3900", name: "Aut. 520, west of av. Marshall", city: "Montréal", km: 2.1 }, { id: "quebec511-3894", name: "Aut. 520 at boul. McMillan", city: "Montréal", km: 2.1 }, { id: "quebec511-3393", name: "Aut. 13 at aut. 40", city: "Montréal", km: 2.2 }, { id: "quebec511-3437", name: "Aut. 40 at aut. 13", city: "Montréal", km: 2.2 }],
    cityPageSlug: "montreal",
  },
  {
    iata: "ONT", icao: "KONT", slug: "ont-ontario-california", scopeKey: "airport-ont",
    name: "Ontario International Airport", city: "Ontario", country: "United States", countryCode: "US", countrySlug: "united-states",
    lat: 34.056, lng: -117.6012, radiusKm: 15, count: 111,
    topSource: { label: "Caltrans", raw: "Caltrans", count: 109 },
    faaCount: 0, faaNearestKm: null, nearestKm: 1.3,
    samples: [{ id: "cal-1759", name: "I-10 : (11) Holt Undercross", city: "Ontario", km: 1.3 }, { id: "cal-1758", name: "I-10 : (10) East of Vineyard", city: "Ontario", km: 1.6 }, { id: "cal-1760", name: "I-10 : (12) West of Haven", city: "Ontario", km: 2.0 }, { id: "occ-caltrans-d8-I-10-1426", name: "I - 10 : (489) Haven Ave.", city: "Ontario", km: 2.7 }, { id: "cal-1899", name: "SR-60 : (156) West of Archibald Avenue (Cucamonga Creek)", city: "Ontario", km: 2.9 }, { id: "cal-1900", name: "SR-60 : (157) Archibald Avenue", city: "Ontario", km: 3.0 }],
    note: "This is Ontario, California — the Inland Empire cargo hub in San Bernardino County, not the Canadian province of the same name.",
  },
  {
    iata: "JFK", icao: "KJFK", slug: "jfk-new-york", scopeKey: "airport-jfk",
    name: "John F. Kennedy International Airport", city: "New York", country: "United States", countryCode: "US", countrySlug: "united-states",
    lat: 40.6399, lng: -73.7787, radiusKm: 15, count: 108,
    topSource: { label: "New York's 511NY network", raw: "OpenCCTV / ny511", count: 108 },
    faaCount: 0, faaNearestKm: null, nearestKm: 3.5,
    samples: [{ id: "occ-ny511-84ab9e1726", name: "NY878 at Peninsula/Bay Blvd", city: "Queens", km: 3.5 }, { id: "occ-ny511-6912ccb3ef", name: "NY878 at Rockaway Tpke", city: "Queens", km: 3.6 }, { id: "occ-ny511-b7e3e13f81", name: "I-678 at North Conduit Ave.", city: "Queens", km: 3.6 }, { id: "occ-ny511-753f2985e7", name: "I-678 at 133rd Avenue Southbound", city: "Queens", km: 3.8 }, { id: "occ-ny511-1cfecf2551", name: "NY878 at Burnside Avenue", city: "Queens", km: 4.1 }, { id: "occ-ny511-277127ad15", name: "NY878 at Bayview Avenue", city: "Queens", km: 4.1 }],
    cityPageSlug: "new-york-city",
  },
  {
    iata: "SJC", icao: "KSJC", slug: "sjc-san-jose", scopeKey: "airport-sjc",
    name: "San José Mineta International Airport", city: "San José", country: "United States", countryCode: "US", countrySlug: "united-states",
    lat: 37.3626, lng: -121.9291, radiusKm: 15, count: 108,
    topSource: { label: "Caltrans", raw: "Caltrans", count: 69 },
    faaCount: 3, faaNearestKm: 10.6, nearestKm: 0.9,
    samples: [{ id: "occ-caltrans-d4-SR-87-736", name: "TV926 -- SR-87 : AT SKYPORT DR", city: "San Jose", km: 0.9 }, { id: "cal-836", name: "TVC11 -- SR-87 : US-101", city: "San Jose", km: 1.2 }, { id: "cal-479", name: "TVC74 -- US-101 : North 1st Street Loop Onramp", city: "San Jose", km: 1.5 }, { id: "occ-caltrans-d4-I-880-719", name: "TVC54 -- I-880 : AT COLEMAN AV", city: "San Jose", km: 1.8 }, { id: "occ-caltrans-d4-US-101-758", name: "TVC49 -- US-101 : AT DE LA CRUZ BL", city: "San Jose", km: 1.9 }, { id: "occ-caltrans-d4-US-101-715", name: "TVC77 -- US-101 : AT DE LA CRUZ Offramp", city: "San Jose", km: 2.0 }],
    cityPageSlug: "san-jose",
    note: "Three FAA WeatherCams are in range alongside the Caltrans wall — downtown San José wraps around this airport, so the wall is as much city grid as freeway.",
  },
  {
    iata: "MAD", icao: "LEMD", slug: "mad-madrid-barajas", scopeKey: "airport-mad",
    name: "Adolfo Suárez Madrid–Barajas Airport", city: "Madrid", country: "Spain", countryCode: "ES", countrySlug: "spain",
    lat: 40.4936, lng: -3.5668, radiusKm: 15, count: 108,
    topSource: { label: "Spain's DGT", raw: "DGT", count: 102 },
    faaCount: 0, faaNearestKm: null, nearestKm: 1.8,
    samples: [{ id: "dgt-1092", name: "M-111 km 0.05", city: "Madrid", km: 1.8 }, { id: "dgt-1091", name: "M-111 km 3.7 (Ascending)", city: "Madrid", km: 1.8 }, { id: "dgt-650", name: "M-11 km 8.6", city: "Madrid", km: 3.1 }, { id: "dgt-1164", name: "M-11 km 7.05", city: "Madrid", km: 3.9 }, { id: "dgt-1094", name: "M-12 km 8.9 (Ascending)", city: "Madrid", km: 4.4 }, { id: "dgt-659", name: "M-11 km 6.2", city: "Madrid", km: 4.5 }],
    cityPageSlug: "madrid",
  },
  {
    iata: "STL", icao: "KSTL", slug: "stl-st-louis-lambert", scopeKey: "airport-stl",
    name: "St. Louis Lambert International Airport", city: "St Louis", country: "United States", countryCode: "US", countrySlug: "united-states",
    lat: 38.7487, lng: -90.37, radiusKm: 15, count: 101,
    topSource: { label: "state DOT cameras published via ArcGIS services", raw: "OpenCCTV / arcgis_cams", count: 101 },
    faaCount: 0, faaNearestKm: null, nearestKm: 1.1,
    samples: [{ id: "occ-arcgis-MO-0459ae991d", name: "70 E/O CYPRESS, MM 236.1", city: "St. Ann", km: 1.1 }, { id: "occ-arcgis-MO-747d33766f", name: "70 AT AIRFLIGHT, MM 236.7", city: "East St Louis", km: 1.1 }, { id: "occ-arcgis-MO-20002df7ff", name: "70 E/O AIRFLIGHT, MM 237.2", city: "Edmundson", km: 1.4 }, { id: "occ-arcgis-MO-f8529d94c9", name: "70 AT FEE FEE, MM 235", city: "East St Louis", km: 2.6 }, { id: "occ-arcgis-MO-19524e1fc1", name: "170 AT AIRPORT RD, MM 9.1", city: "East St Louis", km: 2.8 }, { id: "occ-arcgis-MO-a45eff254e", name: "170 AT SCUDDER, MM 8.7", city: "East St Louis", km: 3.0 }],
  },
  {
    iata: "BNA", icao: "KBNA", slug: "bna-nashville", scopeKey: "airport-bna",
    name: "Nashville International Airport", city: "Nashville", country: "United States", countryCode: "US", countrySlug: "united-states",
    lat: 36.1263, lng: -86.6774, radiusKm: 15, count: 101,
    topSource: { label: "state traffic cameras published via ArcGIS services", raw: "OpenCCTV / arcgis_cams", count: 100 },
    faaCount: 0, faaNearestKm: null, nearestKm: 1.8,
    samples: [{ id: "occ-arcgis-TN-0793d3403f", name: "I-40 WB w/o Donelson Pike (MM 216.36) (R3_107)", city: "Nashville", km: 1.8 }, { id: "occ-arcgis-TN-0f22f95afd", name: "I-40 WB @ Donelson Pike (MM 216.94) (R3_108)", city: "Nashville", km: 2.0 }, { id: "occ-arcgis-TN-4ff598cfdf", name: "I-40 EB w /o Briley Parkway (Hermitage) (MM 215.90) (R3_106)", city: "Nashville", km: 2.0 }, { id: "occ-arcgis-TN-c5a0ffd5b0", name: "I-40 EB e/o Donelson Pike (MM 217.72) (R3_109)", city: "Nashville", km: 2.8 }, { id: "occ-arcgis-TN-9291d61c3b", name: "I-40 WB @ Briley Parkway (MM 215.15) (R3_062)", city: "Nashville", km: 2.8 }, { id: "occ-arcgis-TN-7a33e3bf0c", name: "Briley Pkwy NB @ Elm Hill Pike (MM 7.04) (R3_134)", city: "Nashville", km: 2.9 }],
    cityPageSlug: "nashville",
  },
  {
    iata: "SYD", icao: "YSSY", slug: "syd-sydney", scopeKey: "airport-syd",
    name: "Sydney Kingsford Smith Airport", city: "Sydney", country: "Australia", countryCode: "AU", countrySlug: "australia",
    lat: -33.9399, lng: 151.1753, radiusKm: 15, count: 101,
    topSource: { label: "Live Traffic NSW", raw: "Live Traffic", count: 100 },
    faaCount: 0, faaNearestKm: null, nearestKm: 0.8,
    samples: [{ id: "airport-tunnel-east-portal-mascot", name: "Airport Tunnel East Portal (Mascot)", city: "SYD_MET", km: 0.8 }, { id: "general-holmes-drive-mascot", name: "General Holmes Drive (Mascot)", city: "SYD_MET", km: 0.9 }, { id: "general-holmes-drive-kyeemagh", name: "General Holmes Drive (Kyeemagh)", city: "SYD_MET", km: 1.3 }, { id: "marsh-st-mascot", name: "Marsh St (Mascot)", city: "SYD_MET", km: 1.4 }, { id: "airport-drive-mascot", name: "Airport Drive (Mascot)", city: "SYD_MET", km: 1.4 }, { id: "oriordan-street-mascot", name: "ORiordan Street (Mascot)", city: "SYD_MET", km: 1.5 }],
    cityPageSlug: "sydney",
    spotting: "Shep's Mound, on Ross Smith Avenue beside the control tower, is Sydney Airport's own official plane-spotter lookout — raised viewing platforms, parking and grass areas the airport maintains for enthusiasts. The airport's other listed vantage point is Lady Robinson's Beach, close to runway 16R/34L.",
  },
  {
    iata: "SAN", icao: "KSAN", slug: "san-san-diego", scopeKey: "airport-san",
    name: "San Diego International Airport", city: "San Diego", country: "United States", countryCode: "US", countrySlug: "united-states",
    lat: 32.7336, lng: -117.1897, radiusKm: 15, count: 93,
    topSource: { label: "Caltrans", raw: "Caltrans", count: 90 },
    faaCount: 0, faaNearestKm: null, nearestKm: 1.2,
    samples: [{ id: "cal-2392", name: "(C 011) I-5 : Just North Of Washington Street", city: "San Diego", km: 1.2 }, { id: "cal-2393", name: "(C 012) NB 5 : Just North Of Pacific Highway", city: "San Diego", km: 1.4 }, { id: "cal-2391", name: "(C 010) I-5 : Old Town Avenue", city: "San Diego", km: 1.5 }, { id: "cal-2394", name: "(C013) NB 5 at Sassafras St", city: "San Diego", km: 1.7 }, { id: "cal-2390", name: "(C 009) I-5 : Just North Of Old Town", city: "San Diego", km: 1.9 }, { id: "cal-2395", name: "(C014) I-5 : First Avenue", city: "San Diego", km: 2.7 }],
    cityPageSlug: "san-diego",
  },
  {
    iata: "MKE", icao: "KMKE", slug: "mke-milwaukee-mitchell", scopeKey: "airport-mke",
    name: "Milwaukee Mitchell International Airport", city: "Milwaukee", country: "United States", countryCode: "US", countrySlug: "united-states",
    lat: 42.9472, lng: -87.8966, radiusKm: 15, count: 92,
    topSource: { label: "Wisconsin 511", raw: "OpenCCTV / state511", count: 91 },
    faaCount: 0, faaNearestKm: null, nearestKm: 1.0,
    samples: [{ id: "occ-s511-WI-182", name: "WIS 119 at Howell Ave", city: "Milwaukee", km: 1.0 }, { id: "occ-s511-WI-257", name: "WIS 794 at Layton Ave", city: "Cudahy", km: 1.8 }, { id: "occ-s511-WI-77", name: "I-43/94 at Plainfield Curve", city: "Milwaukee", km: 2.8 }, { id: "occ-s511-WI-68", name: "I-41/94 at WIS 119", city: "Milwaukee", km: 3.2 }, { id: "occ-s511-WI-62", name: "I-41/94 at Grange Ave", city: "Milwaukee", km: 3.2 }, { id: "occ-s511-WI-246", name: "WIS 794 at Howard Ave", city: "St. Francis", km: 3.2 }],
    cityPageSlug: "milwaukee",
  },
  {
    iata: "HNL", icao: "PHNL", slug: "hnl-honolulu", scopeKey: "airport-hnl",
    name: "Daniel K. Inouye International Airport", city: "Honolulu", country: "United States", countryCode: "US", countrySlug: "united-states",
    lat: 21.3187, lng: -157.9225, radiusKm: 15, count: 91,
    topSource: { label: "Hawaii traffic cameras published via ArcGIS services", raw: "OpenCCTV / arcgis_cams", count: 90 },
    faaCount: 0, faaNearestKm: null, nearestKm: 2.2,
    samples: [{ id: "occ-arcgis-HI-52e51d5b73", name: "NIMITZ & AOLELE ST. (WEST BD)", city: "Honolulu County", km: 2.2 }, { id: "occ-arcgis-HI-6ac08b03d1", name: "NIMITZ & PAIEA (WEST BD)", city: "Honolulu County", km: 2.2 }, { id: "occ-arcgis-HI-63658f609b", name: "NIMITZ & OHOHIA ST. (WEST BD)", city: "Honolulu County", km: 2.5 }, { id: "occ-arcgis-HI-691294d884", name: "NIMITZ & VALKENBURG (WEST BD)", city: "Honolulu County", km: 2.6 }, { id: "occ-arcgis-HI-afdf64bc9c", name: "SALT LAKE & ALA LILIKOI", city: "Honolulu County", km: 2.9 }, { id: "occ-arcgis-HI-07e7244f15", name: "NIMITZ & AHUA ST. (EAST BD)", city: "Honolulu County", km: 3.0 }],
  },
  {
    iata: "IND", icao: "KIND", slug: "ind-indianapolis", scopeKey: "airport-ind",
    name: "Indianapolis International Airport", city: "Indianapolis", country: "United States", countryCode: "US", countrySlug: "united-states",
    lat: 39.7173, lng: -86.2944, radiusKm: 15, count: 84,
    topSource: { label: "Indiana DOT TrafficWise", raw: "INDOT TrafficWise", count: 84 },
    faaCount: 0, faaNearestKm: null, nearestKm: 1.7,
    samples: [{ id: "indot-24468", name: "I-70: I-70/72.3 HIGH SCHOOL RD", city: "Indiana", km: 1.7 }, { id: "indot-24046", name: "I-465: I-70 WEST", city: "Indiana", km: 2.6 }, { id: "indot-23846", name: "I-465: SAM JONES EXPWY", city: "Indiana", km: 3.0 }, { id: "indot-24475", name: "I-70: W OF LYNHURST DR", city: "Indiana", km: 3.5 }, { id: "indot-23974", name: "I-465: I-465/8.4 SR 67/KENTUCKY AVE", city: "Indiana", km: 3.6 }, { id: "indot-24532", name: "US 40: US40 @ Ronald Reagan", city: "Indiana", km: 3.8 }],
  },
  {
    iata: "AUS", icao: "KAUS", slug: "aus-austin-bergstrom", scopeKey: "airport-aus",
    name: "Austin-Bergstrom International Airport", city: "Austin", country: "United States", countryCode: "US", countrySlug: "united-states",
    lat: 30.1945, lng: -97.6699, radiusKm: 15, count: 83,
    topSource: { label: "Texas DOT (TxDOT)", raw: "TxDOT", count: 83 },
    faaCount: 0, faaNearestKm: null, nearestKm: 2.3,
    samples: [{ id: "txdot-AUS-SH-71 @ Presidential 11077", name: "SH-71 @ Presidential", city: "Austin", km: 2.3 }, { id: "txdot-AUS-SH-71 @ Brandt Dr 11025", name: "SH-71 @ Brandt Dr", city: "Austin", km: 2.7 }, { id: "txdot-AUS-SH-71 @ FM-973 11144", name: "SH-71 @ FM-973", city: "Austin", km: 3.1 }, { id: "txdot-AUS-SH-130 @ Pearce 601", name: "SH-130 @ Pearce 601", city: "Austin", km: 3.4 }, { id: "txdot-AUS-SH-71 WB @ E Riverside Dr 7700", name: "SH-71 WB @ E Riverside Dr", city: "Austin", km: 3.4 }, { id: "txdot-AUS-SH-71 EB @ E Riverside Dr 7400", name: "SH-71 EB @ E Riverside Dr", city: "Austin", km: 3.5 }],
    cityPageSlug: "austin",
  },
  {
    iata: "LAX", icao: "KLAX", slug: "lax-los-angeles", scopeKey: "airport-lax",
    name: "Los Angeles International Airport", city: "Los Angeles", country: "United States", countryCode: "US", countrySlug: "united-states",
    lat: 33.9425, lng: -118.4081, radiusKm: 15, count: 81,
    topSource: { label: "Caltrans", raw: "Caltrans", count: 59 },
    faaCount: 0, faaNearestKm: null, nearestKm: 1.2,
    samples: [{ id: "pubcam-united-states-los-angeles-international-airport-los-angeles-airportcam", name: "Los Angeles Airportcam", city: "Los Angeles International Airport", km: 1.2 }, { id: "occ-caltrans-d7-I-405-1190", name: "I-405 : (867) S/O CENTURY BLVD", city: "Inglewood", km: 3.6 }, { id: "occ-caltrans-d7-I-405-1193", name: "I-405 : (870) N/O CENTURY BLVD", city: "Inglewood", km: 3.6 }, { id: "occ-caltrans-d7-I-405-1189", name: "I-405 : (865) S/O CENTURY BLVD", city: "Los Angeles County", km: 3.7 }, { id: "occ-caltrans-d7-I-405-1188", name: "I-405 : (864) S/O IMPERIAL HWY", city: "Los Angeles County", km: 3.7 }, { id: "occ-caltrans-d7-I-405-1191", name: "I-405 : (868) CENTURY BLVD", city: "Inglewood", km: 3.8 }],
    cityPageSlug: "los-angeles",
    note: "One feed in this wall is an airport camera in the literal sense — named Los Angeles Airportcam, 1.2 km from the airport centre. The rest is the freeway ring (I-405, I-105, Century Boulevard) that decides every trip to LAX.",
    spotting: "The In-N-Out Burger on Sepulveda Boulevard sits under the final approach to the northern runways, and its parking lot is a famous, long-documented spotting perch; across the field, Imperial Hill in El Segundo (Clutter’s Park) overlooks the southern runways. Pair either with the live flight layer to identify what is passing overhead.",
  },
  {
    iata: "BUF", icao: "KBUF", slug: "buf-buffalo-niagara", scopeKey: "airport-buf",
    name: "Buffalo Niagara International Airport", city: "Buffalo", country: "United States", countryCode: "US", countrySlug: "united-states",
    lat: 42.9405, lng: -78.7322, radiusKm: 15, count: 80,
    topSource: { label: "New York's 511NY network", raw: "OpenCCTV / ny511", count: 79 },
    faaCount: 0, faaNearestKm: null, nearestKm: 2.0,
    samples: [{ id: "occ-ny511-635ab9bcfb", name: "I-90 MP 419.65 WB at Interchange 50 (Williamsville Toll Gantry)", city: "Williamsville", km: 2.0 }, { id: "occ-ny511-4fc26a43e8", name: "NY 33 at Union Rd (2)", city: "Cheektowaga", km: 2.1 }, { id: "occ-ny511-0eab2e4919", name: "NY 33 between I-90 and Union Rd (2)", city: "Cheektowaga", km: 2.7 }, { id: "occ-ny511-403a805402", name: "I-90 MP 420.50 WB East of Interchange 50A (Cleveland Drive)", city: "Buffalo", km: 2.8 }, { id: "occ-ny511-dd1ccf67c2", name: "I-90 MP 421.00 WB East of Interchange 51 (Buffalo/Airport)", city: "Buffalo", km: 2.8 }, { id: "occ-ny511-3efe771dab", name: "I-90 MP 421.30 WB East of Interchange 51 (Buffalo/Airport)", city: "Buffalo", km: 2.8 }],
    cityPageSlug: "buffalo",
  },
  {
    iata: "LHR", icao: "EGLL", slug: "lhr-london-heathrow", scopeKey: "airport-lhr",
    name: "London Heathrow Airport", city: "London", country: "United Kingdom", countryCode: "GB", countrySlug: "united-kingdom",
    lat: 51.47, lng: -0.4543, radiusKm: 15, count: 79,
    topSource: { label: "Transport for London (TfL)", raw: "TfL", count: 79 },
    faaCount: 0, faaNearestKm: null, nearestKm: 1.3,
    samples: [{ id: "tfl-JamCams_00001.06506", name: "A4 West of Sipson Road", city: "London", km: 1.3 }, { id: "tfl-JamCams_00001.06750", name: "A30 Hatton Cross", city: "London", km: 2.3 }, { id: "tfl-JamCams_00001.06923", name: "Bath Rd / Oxford Ave", city: "London", km: 2.4 }, { id: "tfl-JamCams_00001.06751", name: "Clockhouse Lane/Staines Rd", city: "London", km: 2.4 }, { id: "tfl-JamCams_00001.06737", name: "The Causeway / Faggs Rd", city: "London", km: 2.8 }, { id: "tfl-JamCams_00001.06850", name: "Airport Way/Stanwellmore Rd", city: "London", km: 2.8 }],
    cityPageSlug: "london",
    spotting: "Myrtle Avenue in Hatton, at the eastern end of the southern runway, is Heathrow’s classic spotting location: on westerly operations, arrivals for runway 27L pass low directly overhead, and it is a short walk from Hatton Cross station on the Piccadilly line. It is a residential street — park considerately and take litter home.",
  },
  {
    iata: "RNO", icao: "KRNO", slug: "rno-reno-tahoe", scopeKey: "airport-rno",
    name: "Reno–Tahoe International Airport", city: "Reno", country: "United States", countryCode: "US", countrySlug: "united-states",
    lat: 39.4991, lng: -119.7681, radiusKm: 15, count: 77,
    topSource: { label: "Nevada DOT (NDOT)", raw: "NDOT", count: 77 },
    faaCount: 0, faaNearestKm: null, nearestKm: 1.2,
    samples: [{ id: "ndot-7780", name: "I580 @ Plumb Airport", city: "Nevada", km: 1.2 }, { id: "ndot-7788", name: "I580 @ Moana", city: "Nevada", km: 1.5 }, { id: "ndot-7778", name: "I580 @ Villanova On Ramp", city: "Nevada", km: 1.6 }, { id: "ndot-7777", name: "I580 @ Mill St", city: "Nevada", km: 2.6 }, { id: "ndot-7900", name: "I580 @ S McCarran NE", city: "Nevada", km: 3.1 }, { id: "ndot-7901", name: "I580 @ S McCarran SW", city: "Nevada", km: 3.1 }],
  },
  {
    iata: "DEN", icao: "KDEN", slug: "den-denver-international", scopeKey: "airport-den",
    name: "Denver International Airport", city: "Denver", country: "United States", countryCode: "US", countrySlug: "united-states",
    lat: 39.8561, lng: -104.6737, radiusKm: 25, count: 57,
    topSource: { label: "Colorado DOT (COtrip)", raw: "OpenCCTV / cotrip", count: 53 },
    faaCount: 4, faaNearestKm: 12.9, nearestKm: 12.9,
    samples: [{ id: "faa-12071", name: "Colorado Air and Space Port — Camera 1 (North)", city: "Colorado Air and Space Port", km: 12.9 }, { id: "faa-12072", name: "Colorado Air and Space Port — Camera 2 (NorthEast)", city: "Colorado Air and Space Port", km: 12.9 }, { id: "faa-12073", name: "Colorado Air and Space Port — Camera 3 (South)", city: "Colorado Air and Space Port", km: 12.9 }, { id: "faa-12074", name: "Colorado Air and Space Port — Camera 4 (West)", city: "Colorado Air and Space Port", km: 12.9 }, { id: "occ-cr-6a92aff994", name: "I-70 MP 291.10 EB : 0.1 miles W of Powhaton Rd", city: "Bennett", km: 12.9 }, { id: "occ-cr-75a1e9f85a", name: "I-70 MP 289.15 EB at EB I-70 Ramp to E-470", city: "Denver", km: 13.5 }],
    cityPageSlug: "denver",
    note: "The honest exception in this set. DEN sits on the plains some 40 km from downtown, and the catalogue holds no cameras at the airport itself: the nearest feeds are about 13 km away on the I-70 corridor, and the four FAA WeatherCams in range belong to Colorado Air and Space Port, a different airfield near Watkins. This page therefore uses a wider 25 km radius than the rest of the set, and says so — what it shows is the airport’s highway lifeline (I-70, E-470, Peña Boulevard’s approaches), which is the view that decides a DEN trip in bad weather.",
  },
];

export const AIRPORT_PAGE_BY_SLUG: Record<string, AirportPageDef> = Object.fromEntries(
  AIRPORT_PAGES.map((a) => [a.slug, a]),
);

/** The globe centred on the airport with the flight layers lit —
 *  the honest substitute for an arrivals board this feed cannot
 *  provide: live aircraft over the field, not invented schedules. */
export function airportGlobeUrl(a: AirportPageDef): string {
  const radiusM = Math.min(100_000, a.radiusKm * 1000);
  return `/?geo=${a.lat.toFixed(5)},${a.lng.toFixed(5)},${radiusM}&layers=flights,private,jets,military`;
}
