import Link from "next/link";
import { Camera, Plane, Radio, Satellite } from "lucide-react";
import AlternativePage, {
  altMetadata,
  type AltData,
} from "@/components/AlternativePage";

const data: AltData = {
  name: "Flightradar24",
  path: "/alternatives/flightradar24",
  title: "Flightradar24 Alternative — Live Flights Plus the Whole Planet",
  description:
    "Flightradar24 tracks flights superbly — and nothing else. WorldEye is the alternative that puts live flights on a 3D globe with 74,229 cameras, satellites, weather, quakes and ships. Free, no signup.",
  ogTitle: "Flightradar24 Alternative — Flights, Cameras, Satellites, One Globe | WorldEye",
  ogDescription:
    "Compare Flightradar24 vs WorldEye: flight-depth vs a full live planet — 74,229 cameras, satellites, weather, earthquakes and more on one globe, free with no signup.",
  kicker: "FLIGHTRADAR24 ALTERNATIVES",
  heroIcon: Plane,
  heroTitle: (
    <>
      A Flightradar24 alternative for when the flight{" "}
      <span className="text-[#0096FF]">isn&apos;t the whole story.</span>
    </>
  ),
  heroLede: (
    <>
      Flightradar24 is the world&apos;s favourite flight tracker, and for pure
      aviation depth it earns that spot. But the moment your question widens —
      what&apos;s the weather doing at the destination, what do the airport
      cameras show, what else is moving up there — a flight-only map runs out
      of planet. WorldEye puts live flights on a globe that also carries
      74,229 cameras, satellites, weather, earthquakes, fires and ships. Here
      is the honest comparison.
    </>
  ),
  updatedNote:
    "Facts checked October 20, 2026 against Flightradar24's official app listings (tier features, receiver-network size) and WorldEye's live pricing page. Flightradar24 sets its own prices per country and currency, so this page describes its tiers without printing a currency figure.",
  aboutIcon: Plane,
  aboutHeading: "What Flightradar24 is — and why it's loved",
  about: [
    <>
      Flightradar24 is a Swedish flight-tracking service that turned ADS-B
      data into a household habit: open the map and every airborne airliner is
      there, moving in near-real time. Its positions come from a network it
      describes as roughly{" "}
      <span className="text-white/85 font-semibold">
        50,000 ground receiver stations
      </span>{" "}
      — many hosted by volunteers — supplemented by multilateration (MLAT) for
      aircraft without ADS-B and satellite-based ADS-B over the oceans. Tap any
      aircraft and you get the flight&apos;s route, schedule, aircraft type and
      registration; search by flight number, airline, airport or tail number.
    </>,
    <>
      Its tiers are built for aviation people. The free Basic tier is
      ad-supported with a short window of flight history.{" "}
      <span className="text-white/85 font-semibold">Silver</span> adds 90 days
      of history, richer aircraft details (serial number, age), flight details
      like vertical speed and squawk, filters and alerts, and current weather
      at 3,000+ airports.{" "}
      <span className="text-white/85 font-semibold">Gold</span> stretches
      history to 365 days and adds detailed live weather layers, aeronautical
      charts, oceanic tracks, ATC boundaries and extended Mode S data. A
      Business tier serves professional users and data customers.
    </>,
    <>
      Who is it for? Plane spotters, frequent flyers tracking family,
      aviation professionals and the simply curious — anyone whose question
      starts and ends with aircraft. Its mobile apps are polished, its 3D view
      and augmented-reality plane-spotting are delightful, and its playback
      feature lets you rewind the sky. If aeroplanes are your whole hobby,
      stop reading and keep it: this page is for the moments when they
      aren&apos;t.
    </>,
  ],
  strengths: [
    {
      title: "The deepest flight data for consumers",
      body: "365 days of history on Gold, extended Mode S telemetry, oceanic tracks and ATC boundaries — no generalist globe matches its aviation archive.",
    },
    {
      title: "Its own global receiver network",
      body: "~50,000 ground stations plus MLAT and satellite ADS-B give it coverage and redundancy that aggregators of public feeds can't easily copy.",
    },
    {
      title: "Superb apps and playback",
      body: "Native iOS/Android apps, AR plane identification, airport boards and global playback — the flight-tracking craft is refined to a shine.",
    },
    {
      title: "Alerts and filters that spotters love",
      body: "Silver and up bring flight alerts, emergency squawk highlighting and rich filtering by airline, aircraft, altitude and speed.",
    },
  ],
  gapsIcon: Radio,
  gapsHeading: "Where a flight-only map runs out",
  gaps: [
    <>
      The first gap is scope. Flightradar24 answers &ldquo;where is that
      plane?&rdquo; magnificently — and nothing around it. There are no ground
      cameras to check the weather at your destination with your own eyes, no
      satellites-as-objects (the other traffic overhead), no ships, no
      earthquake or wildfire context when a flight diverts, no transit. In
      practice, following a real event — a storm diversion, an airport
      incident — means juggling three or four other sites alongside it.
    </>,
    <>
      The second gap is the free tier&apos;s ceiling. Basic is ad-supported
      and history is short; the features casual users most often reach for —
      alerts, deep history, weather layers — sit behind Silver or Gold. The
      prices themselves are reasonable, but they buy depth in exactly one
      layer of the world.
    </>,
    <>
      The third gap is perspective — literally. Flightradar24 is a flat map
      (with an optional 3D view per aircraft). Watching a long-haul arc across
      a living 3D planet, with the terminator line and weather moving under
      it, is a different experience, and it is the one WorldEye is built
      around. If flights are your entry point rather than your destination,
      that wider frame is the alternative worth trying.
    </>,
  ],
  worldEyeHeading: "WorldEye: flights, in their full context",
  worldEye: [
    <>
      WorldEye&apos;s{" "}
      <Link href="/live-flight-tracker" className="text-[#0096FF] hover:underline">
        live flight tracker
      </Link>{" "}
      shows worldwide air traffic on a 3D globe, free with no signup — search
      a flight, follow an aircraft, and watch its route drawn over the planet.
      The difference is everything sharing the screen:{" "}
      <span className="text-white/85 font-semibold">
        74,229 live cameras
      </span>{" "}
      (including airport and skyline feeds), tracked satellites passing
      overhead, live weather and radar, earthquakes, wildfires and ships —
      one globe, no tab-juggling.
    </>,
    <>
      Honesty about the trade: WorldEye does not match Flightradar24&apos;s
      aviation archive. There is no 365-day history search, no Mode S
      telemetry firehose, no ATC boundary layer. If your hobby is tail-number
      archaeology, Gold is worth its money. WorldEye is the alternative for
      the other 90% of moments — tracking a family flight while checking the
      destination&apos;s weather on a live camera, or watching diversions pile
      up around a storm you can also see.
    </>,
  ],
  worldEyePoints: [
    {
      title: "Flights plus the ground truth",
      body: "Follow a flight, then open a live camera at its destination — 74,229 feeds including airports, cities, beaches and ski areas — without leaving the globe.",
    },
    {
      title: "More of the sky than aircraft",
      body: "Tracked satellites and the space station share the same view, with passes and positions live on the free tier.",
    },
    {
      title: "Weather with eyes on it",
      body: "Live weather, radar, hurricanes, quakes and fires sit one toggle away from the flight layer — context FR24's weather layers only partly cover.",
    },
    {
      title: "Follow mode and flight paths on Pro",
      body: "Pro adds full flight-path following (planned route vs flown track) and the satellite map view; the core tracker stays free.",
    },
  ],
  chips: [
    { icon: Plane, label: "Live flight tracker", href: "/live-flight-tracker" },
    { icon: Camera, label: "Airport & city cameras", href: "/cameras" },
    { icon: Satellite, label: "Satellite tracker", href: "/satellite-tracker" },
  ],
  tableHeading: "Flightradar24 vs WorldEye, side by side",
  tableIntro:
    "Flightradar24 wins the aviation-depth rows on purpose — it's a specialist. Read the table by which rows match your actual questions.",
  rows: [
    { feature: "Live flight tracking", competitor: "Yes — its core craft, ~50,000 receivers", worldEye: "Yes — worldwide live traffic on a 3D globe" },
    { feature: "Flight history", competitor: "7 days free (limited); 90 days Silver; 365 days Gold", worldEye: "Live-focused; no long historical archive" },
    { feature: "Aircraft detail depth", competitor: "Deep — registration, age, serial, Mode S telemetry on paid tiers", worldEye: "Core flight details; not a Mode S archive" },
    { feature: "Flight alerts & filters", competitor: "Yes, on Silver and Gold", worldEye: "Basic search and follow; camera alerts on VIP Pro" },
    { feature: "Live cameras", competitor: "No", worldEye: "74,229 live public cameras" },
    { feature: "Satellites as objects", competitor: "No (satellite ADS-B is a data source, not a layer)", worldEye: "Yes — live satellite tracker, free" },
    { feature: "Weather", competitor: "Airport weather free-ish; full live layers on Gold", worldEye: "Weather, radar and storm layers, free" },
    { feature: "Ships, quakes, fires, transit", competitor: "No", worldEye: "Yes — all on the same globe, free" },
    { feature: "Ads", competitor: "Yes on the free tier", worldEye: "No ads" },
    { feature: "Apps", competitor: "Native iOS/Android apps", worldEye: "Browser-based, phone and desktop" },
  ],
  pricingHeading: "Pricing: depth in one layer vs breadth across all of them",
  pricing: [
    <>
      Flightradar24&apos;s free tier is ad-supported. Silver and Gold are
      inexpensive subscriptions priced per country and currency (shown in its
      apps and checkout — the company does not publish one global figure), and
      they buy genuine aviation depth: longer history, alerts, weather layers,
      charts. A Business tier covers professional and data use.
    </>,
    <>
      WorldEye&apos;s flight tracking — and the cameras, satellites, weather,
      quakes and fires around it — is{" "}
      <span className="text-white/85 font-semibold">
        free with no signup
      </span>
      . Paid tiers add capability, not the basics:{" "}
      <span className="text-white/85 font-semibold">
        Pro at $7.99/week or $13.99/month
      </span>{" "}
      (10-day trials) for flight-path follow, satellite view, the OSINT toolkit
      and multi-camera recording;{" "}
      <span className="text-white/85 font-semibold">
        VIP Pro at $74.99/year
      </span>{" "}
      (10-day trial) for intel layers, timelapse and camera alerts. First
      charges carry a 7-day money-back guarantee — see{" "}
      <Link href="/pricing" className="text-[#0096FF] hover:underline">
        pricing
      </Link>{" "}
      and the dedicated{" "}
      <Link href="/compare/flightradar24" className="text-[#0096FF] hover:underline">
        Flightradar24 comparison
      </Link>
      .
    </>,
  ],
  stepsHeading: "Trying the alternative takes a minute",
  steps: [
    {
      title: "Open the globe",
      body: "worldeye.app loads live traffic immediately — no account, no app install, on phone or desktop.",
    },
    {
      title: "Find your flight",
      body: "Search or tap any aircraft to follow it across the 3D globe, route drawn live. What is ADS-B? Our explainer at /what-is-ads-b covers the tech both sites share.",
    },
    {
      title: "Add the context",
      body: "Toggle cameras, weather, satellites and fires. Check your destination's live camera while the flight is still en route.",
    },
    {
      title: "Keep FR24 for the archive",
      body: "If you research historical flights, keep Gold for that. Switching costs nothing because WorldEye's tracker is free — many people run both.",
    },
  ],
  verdictHeading: "Which one should you use?",
  verdicts: [
    {
      q: "Serious spotter or aviation researcher?",
      a: "Flightradar24 Gold. The 365-day archive, Mode S depth and ATC boundaries are built for you.",
    },
    {
      q: "Tracking family flights and travel days?",
      a: "WorldEye. Follow the flight and see the destination's weather and cameras on the same screen, free.",
    },
    {
      q: "Curious about everything overhead?",
      a: "WorldEye. Aircraft are one layer among satellites, ships, storms and 74,229 cameras.",
    },
  ],
  faqHeading: "Flightradar24 alternative questions, answered",
  faqs: [
    {
      q: "Is there a free alternative to Flightradar24?",
      a: "Yes. WorldEye's live flight tracker is free with no signup and no ads, showing worldwide traffic on a 3D globe — and it adds cameras, satellites, weather, earthquakes and ships that Flightradar24 doesn't have. ADS-B Exchange and airplanes.live are other free flight-only options.",
    },
    {
      q: "What is the best Flightradar24 alternative?",
      a: "It depends on the job. For pure aviation depth — long history, alerts, telemetry — Flightradar24 itself is still the benchmark. For flight tracking as part of a wider live picture (cameras, weather, satellites, ground events), WorldEye is the strongest alternative. For unfiltered raw ADS-B, enthusiasts pick ADS-B Exchange.",
    },
    {
      q: "Does WorldEye have flight history like Flightradar24 Gold?",
      a: "No — and we won't pretend otherwise. Flightradar24 Gold keeps 365 days of searchable history; WorldEye is built for the live moment and flight following, not historical research. Keep a Gold subscription if the archive is your hobby.",
    },
    {
      q: "Is Flightradar24 free?",
      a: "There's a free ad-supported tier with limited history. Silver (90 days of history, alerts, airport weather) and Gold (365 days, weather layers, charts, ATC boundaries) are paid, priced by country and currency in Flightradar24's apps and checkout.",
    },
    {
      q: "Can WorldEye show me the weather at my destination airport?",
      a: "Two ways: the live weather and radar layers on the globe, and — uniquely — actual live cameras. WorldEye serves 74,229 public camera feeds including airport and city cameras, so you can look at the sky over your destination instead of just reading a forecast for it.",
    },
    {
      q: "Flightradar24 vs WorldEye — which is better on a phone?",
      a: "Flightradar24 has native apps with AR plane-spotting; WorldEye runs in the mobile browser with nothing to install, and its globe carries every layer (cameras, satellites, storms) rather than flights alone. Both are smooth; the difference is breadth, not polish.",
    },
    {
      q: "Does WorldEye track military or private flights?",
      a: "WorldEye displays the public ADS-B traffic its feeds carry. Like all public trackers, some aircraft are anonymised or absent by request of operators and regulators; Flightradar24 applies similar filtering. Neither public site shows everything that flies.",
    },
  ],
  midCta: {
    heading: "Your flight, and everything around it",
    body: "Track the plane, check the destination camera, watch the storm it's skirting — one globe, free. Try it alongside Flightradar24 and feel the difference.",
  },
  ctaHeading: (
    <>
      More than a flight map. <span className="text-[#0096FF]">The whole planet.</span>
    </>
  ),
  ctaBody: "Live flights, 74,229 cameras, satellites and storms — free in your browser.",
  related: [
    {
      label: "Flightradar24 vs WorldEye, head to head",
      desc: "The dedicated comparison page with the full feature matrix.",
      href: "/compare/flightradar24",
    },
    {
      label: "Live flight tracker",
      desc: "WorldEye's free live air-traffic globe.",
      href: "/live-flight-tracker",
    },
    {
      label: "Best flight tracking tools",
      desc: "The ranked guide to trackers for every kind of user.",
      href: "/best-flight-tracking-tools",
    },
    {
      label: "What is ADS-B?",
      desc: "The broadcast technology every flight tracker is built on.",
      href: "/what-is-ads-b",
    },
  ],
};

export const metadata = altMetadata(data);

export default function Page() {
  return <AlternativePage data={data} />;
}
