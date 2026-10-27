/**
 * English live-flight-tracker dictionary — source of truth for the
 * localized flight tracker page. Extracted verbatim 2026-10-26 from
 * src/app/live-flight-tracker/page.tsx; the page body now lives in
 * src/components/pages/LiveFlightTrackerPage.tsx and renders from the
 * dictionary in both locales. Prose with inline <strong>/<Link> markup
 * is modeled as RichText segments (src/i18n/dictionaries/types.ts);
 * internal links carry slugs and resolve through localizedPath().
 *
 * The voice questions merged into this page's FAQ (canonical dataset,
 * src/lib/voice-questions.ts) stay data-owned in English: the route
 * wrappers pass the canonical entries and the body translates them
 * through `voiceQuestions` when the dictionary provides a translation.
 */

import type { RichText } from "../types";
import { ac, lk, st, tx } from "../types";

export interface TrackerVoiceCopy {
  question: string;
  shortAnswer: string;
  longAnswer: string;
}

export interface LiveFlightTrackerCopy {
  meta: {
    title: string;
    description: string;
    ogTitle: string;
    ogDescription: string;
    keywords: string[];
  };
  schema: {
    webPageName: string;
    webPageDescription: string;
  };
  topBar: {
    backToMap: string;
    logoAria: string;
  };
  breadcrumbLabel: string;
  hero: {
    badge: string;
    h1: RichText;
    sub: string;
    ctaPrimary: string;
    freeNote: string;
  };
  oneMap: {
    heading: string;
    body: RichText;
  };
  howItWorks: {
    heading: string;
    paragraphs: RichText[];
  };
  howToUse: {
    heading: string;
    paragraphs: RichText[];
  };
  whatYouSee: {
    heading: string;
    cards: { title: string; body: string }[];
  };
  useCases: {
    heading: string;
    cards: { title: string; body: string }[];
  };
  reading: {
    heading: string;
    paragraphs: RichText[];
  };
  faqHeading: string;
  faqs: { q: string; a: string }[];
  voiceQuestions: Record<string, TrackerVoiceCopy>;
  /** VoiceQA block heading (the component's default is the en value). */
  voiceTitle: string;
  questionsMap: {
    heading: string;
    paragraphs: RichText[];
  };
  proStrip: {
    eyebrow: string;
    heading: string;
    body: RichText;
    cta: string;
  };
  related: { label: string; desc: string }[];
  trust: string[];
}

export const enLiveFlightTracker: LiveFlightTrackerCopy = {
  meta: {
    title: "Watch Flights Live — Free Flight Tracker with Satellite View",
    description:
      "Watch flights live on a free 3D globe with satellite view: real-time position, altitude, speed, aircraft type and routes from live ADS-B data — plus satellites, ships and 74,229 public cameras on the same map. Free — no signup, no account, no cost.",
    ogTitle: "Watch Flights Live — Free Flight Tracker with Satellite View | WorldEye",
    ogDescription:
      "Real-time flight tracking on a free 3D globe: position, altitude, speed, aircraft type and routes from live ADS-B data — plus satellites, ships and 74,229 public cameras on the same map. Free — no signup.",
    keywords: [
      "live flight tracker",
      "flight radar",
      "track flights live",
      "airplane tracker",
      "real time flight tracking",
      "free flight tracker",
    ],
  },
  schema: {
    webPageName: "WorldEye Live Flight Tracker",
    webPageDescription:
      "Track flights live on a free 3D map with satellite view. This airplane tracker shows real-time position, altitude, speed, aircraft type and routes — no signup, no cost.",
  },
  topBar: {
    backToMap: "Back to the map",
    logoAria: "WorldEye — back to the live globe",
  },
  breadcrumbLabel: "Live Flight Tracker",
  hero: {
    badge: "FREE LIVE FLIGHT TRACKER",
    h1: [tx("Track every flight, "), ac("live"), tx(".")],
    sub: "This airplane tracker plots aircraft in real time on a 3D globe — position, altitude, speed and routes. It's a flight radar that costs nothing and asks for nothing: no signup, no account, no paywall.",
    ctaPrimary: "Open live tracker",
    freeNote: "Free forever · No signup",
  },
  oneMap: {
    heading: "One live map for flights — and everything around them",
    body: [
      tx("WorldEye is a free flight tracker with satellite view: "),
      lk("", "watch flights live"),
      tx(" on a 3D globe, with real-time positions from live ADS-B data. The same map also carries "),
      lk("satellite-tracker", "live satellites"),
      tx(", "),
      lk("ship-tracker", "ships at sea"),
      tx(" and "),
      lk("live-webcams", "74,229 public cameras"),
      tx(" — flights, satellites, ships and cameras on one live map, all free, with no signup and no account. For the ground view of the same traffic, "),
      lk("airport-webcams", "airport webcams"),
      tx(" watch the ramps and runways, and "),
      lk("live-plane-spotting", "live plane spotting"),
      tx(" pairs those cameras with the flight layer itself."),
    ],
  },
  howItWorks: {
    heading: "How live flight tracking works",
    paragraphs: [
      [
        tx("Modern aircraft constantly broadcast their identity, GPS position, altitude and speed using a system called "),
        st("ADS-B"),
        tx(" (Automatic Dependent Surveillance–Broadcast). It's a radio signal any receiver on the ground can pick up — no radar dish required."),
      ],
      [
        tx("Thousands of volunteer and commercial receivers around the world listen for those broadcasts and share what they hear. WorldEye aggregates those public feeds and draws every aircraft onto the live 3D map, seconds after it broadcasts."),
      ],
      [
        tx("That's the whole trick behind every service that lets you track flights live. The difference here: the map around it — the globe, the satellites, the weather, the cameras — is free too."),
      ],
    ],
  },
  howToUse: {
    heading: "How to use the flight tracker",
    paragraphs: [
      [
        st("1. Open the map."),
        tx(" The flight layer is part of the free globe — aircraft are drawn as soon as the map loads, denser over busy airspace, thinner over oceans. Zoom toward any region and individual flights resolve out of the flow."),
      ],
      [
        st("2. Click an aircraft."),
        tx(" Selecting a plane shows what the public feed carries for it: flight number or callsign, aircraft type, altitude, ground speed, heading, and its origin and destination where the feed provides them — with the flown path drawn across the map."),
      ],
      [
        st("3. Search instead of hunting."),
        tx(" Basic search is free: type a place or an airport and fly straight to its airspace to see what is arriving, departing and holding overhead. Pro adds advanced search filters for digging through the full data set."),
      ],
      [
        st("4. Put the flight in context."),
        tx(" This is where a globe beats a list: the same screen carries the weather systems the flight is crossing, the live cameras at its destination, and the satellites passing above it. One view, no tab-switching."),
      ],
    ],
  },
  whatYouSee: {
    heading: "What you can see on the tracker",
    cards: [
      {
        title: "Live position",
        body: "Every aircraft's current location, updated in real time as it moves across the globe.",
      },
      {
        title: "Altitude & speed",
        body: "Cruising altitude, ground speed and heading — the telemetry that tells the flight's story.",
      },
      {
        title: "Aircraft type",
        body: "See what kind of plane it is, from wide-body airliners to regional jets and cargo haulers.",
      },
      {
        title: "Route & flight number",
        body: "Origin, destination and flight number, with the flown path drawn across the map.",
      },
    ],
  },
  useCases: {
    heading: "Who uses a live flight tracker",
    cards: [
      {
        title: "Aviation enthusiasts",
        body: "Follow interesting traffic, watch holding patterns over your city, and learn the rhythms of the sky above you.",
      },
      {
        title: "Airport pickups",
        body: "Check whether an inbound flight is on time, circling, or delayed — before you leave for the airport.",
      },
      {
        title: "Planespotters",
        body: "Pair the live map with your eyes (or a camera): know what's overhead before you hear it.",
      },
    ],
  },
  reading: {
    heading: "Reading a flight like a controller",
    paragraphs: [
      [
        st("Altitude"),
        tx(" is reported in feet above sea level; airliners cruise roughly between 30,000 and 42,000 feet. A steady altitude with a falling ground speed usually means descent has begun. "),
        st("Ground speed"),
        tx(" is speed over the ground, not through the air — a strong jet stream can push an eastbound airliner past 1,000 km/h over the ground while its airspeed stays ordinary. "),
        st("Heading"),
        tx(" is where the nose points; the drawn path is where it has actually been, and in crosswinds the two differ slightly."),
      ],
      [
        tx("Patterns tell stories: a neat racetrack shape is a holding pattern (weather or congestion at the destination), a sudden descent to a nearby airport is a diversion, and a long straight line at an odd hour is usually a cargo flight — the night sky belongs to freight. And the honest limits: coverage follows receiver density, some flights are filtered or delayed at the source, and positions over remote oceans can be minutes apart. The tracker shows the public picture of the sky, which is remarkably complete — but it is not a navigation or safety tool, and pilots and controllers work from regulated feeds, not this map."),
      ],
    ],
  },
  faqHeading: "Flight tracker FAQ",
  faqs: [
    {
      q: "Is the live flight tracker free?",
      a: "Yes — completely free, forever. The flight tracking layer is part of WorldEye's free map, alongside the 3D globe, satellites, weather, earthquakes and 74,229 public cameras. No account, no credit card, no trial countdown.",
    },
    {
      q: "Do I need an account to track flights?",
      a: "No. Open the map and the aircraft are already there. Accounts exist only for Pro subscribers and affiliates — never as a gate in front of the free map.",
    },
    {
      q: "How does live flight tracking work?",
      a: "Most aircraft broadcast their position, altitude and speed using ADS-B transponders. A global network of receivers picks up those broadcasts, and the aggregated data is plotted on the map in near real time. It's the same principle behind every flight radar service.",
    },
    {
      q: "How accurate is the tracking?",
      a: "Positions come from the aircraft's own broadcasts, so they're typically accurate to within seconds of real time. Coverage depends on receiver density — busy airspace is near-instant, remote oceanic regions may update less frequently.",
    },
    {
      q: "Can I track military or private jets?",
      a: "If an aircraft is broadcasting ADS-B and is within receiver coverage, it appears on the map — including many private jets. Some military and sensitive flights don't broadcast or are filtered at the source, so they won't show up. What you see is whatever the public data feeds carry.",
    },
    {
      q: "Why did a plane disappear mid-flight?",
      a: "Usually it left receiver coverage — over an ocean, a desert or a polar region, gaps between ground receivers are real, and an aircraft can drop off the public picture until it flies back into range. It can also mean the aircraft landed, its transponder stopped reporting, or the feed filtered it. A gap on the map is a gap in public data, not an event in the sky.",
    },
  ],
  voiceQuestions: {},
  voiceTitle: "Questions people ask",
  questionsMap: {
    heading: "Questions the map answers in seconds",
    paragraphs: [
      [
        st("“What is that plane overhead?”"),
        tx(" Point the globe at your neighborhood, tap the aircraft passing above you, and read its flight number, type and route — the five-second version of planespotting, from your couch."),
      ],
      [
        st("“Is the flight I'm meeting on time?”"),
        tx(" Find it by route, look at where it actually is and whether it is holding or descending. The map shows the aircraft's live position — for gate times and official status, the airline's own updates remain the source of truth."),
      ],
      [
        st("“What does the sky over a big event look like?”"),
        tx(" Fly to any city on a headline day and watch the traffic react in real time: diversions around storms, holds stacking up over a hub, the cargo fleet rolling out at night. News tells you what happened; the tracker lets you watch it happen."),
      ],
    ],
  },
  proStrip: {
    eyebrow: "WANT MORE THAN TRACKING?",
    heading: "Pro adds an AI analyst that works the map for you",
    body: [
      tx("The flight tracker is free forever. "),
      lk("pricing", "WorldEye Pro"),
      tx(" adds the OI AI assistant, live traffic, advanced search filters and premium intel feeds — from $7.99/week."),
    ],
    cta: "See Pro plans",
  },
  related: [
    {
      label: "Satellite tracker",
      desc: "Thousands of satellites overhead — the ISS, Starlink and more, live.",
    },
    {
      label: "Earthquake tracker",
      desc: "Quakes as they happen — magnitude, depth and location on the live map.",
    },
    {
      label: "Live cameras",
      desc: "74,229 public cameras — watch the streets below the flight paths.",
    },
    {
      label: "All features",
      desc: "Everything WorldEye can do — free forever layers and Pro tools.",
    },
    {
      label: "Live plane spotting",
      desc: "Airport cameras matched to the live flight layer — watch arrivals and departures on approach.",
    },
    {
      label: "Ship tracker",
      desc: "Live vessel traffic on the same globe — ports, shipping lanes and the open ocean.",
    },
  ],
  trust: ["Free forever", "No signup required", "Public ADS-B data"],
};
