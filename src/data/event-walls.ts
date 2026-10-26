/**
 * Live event camera walls — curated configuration.
 *
 * A "wall" is a fixed, hand-picked set of catalogue cameras gathered
 * around a place people search for at a moment: Times Square on New
 * Year's Eve, the aurora belt in season, the Space Coast on launch
 * day, the Atlantic and Gulf coasts in hurricane season.
 *
 * Every camera below was resolved against the catalogue's OWN place
 * data — the record's city/country fields and its published
 * coordinates — never by guessing from a camera's name:
 *
 *   - Times Square: the catalogue carries no camera mounted in the
 *     Square itself (verified — no record names it, and the Manhattan
 *     records nearest its coordinates are NYSDOT street cameras on the
 *     avenues around Midtown). The picks are the records whose
 *     catalogue coordinates fall closest to Times Square
 *     (40.7580, -73.9855), all with city "New York City"/"Manhattan".
 *   - Northern lights: records the catalogue places at aurora
 *     latitudes — a dedicated aurora camera (Apukka), resort, town,
 *     harbour and research cameras across Finland, Norway, Iceland,
 *     Sweden, Alaska and Arctic Canada, every one at lat >= 64.5.
 *   - Rocket launches: the catalogue's Space Coast coverage is the
 *     Florida DOT network; the picks are the Brevard County records on
 *     the two causeways that serve the Cape — SR-528 (Port Canaveral /
 *     Cape Canaveral) and SR-405/SR-406 (Kennedy Space Center /
 *     Titusville) — selected by their catalogue coordinates and road
 *     names. No catalogue camera sits on a launch pad, and the wall
 *     copy says so.
 *   - Hurricane watch: beach and coast records the catalogue places
 *     on the Florida Atlantic and Gulf coasts, in Puerto Rico, the US
 *     Virgin Islands, the Dominican Republic and South Carolina,
 *     including the USGS CoastCam stations at Madeira Beach FL and
 *     Isla Verde PR (built by src/app/api/cctv/coastcams.ts, resolved
 *     from that module rather than a country chunk).
 *
 * The integrity tests (src/lib/event-walls.test.ts) re-resolve every
 * ID against the real data files and re-check the place rules, so a
 * pick that rots out of the catalogue fails the suite instead of
 * silently shrinking a wall.
 *
 * Status honesty: a wall's schedule drives its state line. Outside
 * its window a wall says so and names the next window — it never
 * presents an off-season place as a live event.
 */

/** Where a wall camera's record is resolved from: a country chunk
 *  (src/data/countries/<slug>.json, via loadCountryChunk) or the USGS
 *  CoastCam module's station map. */
export type EventWallCameraSource = string; // country chunk slug, or "usgs-coastcams"

export interface EventWallCamera {
  id: string;
  from: EventWallCameraSource;
  /** Caption under the card — what this camera is and why it's here. */
  note: string;
}

export type EventWallSchedule =
  | { kind: "evergreen" }
  | {
      kind: "annual";
      /** First day of the annual window (inclusive), local-naive month/day. */
      start: { month: number; day: number };
      /** Last day of the annual window (inclusive). May precede the
       *  start in the year — the window wraps (aurora: Sep 1 – Mar 31). */
      end: { month: number; day: number };
    };

export interface EventWall {
  slug: string;
  /** Page H1 / title. */
  title: string;
  /** Short name for cards, breadcrumbs and cross-links. */
  shortTitle: string;
  tagline: string;
  /** Meta description. */
  description: string;
  /** The place the catalogue data puts these cameras in. */
  placeLabel: string;
  schedule: EventWallSchedule;
  /** What the moment is called ("New Year's Eve", "Aurora season"). */
  eventLabel: string;
  /** Framing shown while the wall is in its live state. */
  liveNote: string;
  /** Framing shown out of season (annual walls only). */
  offSeasonNote: string;
  intro: string[];
  /** "About these cameras" — the honest provenance of the picks. */
  about: string[];
  cameras: EventWallCamera[];
  faqs: { q: string; a: string }[];
  related: { label: string; href: string }[];
}

const US = "united-states";
const USGS = "usgs-coastcams";

export const EVENT_WALLS: EventWall[] = [
  {
    slug: "times-square",
    title: "Times Square & Midtown Manhattan — Live Cameras",
    shortTitle: "Times Square — New Year's Eve",
    tagline:
      "The live street cameras around Times Square and Midtown Manhattan — the front row when the ball drops.",
    description:
      "Watch Times Square and Midtown Manhattan live: the closest live cameras to the Square in the WorldEye network, streaming around the clock — and the place to be on New Year's Eve. Free, no signup.",
    placeLabel: "Midtown Manhattan, New York City",
    schedule: {
      kind: "annual",
      start: { month: 12, day: 30 },
      end: { month: 1, day: 2 },
    },
    eventLabel: "New Year's Eve at Times Square",
    liveNote:
      "It's New Year's Eve week: these are the live street cameras around Times Square and Midtown as the crowd gathers for the ball drop at midnight on December 31.",
    offSeasonNote:
      "The ball drops on December 31 — outside that week, these cameras stream Midtown Manhattan around the clock, and this wall becomes the front row again when the countdown returns.",
    intro: [
      "Times Square is the most-watched street corner on Earth for exactly one night a year — and a working piece of Midtown Manhattan for the other 364. This wall gathers the live cameras closest to the Square in the WorldEye network: New York State DOT street cameras on the avenues around Midtown, streaming live video around the clock.",
      "On New Year's Eve the streets in these frames fill from the afternoon onward, and the cameras watch the neighbourhood the celebration takes over — the approach avenues, the West Side, the tunnel traffic pouring into Midtown. The rest of the year they are simply the city's pulse: theatre-district traffic, Hudson Yards, the climb up the West Side Highway.",
    ],
    about: [
      "An honest note on the picks: the catalogue carries no camera mounted inside Times Square itself. These are the records whose published coordinates fall closest to the Square — the nearest, West Street at W. 42nd Street, is roughly 1.4 km west of it — every one a New York City street camera placed there by the catalogue's own city and coordinate data. Nothing here is a stock photo or a renamed feed from somewhere else.",
    ],
    cameras: [
      { id: "occ-ny511-bb468b10f2", from: US, note: "West St at W. 42nd St — the closest catalogue camera to Times Square, about 1.4 km west" },
      { id: "occ-ny511-63a8e95b46", from: US, note: "West St at W. 34th St, Hudson Yards — about 1.6 km from the Square" },
      { id: "occ-ny511-0c41fc0153", from: US, note: "West St at W. 57th St — the climb toward Columbus Circle" },
      { id: "occ-ny511-4bb4a21c53", from: US, note: "West St at W. 23rd St, Chelsea" },
      { id: "occ-ny511-286d0775fd", from: US, note: "Henry Hudson Pkwy at W. 66th St, Upper West Side" },
      { id: "occ-ny511-1184405cf1", from: US, note: "West St at W. 14th St, Meatpacking District" },
      { id: "occ-ny511-bcf63fc438", from: US, note: "I-495 at the Queens Midtown Tunnel — traffic pouring into Midtown" },
    ],
    faqs: [
      {
        q: "Is there a camera inside Times Square itself?",
        a: "Not in this network. The catalogue's Manhattan coverage is the New York State DOT street-camera network, and this wall collects the cameras closest to Times Square by their published coordinates — the nearest is about 1.4 km west, at West Street and W. 42nd Street. What you see is the real Midtown around the Square, honestly labelled.",
      },
      {
        q: "When is the best time to watch this wall?",
        a: "New Year's Eve. The event window runs December 30 to January 2: Midtown fills through December 31, the ball drops at midnight, and the cameras catch the crowd, the approach avenues and the clean-up. Outside that week the same cameras stream ordinary — and still very watchable — Manhattan street life.",
      },
      {
        q: "Are these live video or photos?",
        a: "Live video. Every camera on this wall is an HLS stream from the New York State DOT network, the same feeds the WorldEye globe carries.",
      },
      {
        q: "Is it free to watch?",
        a: "Yes — every camera here is a public stream, free on WorldEye with no account or signup.",
      },
    ],
    related: [
      { label: "City webcams", href: "/world-city-webcams" },
      { label: "Live webcams worldwide", href: "/live-webcams" },
      { label: "All live event walls", href: "/live-events" },
    ],
  },
  {
    slug: "northern-lights",
    title: "Northern Lights — Live Aurora Cameras",
    shortTitle: "Northern Lights",
    tagline:
      "Dedicated aurora cameras and dark-sky feeds across the aurora belt — Finland, Norway, Iceland, Sweden, Alaska and Arctic Canada.",
    description:
      "Watch the northern lights live: a dedicated aurora camera in Finnish Lapland plus dark-landscape cameras across Norway, Iceland, Sweden, Alaska and Arctic Canada. Aurora season September to March. Free, no signup.",
    placeLabel: "The aurora belt — 64.5° N and beyond",
    schedule: {
      kind: "annual",
      start: { month: 9, day: 1 },
      end: { month: 3, day: 31 },
    },
    eventLabel: "Aurora season",
    liveNote:
      "Aurora season is on: long, fully dark nights across the aurora belt. These cameras face dark northern landscapes — on a clear, active night, the arc shows here first.",
    offSeasonNote:
      "Aurora season runs September to March. In summer these latitudes barely darken at all — the cameras stream the midnight twilight instead, and this wall returns with the dark in September.",
    intro: [
      "The northern lights are the hardest show on Earth to travel to on a forecast — so the watchers learned to let the cameras do the travelling. This wall gathers the catalogue's aurora-belt cameras into one place: a dedicated aurora camera at Apukka Resort in Finnish Lapland, resort and town cameras in Rovaniemi and Levi, harbour and road cameras in northern Norway, Iceland and Swedish Lapland, and weather cameras in Fairbanks and Arctic Canada — every one of them at 64.5° north or beyond.",
      "The honest framing, the same one this site's aurora guide uses: most of these are not dedicated aurora cameras. They are road, weather, harbour and resort feeds that happen to face dark landscapes. On an ordinary night they show ordinary darkness. On a clear, dark, active night, the same frames show the arc standing over the road, curtains moving above the harbour. Check the sky is dark, check it is clear, then give it a minute — slow change in the sky itself is the signature.",
    ],
    about: [
      "Every pick was resolved by the catalogue's own place data — the record's town and country, and coordinates at aurora latitude. The wall leads with the one true specialist in the set, the Apukka Aurora Cam, a camera run to watch the sky; the rest earn their place by geography: North Cape at 71.2° N is among the northernmost cameras in the whole network, and Clyde River, Nunavut sits at 70.5° N. Frames refresh at each source's own cadence — the snapshot cameras update every few minutes, which suits a sky that moves slowly.",
    ],
    cameras: [
      { id: "pubcam-finland-apukka-apukka-aurora-cam", from: "finland", note: "Apukka Aurora Cam, Rovaniemi — a dedicated aurora camera, built to watch the sky" },
      { id: "pubcam-finland-levi-levi-ski-resort", from: "finland", note: "Levi, Finnish Lapland — 67.8° N" },
      { id: "pubcam-finland-rovaniemi-city-of-rovaniemi", from: "finland", note: "Rovaniemi, on the Arctic Circle — 66.5° N" },
      { id: "pubcam-norway-nordkapp-northcape-seafishing", from: "norway", note: "North Cape, Norway — 71.2° N, among the northernmost cameras in the network" },
      { id: "pubcam-norway-kirkenes-s-r-varanger-kirkenes", from: "norway", note: "Kirkenes, far northeastern Norway — 69.7° N" },
      { id: "is-7175-439", from: "iceland", note: "Dettifoss, north Iceland — waterfall country under dark skies" },
      { id: "is-7049-133", from: "iceland", note: "The Siglufjörður road, north Iceland — 66.2° N" },
      { id: "is-7097-261", from: "iceland", note: "Blönduós, north Iceland — 65.7° N" },
      { id: "occ-trafikverket-SE_STA_CAMERA_VViS_2580_K1", from: "sweden", note: "Kiruna, Swedish Lapland — 67.9° N" },
      { id: "faa-14031", from: US, note: "Fairbanks International, Alaska — a classic aurora city, 64.8° N" },
      { id: "occ-phenocam-bigtraillake", from: US, note: "Big Trail Lake, Fairbanks — a research lake camera facing open sky" },
      { id: "faa-11529", from: "canada", note: "Clyde River, Nunavut — 70.5° N, deep in the Canadian Arctic" },
    ],
    faqs: [
      {
        q: "When is aurora season on these cameras?",
        a: "Roughly September to March, when nights at these latitudes are long and fully dark. This wall treats September 1 to March 31 as the season; outside it, the same cameras stream bright northern summer nights and twilight rather than darkness.",
      },
      {
        q: "Are these dedicated aurora cameras?",
        a: "One is: the Apukka Aurora Cam in Finnish Lapland exists to watch the sky. The rest are resort, town, harbour, road and weather cameras in aurora latitudes that face dark landscapes — which is exactly what catches an aurora on a clear, active night. The wall labels every camera for what it is.",
      },
      {
        q: "Why does a strong forecast still show nothing?",
        a: "Three conditions must coincide: real darkness at the camera, clear sky above it, and enough geomagnetic activity over its latitude. Cloud is the most common spoiler — which is why the wall spans several countries, so somewhere on the belt is usually clear.",
      },
      {
        q: "How can I tell real aurora from cloud or town light?",
        a: "Look for structure in the sky itself: a greenish arc or band that brightens, fades and moves within itself over several minutes. Cloud lit from below drifts across the frame and sits low. Recheck after five minutes — a real display evolves rather than repeating.",
      },
    ],
    related: [
      { label: "Northern lights webcams — the full guide", href: "/northern-lights-webcams" },
      { label: "Dark-sky cameras", href: "/dark-sky-cameras" },
      { label: "All live event walls", href: "/live-events" },
    ],
  },
  {
    slug: "rocket-launches",
    title: "Rocket Launches — Space Coast Cameras",
    shortTitle: "Rocket Launches — Space Coast",
    tagline:
      "The causeways to Kennedy Space Center and Cape Canaveral, live — the public views of the Space Coast on launch day.",
    description:
      "Watch Florida's Space Coast live: the SR-528 and SR-405 causeway cameras serving Kennedy Space Center, Cape Canaveral and Titusville — the coast rockets rise over. Free, no signup.",
    placeLabel: "Brevard County, Florida — the Space Coast",
    schedule: { kind: "evergreen" },
    eventLabel: "The Space Coast, Florida",
    liveNote:
      "The Space Coast streams around the clock. Launches lift off from Kennedy Space Center and Cape Canaveral on published schedules — on launch day, these causeway and corridor cameras are the public views of the coast the pads stand on.",
    offSeasonNote: "",
    intro: [
      "Every rocket that leaves Florida's Space Coast crosses the same two causeways these cameras watch: SR-528, the Beachline, running east to Port Canaveral and Cape Canaveral; and SR-405, the road to Kennedy Space Center, met at Titusville — the town that has watched launches from its riverbank since the Apollo years. This wall gathers the Florida DOT cameras along those corridors, chosen by their catalogue positions in Brevard County.",
      "What that means on launch day: these are not pad cameras, and the wall will not pretend otherwise. They are the coast itself, live — the causeways filling with parked cars, the Banana River crossings, the roads the countdown empties and fills again. A rocket rises over all of it, visible across this whole shoreline on a clear day, and in the minutes after a launch these frames show the Space Coast doing what it has done for sixty years: stopping to look up.",
    ],
    about: [
      "The catalogue's Space Coast coverage is the Florida DOT camera network — there is no public launch-pad webcam in it. The picks are the Brevard County records on the launch corridors themselves: SR-405 at US-1 and SR-407 (the Kennedy Space Center approaches), SR-406 at US-1 in Titusville, and the SR-528 causeway miles 51 to 54 crossing toward Cape Canaveral — the easternmost catalogue cameras on the road to the pads, selected from the records' own road names and coordinates.",
    ],
    cameras: [
      { id: "fdot-1112", from: US, note: "SR-405 at US-1 — the Kennedy Space Center approach from Titusville" },
      { id: "fdot-1105", from: US, note: "SR-406 at US-1 — Titusville, the classic launch-viewing town" },
      { id: "fdot-925", from: US, note: "SR-405 at SR-407 — the NASA causeway junction" },
      { id: "fdot-682", from: US, note: "SR-528 (the Beachline), mile 51.2 — the Port Canaveral causeway" },
      { id: "fdot-685", from: US, note: "SR-528 mile 52.5, eastbound toward the Cape" },
      { id: "fdot-683", from: US, note: "SR-528 mile 53 — the Banana River crossing" },
      { id: "fdot-1035", from: US, note: "SR-528 at mile 54" },
      { id: "fdot-684", from: US, note: "SR-528 mile 54 eastbound — the closest of the set to Cape Canaveral" },
    ],
    faqs: [
      {
        q: "Can I watch a rocket launch on this wall?",
        a: "You can watch the Space Coast on launch day: the causeways, the river crossings and the corridor roads around Kennedy Space Center and Cape Canaveral, live. The catalogue carries no camera on a launch pad, so this wall shows the coast a launch rises over — on a clear day the ascent is visible across the whole shoreline — rather than a pad close-up it cannot honestly offer.",
      },
      {
        q: "When do launches happen?",
        a: "On schedules published by the launch providers and the Space Force range, which change often — scrubs and slips are part of the rhythm. This wall streams the coast around the clock; check an official launch schedule for the next window, then watch the causeways fill.",
      },
      {
        q: "Why traffic cameras?",
        a: "Because they are the Space Coast's public camera network. Florida DOT runs the cameras on the roads that serve the Cape, and those roads — SR-528 and SR-405 — are where the public actually gathers. The wall labels every camera with the road it watches.",
      },
      {
        q: "Is it free to watch?",
        a: "Yes — every camera here is a public stream, free on WorldEye with no account or signup.",
      },
    ],
    related: [
      { label: "Space station tracker", href: "/space-station-tracker" },
      { label: "Airport webcams", href: "/airport-webcams" },
      { label: "All live event walls", href: "/live-events" },
    ],
  },
  {
    slug: "hurricane-watch",
    title: "Hurricane Watch — Live Coast Cameras",
    shortTitle: "Hurricane Watch",
    tagline:
      "Beach and coast cameras across Florida, the Gulf and the Caribbean — the shores a hurricane reaches first.",
    description:
      "Watch the Atlantic and Gulf coasts live through hurricane season: beach and coast cameras in Florida, Puerto Rico, the US Virgin Islands, the Dominican Republic and South Carolina. Season June 1 to November 30. Free, no signup.",
    placeLabel: "Florida, the Gulf & the Caribbean",
    schedule: {
      kind: "annual",
      start: { month: 6, day: 1 },
      end: { month: 11, day: 30 },
    },
    eventLabel: "Atlantic hurricane season",
    liveNote:
      "Atlantic hurricane season is open, June 1 to November 30. These are the coast cameras a storm reaches first — and when one makes landfall, this wall is where the coast shows it. Always follow official warnings from the National Hurricane Center.",
    offSeasonNote:
      "Atlantic hurricane season runs June 1 to November 30. Out of season, these coast cameras stream ordinary beach weather — the wall stands watch again when the season opens.",
    intro: [
      "When a hurricane comes ashore, the first pictures are never from a studio — they are from the coast itself: the beach cameras, harbour cameras and shore stations that were already watching the water. This wall gathers them in advance: Florida's Atlantic and Gulf beaches, Puerto Rico, St. Croix, the Dominican Republic's north coast, Myrtle Beach, and the USGS CoastCam stations that exist precisely to record what storms do to a shoreline.",
      "Between storms, this is simply a wall of beautiful coastline — surf checks, harbour weather, the Caribbean in the morning. In season it becomes something else: the place to watch the sea state build, the bands come in, and a coast brace. A standing warning belongs on the wall itself: cameras are context, never guidance. Official forecasts and evacuation orders come from the National Hurricane Center and local authorities — and as a storm arrives, feeds fail as power and networks do, which is itself information about conditions on the ground.",
    ],
    about: [
      "Every pick is a record the catalogue places on a hurricane-belt coast — beach, harbour and shore cameras resolved by their own city and coordinate data. The two USGS CoastCam stations (Madeira Beach on Florida's Gulf coast, Isla Verde in San Juan) are research cameras installed to document storm-driven coastal change; their snapshots update through daylight hours. The Caribbean picks are SkylineWebcams beach cameras in St. Croix, Cabarete and Juan Dolio, with Myrtle Beach and Cape Cod marking the Atlantic coast's northern reach.",
    ],
    cameras: [
      { id: "usgs-coastcam-madeira_beach-c1", from: USGS, note: "Madeira Beach, Florida's Gulf coast — USGS CoastCam research station" },
      { id: "pubcam-united-states-hollywood-city-of-hollywood", from: US, note: "Hollywood Beach, Florida's Atlantic coast" },
      { id: "pubcam-united-states-port-everglades-port-everglades-trafficcams", from: US, note: "Port Everglades, Fort Lauderdale — the harbour entrance" },
      { id: "pubcam-united-states-st-augustine-st-augustine-live", from: US, note: "St. Augustine, Florida's Atlantic coast" },
      { id: "pubcam-united-states-myrtle-beach-myrtle-beach", from: US, note: "Myrtle Beach, South Carolina" },
      { id: "usgs-coastcam-islaverde-c1", from: USGS, note: "Isla Verde, San Juan, Puerto Rico — USGS CoastCam, first view" },
      { id: "usgs-coastcam-islaverde-c2", from: USGS, note: "Isla Verde, San Juan — USGS CoastCam, second view" },
      { id: "sky-puerto-rico-panorama-of-puerto-rico-san-juan-5786", from: "puerto-rico", note: "San Juan panorama, Puerto Rico" },
      { id: "sky-us-virgin-islands-st-croix-usvi-5769", from: "us-virgin-islands", note: "St. Croix, US Virgin Islands" },
      { id: "sky-us-virgin-islands-cane-bay-st-croix-3036", from: "us-virgin-islands", note: "Cane Bay, St. Croix — the north shore" },
      { id: "sky-dominican-republic-beach-of-cabarete-5865", from: "dominican-republic", note: "Cabarete beach, Dominican Republic" },
      { id: "sky-dominican-republic-playa-juan-dolio-dominican-republic-5942", from: "dominican-republic", note: "Playa Juan Dolio, Dominican Republic" },
      { id: "usgs-coastcam-caco-05-c1", from: USGS, note: "Marconi Beach, Cape Cod — USGS CoastCam, the Atlantic watch's northern end" },
    ],
    faqs: [
      {
        q: "When is hurricane season?",
        a: "The Atlantic season runs June 1 to November 30, peaking from mid-August to late October. This wall treats those dates as its season: in season it leads with the storm framing, out of season it says so plainly and the same cameras stream ordinary beach weather.",
      },
      {
        q: "What am I watching between storms?",
        a: "The coast on a normal day — surf, harbour traffic, beach weather from Florida to the Caribbean. That baseline is the point: a shoreline you have watched calm is one you can read when it changes.",
      },
      {
        q: "Should I rely on these cameras during a hurricane?",
        a: "No — never for decisions. Official forecasts, warnings and evacuation orders come from the National Hurricane Center and local authorities. Cameras add ground truth about conditions, and they commonly fail as a storm knocks out power and networks; a feed going dark near landfall is expected, not a sign the danger has passed.",
      },
      {
        q: "What are the USGS CoastCam stations?",
        a: "Research cameras the US Geological Survey runs to document how storms and seasons reshape coastlines. Madeira Beach (Florida Gulf) and Isla Verde (Puerto Rico) are on this wall, plus Marconi Beach on Cape Cod; their snapshots update through daylight hours.",
      },
    ],
    related: [
      { label: "Hurricane tracker", href: "/hurricane-tracker" },
      { label: "Weather tracker", href: "/weather-tracker" },
      { label: "Beach webcams", href: "/beach-webcams" },
      { label: "All live event walls", href: "/live-events" },
    ],
  },
];

export function getEventWall(slug: string): EventWall | undefined {
  return EVENT_WALLS.find((w) => w.slug === slug);
}
