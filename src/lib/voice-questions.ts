/**
 * Canonical voice-question dataset for WorldEye.
 *
 * Voice assistants (Google Home, Alexa, Siri) and AI answer engines read ONE
 * answer aloud or quote one passage. Every entry here is shaped for that:
 *   - `question` is phrased the way people actually speak the query.
 *   - `shortAnswer` is a complete, self-contained answer of at most 30
 *     words — it must make sense read aloud on its own.
 *   - `longAnswer` adds 1–3 sentences of supporting detail.
 *   - `href` deep-links to the page that proves or serves the answer.
 *
 * Facts come only from the verified set: 74,229 cameras served, 109
 * countries, per-country and per-city counts reproduced from
 * src/data/camera-countries.json and src/data/city-pages.json, plan prices
 * from the live pricing configuration. No superlatives we cannot source;
 * "best" appears only inside question phrasing and is answered with facts.
 *
 * Invariants are enforced by src/lib/voice-questions.test.ts (word limit,
 * unique ids, href liveness against the route inventory).
 */

export type VoiceCategoryId =
  | "watch-cameras-by-place"
  | "traffic-and-roads"
  | "weather-and-nature"
  | "track-anything"
  | "worldeye-basics"
  | "plans-and-pricing"
  | "ski-webcams"
  | "beach-webcams"
  | "airport-webcams";

export interface VoiceQuestion {
  id: string;
  category: VoiceCategoryId;
  /** The question as people speak it. */
  question: string;
  /** Complete standalone answer, ≤ 30 words. This is the speakable text. */
  shortAnswer: string;
  /** 1–3 sentences of supporting detail. */
  longAnswer: string;
  /** Route that proves or serves the answer (must exist in the app). */
  href: string;
  /** Country/city slugs this answer relates to, for cross-linking. */
  relatedSlugs?: string[];
}

export interface VoiceCategory {
  id: VoiceCategoryId;
  title: string;
  blurb: string;
}

/** The six categories rendered on the /answers hub, in order. */
export const VOICE_CATEGORIES: VoiceCategory[] = [
  {
    id: "worldeye-basics",
    title: "WorldEye basics",
    blurb: "What WorldEye is, where its cameras come from, and how it compares.",
  },
  {
    id: "watch-cameras-by-place",
    title: "Watch cameras by place",
    blurb: "Live cameras for countries, cities, beaches, resorts and airports.",
  },
  {
    id: "traffic-and-roads",
    title: "Traffic and roads",
    blurb: "Highway cameras, road conditions and the drive ahead — checked live.",
  },
  {
    id: "weather-and-nature",
    title: "Weather and nature",
    blurb: "Hurricanes, wildfires, auroras, snow and storms, watched as they happen.",
  },
  {
    id: "track-anything",
    title: "Track anything",
    blurb: "Flights, satellites, the space station, ships and earthquakes on one globe.",
  },
  {
    id: "plans-and-pricing",
    title: "Plans and pricing",
    blurb: "What is free, what Pro and Ultra add, and what Enterprise costs.",
  },
];

export const VOICE_QUESTIONS: VoiceQuestion[] = [
  // ── WorldEye basics ──────────────────────────────────────────────────────
  {
    id: "what-is-worldeye",
    category: "worldeye-basics",
    question: "What is WorldEye?",
    shortAnswer:
      "WorldEye is a free website that puts 74,229 live public cameras on an interactive 3D globe, alongside live flights, satellites, ships, weather and earthquakes.",
    longAnswer:
      "Open the globe at worldeye.app, zoom to any place, and tap a camera marker to watch the live feed. No account is needed to browse.",
    href: "/",
  },
  {
    id: "best-website-live-cameras-world",
    category: "worldeye-basics",
    question: "What's the best website to watch live cameras around the world?",
    shortAnswer:
      "WorldEye is a strong pick: 74,229 public cameras on one free interactive globe, covering 109 countries, with flights, weather and earthquakes on the same map.",
    longAnswer:
      "Unlike single-city webcam sites, WorldEye maps every feed, so you can move from a Tokyo street to a Utah highway in one zoom. Browsing is free and needs no account.",
    href: "/live-webcams",
  },
  {
    id: "worldeye-vs-gods-eye-view",
    category: "worldeye-basics",
    question: "What's the difference between WorldEye and God's Eye View?",
    shortAnswer:
      "WorldEye serves 74,229 live cameras across 109 countries; God's Eye View offers about 4,000 cameras. WorldEye also adds flights, satellites, ships and weather layers.",
    longAnswer:
      "Both are interactive globes for exploring live cameras, and both start free in the browser with no download. WorldEye's paid tiers add an OSINT toolkit, camera recording and alerts; the full side-by-side is on the comparison page.",
    href: "/alternatives/gods-eye-view",
    relatedSlugs: ["gods-eye-view"],
  },
  {
    id: "how-many-cameras-on-worldeye",
    category: "worldeye-basics",
    question: "How many live cameras are there on WorldEye?",
    shortAnswer:
      "WorldEye serves 74,229 live public cameras from 109 countries, including 41,355 in the United States and 10,472 in Japan.",
    longAnswer:
      "The United States is the largest network, built mostly from state highway and transport-agency feeds. Japan is second, followed by Canada with 4,685 cameras.",
    href: "/cameras",
  },
  {
    id: "where-do-the-cameras-come-from",
    category: "worldeye-basics",
    question: "Where do WorldEye's cameras come from?",
    shortAnswer:
      "They are public feeds published by transport agencies, highway departments, municipalities, airports and businesses, collected and mapped by WorldEye. WorldEye operates no cameras itself.",
    longAnswer:
      "Each feed stays the property of its operator — a state DOT, a city, a resort or a business that already publishes it openly. WorldEye's work is finding, verifying and mapping them in one place.",
    href: "/cameras",
  },
  {
    id: "do-i-need-an-account",
    category: "worldeye-basics",
    question: "Do I need an account to watch cameras on WorldEye?",
    shortAnswer:
      "No. Anyone can open the globe and watch public cameras with no account; free use includes five camera opens on the globe per device.",
    longAnswer:
      "An account is only needed for paid features like recording and camera alerts. The globe, the cameras and every tracker work for visitors who never sign up.",
    href: "/",
  },
  {
    id: "does-worldeye-work-on-phone",
    category: "worldeye-basics",
    question: "Does WorldEye work on my phone?",
    shortAnswer:
      "Yes. WorldEye runs in a mobile browser with the same globe, cameras and trackers as desktop — no app download is required.",
    longAnswer:
      "Open worldeye.app in any modern phone browser. The map, camera feeds, flight and satellite layers, and your account features all work the same way.",
    href: "/",
  },
  {
    id: "what-else-can-i-track",
    category: "worldeye-basics",
    question: "What can I track on WorldEye besides cameras?",
    shortAnswer:
      "Live flights, satellites and the space station, ships, weather systems, earthquakes, wildfires and hurricanes — each on its own layer of the same globe.",
    longAnswer:
      "The layers combine: watch a hurricane on the weather layer, then open the coastal cameras under it, then check the flights rerouting around it — all in one session.",
    href: "/features",
  },
  {
    id: "are-the-cameras-really-live",
    category: "worldeye-basics",
    question: "Are the cameras on WorldEye really live?",
    shortAnswer:
      "Yes. The feeds are the operators' own live streams; when a camera goes offline for maintenance, its feed can be dark until the operator restores it.",
    longAnswer:
      "WorldEye does not record or replay these feeds as 'live'. A dark or frozen image almost always means the operating agency's camera is down, not that the stream is staged.",
    href: "/live-webcams",
  },

  // ── Watch cameras by place ───────────────────────────────────────────────
  {
    id: "how-many-cameras-in-japan",
    category: "watch-cameras-by-place",
    question: "How many live cameras are there in Japan?",
    shortAnswer:
      "WorldEye lists 10,472 live cameras in Japan, the second-largest national network on the site after the United States.",
    longAnswer:
      "Most are road and highway feeds published by Japanese agencies. Tokyo alone lists 112 cameras, and Osaka and Sapporo have dedicated city pages.",
    href: "/cameras/countries/japan",
    relatedSlugs: ["japan"],
  },
  {
    id: "watch-cameras-new-york-city",
    category: "watch-cameras-by-place",
    question: "Can I watch live cameras in New York City?",
    shortAnswer:
      "Yes. WorldEye lists 229 cameras in Queens and 172 in the Bronx, with dedicated pages for both boroughs' street and traffic feeds.",
    longAnswer:
      "The borough pages gather the feeds that cover expressways, bridges and arterial streets. For the wider region, the United States country page puts all 41,355 US cameras on one map.",
    href: "/city-webcams/queens",
    relatedSlugs: ["queens", "bronx", "united-states"],
  },
  {
    id: "watch-cameras-london",
    category: "watch-cameras-by-place",
    question: "Can I watch live cameras in London?",
    shortAnswer:
      "Yes. WorldEye's London page collects the capital's street and traffic cameras — the North Circular, Blackwall Tunnel approaches and West End views among them.",
    longAnswer:
      "The feeds are working road cameras of the kind Transport for London publishes for network status. All of them open free on the WorldEye map, with no signup.",
    href: "/city-webcams/london",
    relatedSlugs: ["london", "united-kingdom"],
  },
  {
    id: "how-many-cameras-in-the-us",
    category: "watch-cameras-by-place",
    question: "How many live cameras are there in the United States?",
    shortAnswer:
      "WorldEye lists 41,355 live cameras in the United States, its largest national network, built mostly from state highway and transport-agency feeds.",
    longAnswer:
      "Georgia accounts for 4,284 of them — largely GDOT highway cameras around Atlanta — and Utah for 2,084. Houston and Dallas have dedicated city pages.",
    href: "/cameras/countries/united-states",
    relatedSlugs: ["united-states"],
  },
  {
    id: "watch-cameras-canada",
    category: "watch-cameras-by-place",
    question: "Can I watch live cameras in Canada?",
    shortAnswer:
      "Yes. WorldEye lists 4,685 live cameras in Canada, including 233 in Calgary and 148 in Montreal, most of them highway and city traffic feeds.",
    longAnswer:
      "British Columbia is the largest provincial cluster. Ottawa and Toronto also have dedicated city pages covering their street and highway networks.",
    href: "/cameras/countries/canada",
    relatedSlugs: ["canada"],
  },
  {
    id: "watch-cameras-tokyo",
    category: "watch-cameras-by-place",
    question: "Can I watch live cameras in Tokyo?",
    shortAnswer:
      "Yes. WorldEye lists 112 cameras in Tokyo itself and 10,472 across Japan; the Tokyo page gathers the capital's street and traffic feeds.",
    longAnswer:
      "Japan's network is dominated by road cameras published by public agencies, so Tokyo's feeds focus on expressways, intersections and transport corridors.",
    href: "/city-webcams/tokyo",
    relatedSlugs: ["tokyo", "japan"],
  },
  {
    id: "watch-cameras-europe",
    category: "watch-cameras-by-place",
    question: "Where can I watch live cameras in Europe?",
    shortAnswer:
      "WorldEye's Europe page maps live cameras across the continent — Spain alone lists 2,120 feeds and Austria 1,725, from Alpine passes to city streets.",
    longAnswer:
      "Sweden lists 1,569 cameras and the United Kingdom 1,403. Each country also has its own page with counts, top cities and sample feeds.",
    href: "/europe-live-cameras",
    relatedSlugs: ["spain", "austria", "sweden", "united-kingdom"],
  },
  {
    id: "watch-cameras-australia",
    category: "watch-cameras-by-place",
    question: "Can I watch live cameras in Australia?",
    shortAnswer:
      "Yes. WorldEye lists 421 live cameras in Australia, including a dedicated Sydney page covering the harbour city's streets and traffic.",
    longAnswer:
      "Coverage follows Australia's public camera infrastructure, so the big east-coast cities carry most feeds. Auckland, across the Tasman, has its own page too.",
    href: "/cameras/countries/australia",
    relatedSlugs: ["australia", "sydney"],
  },
  {
    id: "where-see-beach-cameras",
    category: "watch-cameras-by-place",
    question: "Where can I see live beach cameras?",
    shortAnswer:
      "On WorldEye's beach webcams page, which gathers coastal, boardwalk, harbor and marina feeds worldwide — open one to check surf, crowds and coastal weather live.",
    longAnswer:
      "East-facing coasts catch the sunrise and west-facing coasts the sunset, so there is always a beach at golden hour somewhere on the page.",
    href: "/beach-webcams",
  },
  {
    id: "live-cameras-at-ski-resorts",
    category: "watch-cameras-by-place",
    question: "Are there live cameras at ski resorts?",
    shortAnswer:
      "Yes. WorldEye's ski webcams page gathers mountain and resort-area feeds showing snowfall, lift lines, visibility and access-road conditions before you drive up.",
    longAnswer:
      "Slope cameras show the actual snow surface, summit cameras show visibility, and base cameras show the lift queues — a firmer check than any snowfall report.",
    href: "/ski-webcams",
  },
  {
    id: "live-cameras-at-airports",
    category: "watch-cameras-by-place",
    question: "Can I watch live cameras at airports?",
    shortAnswer:
      "Yes. WorldEye's airport webcams page gathers public feeds around airports — runways, terminals, approach paths and airport roads — free to watch.",
    longAnswer:
      "Pair an airport camera with the live flight layer on the same map and you can match the aircraft on final approach to its flight number and route.",
    href: "/airport-webcams",
  },

  // ── Traffic and roads ────────────────────────────────────────────────────
  {
    id: "traffic-cameras-california",
    category: "traffic-and-roads",
    question: "Where can I check live traffic cameras in California?",
    shortAnswer:
      "On WorldEye's live traffic cameras page — California's highway feeds sit on the same map as 41,355 US cameras; zoom to any freeway to check conditions.",
    longAnswer:
      "The traffic hub links every state and country traffic page. California coverage comes from public highway feeds, so the busiest freeway corridors carry the most cameras.",
    href: "/live-traffic-cameras",
    relatedSlugs: ["united-states"],
  },
  {
    id: "traffic-cameras-texas",
    category: "traffic-and-roads",
    question: "Where can I check live traffic cameras in Texas?",
    shortAnswer:
      "On WorldEye's Texas traffic camera page, which maps the state's highway feeds — Houston alone lists 1,174 cameras and Dallas 843 on the same network.",
    longAnswer:
      "Texas feeds are working road cameras: lanes, ramps and interchanges. They are at their most useful at rush hour and during the state's fast summer storms.",
    href: "/us-traffic-cameras/texas",
    relatedSlugs: ["texas", "houston", "dallas"],
  },
  {
    id: "road-conditions-utah",
    category: "traffic-and-roads",
    question: "How can I check road conditions in Utah?",
    shortAnswer:
      "WorldEye lists 2,084 cameras in Utah, including the highway feeds on its Utah traffic page — check canyon and freeway conditions before you drive.",
    longAnswer:
      "Utah's network covers the Wasatch Front freeways and the canyon corridors to the ski resorts. On storm days, re-check the camera nearest your route right before leaving.",
    href: "/us-traffic-cameras/utah",
    relatedSlugs: ["utah"],
  },
  {
    id: "atlanta-traffic-cameras",
    category: "traffic-and-roads",
    question: "Where can I see Atlanta traffic cameras?",
    shortAnswer:
      "WorldEye lists 4,284 cameras in Georgia, most of them GDOT highway feeds around Atlanta, gathered on its Georgia traffic camera page.",
    longAnswer:
      "The feeds show congestion, crashes and lane closures as they happen. During summer thunderstorms they also show the flooding Atlanta's low-lying interstates are known for.",
    href: "/us-traffic-cameras/georgia",
    relatedSlugs: ["georgia"],
  },
  {
    id: "is-the-freeway-jammed",
    category: "traffic-and-roads",
    question: "Can traffic cameras tell me if the freeway is jammed?",
    shortAnswer:
      "Yes. A live freeway camera shows queues, speeds and incidents as they are — WorldEye's traffic hub links state and country pages, from Georgia to Japan.",
    longAnswer:
      "A camera is a direct look rather than an estimate: if the lanes in the frame are stopped, the freeway is stopped, whatever the travel-time apps say.",
    href: "/live-traffic-cameras",
  },
  {
    id: "is-the-mountain-pass-snowy",
    category: "traffic-and-roads",
    question: "How do I see if a mountain pass is snowy?",
    shortAnswer:
      "Open the pass on WorldEye's globe and tap the nearest highway camera: the live feed shows snow cover, chain controls and visibility directly.",
    longAnswer:
      "Pass cameras are road-agency feeds placed exactly where conditions change fastest. Pair the view with the weather layer to see the storm system behind the snow.",
    href: "/ski-webcams",
  },
  {
    id: "traffic-cameras-japan",
    category: "traffic-and-roads",
    question: "Can I check traffic cameras in Japan?",
    shortAnswer:
      "Yes. WorldEye's Japan traffic page draws on the country's 10,472 listed cameras, most of them road and highway feeds published by Japanese agencies.",
    longAnswer:
      "Japan's network is one of the densest road-camera systems in the world. City pages for Osaka, Sapporo and other metros gather the local feeds.",
    href: "/japan-traffic-cameras",
    relatedSlugs: ["japan"],
  },
  {
    id: "weather-on-my-road-trip",
    category: "traffic-and-roads",
    question: "How do I check the weather on my road trip route?",
    shortAnswer:
      "Open your route on WorldEye and tap cameras along it: each live feed shows the actual sky and road surface, backed by the map's weather layer.",
    longAnswer:
      "Forecasts describe a region; a camera shows the exact interchange you are about to drive through. Check two or three feeds spaced along the route for the full picture.",
    href: "/live-traffic-cameras",
  },

  // ── Weather and nature ───────────────────────────────────────────────────
  {
    id: "watch-a-hurricane-live",
    category: "weather-and-nature",
    question: "Can I watch a hurricane live?",
    shortAnswer:
      "Yes. WorldEye's hurricane tracker follows active storms while coastal cameras on the same map show the surf, wind and flooding as landfall approaches.",
    longAnswer:
      "Beach and harbor feeds near the landfall zone become front-row seats in the final hours. Individual cameras can drop offline when power or connectivity fails in the storm.",
    href: "/hurricane-tracker",
  },
  {
    id: "northern-lights-on-camera",
    category: "weather-and-nature",
    question: "Where can I see the northern lights on camera?",
    shortAnswer:
      "WorldEye's northern lights page gathers aurora cameras in dark-sky locations, so you can watch the sky live before — or instead of — standing outside.",
    longAnswer:
      "Aurora cameras run all night in the far north. Check the page after dark in the camera's own timezone, and pair it with the weather layer for cloud cover.",
    href: "/northern-lights-webcams",
  },
  {
    id: "watch-wildfires-live",
    category: "weather-and-nature",
    question: "Can I watch wildfires live?",
    shortAnswer:
      "Yes. WorldEye's wildfire tracker maps active fires and smoke, and nearby public cameras show conditions on the ground in fire-affected areas.",
    longAnswer:
      "The tracker follows reported incidents and fire detections; mountain and highway cameras near an incident show the smoke column and road conditions directly.",
    href: "/wildfire-tracker",
  },
  {
    id: "watch-a-volcano-live",
    category: "weather-and-nature",
    question: "Can I watch a volcano erupting live?",
    shortAnswer:
      "WorldEye's volcano page gathers cameras pointed at active volcanoes worldwide, so eruptions, ash plumes and lava lakes can be watched as they happen.",
    longAnswer:
      "Volcano observatories and agencies publish many of these feeds for monitoring. Activity changes fast — a quiet crater camera can become the most-watched feed on the map in an hour.",
    href: "/volcano-webcams",
  },
  {
    id: "where-is-it-snowing",
    category: "weather-and-nature",
    question: "Where is it snowing right now?",
    shortAnswer:
      "Open WorldEye's weather layer for the storm map, then tap mountain and highway cameras inside the snow band — each feed shows accumulation live.",
    longAnswer:
      "Snow bands are narrow: two towns thirty miles apart can have different weather. Cameras spaced along your route show exactly where the snow starts.",
    href: "/weather-tracker",
  },
  {
    id: "watch-the-sunset-somewhere",
    category: "weather-and-nature",
    question: "Can I watch the sunset somewhere else in the world?",
    shortAnswer:
      "Yes. West-facing beach and coastal cameras on WorldEye catch the sunset in whatever timezone is at golden hour — pick a coast and watch live.",
    longAnswer:
      "The sun is always setting somewhere: as one coast goes dark, the globe offers another an hour behind. East-facing beaches do the same for sunrises.",
    href: "/beach-webcams",
  },
  {
    id: "watch-storms-hit-the-coast",
    category: "weather-and-nature",
    question: "Can I watch storms hit the coast on camera?",
    shortAnswer:
      "Yes. Beach and harbor cameras on WorldEye become front-row storm seats — waves building and skies darkening — while the hurricane tracker follows the system.",
    longAnswer:
      "Coastal feeds are at their most dramatic in the hours before landfall. Expect some cameras to go dark if the storm knocks out local power.",
    href: "/beach-webcams",
  },
  {
    id: "watch-the-night-sky-live",
    category: "weather-and-nature",
    question: "Where can I watch the night sky live?",
    shortAnswer:
      "WorldEye's dark-sky page gathers cameras in low-light-pollution areas for stars, the Milky Way and auroras, streamed from remote locations worldwide.",
    longAnswer:
      "Dark-sky cameras sit far from city light, so moonless nights show the most. They are also the feeds that catch auroras when solar activity spikes.",
    href: "/dark-sky-cameras",
  },

  // ── Track anything ───────────────────────────────────────────────────────
  {
    id: "best-way-to-track-flights",
    category: "track-anything",
    question: "What's the best way to track flights live?",
    shortAnswer:
      "WorldEye's flight tracker plots live aircraft on the same globe as its cameras, with flight numbers, routes and aircraft types — free in the browser.",
    longAnswer:
      "Because the flights share a map with cameras and weather, you can follow a flight and check the airport cameras and conditions at its destination in one view.",
    href: "/live-flight-tracker",
  },
  {
    id: "track-the-space-station",
    category: "track-anything",
    question: "Can I track the space station?",
    shortAnswer:
      "Yes. WorldEye's space station tracker follows the ISS orbit live on the globe, showing its current position and ground track as it circles Earth.",
    longAnswer:
      "The station completes an orbit in about ninety minutes, so its position changes visibly while you watch. The satellite layer shows the wider constellation traffic around it.",
    href: "/space-station-tracker",
  },
  {
    id: "follow-a-ship-at-sea",
    category: "track-anything",
    question: "How can I follow a ship at sea?",
    shortAnswer:
      "WorldEye's ship tracker plots AIS vessel positions on the globe — ports, shipping lanes and ships. Maritime is an Ultra feed; cameras, flights and satellites stay free without an account.",
    longAnswer:
      "AIS is the transponder system ships use to broadcast position, course and speed. WorldEye shows a live position whenever a ship is reporting; when it isn't reporting, the page says so instead of guessing. Harbor cameras near a port let you match the plotted ship to the real one.",
    href: "/ship-tracker",
  },
  {
    id: "watch-planes-take-off-and-land",
    category: "track-anything",
    question: "Where can I watch planes take off and land live?",
    shortAnswer:
      "WorldEye's plane-spotting page pairs airport-area cameras with the live flight layer, so you can identify the aircraft on final approach in real time.",
    longAnswer:
      "Approach-corridor cameras catch arrivals lining up; the flight layer names the airline, route and aircraft type for what the camera is showing.",
    href: "/live-plane-spotting",
  },
  {
    id: "see-earthquakes-as-they-happen",
    category: "track-anything",
    question: "How can I see earthquakes as they happen?",
    shortAnswer:
      "WorldEye's earthquake tracker plots recent quakes worldwide on the globe with magnitude and depth, updated from global seismic feeds as events are reported.",
    longAnswer:
      "Each event sits on the same map as the camera network, so you can check public cameras near a strong quake's epicentre in the minutes after it posts.",
    href: "/earthquake-tracker",
  },
  {
    id: "track-satellites-overhead",
    category: "track-anything",
    question: "Can I track satellites overhead?",
    shortAnswer:
      "Yes. WorldEye's satellite tracker shows live satellite positions on the globe — search a satellite or watch constellations pass over your location.",
    longAnswer:
      "The layer renders satellites in their real orbital positions, including the space station. It is the same globe as the cameras, so passes and places line up.",
    href: "/satellite-tracker",
  },
  {
    id: "what-is-ads-b",
    category: "track-anything",
    question: "What is ADS-B?",
    shortAnswer:
      "ADS-B is the broadcast system aircraft use to report their GPS position, altitude and speed; receivers on the ground collect it to power live flight tracking.",
    longAnswer:
      "Almost every airliner broadcasts ADS-B continuously. WorldEye's explainer covers how the signals are received and turned into the live flight layer on the globe.",
    href: "/what-is-ads-b",
  },

  // ── Plans and pricing ────────────────────────────────────────────────────
  {
    id: "is-worldeye-free",
    category: "plans-and-pricing",
    question: "Is WorldEye free?",
    shortAnswer:
      "Yes. Browsing the globe, watching cameras and using the trackers are free with no account; free use includes five camera opens on the globe per device.",
    longAnswer:
      "Paid plans exist for people who want more: unlimited camera use, the OSINT toolkit, recording and alerts. Nothing about the free globe is a timed trial.",
    href: "/pricing",
  },
  {
    id: "how-much-does-worldeye-cost",
    category: "plans-and-pricing",
    question: "How much does WorldEye cost?",
    shortAnswer:
      "Pro costs $7.99 a week or $13.99 a month; VIP Pro is $74.99 a year, and Enterprise is $999 a year for commercial camera-feed access.",
    longAnswer:
      "All prices are in US dollars and billed through Stripe. A seven-day money-back guarantee covers the first charge on paid plans.",
    href: "/pricing",
  },
  {
    id: "what-do-i-get-with-pro",
    category: "plans-and-pricing",
    question: "What do I get with WorldEye Pro?",
    shortAnswer:
      "Pro removes the free camera limit and unlocks the OSINT toolkit, live traffic, the AI assistant and recording for up to 20 cameras.",
    longAnswer:
      "Pro also unlocks following a flight's route on the map. The AI assistant runs on WorldEye's own key, so there is nothing to set up.",
    href: "/pricing",
  },
  {
    id: "what-do-i-get-with-vip-pro",
    category: "plans-and-pricing",
    question: "What do I get with VIP Pro?",
    shortAnswer:
      "VIP Pro is the annual Pro plan — same features as Pro, billed yearly. The top tier is Ultra, with 10-camera alerts, timelapse, intel layers and 40-camera recording.",
    longAnswer:
      "VIP Pro includes everything in Pro, billed annually at $74.99, and annual members who joined before the current tiers launched keep the extras their plan started with. Camera alerts start on Pro (up to 2 cameras); Ultra raises the cap to 10 and adds timelapse, the intel layers and 40-camera recording.",
    href: "/pricing",
  },
  {
    id: "plan-for-businesses",
    category: "plans-and-pricing",
    question: "Does WorldEye offer a plan for businesses?",
    shortAnswer:
      "Yes. Enterprise, at $999 a year, adds a licensed camera-feed API with per-camera rights clearance, an embed player and onboarding for commercial use.",
    longAnswer:
      "Every camera in an Enterprise collection carries a rights verdict, so a business knows which feeds it may use commercially. Team seats are priced separately from the Enterprise plan.",
    href: "/enterprise",
  },
  {
    id: "can-i-try-pro-free",
    category: "plans-and-pricing",
    question: "Can I try WorldEye Pro free?",
    shortAnswer:
      "Yes. Weekly Pro includes a 3-day free trial, monthly Pro a 10-day free trial and VIP Pro a 10-day trial; a seven-day money-back guarantee covers the first charge.",
    longAnswer:
      "Trials start from the pricing page and convert to the paid plan unless cancelled before they end. The free tier itself never expires.",
    href: "/pricing",
  },
  {
    id: "can-i-cancel-anytime",
    category: "plans-and-pricing",
    question: "Can I cancel WorldEye anytime?",
    shortAnswer:
      "Yes. You can manage or cancel your subscription from the Manage Subscription page in your WorldEye settings at any time.",
    longAnswer:
      "The settings page handles plan changes on site, with a link to the Stripe billing portal for cancellation. Nothing about cancelling removes your free account.",
    href: "/pricing",
  },

  // ── Page-specific: /ski-webcams ──────────────────────────────────────────
  {
    id: "ski-is-it-snowing-at-the-resort",
    category: "ski-webcams",
    question: "Can I check if it's snowing at the ski resort right now?",
    shortAnswer:
      "Yes. Slope and summit cameras on WorldEye show falling snow, accumulation and visibility at the resort as it happens — no forecast translation needed.",
    longAnswer:
      "Check the base camera for the scene in the village and the summit camera for the conditions on the upper mountain; on a storm day they can tell different stories.",
    href: "/weather-tracker",
  },
  {
    id: "ski-check-the-drive-up",
    category: "ski-webcams",
    question: "How do I check the drive to the ski resort?",
    shortAnswer:
      "Check the highway cameras along the access road on WorldEye: they show chain controls, plowed lanes and backups before you reach the canyon.",
    longAnswer:
      "The mountain can be perfect while the access road is a mess, or the reverse. The traffic hub links the state pages that cover the main ski corridors.",
    href: "/live-traffic-cameras",
  },
  {
    id: "ski-see-lift-lines",
    category: "ski-webcams",
    question: "Can I see how long the lift lines are?",
    shortAnswer:
      "Often, yes. Base-area cameras at resorts show lift queues and parking lots filling up, so you can judge a powder-day crowd before leaving.",
    longAnswer:
      "A base camera at 7 AM shows empty lots and spinning lifts; at 9:30 on a powder Saturday it shows the line you are about to join.",
    href: "/ski-webcams",
  },
  {
    id: "ski-regions-with-most-cameras",
    category: "ski-webcams",
    question: "Which ski regions have the most cameras?",
    shortAnswer:
      "The US Rockies and Sierra, the Alps and Japan's snow country are the densest in the directory, with highway cameras often outnumbering resort feeds.",
    longAnswer:
      "Coverage follows resort and highway infrastructure. Search the range or the resort town on the map to see what is actually there before relying on it.",
    href: "/live-webcams",
  },

  // ── Page-specific: /beach-webcams ────────────────────────────────────────
  {
    id: "beach-check-the-surf",
    category: "beach-webcams",
    question: "Can I check the surf before going to the beach?",
    shortAnswer:
      "Yes. Beach-facing cameras near breaks show wave size, wind texture on the water and lineup crowds — the fastest visual surf check there is.",
    longAnswer:
      "A camera will not replace a surf report with period and direction, but at 6 AM it answers the only question that matters: whether it is worth the drive.",
    href: "/beach-webcams",
  },
  {
    id: "beach-which-beaches-live",
    category: "beach-webcams",
    question: "Which beaches can I watch live?",
    shortAnswer:
      "Coastlines worldwide: WorldEye's directory clusters beach, boardwalk and harbor cameras on US coasts, European resorts, Australia and the Caribbean.",
    longAnswer:
      "Coverage follows public camera infrastructure, so famous surf coasts and resort towns carry the most feeds. Zoom into any coastline on the map to see the markers.",
    href: "/world-city-webcams",
  },
  {
    id: "beach-safe-to-swim",
    category: "beach-webcams",
    question: "Can a beach camera tell me if it's safe to swim?",
    shortAnswer:
      "Not by itself. Cameras show surf size and rough water, but flags, patrols and local warnings decide safety — treat the feed as a preview only.",
    longAnswer:
      "Cameras cannot show rip currents reliably or certify water quality. The lifeguard's call and the flag on the beach always win over anything on screen.",
    href: "/beach-webcams",
  },
  {
    id: "beach-watch-the-sunrise",
    category: "beach-webcams",
    question: "Can I watch the sunrise at the beach from home?",
    shortAnswer:
      "Yes. Pick an east-facing coast in the right timezone on WorldEye and open a horizon-facing camera — sunrises and sunsets stream live all day, somewhere.",
    longAnswer:
      "Coastal cameras pointed at the horizon turn the globe into a perpetual golden-hour machine. Dawn patrol surfers use the same feeds for the morning surf check.",
    href: "/beach-webcams",
  },

  // ── Page-specific: /airport-webcams ──────────────────────────────────────
  {
    id: "airport-watch-planes-land",
    category: "airport-webcams",
    question: "Can I watch planes land at the airport live?",
    shortAnswer:
      "Yes, where public cameras cover the field: approach and perimeter feeds show arrivals on final, matched to flight numbers on WorldEye's flight layer.",
    longAnswer:
      "Not every airport has a runway-facing feed — many area cameras watch terminals, roads and parking. The plane-spotting page pairs the best of them with live flight data.",
    href: "/live-plane-spotting",
  },
  {
    id: "airport-check-weather-before-flight",
    category: "airport-webcams",
    question: "How do I check the weather at the airport before my flight?",
    shortAnswer:
      "Open the airport on WorldEye and look at its area cameras: the actual sky, fog and ground conditions over the field, beside the forecast.",
    longAnswer:
      "Cameras show what the weather looks like, not what it will do — for aviation decisions, official aviation weather sources still rule. The camera grounds the forecast in something visible.",
    href: "/weather-tracker",
  },
  {
    id: "airport-terminal-traffic",
    category: "airport-webcams",
    question: "Can airport cameras show me traffic at the terminal?",
    shortAnswer:
      "Yes. Cameras on terminal approach roads and departures curbs show whether traffic is flowing or gridlocked — check before driving in at rush hour.",
    longAnswer:
      "Rental-car return loops and parking structures often have feeds too. A gridlocked curb explains a stressful departure faster than any traffic app's colored line.",
    href: "/live-traffic-cameras",
  },
  {
    id: "airport-who-operates-the-cameras",
    category: "airport-webcams",
    question: "Who operates the airport cameras on WorldEye?",
    shortAnswer:
      "Their owners do — airports, transport agencies, municipalities and nearby businesses publish the feeds openly; WorldEye collects and maps them, operating no cameras itself.",
    longAnswer:
      "That is why views vary: most airport-area feeds were installed for roads, parking or perimeter security, not for planespotters — and they are useful anyway.",
    href: "/cameras",
  },

  // ── Expansion (2026-10-22): trackers, live events, more places, how-tos.
  // Facts verified against the live product and the pages' own copy;
  // per-country counts from src/data/camera-countries.json. No
  // trial-duration claims, no invented figures.
  {
    id: "which-plane-is-flying-over-me",
    category: "track-anything",
    question: "Which plane is flying over my house right now?",
    shortAnswer:
      "Open WorldEye's live flight tracker: planes above you appear on the globe with their altitude, speed, aircraft type and route, updated from ADS-B signals.",
    longAnswer:
      "Tap any aircraft to inspect it. The tracker is free and needs no account.",
    href: "/live-flight-tracker",
  },
  {
    id: "follow-a-specific-flight",
    category: "track-anything",
    question: "How do I follow a specific flight?",
    shortAnswer:
      "Find the flight on WorldEye's live flight tracker and select it to see its position, altitude, speed and route drawn on the globe in real time.",
    longAnswer:
      "Following a flight's route on the map is a Pro feature. The free tracker still shows every airborne plane's live position and telemetry.",
    href: "/live-flight-tracker",
  },
  {
    id: "track-a-cruise-ship",
    category: "track-anything",
    question: "Can I track a cruise ship at sea?",
    shortAnswer:
      "Yes. WorldEye's ship tracker plots vessels at their reported AIS positions with speed, heading and vessel type — cruise ships, tankers and cargo ships included.",
    longAnswer:
      "Watch traffic gather at straits, canals and port approaches as AIS reports arrive. The maritime feed is included with Ultra; the free globe still shows cameras, flights and satellites without an account.",
    href: "/ship-tracker",
  },
  {
    id: "where-was-the-latest-earthquake",
    category: "track-anything",
    question: "Where was the latest earthquake?",
    shortAnswer:
      "WorldEye's earthquake tracker plots earthquakes as they are reported, with each quake's magnitude, depth and location on the globe and in a live list.",
    longAnswer:
      "Open a quake for its full detail page. The same globe layers in wildfires, weather and live cameras near the epicenter.",
    href: "/earthquake-tracker",
  },
  {
    id: "tornado-warnings-live",
    category: "weather-and-nature",
    question: "Where can I see tornado warnings live?",
    shortAnswer:
      "WorldEye's tornado tracker shows live National Weather Service tornado watches and warnings, plus the tornadoes reported to the Storm Prediction Center in recent days.",
    longAnswer:
      "Each watch card names the issuing Weather Service office and the area covered. Pair it with live storm cameras on the globe to see conditions on the ground.",
    href: "/tornado-tracker",
  },
  {
    id: "california-fire-cameras",
    category: "weather-and-nature",
    question: "Where can I see California's fire cameras?",
    shortAnswer:
      "WorldEye's California fire camera page gathers the ALERTCalifornia network — over 1,200 live wildfire cameras across 55 counties — in one searchable grid with county filters.",
    longAnswer:
      "The cameras are live snapshots that refresh about every 15 seconds, labelled honestly as stills rather than video. Active fire incidents link out separately and are never folded into the camera count.",
    href: "/california-fire-cameras",
  },
  {
    id: "wildfires-near-me",
    category: "weather-and-nature",
    question: "How can I check wildfires near me?",
    shortAnswer:
      "Open WorldEye's wildfire tracker to see live fire detections plotted on the globe, then zoom to your area for the cameras and weather around the fire.",
    longAnswer:
      "The tracker follows satellite fire detections as they are published. In California, the fire camera page adds ground-level views from the ALERTCalifornia network.",
    href: "/wildfire-tracker",
  },
  {
    id: "check-weather-anywhere",
    category: "weather-and-nature",
    question: "Can I check live weather anywhere in the world?",
    shortAnswer:
      "Yes. WorldEye's weather tracker shows live radar, storm systems, wind and precipitation sweeping the whole planet on a 3D globe — free, with no signup.",
    longAnswer:
      "Zoom into any region to watch a storm develop and make landfall. The same globe carries the live cameras underneath the weather.",
    href: "/weather-tracker",
  },
  {
    id: "how-many-cameras-in-canada",
    category: "watch-cameras-by-place",
    question: "How many live cameras are there in Canada?",
    shortAnswer:
      "WorldEye lists 4,685 live cameras in Canada. British Columbia is the largest cluster with 1,067, and Ottawa adds 444, many of them road and highway feeds.",
    longAnswer:
      "Canada's dedicated traffic camera page gathers the highway networks in one place. Every provincial cluster is browsable from Canada's country page.",
    href: "/cameras/countries/canada",
    relatedSlugs: ["canada"],
  },
  {
    id: "watch-cameras-taiwan",
    category: "watch-cameras-by-place",
    question: "Can I watch live cameras in Taiwan?",
    shortAnswer:
      "Yes — WorldEye lists 3,243 live cameras in Taiwan, including freeway and city feeds, all plotted on the globe and browsable from Taiwan's country page.",
    longAnswer:
      "Taiwan's feeds come mostly from the national freeway and road agencies, published openly for traffic checks.",
    href: "/cameras/countries/taiwan",
    relatedSlugs: ["taiwan"],
  },
  {
    id: "how-many-cameras-in-the-uk",
    category: "watch-cameras-by-place",
    question: "How many live cameras are there in the United Kingdom?",
    shortAnswer:
      "WorldEye lists 1,403 live cameras in the United Kingdom. London alone accounts for 887 of them, most of them London street and transport cameras.",
    longAnswer:
      "Browse them from the United Kingdom country page, or open London's city page for the capital's full grid.",
    href: "/cameras/countries/united-kingdom",
    relatedSlugs: ["united-kingdom"],
  },
  {
    id: "save-a-camera-for-later",
    category: "worldeye-basics",
    question: "How do I save a camera to watch later?",
    shortAnswer:
      "Create a free WorldEye account, open any camera and save it; your saved cameras gather on your dashboard with previews and one-tap links back to the globe.",
    longAnswer:
      "The dashboard also holds your camera alerts and recordings in one place. Saving needs an account so your list follows you between visits.",
    href: "/dashboard",
  },
  {
    id: "worldeye-vs-earthcam",
    category: "worldeye-basics",
    question: "What's the difference between WorldEye and EarthCam?",
    shortAnswer:
      "EarthCam hand-picks scenic and landmark cameras; WorldEye maps 74,229 public cameras — traffic networks, cities, beaches, airports — on one globe with flights, satellites and weather.",
    longAnswer:
      "EarthCam's own famous feeds stay on EarthCam. WorldEye's directory is built from cameras that agencies, resorts and cities already publish openly.",
    href: "/earthcam-alternative",
  },
  {
    id: "record-a-live-camera",
    category: "plans-and-pricing",
    question: "Can I record a live camera on WorldEye?",
    shortAnswer:
      "Yes, on a paid plan: Pro records up to 20 cameras and Ultra up to 40, and your recordings collect in your dashboard's recordings section.",
    longAnswer:
      "Free accounts can watch every camera live; recording is part of what the paid plans fund. Start from the plans page to compare the limits.",
    href: "/pricing",
  },
  {
    id: "get-alerts-from-a-camera",
    category: "plans-and-pricing",
    question: "Can I get an alert when something changes on a camera?",
    shortAnswer:
      "Yes — Ultra camera alerts check up to 10 chosen cameras on a schedule and notify you when your stated condition appears in the image (Pro covers up to 2).",
    longAnswer:
      "You manage alert rules from your dashboard, alongside your saved cameras and recordings. Alerts are a paid-plan feature — up to 2 cameras on Pro, 10 on Ultra; watching stays free for everyone.",
    href: "/pricing",
  },
];

/** Human-readable labels for every href used by the dataset. */
export const HREF_LABELS: Record<string, string> = {
  "/": "Open the live globe",
  "/cameras": "Camera overview",
  "/cameras/countries/australia": "Australia cameras",
  "/cameras/countries/canada": "Canada cameras",
  "/cameras/countries/japan": "Japan cameras",
  "/cameras/countries/united-states": "United States cameras",
  "/city-webcams/london": "London webcams",
  "/city-webcams/queens": "Queens webcams",
  "/city-webcams/tokyo": "Tokyo webcams",
  "/live-webcams": "Live webcams hub",
  "/world-city-webcams": "Top camera regions",
  "/europe-live-cameras": "Europe live cameras",
  "/beach-webcams": "Beach webcams",
  "/ski-webcams": "Ski webcams",
  "/airport-webcams": "Airport webcams",
  "/northern-lights-webcams": "Northern lights webcams",
  "/volcano-webcams": "Volcano webcams",
  "/dark-sky-cameras": "Dark-sky cameras",
  "/live-traffic-cameras": "Live traffic cameras",
  "/us-traffic-cameras/georgia": "Georgia traffic cameras",
  "/us-traffic-cameras/texas": "Texas traffic cameras",
  "/us-traffic-cameras/utah": "Utah traffic cameras",
  "/japan-traffic-cameras": "Japan traffic cameras",
  "/weather-tracker": "Weather tracker",
  "/hurricane-tracker": "Hurricane tracker",
  "/wildfire-tracker": "Wildfire tracker",
  "/earthquake-tracker": "Earthquake tracker",
  "/live-flight-tracker": "Live flight tracker",
  "/live-plane-spotting": "Live plane spotting",
  "/satellite-tracker": "Satellite tracker",
  "/space-station-tracker": "Space station tracker",
  "/ship-tracker": "Ship tracker",
  "/what-is-ads-b": "What is ADS-B?",
  "/features": "WorldEye features",
  "/pricing": "Plans and pricing",
  "/enterprise": "WorldEye Enterprise",
  "/alternatives/gods-eye-view": "WorldEye vs God's Eye View",
  "/earthcam-alternative": "WorldEye vs EarthCam",
  "/tornado-tracker": "Tornado tracker",
  "/california-fire-cameras": "California fire cameras",
  "/cameras/countries/taiwan": "Taiwan cameras",
  "/cameras/countries/united-kingdom": "United Kingdom cameras",
  "/dashboard": "Your dashboard",
};

const BY_ID = new Map(VOICE_QUESTIONS.map((q) => [q.id, q]));

/** The six hub categories, in display order. */
export const HUB_CATEGORY_IDS: VoiceCategoryId[] = VOICE_CATEGORIES.map((c) => c.id);

export function getVoiceQuestion(id: string): VoiceQuestion {
  const q = BY_ID.get(id);
  if (!q) throw new Error(`Unknown voice question id: ${id}`);
  return q;
}

export function getVoiceQuestionsByIds(ids: string[]): VoiceQuestion[] {
  return ids.map(getVoiceQuestion);
}

export function getVoiceQuestionsByCategory(category: VoiceCategoryId): VoiceQuestion[] {
  return VOICE_QUESTIONS.filter((q) => q.category === category);
}

/** Full answer text used in FAQPage schema: short + long, matching the visible copy. */
export function voiceAnswerText(q: VoiceQuestion): string {
  return `${q.shortAnswer} ${q.longAnswer}`;
}

/** Map dataset entries to the {q, a} shape the directory FaqJsonLd/FaqSection use. */
export function voiceFaqs(ids: string[]): { q: string; a: string }[] {
  return getVoiceQuestionsByIds(ids).map((q) => ({ q: q.question, a: voiceAnswerText(q) }));
}

export function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}
