import Link from "next/link";
import { Camera, Crosshair, Plane, Satellite } from "lucide-react";
import AlternativePage, {
  altMetadata,
  type AltData,
} from "@/components/AlternativePage";

const data: AltData = {
  name: "War Monitor",
  path: "/alternatives/war-monitor",
  title: "War Monitor Alternative — Conflict Awareness With Eyes on the Ground",
  description:
    "War Monitor is a conflict-first intelligence dashboard with analyst tools. WorldEye is the alternative for visual confirmation: 74,229 live cameras, flights, satellites, fires and events on one globe — free to open.",
  ogTitle: "War Monitor Alternative — Analyst Dashboard vs Live Globe | WorldEye",
  ogDescription:
    "Compare War Monitor vs WorldEye: frontlines, replay and link analysis vs 74,229 live cameras, live flights and satellite tracking on a 3D globe. Honest about what each does better.",
  kicker: "WAR MONITOR ALTERNATIVES",
  heroIcon: Crosshair,
  heroTitle: (
    <>
      War Monitor maps the conflict.{" "}
      <span className="text-[#0096FF]">WorldEye lets you look at it.</span>
    </>
  ),
  heroLede: (
    <>
      War Monitor (warmonitor.app) is a serious conflict-first intelligence
      dashboard — frontlines, event feeds and an analyst toolkit aimed at
      people who follow wars professionally. WorldEye answers the adjacent
      need: not just where the reports say fighting is, but what the region
      looks like right now — 74,229 live cameras, aircraft and satellites
      overhead, fires and storms on one globe. This page gives War Monitor
      its due, then shows where the globe fits.
    </>
  ),
  updatedNote:
    "Facts checked October 20, 2026 against warmonitor.app. War Monitor does not publish its paid tier's price on its site; none is quoted here.",
  aboutIcon: Crosshair,
  aboutHeading: "What War Monitor is",
  about: [
    <>
      War Monitor is a hosted intelligence dashboard built conflict-first.
      Its map carries 25+ layers — aircraft, satellites, vessels, fires,
      earthquakes, protests, nuclear facilities and undersea cables among
      them — fed by conflict data sources including ACLED and GDELT, with
      drawn frontlines and a GPS-jamming layer that has become a signature
      for watchers of the war in Ukraine and other theatres. The interface
      switches between WAR, CYBER and MARITIME modes, reframing the console
      around each domain.
    </>,
    <>
      What sets it apart from a simple event map is the analyst toolkit:
      <span className="text-white/85 font-semibold">
        {" "}
        timeline replay
      </span>{" "}
      to re-run how a situation developed,{" "}
      <span className="text-white/85 font-semibold">link analysis</span> to
      trace relationships between entities, and{" "}
      <span className="text-white/85 font-semibold">geofence alerts</span>{" "}
      tied to areas you define — plus AI briefs summarising theatres. Its free
      tier is $0 with an account signup; a paid &ldquo;Operator&rdquo; tier
      sits above it, with its price not displayed on the public site.
    </>,
    <>
      Who is it for? Defence watchers, OSINT analysts, journalists and
      serious hobbyists who follow specific theatres day after day and think
      in entities, timelines and relationships. It is a specialist instrument
      and presents itself as one.
    </>,
  ],
  strengths: [
    {
      title: "Conflict is the whole design",
      body: "Frontlines, ACLED/GDELT feeds and a GPS-jamming layer — the map is organised around theatres and how they change, not generic world news.",
    },
    {
      title: "A real analyst toolkit",
      body: "Timeline replay, link analysis and geofence alerts are professional instruments. WorldEye has no equivalent for replay or link analysis — said plainly.",
    },
    {
      title: "Domain modes",
      body: "WAR, CYBER and MARITIME modes reframe layers and priorities around the question you're actually asking.",
    },
    {
      title: "Free tier to start",
      body: "$0 with an account — enough console to learn whether the analyst workflow fits how you follow events.",
    },
  ],
  gapsIcon: Crosshair,
  gapsHeading: "Where the conflict dashboard stops",
  gaps: [
    <>
      The first gap is the same one every report-based tool has: it shows you
      the conflict as <em>data about</em> the conflict. There is no camera
      network — no live street in the city being shelled, no port, highway or
      border crossing to open and watch. When a report lands, the natural
      next move — &ldquo;let me see it&rdquo; — has to happen somewhere else.
    </>,
    <>
      The second gap is context beyond the theatre. A conflict dashboard is
      deliberately narrow; the rest of the living planet — weather systems
      moving over the front, civilian air traffic rerouting around it, the
      cameras in the neighbouring country — lives outside its frame. And the
      third gap is audience: its console assumes an analyst&apos;s fluency.
      Family members with relatives in a region, travellers, and the simply
      worried mostly want to <em>look at the place</em> — a need the toolkit
      shape doesn&apos;t serve.
    </>,
    <>
      Finally, price transparency: the Operator tier&apos;s price isn&apos;t
      shown publicly, so a casual user can&apos;t weigh the upgrade without
      starting a signup. None of this makes War Monitor a bad tool — it makes
      it a specialist one, and specialists always leave the generalist
      watching job open.
    </>,
  ],
  worldEyeHeading: "WorldEye: the visual companion to conflict monitoring",
  worldEye: [
    <>
      WorldEye is a live 3D globe whose core layers are free with no signup:
      <span className="text-white/85 font-semibold">
        {" "}
        74,229 live public cameras
      </span>{" "}
      (including cameras across Eastern Europe, the Middle East and every
      other region its catalogue covers), live flights and tracked
      satellites, wildfire detection, earthquakes, weather and storms. When a
      theatre heats up, it is the place to <em>see</em>: the highways out of a
      city, the airport, the border crossing — as they look this minute.
    </>,
    <>
      Its paid tiers lean further into monitoring: VIP Pro plots GDELT global
      events and cyber/maritime intel layers onto the globe beside the
      cameras, and its{" "}
      <span className="text-white/85 font-semibold">camera alerts</span> let
      you watch up to 10 specific feeds for a condition you describe and get
      notified — with a photo — when it changes. What WorldEye does not do is
      War Monitor&apos;s analyst craft: no frontline drawing, no timeline
      replay, no link analysis. If those are your instruments, keep them —
      and use the globe as your eyes.
    </>,
  ],
  worldEyePoints: [
    {
      title: "Ground truth by camera",
      body: "Open live feeds near the reported event — streets, squares, highways, ports — instead of relying on the report alone.",
    },
    {
      title: "The sky over the theatre",
      body: "Live air traffic and tracked satellites on the same globe show diversions, closures and overhead activity as they happen.",
    },
    {
      title: "Fires, quakes and weather in frame",
      body: "Wildfire detections, earthquakes and storm systems share the map — the physical context a conflict feed assumes you have.",
    },
    {
      title: "Alerts for the places you fear for",
      body: "VIP Pro camera alerts watch specific feeds for your plain-language condition and notify you on change — built for worried humans, not just analysts.",
    },
  ],
  chips: [
    { icon: Camera, label: "Live cameras by country", href: "/cameras" },
    { icon: Plane, label: "Live flights", href: "/live-flight-tracker" },
    { icon: Satellite, label: "Satellite tracker", href: "/satellite-tracker" },
  ],
  tableHeading: "War Monitor vs WorldEye, side by side",
  tableIntro:
    "An analyst's conflict console vs a public live globe. The rows where War Monitor wins are real wins — read for your own workflow.",
  rows: [
    { feature: "Focus", competitor: "Conflict-first intelligence", worldEye: "The whole live planet, conflicts included" },
    { feature: "Price", competitor: "Free tier with account; Operator tier price not published", worldEye: "Free tier, no signup; Pro $7.99/wk or $13.99/mo; VIP Pro $74.99/yr" },
    { feature: "Live cameras", competitor: "No camera network", worldEye: "74,229 live public cameras" },
    { feature: "Conflict data", competitor: "ACLED + GDELT feeds, drawn frontlines, GPS-jamming layer", worldEye: "GDELT event layer on VIP Pro; no frontline drawing" },
    { feature: "Analyst toolkit", competitor: "Timeline replay, link analysis, geofence alerts, AI briefs", worldEye: "No replay or link analysis; camera alerts and recording instead" },
    { feature: "Flights, satellites, vessels", competitor: "Yes — layers on its console", worldEye: "Yes — live on the 3D globe, free" },
    { feature: "Fires, quakes, weather", competitor: "Fire and quake layers included", worldEye: "Yes — plus radar, storms and hurricanes" },
    { feature: "Recording & timelapse", competitor: "Not its product shape", worldEye: "Multi-cam recording (20/40), timelapse on VIP Pro" },
    { feature: "Audience", competitor: "Analysts and committed theatre-watchers", worldEye: "Anyone — including family and travellers checking a place" },
  ],
  pricingHeading: "Pricing: one published, one not",
  pricing: [
    <>
      War Monitor&apos;s free tier costs $0 and requires an account. Its paid
      Operator tier&apos;s price was not displayed on its public site when
      checked (October 2026), so this page quotes none — you&apos;d learn it
      inside the signup flow.
    </>,
    <>
      WorldEye publishes everything: the globe, cameras, flights, satellites,
      fires, quakes and weather are{" "}
      <span className="text-white/85 font-semibold">
        free with no signup
      </span>
      . <span className="text-white/85 font-semibold">Pro</span> is $7.99/week
      or $13.99/month (10-day trials);{" "}
      <span className="text-white/85 font-semibold">VIP Pro</span> is
      $74.99/year (10-day trial) adding GDELT events, intel layers, camera
      alerts and 40-camera recording, with a 7-day money-back guarantee on
      first charges. Full detail at{" "}
      <Link href="/pricing" className="text-[#0096FF] hover:underline">
        /pricing
      </Link>
      .
    </>,
  ],
  stepsHeading: "Using WorldEye alongside a conflict dashboard",
  steps: [
    {
      title: "Keep the dashboard for reports",
      body: "Frontlines, event feeds and replay are War Monitor's craft. Start your session there as usual.",
    },
    {
      title: "Open WorldEye for the place",
      body: "Search the city or region on the globe and open its live cameras — streets, highways, airports, crossings.",
    },
    {
      title: "Read the sky and the ground together",
      body: "Flights, satellites, fires and storms on the same globe give the report a physical picture.",
    },
    {
      title: "Set a camera alert",
      body: "Watching a specific crossing or square? VIP Pro alerts notify you with a photo when the feed changes.",
    },
  ],
  verdictHeading: "Which one should you use?",
  verdicts: [
    {
      q: "Analyst following a theatre daily?",
      a: "War Monitor. Replay, link analysis and frontlines are instruments built for exactly that discipline.",
    },
    {
      q: "Want to see a place with your own eyes?",
      a: "WorldEye. 74,229 cameras and the live sky over the region, free, on any device.",
    },
    {
      q: "Family or travel tied to a region?",
      a: "WorldEye. It's the one a non-analyst can open and understand in a minute — and its alerts watch the place for you.",
    },
  ],
  faqHeading: "War Monitor alternative questions, answered",
  faqs: [
    {
      q: "What is War Monitor?",
      a: "War Monitor (warmonitor.app) is a hosted, conflict-first intelligence dashboard: 25+ layers (aircraft, vessels, satellites, fires, protests, cables), ACLED and GDELT conflict feeds, drawn frontlines, a GPS-jamming layer, AI briefs and an analyst toolkit with timeline replay, link analysis and geofence alerts. It has a free tier with signup and a paid Operator tier.",
    },
    {
      q: "Is War Monitor free?",
      a: "It has a free tier ($0 with an account). Its paid Operator tier's price isn't published on its public site. WorldEye's core globe is free without any signup; its paid tiers are publicly priced from $7.99/week.",
    },
    {
      q: "What is the best War Monitor alternative?",
      a: "For curated conflict reporting on a map, LiveUAMap is the long-running name. For an open-source console, World Monitor. For seeing places live — cameras, flights, satellites, fires — WorldEye is the alternative, and it complements rather than replaces an analyst dashboard.",
    },
    {
      q: "War Monitor vs WorldEye — what's the difference?",
      a: "War Monitor renders conflict as analysed data: frontlines, feeds, replay and entity relationships for analysts. WorldEye renders the world as a place you can look at: 74,229 live cameras, live flights and satellites, fires and weather on a 3D globe, with recording and camera alerts. Analysis vs vision.",
    },
    {
      q: "Does WorldEye show frontlines or conflict zones?",
      a: "WorldEye plots GDELT global events on its VIP Pro intel layers and shows fires, quakes and live traffic of every kind, but it does not draw military frontlines or offer timeline replay and link analysis. If those are central to your work, War Monitor is the right primary tool.",
    },
    {
      q: "Can I watch a specific city in a conflict zone live?",
      a: "If a public camera covers it, yes. WorldEye serves 74,229 public feeds searchable by country and city, including cameras across Eastern Europe and the Middle East. Coverage follows what public networks publish — where a feed exists, you can open it in seconds, free.",
    },
  ],
  midCta: {
    heading: "Reports say. Cameras show.",
    body: "When the next alert lands, be the person who can actually look at the place — live cameras, flights and fires on one free globe.",
  },
  ctaHeading: (
    <>
      See the theatre. <span className="text-[#0096FF]">Not just the feed.</span>
    </>
  ),
  ctaBody: "74,229 live cameras and the whole live sky — free in your browser.",
  related: [
    {
      label: "LiveUAMap alternatives",
      desc: "The curated conflict map, compared the same way.",
      href: "/alternatives/liveuamap",
    },
    {
      label: "World Monitor alternatives",
      desc: "The free intelligence console vs the live globe.",
      href: "/alternatives/world-monitor",
    },
    {
      label: "Best conflict monitoring tools",
      desc: "The ranked field for following wars and crises.",
      href: "/best-conflict-monitoring-tools",
    },
    {
      label: "GDELT on the globe",
      desc: "One of WorldEye's VIP Pro intel layers, explained via the comparison hub.",
      href: "/compare/gdelt",
    },
  ],
};

export const metadata = altMetadata(data);

export default function Page() {
  return <AlternativePage data={data} />;
}
