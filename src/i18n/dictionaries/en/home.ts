/**
 * English homepage dictionary — the source of truth for the localized
 * homepage (dictionaries/<locale>/home.ts translate THIS file).
 *
 * Every string below was extracted verbatim from the components that
 * render the homepage today: the root layout's metadata defaults
 * (src/app/(en)/layout.tsx), HomeSeoShell and the landing sections
 * under src/components/landing/, and src/lib/home-faqs.ts. The English
 * homepage renders from this dictionary, so the English text is the
 * versioned source the manifest's sourceHash is computed over.
 *
 * Re-extracted 2026-10-26 against the current components. Two factual
 * corrections ride along (flagged in the build REPORT): the trial line
 * and FAQ trial terms now match src/lib/billing/trials.ts (weekly =
 * 3 days, monthly/annual = 10 days — PlansCards and home-faqs still
 * carry stale trial text), and satellite imagery is no longer listed
 * as a Pro feature (the satellite view is free for everyone since the
 * globe-chrome ship; the pricing page already presents it that way).
 *
 * Factual tokens (74,229 cameras; $7.99 / $13.99 / $74.99 prices; 109
 * countries; 41,355 / 10,472 country counts) are glossary-locked —
 * translations copy them unchanged (see src/i18n/glossary.ts).
 */

export interface HomeFaq {
  q: string;
  a: string;
}

export interface HomeCopy {
  /** <title> for the localized homepage (the layout's English default). */
  metaTitle: string;
  metaDescription: string;
  ogTitle: string;
  ogDescription: string;
  /** aria-label of the shell section. */
  shellLabel: string;
  cameras: {
    ariaLabel: string;
    eyebrow: string;
    h1: string;
    h2: string;
    sub: string;
    ctaGlobe: string;
    ctaSignup: string;
    ctaPricing: string;
    /** Labels for CAMERA_CATEGORIES in CamerasSection (hrefs stay in code). */
    categoryLabels: string[];
    exploreLink: string;
    /** The second directory link, to /live-webcams. */
    webcamsLink: string;
  };
  directAnswers: {
    label: string;
    items: HomeFaq[];
  };
  tracking: {
    ariaLabel: string;
    eyebrow: string;
    title: string;
    sub: string;
    stageAlt: string;
    ctaFlight: string;
    satelliteLink: string;
  };
  hazards: {
    ariaLabel: string;
    eyebrow: string;
    title: string;
    sub: string;
    exploreLink: string;
    earthquakeLink: string;
    wildfireLink: string;
  };
  osint: {
    ariaLabel: string;
    eyebrow: string;
    title: string;
    sub: string;
    proBadge: string;
    /** Cards in OSINT_CARDS order (slug/href stay in code). */
    cards: { title: string; desc: string }[];
    exploreLink: string;
  };
  plans: {
    ariaLabel: string;
    eyebrow: string;
    title: string;
    compareBefore: string;
    compareLink: string;
    compareAfter: string;
    pricingLink: string;
    freeTitle: string;
    freePriceLine: string;
    freeRows: string[];
    freeCta: string;
    popularBadge: string;
    proTitle: string;
    proPriceLine: string;
    proTrialsLine: string;
    proRows: string[];
    proCta: string;
  };
  faq: {
    ariaLabel: string;
    eyebrow: string;
    title: string;
    items: HomeFaq[];
    contactBefore: string;
    contactEmailLink: string;
    contactMiddle1: string;
    contactPageLink: string;
    contactMiddle2: string;
    contactAboutLink: string;
    contactAfter: string;
  };
  /** The homepage passes these headline strings to SiteFooter. */
  footerHeadline: string;
  footerSub: string;
}

export const enHome: HomeCopy = {
  metaTitle: "WorldEye — Live Cams, Flights & Satellites on a 3D Globe",
  metaDescription:
    "Watch 74,229 live cams, track flights live and follow satellites on WorldEye's free 3D globe — no signup. Go Pro for the AI analyst and live traffic — Ultra adds the premium intel feeds.",
  ogTitle:
    "WorldEye — Live 3D Globe | Live Cams, Flights, Satellites & OSINT Tools",
  ogDescription:
    "Watch 74,229 live cams, track live aircraft and satellites on a free 3D globe. Go Pro for the AI analyst and live traffic — Ultra adds the premium intel feeds.",
  shellLabel: "About WorldEye",
  cameras: {
    ariaLabel: "Live cameras",
    eyebrow: "WORLDEYE — LIVE PLANETARY INTELLIGENCE",
    h1: "WorldEye — the world, live on one globe",
    h2: "74,229 Live Cameras. One World.",
    sub: "Watch live cams from cities, highways, mountains, beaches, and landmarks around the planet — every camera has a share link, so you can send someone straight to the exact view.",
    ctaGlobe: "Explore the live globe",
    ctaSignup: "Get started free",
    ctaPricing: "See Pro plans",
    categoryLabels: [
      "Cities",
      "Ski Resorts",
      "Beaches",
      "Highways",
      "Mountains",
      "Airports",
    ],
    exploreLink: "Explore Live Cameras",
    webcamsLink: "Live cams worldwide",
  },
  directAnswers: {
    label: "Quick answers",
    items: [
      {
        q: "What is WorldEye?",
        a: "WorldEye is a free website that puts a live 3D globe of Earth in your browser — 74,229 public cameras, live flights, satellites, weather, earthquakes and wildfires on one map. There is nothing to install and no account needed to look around. Paid plans add an AI analyst, camera recording and alerts; Ultra adds the premium intelligence layers.",
      },
      {
        q: "How many live cameras can I watch on WorldEye?",
        a: "You can watch 74,229 live public cameras on WorldEye, plotted on one globe from 109 countries. The United States contributes the most — 41,355 cameras, largely state transportation-department networks — followed by Japan with 10,472. The mix covers highways, city streets, beaches, ski resorts, airports, harbors and nature reserves.",
      },
      {
        q: "Is WorldEye free?",
        a: "Yes — the globe, all the cameras, flight and satellite tracking, weather, earthquakes and basic search are free, and you never need an account to browse. The free plan includes 5 camera opens on the globe. Optional paid plans — Weekly at $7.99, Monthly at $13.99 and VIP Pro at $74.99 a year — remove that limit and add the AI analyst and camera recording; Ultra adds the premium intel layers.",
      },
    ],
  },
  tracking: {
    ariaLabel: "Flight, satellite and maritime tracking",
    eyebrow: "Live Tracking",
    title: "Track the Planet in Motion.",
    sub: "Follow aircraft, satellites, maritime activity and live transit from one interactive platform.",
    stageAlt: "Earth from orbit with live tracking overlays in WorldEye",
    ctaFlight: "Live flight tracker",
    satelliteLink: "Satellite tracker",
  },
  hazards: {
    ariaLabel: "Weather, wildfires and earthquakes",
    eyebrow: "Earth Systems",
    title: "Watch the World Change.",
    sub: "Follow storms, wildfires, earthquakes, and environmental activity as data becomes available.",
    exploreLink: "Explore Live Weather",
    earthquakeLink: "Earthquake tracker",
    wildfireLink: "Wildfire tracker",
  },
  osint: {
    ariaLabel: "Professional OSINT toolkit",
    eyebrow: "Pro Toolkit",
    title: "Your Global Intelligence Command Center.",
    sub: "Powerful monitoring and research tools, together in one place.",
    proBadge: "PRO",
    cards: [
      {
        title: "Satellite Maps",
        desc: "Full-screen satellite imagery on the globe.",
      },
      {
        title: "Maritime Tracking",
        desc: "Ships, ports and naval movements, live.",
      },
      {
        title: "Advanced Search",
        desc: "Pro filters across places, cameras and intel — basic search is free.",
      },
      {
        title: "Cyber Intelligence",
        desc: "Malware, botnets and outages as they surface.",
      },
      {
        title: "Camera Recording",
        desc: "Record clips from live cameras in your browser.",
      },
    ],
    exploreLink: "Explore Pro Features",
  },
  plans: {
    ariaLabel: "Free and Pro plans",
    eyebrow: "Plans",
    title: "Free to Explore. Pro When You Want More.",
    compareBefore: "Comparing tools?",
    compareLink: "See how WorldEye compares to God's Eye View",
    compareAfter: ".",
    pricingLink: "Compare plans on the pricing page",
    freeTitle: "Free",
    freePriceLine: "$0 — no account needed",
    freeRows: [
      "Interactive 3D globe",
      "74,229 public cameras",
      "Flight & satellite tracking",
      "Basic search — fly to any place",
      "Transit, launches & street level",
      "Weather, earthquakes & fires",
      "Cameras: 5 free opens per device",
    ],
    freeCta: "Get Started Free",
    popularBadge: "MOST POPULAR",
    proTitle: "Pro",
    proPriceLine: "Weekly $7.99 · Monthly $13.99 · VIP Pro $74.99",
    proTrialsLine: "Free trials: 3 days on weekly · 10 days on monthly & annual",
    proRows: [
      "Unlimited camera opens",
      "Live traffic layer",
      "Advanced search filters",
      "OSINT toolkit",
      "Premium intel layers & live feeds (Ultra)",
      "Camera Recording Studio",
      "Camera timelapse (Ultra)",
    ],
    proCta: "See Pro Plans",
  },
  faq: {
    ariaLabel: "Frequently asked questions",
    eyebrow: "FAQ",
    title: "Frequently asked questions",
    items: [
      {
        q: "Is WorldEye really free?",
        a: "Yes. The live globe — the map, 74,229 public cameras, flight and satellite tracking, live transit, weather radar, earthquakes, wildfires and basic search — is free to use with no account. WorldEye Pro is an optional subscription that adds the AI analyst, the live traffic layer and advanced search filters; Ultra adds the premium intelligence feeds.",
      },
      {
        q: "Do I need an account to use WorldEye?",
        a: "No. Just open the site and you are looking at the planet. Accounts are free — subscribers use them for billing, affiliates for their links, and members get extra camera opens — never as a gate in front of the map.",
      },
      {
        q: "How is WorldEye different from Google Earth?",
        a: "Google Earth shows the recorded past; WorldEye shows right now. It fuses live streams — aircraft, satellites, weather, earthquakes, wildfires and 74,229 public cameras — onto one 3D globe that updates in real time.",
      },
      {
        q: "What does WorldEye Pro include, and what does it cost?",
        a: "Pro adds the OI AI analyst, the live traffic layer, advanced search filters and the camera recording studio. Ultra adds premium intel feeds such as cyber threats, maritime tracking and a live news feed, plus camera timelapse. Plans are weekly at $7.99, monthly at $13.99 and annual at $74.99. The weekly plan starts with a 3-day free trial, the monthly and annual plans start with a 10-day free trial, and you can cancel anytime in one click.",
      },
      {
        q: "Where do the live cameras come from?",
        a: "WorldEye aggregates publicly available camera feeds from around the world — traffic, city streets, landmarks and nature — into one browsable layer on the globe. They are third-party public sources, so individual feeds can go offline and coverage varies by region.",
      },
      {
        q: "Can anyone watch public street cameras?",
        a: "Yes — anyone. Every camera on WorldEye is a feed its operator already publishes openly on the web: transport departments, cities, resorts and parks put them online for the public to view. WorldEye gathers them onto one map; it never unlocks, intercepts or accesses a private camera.",
      },
      {
        q: "Are the cameras really live?",
        a: "The feeds are live sources. Many stream real-time video; others, including much of the DOT networks, refresh a still image every minute or two — current either way, and each feed carries its timestamp. A camera whose source stops updating is marked unavailable, never replayed from a recording.",
      },
      {
        q: "Does WorldEye work on my phone?",
        a: "Yes. WorldEye runs in any modern browser — Chrome, Edge, Firefox and Safari — on desktop and mobile. There is nothing to install; just open worldeye.app.",
      },
    ],
    contactBefore: "Questions? Talk to a human —",
    contactEmailLink: "email us",
    contactMiddle1: ", use the",
    contactPageLink: "contact page",
    contactMiddle2: ", or read",
    contactAboutLink: "about WorldEye",
    contactAfter: ".",
  },
  footerHeadline: "Stay Ahead of the World.",
  footerSub:
    "Get platform updates, new intelligence layers, and important announcements.",
};
