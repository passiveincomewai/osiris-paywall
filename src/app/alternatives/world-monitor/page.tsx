import Link from "next/link";
import { Camera, MonitorSmartphone, Plane, Satellite, Waves } from "lucide-react";
import AlternativePage, {
  altMetadata,
  type AltData,
} from "@/components/AlternativePage";

const data: AltData = {
  name: "World Monitor",
  path: "/alternatives/world-monitor",
  title: "World Monitor Alternative — The Intelligence Dashboard Meets the Live Globe",
  description:
    "World Monitor is a free hosted geopolitical dashboard. WorldEye is the alternative that trades its breadth of feeds for eyes on the ground: 74,229 live cameras on a 3D globe, plus flights, satellites and alerts.",
  ogTitle: "World Monitor Alternative — Dashboard Breadth vs Live Cameras | WorldEye",
  ogDescription:
    "Compare World Monitor vs WorldEye honestly: 500+ feeds, markets and AI briefs vs 74,229 live cameras on a 3D globe. Both free to open — here's which fits your questions.",
  kicker: "WORLD MONITOR ALTERNATIVES",
  heroIcon: MonitorSmartphone,
  heroTitle: (
    <>
      World Monitor tells you. <span className="text-[#0096FF]">WorldEye shows you.</span>
    </>
  ),
  heroLede: (
    <>
      World Monitor is one of the best free intelligence dashboards ever put
      on the web — hundreds of feeds, conflict data, markets and AI briefs in
      a single dense console. WorldEye is the alternative for the moment a
      dashboard row makes you ask &ldquo;but what does it actually look like
      there?&rdquo;: a live 3D globe with 74,229 cameras you can open, flights
      and satellites overhead, and alerts when a place changes. Both are free
      to open. They answer different questions — this page sorts out which
      are yours.
    </>
  ),
  updatedNote:
    "Facts checked October 20, 2026 against worldmonitor.app, its /pro page and its GitHub repository (koala73/worldmonitor). World Monitor's audience figures are its own claims and are labelled as such.",
  aboutIcon: MonitorSmartphone,
  aboutHeading: "What World Monitor is",
  about: [
    <>
      World Monitor is a geopolitical intelligence dashboard created by Elie
      Habib and released as open source under the AGPL-3.0 licence, with a
      free hosted version at worldmonitor.app that needs no signup. It is a
      firehose organised into a console: its site describes{" "}
      <span className="text-white/85 font-semibold">
        58 map layer types drawing on 500+ feeds from 770 providers
      </span>{" "}
      — ACLED and UCDP conflict data, AIS vessel tracking, OpenSky aircraft,
      NASA FIRMS fires, USGS earthquakes, plus markets and macro data from
      sources like FRED, the IMF and the BIS. It tracks 13 strategic
      chokepoints, generates AI country briefs, and ships in six variants —
      World, Tech, Finance, Commodity, Happy and Energy — each re-skinning
      the console for a different reader.
    </>,
    <>
      Its Pro tier, priced on its own site at{" "}
      <span className="text-white/85 font-semibold">
        $39.99/month ($359.99/year)
      </span>{" "}
      with Business and API tiers above it, is aimed at professionals who
      live in the console all day. The project has real momentum — tens of
      thousands of GitHub stars and press coverage — and it claims an audience
      in the millions across 190+ countries (its figure, quoted here as
      theirs).
    </>,
    <>
      Who is it for? Analysts, journalists, traders and the geopolitically
      obsessed — people who want the maximum number of signals per screen and
      are fluent in reading them. It is a superb instrument panel. What it is
      not is a pair of eyes: its world is rendered in data, not in pictures of
      the place itself.
    </>,
  ],
  strengths: [
    {
      title: "Feed breadth nobody free matches",
      body: "500+ feeds across conflict, markets, macro, climate and infrastructure, unified into one console with 58 layer types.",
    },
    {
      title: "Chokepoints and variants",
      body: "Thirteen tracked maritime chokepoints and six purpose-built variants (Finance, Energy, Tech…) show real editorial thought about who reads it.",
    },
    {
      title: "AI country briefs",
      body: "Generated briefings compress a country's situation into a readable summary — a genuine time-saver for analysts starting their day.",
    },
    {
      title: "Free, hosted and open source",
      body: "The hosted dashboard is $0 with no signup, and the code is AGPL-3.0 if you'd rather run your own — a rare combination.",
    },
  ],
  gapsIcon: Waves,
  gapsHeading: "Where the dashboard runs out",
  gaps: [
    <>
      The first gap is the absence of the ground itself. World Monitor will
      tell you a protest is trending in a capital; it cannot show you the
      square. There is no camera network to open — no live street, port,
      border crossing or ski slope to verify a story with your own eyes. For
      readers whose instinct is &ldquo;show me&rdquo;, every row of the
      console ends in a dead end that another site has to fill.
    </>,
    <>
      The second gap is shape. A dense, desktop-first console of panels and
      tickers is powerful at a desk and punishing on a phone — and the globe
      moment, spinning a living planet and diving to a place, is not its
      interaction model at all. It is built to be read, not explored.
    </>,
    <>
      The third gap is action. There is no recording, no timelapse and no
      alerting tied to a place you care about — no way to say &ldquo;watch
      this harbour and tell me when it changes&rdquo;. Monitoring, in World
      Monitor, means a human watching the dashboard. For professionals its
      Pro price buys more console; the watching-your-places layer simply
      isn&apos;t its product.
    </>,
  ],
  worldEyeHeading: "WorldEye: the globe with eyes",
  worldEye: [
    <>
      WorldEye starts from the opposite end: a 3D globe whose first layer is
      the visible world —{" "}
      <span className="text-white/85 font-semibold">
        74,229 live public cameras
      </span>{" "}
      searchable by{" "}
      <Link href="/cameras" className="text-[#0096FF] hover:underline">
        country and city
      </Link>
      , with live flights and tracked satellites overhead, weather, radar,
      earthquakes, wildfires and transit in the same view. The free tier
      needs no signup and there are no ads. Where World Monitor aggregates
      what is <em>reported</em> about a place, WorldEye lets you look at the
      place.
    </>,
    <>
      WorldEye is not feed-less: its VIP Pro tier adds the intel layers —
      cyber, maritime and GDELT global-event data with live news — plotted on
      the globe rather than listed in panels, plus the action layer World
      Monitor lacks: multi-camera recording, timelapse, and camera alerts
      that watch a feed for a condition you describe and notify you with a
      photo when it changes. Honest trade, stated plainly: World
      Monitor&apos;s feed catalogue — markets, macro series, six variants —
      is broader than WorldEye&apos;s, and analysts who need FRED data beside
      their conflict map should keep it open. Most people run both.
    </>,
  ],
  worldEyePoints: [
    {
      title: "74,229 cameras of ground truth",
      body: "When a dashboard row says something happened, open the nearest live feed and see the street, port or slope yourself.",
    },
    {
      title: "A globe you explore, not a console you read",
      body: "Spin, dive and follow — flights, satellites, storms and cameras share one living 3D planet that works on a phone.",
    },
    {
      title: "Alerts tied to places",
      body: "VIP Pro camera alerts watch up to 10 feeds for plain-language conditions and notify you on change, photo attached.",
    },
    {
      title: "Recording and timelapse",
      body: "Record up to 20 cameras at once on Pro (40 on VIP Pro) and build timelapses — evidence, not just awareness.",
    },
  ],
  chips: [
    { icon: Camera, label: "74,229 cameras", href: "/cameras" },
    { icon: Plane, label: "Live flights", href: "/live-flight-tracker" },
    { icon: Waves, label: "Ship tracker", href: "/ship-tracker" },
    { icon: Satellite, label: "Satellites", href: "/satellite-tracker" },
  ],
  tableHeading: "World Monitor vs WorldEye, side by side",
  tableIntro:
    "Breadth of feeds vs depth of vision. Both free to open — the table shows where each spends its strength.",
  rows: [
    { feature: "Form", competitor: "Dense intelligence console of panels and feeds", worldEye: "Interactive 3D globe with layered live data" },
    { feature: "Price", competitor: "Free hosted tier; Pro $39.99/mo ($359.99/yr); API tiers above", worldEye: "Free tier; Pro $7.99/wk or $13.99/mo; VIP Pro $74.99/yr" },
    { feature: "Live cameras", competitor: "No camera network", worldEye: "74,229 live public cameras" },
    { feature: "Data feeds", competitor: "500+ feeds / 770 providers — conflict, markets, macro, climate", worldEye: "Focused live layers: flights, satellites, weather, quakes, fires, transit; GDELT + cyber/maritime on VIP Pro" },
    { feature: "Markets & macro data", competitor: "Yes — FRED, IMF, BIS and market feeds are a speciality", worldEye: "No markets/macro console" },
    { feature: "AI briefs", competitor: "AI country briefs built in", worldEye: "AI assistant in the Pro toolkit; live news layer on VIP Pro" },
    { feature: "Alerts & recording", competitor: "Dashboard watching; no place-based camera alerts or recording", worldEye: "Camera alerts, multi-cam recording, timelapse" },
    { feature: "Open source", competitor: "Yes — AGPL-3.0, self-hostable", worldEye: "Hosted product" },
    { feature: "Mobile experience", competitor: "Desktop-first console", worldEye: "Full globe in a mobile browser" },
  ],
  pricingHeading: "Pricing: two very different ideas of 'Pro'",
  pricing: [
    <>
      World Monitor&apos;s hosted dashboard is free with no signup; its{" "}
      <span className="text-white/85 font-semibold">
        Pro is $39.99/month or $359.99/year
      </span>
      , Business $49.99/month, and API tiers run $99.99–$299.99/month (their
      published /pro page, checked October 2026). That pricing is aimed at
      professionals who use the console as a work instrument.
    </>,
    <>
      WorldEye&apos;s free tier covers the whole globe and camera network.
      <span className="text-white/85 font-semibold">
        {" "}
        Pro is $7.99/week or $13.99/month
      </span>{" "}
      (1-day trials) and{" "}
      <span className="text-white/85 font-semibold">
        VIP Pro is $74.99/year
      </span>{" "}
      (3-day trial) — less per year than two months of World Monitor Pro —
      with a 7-day money-back guarantee on first charges. The dedicated
      comparison is at{" "}
      <Link href="/compare/world-monitor" className="text-[#0096FF] hover:underline">
        WorldEye vs World Monitor
      </Link>
      , pricing detail at{" "}
      <Link href="/pricing" className="text-[#0096FF] hover:underline">
        /pricing
      </Link>
      .
    </>,
  ],
  stepsHeading: "Adding the visual layer takes a minute",
  steps: [
    {
      title: "Open the globe",
      body: "worldeye.app — free, no signup. The same events on your dashboard are places you can now fly to.",
    },
    {
      title: "Verify with a camera",
      body: "Search the city from the headline and open a live feed — 74,229 cameras across 109 countries.",
    },
    {
      title: "Watch the approaches",
      body: "Flights, ships, satellites, fires and storms share the globe — the movement around the event, live.",
    },
    {
      title: "Set an alert and walk away",
      body: "On VIP Pro, point a camera alert at the place and get notified with a photo when it changes.",
    },
  ],
  verdictHeading: "Which one should you use?",
  verdicts: [
    {
      q: "Analyst who reads the world in data?",
      a: "World Monitor. Its feed breadth, markets and briefs are the best free console in the niche.",
    },
    {
      q: "Want to see the places in the headlines?",
      a: "WorldEye. Cameras, a living globe and alerts — the visual half of situational awareness.",
    },
    {
      q: "Serious about following world events?",
      a: "Both, in two tabs — data from one, ground truth from the other. That's what most heavy users do.",
    },
  ],
  faqHeading: "World Monitor alternative questions, answered",
  faqs: [
    {
      q: "Is World Monitor free?",
      a: "Yes — the hosted dashboard at worldmonitor.app is free with no signup, and the project is open source (AGPL-3.0) if you prefer to self-host. Its Pro tier is $39.99/month ($359.99/year), with Business and API tiers above that.",
    },
    {
      q: "What is the best World Monitor alternative?",
      a: "For another data console, LiveUAMap and GDELT's own tools are the names. For the thing World Monitor doesn't do — seeing places live — WorldEye is the alternative: 74,229 cameras on a 3D globe with flights, satellites and alerts. Most comparisons end with people using both.",
    },
    {
      q: "Does World Monitor have live cameras?",
      a: "No. World Monitor aggregates data feeds — conflict reports, markets, vessels, aircraft, fires — but it has no camera network to open. If you want to look at the actual street, port or border crossing, that's WorldEye's layer: 74,229 live public feeds.",
    },
    {
      q: "World Monitor vs WorldEye — what's the difference?",
      a: "World Monitor renders the world as data: 500+ feeds, 58 layer types, AI briefs, markets and macro series in a desktop console. WorldEye renders it as a place: a 3D globe with live cameras, flights, satellites, weather and event layers, plus recording and camera alerts. Breadth of signals vs depth of vision.",
    },
    {
      q: "Is World Monitor open source?",
      a: "Yes, under AGPL-3.0 (github.com/koala73/worldmonitor), and self-hosting is supported. WorldEye is a hosted product; if running your own stack is the point, World Monitor (or OSIRIS) is the honest recommendation.",
    },
    {
      q: "Which is better for following a breaking crisis?",
      a: "Start with World Monitor for the report flow — who's saying what, where, with conflict data attached. Verify and watch with WorldEye: live cameras near the location, flights and ships moving, fires and storms on the same globe, and an alert set on the place so you hear about changes without staring at a screen.",
    },
  ],
  midCta: {
    heading: "The dashboard says it. See it anyway.",
    body: "Open the globe, find the place from the headline, and look at it live — 74,229 cameras, free, no signup.",
  },
  ctaHeading: (
    <>
      Data tells. <span className="text-[#0096FF]">Cameras show.</span>
    </>
  ),
  ctaBody: "The live planet, visible — free in your browser.",
  related: [
    {
      label: "World Monitor vs WorldEye, head to head",
      desc: "The dedicated comparison page.",
      href: "/compare/world-monitor",
    },
    {
      label: "OSIRIS alternatives",
      desc: "The other open-source dashboard in this family — and WorldEye's own ancestor.",
      href: "/alternatives/osiris",
    },
    {
      label: "War Monitor alternatives",
      desc: "Conflict-first dashboards compared with the live globe.",
      href: "/alternatives/war-monitor",
    },
    {
      label: "Best global intelligence dashboards",
      desc: "The ranked field of world-watching consoles.",
      href: "/best-global-intelligence-dashboards",
    },
  ],
};

export const metadata = altMetadata(data);

export default function Page() {
  return <AlternativePage data={data} />;
}
