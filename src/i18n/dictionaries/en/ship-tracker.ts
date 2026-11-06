/**
 * English ship-tracker dictionary — source of truth for the localized
 * ship tracker page. Extracted verbatim 2026-10-26 from
 * src/app/ship-tracker/page.tsx; the page body now lives in
 * src/components/pages/ShipTrackerPage.tsx and renders from the
 * dictionary in both locales. Headings with a highlighted span are
 * RichText segments; internal links carry slugs and resolve through
 * localizedPath(). Voice questions merge through the canonical
 * dataset exactly as on the flight tracker page.
 */

import type { RichText } from "../types";
import { ac, lk, tx } from "../types";
import type { TrackerVoiceCopy } from "./live-flight-tracker";

export interface ShipTrackerCopy {
  meta: {
    title: string;
    description: string;
    ogTitle: string;
    ogDescription: string;
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
    cta: string;
  };
  oneMap: {
    heading: string;
    body: RichText;
  };
  dataPoints: {
    heading: RichText;
    cards: { title: string; desc: string }[];
  };
  howItWorks: {
    heading: RichText;
    paragraphs: RichText[];
  };
  useCases: {
    heading: RichText;
    cards: { title: string; desc: string }[];
  };
  cruiseShips: {
    heading: RichText;
    body: string;
    whereIs: string;
    browseAll: string;
  };
  faqHeading: RichText;
  faqs: { q: string; a: string }[];
  voiceQuestions: Record<string, TrackerVoiceCopy>;
  /** VoiceQA block heading (the component's default is the en value). */
  voiceTitle: string;
  closingCta: {
    heading: RichText;
    sub: string;
    cta: string;
    exploreBefore: string;
    exploreLink: string;
  };
  related: { label: string; desc: string }[];
}

export const enShipTracker: ShipTrackerCopy = {
  meta: {
    title: "Live Ship Tracker — Marine Vessel Tracking",
    description:
      "Track ships on a 3D globe: position, speed, heading and vessel type via AIS — a live position whenever a ship is reporting. The maritime feed is included with Ultra; the globe itself is free.",
    ogTitle: "Live Ship Tracker | WorldEye",
    ogDescription:
      "Ships on a 3D globe — position, speed, heading and vessel type via AIS, with a live position whenever a ship is reporting. The maritime feed is included with Ultra.",
  },
  schema: {
    webPageName: "WorldEye Live Ship Tracker",
    webPageDescription:
      "Track ships on a 3D globe: position, speed, heading and vessel type via AIS, with a live position whenever a ship is reporting. Maritime vessel tracking on WorldEye.",
  },
  topBar: {
    backToMap: "Back to the map",
    logoAria: "WorldEye — back to the live globe",
  },
  breadcrumbLabel: "Ship Tracker",
  hero: {
    badge: "MARITIME DATA VIA AIS",
    h1: [tx("The oceans, "), ac("live.")],
    sub: "A ship tracker on a 3D globe. Vessels plotted from AIS transponder broadcasts — position, speed, heading and type — with a live position whenever a ship is reporting; when a ship isn't reporting, the page says so instead of guessing. Ports and chokepoints add context.",
    cta: "Unlock the maritime feed with Ultra",
  },
  oneMap: {
    heading: "One live map for ships — and everything around them",
    body: [
      tx("WorldEye's ship tracker plots vessels from AIS transponder broadcasts — position, speed, heading and ship type — showing a live position whenever a ship is reporting, and saying so when a ship (or the feed) isn't reporting instead of guessing, on the same 3D globe as its free "),
      lk("live-flight-tracker", "live flights"),
      tx(", "),
      lk("satellite-tracker", "satellites"),
      tx(" and "),
      lk("live-webcams", "74,229 public cameras"),
      tx(". Follow a vessel to its destination and you can "),
      lk("port-webcams", "watch the same ships arrive on port cameras"),
      tx(". The globe itself is free with no signup; maritime tracking is one of the premium intel feeds included with "),
      lk("pricing", "an Ultra subscription"),
      tx("."),
    ],
  },
  dataPoints: {
    heading: [tx("What you see for "), ac("every vessel")],
    cards: [
      {
        title: "Position",
        desc: "Every reporting vessel plotted at its reported location — watch traffic bunch up at straits, canals and port approaches as AIS reports arrive.",
      },
      {
        title: "Speed",
        desc: "Reported speed over ground, so you can tell a full-steam container ship apart from a tanker idling at anchor.",
      },
      {
        title: "Heading",
        desc: "Direction of travel for each reporting vessel, making it easy to read which way a shipping lane is actually flowing.",
      },
      {
        title: "Vessel type",
        desc: "Container ships, tankers, bulk carriers, passenger ferries, tugs and fishing boats — each categorized by what it is.",
      },
      {
        title: "Destination & port",
        desc: "Where vessels report they're headed, alongside ports and maritime chokepoints plotted on the globe.",
      },
      {
        title: "Updates as reports arrive",
        desc: "Positions update as new AIS reports arrive. When a vessel — or the feed itself — isn't reporting, the page says so instead of guessing a position.",
      },
      {
        title: "Vessel identity",
        desc: "AIS broadcasts each ship's identity — name, call sign and MMSI number — so the dot on the map is a real, registered vessel, not an anonymous blip.",
      },
      {
        title: "Underway vs. at anchor",
        desc: "Speed and status tell the story: a container ship making 20 knots versus one sitting at anchor outside the port, waiting for a berth. Congestion becomes visible.",
      },
      {
        title: "Chokepoint context",
        desc: "Straits, canals and port approaches are marked on the globe, so you can see why fifty ships are queuing in one narrow stretch of water.",
      },
    ],
  },
  howItWorks: {
    heading: [tx("How ship tracking "), ac("works")],
    paragraphs: [
      [
        tx("Nearly every large vessel at sea carries an AIS transponder — Automatic Identification System. It continuously broadcasts the ship's identity, position, speed, heading and intended destination over VHF radio, primarily so nearby ships and port authorities know what's around them."),
      ],
      [
        tx("A global network of shore-based receivers and satellites picks up those broadcasts and publishes them as open data feeds. WorldEye takes that stream and plots each reporting vessel on the same 3D globe as everything else: flights overhead, storms forming, satellites passing by, and the ports themselves marked with chokepoint context. Positions update as new AIS reports arrive; when a ship or the feed isn't reporting, the page says so instead of guessing."),
      ],
      [
        tx("The maritime feed — full vessel traffic with port and chokepoint intelligence — is part of the "),
        lk("pricing", "Pro intel toolkit"),
        tx(". The rest of the globe, including live flights and 74,229 public cameras, is free for everyone with no account."),
      ],
      [
        tx("What AIS doesn't show matters too. Small craft, fishing boats and military vessels often don't broadcast — or broadcast only intermittently — so an empty stretch of water isn't proof of empty water. And a vessel's reported destination is entered by the crew; it's usually right and occasionally aspirational. Read the traffic, not just the labels."),
      ],
    ],
  },
  useCases: {
    heading: [tx("Why people "), ac("watch the seas")],
    cards: [
      {
        title: "Port & coast watchers",
        desc: "Ship spotting from your desk. Follow the big container ships and tankers into port, or watch a busy strait at rush hour.",
      },
      {
        title: "Logistics watchers",
        desc: "See global trade in motion — traffic piling up at major chokepoints tells you things spreadsheets don't.",
      },
      {
        title: "Enthusiasts & travelers",
        desc: "Waiting on a ferry? Curious what that cruise ship is? Pull up the sea around you and see what's moving.",
      },
      {
        title: "Maritime journalists",
        desc: "When a shipping incident makes the news — a grounding, a collision, a blocked canal — watch the traffic around it as AIS reports arrive instead of waiting for the morning's satellite photo.",
      },
      {
        title: "Supply-chain watchers",
        desc: "Port congestion is an early signal. Ships stacking up at anchor outside major ports has preceded every recent supply crunch — the map shows the queue forming while it's still just a queue.",
      },
      {
        title: "Sailors and cruisers",
        desc: "Planning a passage? See what the commercial traffic is doing in the waters you'll cross. The big ships follow predictable lanes, and knowing those lanes keeps a small boat safer.",
      },
    ],
  },
  cruiseShips: {
    heading: [tx("Follow a specific "), ac("cruise ship")],
    body: "The flagship cruise ships each have their own page — verified facts, homeport cameras, and a live AIS position whenever the ship is reporting, matched by her MMSI. When she isn't reporting, the page says so instead of guessing.",
    whereIs: "Where is",
    browseAll: "Browse all tracked cruise ships →",
  },
  faqHeading: [tx("Ship tracker "), ac("FAQ")],
  faqs: [
    {
      q: "Is the ship tracker free?",
      a: "The WorldEye globe itself is free — no account, no signup. Maritime vessel tracking is part of WorldEye's premium maritime intel feed, which is included with an Ultra subscription. Everything else on the map — flights, satellites, weather, quakes, wildfires and the camera directory — is free to browse forever.",
    },
    {
      q: "How do ships show up on the map?",
      a: "Large commercial vessels broadcast their position, speed and heading using AIS transponders — radio signals picked up by a worldwide network of receivers and satellites. WorldEye's maritime layer plots those reports on the globe as they arrive.",
    },
    {
      q: "What details can I see for each vessel?",
      a: "Position, speed over ground, heading, vessel type (container ship, tanker, bulk carrier, ferry, tug and more), and the destination the vessel has reported — plus ports and maritime chokepoints as context.",
    },
    {
      q: "Are all ships shown?",
      a: "Only vessels that are broadcasting AIS. Large commercial ships are required to carry AIS transponders, but small private boats generally aren't — and vessels can go dark outside receiver coverage or switch their transponder off, so some areas are quieter than others.",
    },
    {
      q: "Is this the same technology as marine-traffic websites?",
      a: "Yes, it's the same underlying data: AIS broadcasts aggregated by receiver networks. WorldEye's difference is the context — ships on the same 3D globe as flights overhead, weather systems, live cameras in ports and satellite imagery.",
    },
    {
      q: "How often do vessel positions update?",
      a: "Positions update as new AIS reports arrive — moving vessels report more often, anchored or slow vessels less often, and a vessel that stops reporting stops updating. It's a picture of traffic, not a navigation instrument.",
    },
    {
      q: "Can I see a ship's cargo?",
      a: "No. AIS broadcasts identity, position, speed, heading and destination — not what's in the holds. Cargo manifests are commercial and customs data, not part of the broadcast.",
    },
    {
      q: "Why do some ships disappear from the map?",
      a: "A vessel goes dark when it leaves receiver coverage, switches off its transponder, or has a faulty unit. Open ocean far from shipping lanes and deliberate switch-offs are the two usual reasons — the map shows what's broadcasting, nothing more.",
    },
    {
      q: "Can I follow a specific named ship?",
      a: "If you know roughly where it operates, zoom to that stretch of water and look for it among the traffic — its name, type, speed and reported destination are all part of the AIS broadcast. If it's broadcasting and within receiver coverage, you'll see it.",
    },
  ],
  voiceQuestions: {},
  voiceTitle: "Questions people ask",
  closingCta: {
    heading: [tx("Watch the world's "), ac("trade routes")],
    sub: "The full maritime feed — vessels, ports and chokepoints — is part of Ultra.",
    cta: "See Ultra plans",
    exploreBefore: "Just want to explore? ",
    exploreLink: "Open the free globe",
  },
  related: [
    {
      label: "Satellite tracker",
      desc: "Thousands of satellites overhead — the ISS, Starlink and more, live on the globe.",
    },
    {
      label: "Features",
      desc: "Everything the globe can do — free-to-browse layers and paid-plan intelligence tools.",
    },
    {
      label: "Pricing",
      desc: "Weekly, monthly and annual plans — the maritime feed is included with Ultra.",
    },
    {
      label: "Open the map",
      desc: "The free live 3D globe — flights, weather, cameras and more, no signup.",
    },
    {
      label: "Live flight tracker",
      desc: "Aircraft live on the same globe — the air picture to pair with the sea picture.",
    },
    {
      label: "Best ship tracking tools",
      desc: "The best ship tracking tools compared — AIS trackers, port data and free globes.",
    },
    {
      label: "What is AIS?",
      desc: "How ship tracking actually works — the transponders, receiver networks and limits behind every vessel on this map.",
    },
  ],
};
