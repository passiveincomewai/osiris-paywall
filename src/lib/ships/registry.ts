/**
 * Tracked cruise ships — the registry behind the /ships pages.
 *
 * Every entry carries a VERIFIED MMSI: the per-ship pages match the live
 * AIS feed (src/app/api/maritime/route.ts) by MMSI first and by AIS
 * broadcast name second, so a page exists only for a ship the feed can
 * actually identify. Facts (tonnage, dimensions, capacity, service
 * entry, homeports) come from the public sources cited per ship —
 * `sourceUrl`, plus `sourceNote` where sources disagree — verified
 * 2026-10-26. Never add a ship here without a verified MMSI and a
 * cited source; a wrong MMSI would pin a stranger's position to a
 * famous name.
 */

export interface ShipHomeport {
  name: string;
  /** Wall key on /port-webcams (anchor `#port-<wallKey>`), or null when
   *  the port hub carries no wall for this port — the page says so
   *  instead of dressing up another port's cameras. */
  wallKey: string | null;
  note?: string;
}

export interface TrackedShip {
  slug: string;
  name: string;
  line: string;
  shipClass: string;
  mmsi: number;
  imo: string;
  callSign: string;
  grossTonnage: number;
  lengthM: number;
  /** Passengers at double occupancy (or lower berths — see note). */
  passengersDouble: number;
  passengersMax: number | null;
  passengersNote?: string;
  /** Display string, e.g. "January 2024". */
  enteredService: string;
  homeports: ShipHomeport[];
  /** Where she sails — only what the cited source supports. */
  regions: string;
  blurb: string;
  /** Names the ship may broadcast on AIS (uppercase, as transmitted). */
  aisNames: string[];
  sourceUrl: string;
  sourceNote?: string;
}

/** Date the registry facts were verified against their sources. */
export const REGISTRY_VERIFIED_AT = "2026-10-26";

/** Wall keys that exist on /port-webcams (pinned by registry.test.ts so a
 *  homeport link can never point at a wall that was never built). */
export const PORT_WALL_KEYS = [
  "hong-kong",
  "tampa",
  "busan",
  "seattle",
  "vancouver",
  "fort-lauderdale",
  "norfolk",
  "miami",
  "honolulu",
  "sydney",
  "new-york",
  "long-beach",
  "rotterdam",
] as const;

const MIAMI: ShipHomeport = { name: "Miami (PortMiami), Florida", wallKey: "miami" };
const CANAVERAL: ShipHomeport = { name: "Port Canaveral, Florida", wallKey: null };

export const SHIPS: TrackedShip[] = [
  {
    slug: "icon-of-the-seas",
    name: "Icon of the Seas",
    line: "Royal Caribbean International",
    shipClass: "Icon class",
    mmsi: 311001178,
    imo: "9829930",
    callSign: "C6FU5",
    grossTonnage: 248663,
    lengthM: 364.75,
    passengersDouble: 5610,
    passengersMax: 7600,
    enteredService: "January 2024",
    homeports: [MIAMI],
    regions: "Western Caribbean cruises from Miami",
    blurb:
      "The lead ship of Royal Caribbean's Icon class. At 248,663 gross tons and 364.75 metres, she is among the largest cruise ships in the world, sailing week-long Western Caribbean cruises from PortMiami since January 2024.",
    aisNames: ["ICON OF THE SEAS"],
    sourceUrl: "https://en.wikipedia.org/wiki/Icon_of_the_Seas",
  },
  {
    slug: "star-of-the-seas",
    name: "Star of the Seas",
    line: "Royal Caribbean International",
    shipClass: "Icon class",
    mmsi: 311001551,
    imo: "9829942",
    callSign: "C6HS3",
    grossTonnage: 248663,
    lengthM: 364.83,
    passengersDouble: 5610,
    passengersMax: 7600,
    enteredService: "August 2025",
    homeports: [CANAVERAL],
    regions: "Eastern and Western Caribbean cruises from Port Canaveral",
    blurb:
      "The second Icon-class ship, entering service in August 2025. She sails seven-night Caribbean cruises from Port Canaveral.",
    aisNames: ["STAR OF THE SEAS"],
    sourceUrl: "https://en.wikipedia.org/wiki/Star_of_the_Seas",
  },
  {
    slug: "wonder-of-the-seas",
    name: "Wonder of the Seas",
    line: "Royal Caribbean International",
    shipClass: "Oasis class",
    mmsi: 311001033,
    imo: "9838345",
    callSign: "C6EY2",
    grossTonnage: 235600,
    lengthM: 362.04,
    passengersDouble: 5734,
    passengersMax: 7084,
    enteredService: "March 2022",
    homeports: [MIAMI],
    regions: "Bahamas short cruises from Miami",
    blurb:
      "An Oasis-class ship in service since March 2022. After first sailing from Port Canaveral, she moved to PortMiami in August 2025 for short Bahamas cruises.",
    aisNames: ["WONDER OF THE SEAS"],
    sourceUrl: "https://en.wikipedia.org/wiki/Wonder_of_the_Seas",
  },
  {
    slug: "utopia-of-the-seas",
    name: "Utopia of the Seas",
    line: "Royal Caribbean International",
    shipClass: "Oasis class",
    mmsi: 311001259,
    imo: "9880001",
    callSign: "C6GI9",
    grossTonnage: 236473,
    lengthM: 362.12,
    passengersDouble: 5668,
    passengersMax: null,
    enteredService: "July 2024",
    homeports: [CANAVERAL],
    regions: "Bahamas short cruises from Port Canaveral",
    blurb:
      "The sixth Oasis-class ship, in service since July 2024, sailing short Bahamas cruises from Port Canaveral.",
    aisNames: ["UTOPIA OF THE SEAS"],
    sourceUrl: "https://en.wikipedia.org/wiki/Utopia_of_the_Seas",
  },
  {
    slug: "symphony-of-the-seas",
    name: "Symphony of the Seas",
    line: "Royal Caribbean International",
    shipClass: "Oasis class",
    mmsi: 311000660,
    imo: "9744001",
    callSign: "C6DF6",
    grossTonnage: 228081,
    lengthM: 361.8,
    passengersDouble: 5518,
    passengersMax: 6680,
    enteredService: "April 2018",
    homeports: [MIAMI],
    regions: "Caribbean cruises from Miami",
    blurb:
      "An Oasis-class ship in service since April 2018, sailing Caribbean cruises from PortMiami.",
    aisNames: ["SYMPHONY OF THE SEAS"],
    sourceUrl: "https://en.wikipedia.org/wiki/Symphony_of_the_Seas",
  },
  {
    slug: "carnival-jubilee",
    name: "Carnival Jubilee",
    line: "Carnival Cruise Line",
    shipClass: "Excel class",
    mmsi: 311001390,
    imo: "9851737",
    callSign: "C6GY5",
    grossTonnage: 183521,
    lengthM: 345.39,
    passengersDouble: 5228,
    passengersMax: 6631,
    enteredService: "December 2023",
    homeports: [{ name: "Galveston, Texas", wallKey: null }],
    regions: "Western Caribbean cruises from Galveston",
    blurb:
      "The third of Carnival's Excel-class ships, in service since December 2023 and sailing Western Caribbean cruises from Galveston — the first Carnival Excel-class ship based in Texas.",
    aisNames: ["CARNIVAL JUBILEE"],
    sourceUrl: "https://en.wikipedia.org/wiki/Carnival_Jubilee",
  },
  {
    slug: "carnival-celebration",
    name: "Carnival Celebration",
    line: "Carnival Cruise Line",
    shipClass: "Excel class",
    mmsi: 311001223,
    imo: "9837456",
    callSign: "C6GE4",
    grossTonnage: 183521,
    lengthM: 344.5,
    passengersDouble: 5374,
    passengersMax: 6500,
    enteredService: "November 2022",
    homeports: [MIAMI],
    regions: "Caribbean cruises from Miami",
    blurb:
      "An Excel-class ship in service since November 2022, sailing Caribbean cruises from Miami.",
    aisNames: ["CARNIVAL CELEBRATION"],
    sourceUrl: "https://en.wikipedia.org/wiki/Carnival_Celebration",
  },
  {
    slug: "mardi-gras",
    name: "Mardi Gras",
    line: "Carnival Cruise Line",
    shipClass: "Excel class",
    mmsi: 311001049,
    imo: "9837444",
    callSign: "C6FA2",
    grossTonnage: 181808,
    lengthM: 344.5,
    passengersDouble: 5282,
    passengersMax: 6500,
    enteredService: "July 2021",
    homeports: [CANAVERAL],
    regions: "Eastern Caribbean cruises from Port Canaveral",
    blurb:
      "The lead ship of Carnival's Excel class — named for the line's first ship — in service since July 2021, sailing Eastern Caribbean cruises from Port Canaveral.",
    aisNames: ["MARDI GRAS"],
    sourceUrl: "https://en.wikipedia.org/wiki/Mardi_Gras_(2020_ship)",
    sourceNote:
      "MMSI and call sign are the ship's current Bahamas registration, as listed by VesselFinder, CruiseMapper and Maritime Optima; the Wikipedia infobox still shows her earlier Panama registration (MMSI 352049000).",
  },
  {
    slug: "norwegian-prima",
    name: "Norwegian Prima",
    line: "Norwegian Cruise Line",
    shipClass: "Prima class",
    mmsi: 311001059,
    imo: "9823986",
    callSign: "C6FB3",
    grossTonnage: 143535,
    lengthM: 299.0,
    passengersDouble: 3099,
    passengersMax: null,
    enteredService: "August 2022",
    homeports: [],
    regions: "Caribbean and Northern Europe itineraries (seasonal)",
    blurb:
      "The lead ship of Norwegian's Prima class, in service since August 2022, sailing seasonal Caribbean and Northern Europe itineraries.",
    aisNames: ["NORWEGIAN PRIMA"],
    sourceUrl: "https://en.wikipedia.org/wiki/Norwegian_Prima",
  },
  {
    slug: "norwegian-aqua",
    name: "Norwegian Aqua",
    line: "Norwegian Cruise Line",
    shipClass: "Prima Plus class",
    mmsi: 311001559,
    imo: "9824007",
    callSign: "C6HT4",
    grossTonnage: 156300,
    lengthM: 322.0,
    passengersDouble: 3571,
    passengersMax: 4224,
    enteredService: "March 2025",
    homeports: [
      MIAMI,
      {
        name: "New York, New York",
        wallKey: "new-york",
        note: "seasonal",
      },
    ],
    regions: "Caribbean cruises from Miami; Bermuda cruises from New York in season",
    blurb:
      "The first Prima Plus-class ship, in service since March 2025 — larger than the Prima class she extends — sailing Caribbean cruises from Miami and Bermuda cruises from New York in season.",
    aisNames: ["NORWEGIAN AQUA"],
    sourceUrl: "https://en.wikipedia.org/wiki/Norwegian_Aqua",
    sourceNote:
      "IMO, MMSI and call sign as listed by VesselFinder, CruiseMapper and Maritime Optima (the Wikipedia infobox does not publish them); tonnage, dimensions and double-occupancy capacity from Wikipedia, maximum capacity per CruiseProdigy.",
  },
  {
    slug: "norwegian-encore",
    name: "Norwegian Encore",
    line: "Norwegian Cruise Line",
    shipClass: "Breakaway Plus class",
    mmsi: 311000879,
    imo: "9751511",
    callSign: "C6EF4",
    grossTonnage: 169116,
    lengthM: 333.44,
    passengersDouble: 3998,
    passengersMax: null,
    passengersNote: "lower berths",
    enteredService: "November 2019",
    homeports: [
      MIAMI,
      {
        name: "Seattle, Washington",
        wallKey: "seattle",
        note: "Alaska season",
      },
    ],
    regions: "Caribbean cruises from Miami; Alaska cruises from Seattle in season",
    blurb:
      "The last of Norwegian's Breakaway Plus class, in service since November 2019, sailing Caribbean cruises from Miami and Alaska cruises from Seattle in season.",
    aisNames: ["NORWEGIAN ENCORE"],
    sourceUrl: "https://en.wikipedia.org/wiki/Norwegian_Encore",
  },
  {
    slug: "disney-wish",
    name: "Disney Wish",
    line: "Disney Cruise Line",
    shipClass: "Wish class",
    mmsi: 311001098,
    imo: "9834739",
    callSign: "C6FG4",
    grossTonnage: 144000,
    lengthM: 341.8,
    passengersDouble: 2508,
    passengersMax: 4000,
    enteredService: "July 2022",
    homeports: [CANAVERAL],
    regions: "Bahamas short cruises from Port Canaveral",
    blurb:
      "The lead ship of Disney's Wish class, in service since July 2022, sailing short Bahamas cruises from Port Canaveral.",
    aisNames: ["DISNEY WISH"],
    sourceUrl: "https://en.wikipedia.org/wiki/Disney_Wish",
  },
  {
    slug: "disney-treasure",
    name: "Disney Treasure",
    line: "Disney Cruise Line",
    shipClass: "Wish class",
    mmsi: 311001221,
    imo: "9834753",
    callSign: "C6GE2",
    grossTonnage: 144256,
    lengthM: 341.8,
    passengersDouble: 2492,
    passengersMax: 4000,
    enteredService: "December 2024",
    homeports: [CANAVERAL],
    regions: "Eastern and Western Caribbean cruises from Port Canaveral",
    blurb:
      "The second Wish-class ship, in service since December 2024, sailing seven-night Caribbean cruises from Port Canaveral.",
    aisNames: ["DISNEY TREASURE"],
    sourceUrl: "https://en.wikipedia.org/wiki/Disney_Treasure",
  },
  {
    slug: "disney-adventure",
    name: "Disney Adventure",
    line: "Disney Cruise Line",
    shipClass: "Global class",
    mmsi: 311000934,
    imo: "9808986",
    callSign: "C6EM2",
    grossTonnage: 208108,
    lengthM: 342.7,
    passengersDouble: 4222,
    passengersMax: 6700,
    enteredService: "March 2026",
    homeports: [{ name: "Singapore", wallKey: null }],
    regions: "Sailings from Singapore",
    blurb:
      "Disney's largest ship at 208,108 gross tons and the first Disney ship homeported outside the United States, sailing from Singapore since March 2026.",
    aisNames: ["DISNEY ADVENTURE"],
    sourceUrl: "https://en.wikipedia.org/wiki/Disney_Adventure",
  },
];

export function getShip(slug: string): TrackedShip | undefined {
  return SHIPS.find((s) => s.slug === slug);
}

/** Lines in registry order (Royal Caribbean, Carnival, Norwegian, Disney). */
export function shipLines(): string[] {
  const seen: string[] = [];
  for (const s of SHIPS) if (!seen.includes(s.line)) seen.push(s.line);
  return seen;
}

export function shipsByLine(line: string): TrackedShip[] {
  return SHIPS.filter((s) => s.line === line);
}
