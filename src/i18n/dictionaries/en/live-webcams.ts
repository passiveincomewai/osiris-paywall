/**
 * English live-webcams dictionary — source of truth for the localized
 * /live-webcams hub (dictionaries/<locale>/live-webcams.ts translate
 * THIS file). Extracted verbatim 2026-10-26 from
 * src/app/live-webcams/page.tsx; the page body now lives in
 * src/components/pages/LiveWebcamsPage.tsx and renders from the
 * dictionary in both locales.
 *
 * Catalogue numbers are NOT copy: {count} is the served headline
 * (74,229), {countries} the country-index length, {topCount} the
 * largest country's count and {europeCount} the Europe scope size —
 * the body fills them from src/lib/explore-data at render time and
 * formats them for the locale.
 */

export interface LiveWebcamsCopy {
  meta: {
    title: string;
    description: string;
    ogTitle: string;
    ogDescription: string;
  };
  schema: {
    name: string;
    description: string;
  };
  topBar: {
    camerasLink: string;
    logoAria: string;
  };
  hero: {
    badge: string;
    h1Before: string;
    h1Accent: string;
    intro1: string;
    intro2: string;
  };
  search: {
    label: string;
    placeholder: string;
    emptyText: string;
    scopeLabel: string;
    explorerPlaceholder: string;
  };
  quickAnswersLabel: string;
  topAnswers: { q: string; a: string }[];
  features: { title: string; desc: string }[];
  topTable: {
    heading: string;
    subBefore: string;
    subLink: string;
    subAfter: string;
    countryHeader: string;
    camerasHeader: string;
  };
  explorer: {
    heading: string;
    sub: string;
  };
  exploreHeading: string;
  exploreCards: { title: string; desc: string }[];
  earn: {
    heading: string;
    paragraphs: string[];
  };
  indexLink: {
    before: string;
    link: string;
    after: string;
  };
  directAnswers: { q: string; a: string }[];
  faqsHeading: string;
  faqs: { q: string; a: string }[];
  cta: {
    headingBefore: string;
    headingAccent: string;
    sub: string;
    primaryCta: string;
    secondaryCta: string;
  };
}

export const enLiveWebcams: LiveWebcamsCopy = {
  meta: {
    title: "Live Cams — Watch 74,229 Live Webcams Worldwide",
    description:
      "Watch live cams around the world: 74,229 live webcams in {countries} countries — traffic, cities, beaches, nature and landmarks. Free forever, no signup.",
    ogTitle: "Live Cams — Watch 74,229 Live Webcams Worldwide | WorldEye",
    ogDescription:
      "Watch live cams from around the world — 74,229 live webcams across {countries} countries: traffic, cities, nature, landmarks. Free forever, no signup.",
  },
  schema: {
    name: "Live Cams — Watch 74,229 Live Webcams Worldwide",
    description:
      "Directory of {count} live public webcams across {countries} countries.",
  },
  topBar: {
    camerasLink: "Cameras",
    logoAria: "WorldEye — back to the live globe",
  },
  hero: {
    badge: "LIVE WEBCAM DIRECTORY",
    h1Before: "Live Cams Worldwide — {count} live webcams. ",
    h1Accent: "One World.",
    intro1:
      "This is the hub of the WorldEye camera directory: {count} publicly available live webcams from {countries} countries, collected and mapped so you can watch the planet in real time. Live cams from highways and intersections, city streets and plazas, beaches, ski resorts, harbors and wilderness — whatever the world points a public camera at.",
    intro2:
      "The United States alone contributes {topCount} feeds, from statewide DOT networks to dense metro corridors. Every camera here is free to watch — no account, no signup, ever.",
  },
  search: {
    label: "the whole directory",
    placeholder: "Search anywhere — try a city…",
    emptyText: 'No places in the directory match "{value}".',
    scopeLabel: "the whole world",
    explorerPlaceholder: "Search all cameras — a city, a beach, a highway…",
  },
  quickAnswersLabel: "Quick answers",
  topAnswers: [
    {
      q: "What is WorldEye?",
      a: "WorldEye is a free website that puts {count} live public cameras from {countries} countries on one interactive 3D globe. Spin the globe, search any place, and tap a camera marker to watch — traffic, cities, beaches, ski resorts, airports, landmarks and nature, right in your browser, with no download.",
    },
    {
      q: "What else can I watch besides cameras?",
      a: "The same globe carries live flights, satellites including the ISS, ships on AIS, weather radar, earthquakes and wildfires — one live map of the planet, not just a camera directory. Each tracker has its own page, and every layer is free to browse.",
    },
    {
      q: "How does watching for free work — do I need an account?",
      a: "No account is needed to start: every device gets 5 free camera opens on the globe. Verify your email and you get 5 more, and a free account brings the total to 15 opens. Browsing this directory, the map and the other live layers is never capped, and paid plans remove the camera-open limit entirely.",
    },
  ],
  features: [
    {
      title: "One globe, every feed",
      desc: "Instead of hunting through hundreds of agency websites, every public camera is plotted on a 3D earth you can spin, zoom and search.",
    },
    {
      title: "Built for curiosity",
      desc: "Check a typhoon in Taiwan, a ski lift in Austria or rush hour in Houston — the directory turns the planet into a browsable, watchable place.",
    },
    {
      title: "Honest about sources",
      desc: "These are public streams their operators already publish openly. WorldEye collects and maps them — it doesn't spy, and it doesn't need your account.",
    },
  ],
  topTable: {
    heading: "Where the cameras are",
    subBefore: "The ten countries with the most live feeds in the directory. ",
    subLink: "See all {countries} countries",
    subAfter: ".",
    countryHeader: "Country",
    camerasHeader: "Live cameras",
  },
  explorer: {
    heading: "Watch the directory live",
    sub: "Every camera in the index, as its real live feed — filter by place, search by name, and jump from any card to the same spot on the globe.",
  },
  exploreHeading: "Explore the directory",
  exploreCards: [
    {
      title: "Cameras by country",
      desc: "All {countries} countries ranked by camera count, with each nation's busiest region.",
    },
    {
      title: "Top 25 camera regions",
      desc: "The busiest metro areas, states and highway corridors in the world — from Georgia to Madrid.",
    },
    {
      title: "US traffic cameras",
      desc: "{topCount} DOT and public road feeds — check your route before you drive.",
    },
    {
      title: "Europe live cameras",
      desc: "{europeCount} European countries, from Spanish plazas to Icelandic highlands.",
    },
    {
      title: "Sunrise around the world",
      desc: "A living page that rides the dawn line: live cameras where the sun is rising right now, recomputed every minute — with a sunset mode for the dusk line.",
    },
    {
      title: "Live flight tracker",
      desc: "The same globe, one layer up: flights in the sky right now, with satellites and ships moving alongside the cameras.",
    },
  ],
  earn: {
    heading: "How a feed earns its place in the directory",
    paragraphs: [
      "The directory is not scraped together and left to rot. A camera gets listed when three things check out: the feed is genuinely public — published openly by its operator for anyone to watch; it actually plays, verified by loading the stream rather than trusting a listing; and it isn't already in the directory under another name or network, which matters when one agency feed surfaces through five different portals.",
      "That discipline is why the counts on this page mean something. The number is the set of cameras the globe serves today — not every webcam ever found, not a scrape of a scrape. Feeds die, move and get replaced, and the directory's job is to keep the map's promise: if it is plotted, it plays.",
    ],
  },
  indexLink: {
    before: "Every count behind this directory is published in the ",
    link: "Live Camera Index",
    after: " — the dated, downloadable dataset (served vs indexed, by country, city and publisher) that these numbers trace to.",
  },
  directAnswers: [
    {
      q: "Can I watch live cameras for free?",
      a: "Yes — live cameras on WorldEye are free to watch in your browser, with no account and no signup. The free plan includes 5 camera opens on the globe; the directory itself is free to browse, and optional paid plans remove the open limit.",
    },
    {
      q: "Where can I watch live webcams from around the world?",
      a: "WorldEye shows 74,229 live public webcams from 109 countries on one free interactive globe you can spin, search and zoom. Browse by country or city in the directory, or open the map and tap any camera marker — traffic, beaches, ski resorts, airports, landmarks and nature.",
    },
    {
      q: "Where can I watch live cams near me?",
      a: "Search your town or area in the directory search above, or open the live globe and zoom to where you are: WorldEye plots {count} public cameras across {countries} countries, so the cameras near you are the ones already mapped there — traffic and street cameras, city squares, beaches and landmarks. Coverage follows the public feeds each area publishes, so dense networks (the US DOT states, much of Europe) show hundreds nearby, while a rural area may show the nearest covered town instead.",
    },
    {
      q: "How many live cameras are there in the world?",
      a: "Nobody publishes an exact count of every webcam on Earth, but WorldEye serves 74,229 live cameras. The United States alone accounts for 41,355 of them, largely transportation-department networks. Every feed is checked before it is listed, so the number counts cameras you can actually watch.",
    },
  ],
  faqsHeading: "Live webcam FAQs",
  faqs: [
    {
      q: "How many live webcams does WorldEye have?",
      a: "The directory currently serves {count} live public cameras across {countries} countries — from US DOT highway systems to city squares, beaches and mountain resorts. The count grows as new public feeds are found and mapped.",
    },
    {
      q: "Is it really free to watch?",
      a: "Yes. Cameras will never sit behind a paywall — every feed on the map is free for everyone, forever, with no account and no signup. The optional Pro plan funds the infrastructure that keeps the directory running.",
    },
    {
      q: "Where can I find cameras for a specific country?",
      a: "The camera directory lists every country with its camera count and busiest region, and every country now has a dedicated page with its full city breakdown — start with the country table or search any place on the live map.",
    },
    {
      q: "Are there live cameras near me?",
      a: "Probably, if your area publishes public feeds. The fastest check is the search on this page: type your city or area and the directory lists the cameras there; the country directory and the Top 25 regions also show where the densest networks run. On the live globe you can zoom straight to your neighbourhood and tap any camera marker. Where no public feed exists nearby, the directory shows the closest covered town rather than pretending otherwise.",
    },
    {
      q: "What kinds of cameras are in the directory?",
      a: "Mostly traffic and highway cameras from transport agencies, plus city street cameras, beach and coastal feeds, ski resort and mountain cameras, harbor views, and plaza webcams. Whatever the world points a public camera at, the directory tries to index.",
    },
    {
      q: "Can I check road conditions before a trip?",
      a: "That is the most practical use. Highway and traffic cameras show congestion, crashes, weather, and road work live — check the route's cameras before leaving rather than discovering the jam from inside it.",
    },
    {
      q: "Do the cameras work on mobile?",
      a: "Yes. The live map and all camera feeds work in mobile browsers — no app download needed. Open the map, zoom to where you want to look, and tap a camera marker.",
    },
    {
      q: "Why do some cameras go offline?",
      a: "Operators maintain, move, or retire their cameras, and network outages happen. The directory re-checks feeds and drops dead ones; with tens of thousands indexed, alternatives are usually nearby.",
    },
    {
      q: "Can I request cameras for my area?",
      a: "The directory grows as public feeds are found and mapped. If your city or agency publishes open cameras, they are candidates for indexing — the fastest-growing regions are the ones publishing openly.",
    },
    {
      q: "How is the directory kept honest?",
      a: "Every feed is checked to make sure it actually plays before it is listed — a camera that doesn't stream doesn't get counted — and the directory re-checks and deduplicates feeds over time. The headline number is the count of cameras the globe actually serves, which is why it is exact rather than a round marketing figure.",
    },
    {
      q: "What is the difference between this page and the map?",
      a: "This page is the directory: the counts, the countries, the structure of the network. The map is the directory alive — every one of these cameras plotted where it stands, with flights, weather and the other live layers around it. Browse here to understand the network; open the map to use it.",
    },
  ],
  cta: {
    headingBefore: "The world is ",
    headingAccent: "live right now.",
    sub: "Spin the globe, pick a continent, and start watching. Free forever — no account, no signup.",
    primaryCta: "Watch live webcams",
    secondaryCta: "Camera overview",
  },
};
