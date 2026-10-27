import type { Metadata } from "next";
import {
  BASE,
  JsonLd,
  Breadcrumb,
  Hero,
  Intro,
  StatRow,
  HowTo,
  FaqSection,
  FaqJsonLd,
  RelatedLinks,
  CtaRow,
  PageShell,
} from "@/components/directory-page";
import DirectoryExplorer from "@/components/DirectoryExplorer";
import TrialCtaSection from "@/components/TrialCtaSection";
import { EXPLORE_SCOPES, countForDef } from "@/lib/explore-data";

export const metadata: Metadata = {
  title: "Port Webcams — Live Harbour & Cruise Port Cameras",
  description:
    "Watch the world's harbours live: port camera walls for Hong Kong, Tampa Bay, Busan, Seattle, Miami, New York Harbor and more — plus the live ship tracker. Free, no signup.",
  alternates: { canonical: `${BASE}/port-webcams` },
  openGraph: {
    title: "Port Webcams — Live Harbour & Cruise Port Cameras",
    description:
      "Live public cameras around the world's great ports and cruise harbours, paired with the live AIS ship tracker. Free on WorldEye.",
    url: "/port-webcams",
    type: "website",
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "CollectionPage",
  name: "Port Webcams — Live Harbour & Cruise Port Cameras",
  description:
    "Live public cameras around the world's ports — harbour-district walls for Hong Kong, Tampa Bay, Busan, Seattle, Vancouver, Miami, New York Harbor and others, paired with the live ship tracker.",
  url: `${BASE}/port-webcams`,
  isPartOf: { "@type": "WebSite", name: "WorldEye", url: "https://worldeye.app" },
};

const FAQS = [
  {
    q: "Where can I watch cruise ships live for free?",
    a: "On the cruise-coast walls of this page — Miami and PortMiami, Fort Lauderdale's Port Everglades and Tampa Bay are the world's busiest cruise homeports, and their harbour cameras are free to watch here with no account. Pair the wall with WorldEye's live ship tracker: find your ship by name on AIS, watch it make its approach, then pick it up on the harbour cameras as it berths.",
  },
  {
    q: "How do I watch a specific ship arrive in port?",
    a: "Use the two tools together. The live ship tracker follows named vessels by AIS — search the ship, watch its speed, course and ETA as it approaches. Then open that port's wall on this page: the harbour-district cameras show the arrival itself — tugs alongside, lines going over, the terminal waking up. Neither tool alone tells the whole story; together they do.",
  },
  {
    q: "Are these dedicated port cameras?",
    a: "Some are — harbour and waterfront feeds — and many are the port district's working cameras: waterfront roads, bridge approaches, marina and city feeds within the stated radius of the port's centre. Each wall on this page says exactly what it is: every catalogue camera within a named distance of the port centre, nearest first. A wall is a harbour district on camera, not a single gantry view of one berth.",
  },
  {
    q: "Which port has the most cameras?",
    a: "Hong Kong, on this page's rules: 380 catalogue cameras within 6 km of Victoria Harbour's centre — Hong Kong is a harbour city through and through, and its camera density shows it. Tampa Bay follows with 263 within 10 km, then Busan with 162. The counts are each wall's stated radius applied to the catalogue, computed the same way everywhere on this page.",
  },
  {
    q: "Why do some famous ports have no wall here?",
    a: "Because the catalogue has no public feeds for them, and a wall built from unrelated cameras would be a label, not a tool. Hamburg, Antwerp, Southampton, Liverpool, Cape Town and Piraeus currently contribute zero catalogue cameras within reach of their port centres, and Singapore only two — so they are named here as gaps instead of being dressed up. If their authorities publish open feeds, the walls will follow.",
  },
];

interface WallDef {
  key: string;
  scopeKey: string;
  heading: string;
  blurb: (count: string) => string;
  placeholder: string;
}

const WALLS: WallDef[] = [
  {
    key: "hong-kong",
    scopeKey: "port-hong-kong",
    heading: "Hong Kong — Victoria Harbour",
    blurb: (n) =>
      `${n} cameras within 6 km of Victoria Harbour's centre — the fullest port wall in the directory, because Hong Kong is a city built around its harbour: the Star Ferry crossings, the container terminals at Kwai Tsing, both shorelines' waterfront roads. If a ship moves in Victoria Harbour, some camera on this wall can see the water it moves through.`,
    placeholder: "Search Hong Kong harbour cameras…",
  },
  {
    key: "tampa",
    scopeKey: "port-tampa",
    heading: "Tampa Bay, Florida — the cruise coast's west wall",
    blurb: (n) =>
      `${n} cameras within 10 km of the Port Tampa Bay centre — the bay's waterfront, the cruise terminals' district and the causeways. Tampa is one of the busiest US cruise homeports and a working cargo harbour; this wall watches both.`,
    placeholder: "Search Tampa Bay cameras…",
  },
  {
    key: "busan",
    scopeKey: "port-busan",
    heading: "Busan, South Korea — the great Pacific container port",
    blurb: (n) =>
      `${n} cameras within 10 km of Busan's port centre — one of the world's busiest container harbours, watched by South Korea's dense municipal camera network: the old port, Gamcheon hillside, the bridges and the waterfront roads.`,
    placeholder: "Search Busan cameras…",
  },
  {
    key: "seattle",
    scopeKey: "port-seattle",
    heading: "Seattle — Elliott Bay and the container terminals",
    blurb: (n) =>
      `${n} cameras within 6 km of Seattle's port terminals — the Elliott Bay waterfront, Harbor Island and the Duwamish approaches: ferries crossing, container cranes working, and the Alaska cruise fleet in season.`,
    placeholder: "Search Seattle cameras…",
  },
  {
    key: "vancouver",
    scopeKey: "port-vancouver",
    heading: "Vancouver — Burrard Inlet",
    blurb: (n) =>
      `${n} cameras within 6 km of Vancouver's port centre — Canada's largest port on Burrard Inlet: the cruise terminal at Canada Place, the grain and container docks, and floatplanes threading the harbour airspace.`,
    placeholder: "Search Vancouver cameras…",
  },
  {
    key: "fort-lauderdale",
    scopeKey: "port-fort-lauderdale",
    heading: "Fort Lauderdale — Port Everglades",
    blurb: (n) =>
      `${n} cameras within 8 km of Port Everglades — one of the world's three busiest cruise ports, where the fleet sails out past the inlet in the late-afternoon parade. The harbour mouth and the 17th Street corridor are the seats for sailaway.`,
    placeholder: "Search Fort Lauderdale cameras…",
  },
  {
    key: "norfolk",
    scopeKey: "port-norfolk",
    heading: "Norfolk & Hampton Roads, Virginia",
    blurb: (n) =>
      `${n} cameras within 10 km of Norfolk's waterfront — the Elizabeth River harbour shared by a great container port and the world's largest naval station. Carriers and box ships use the same water; this wall watches both kinds of traffic.`,
    placeholder: "Search Norfolk cameras…",
  },
  {
    key: "miami",
    scopeKey: "port-miami",
    heading: "Miami — PortMiami, the cruise capital",
    blurb: (n) =>
      `${n} cameras within 10 km of PortMiami — the self-titled cruise capital of the world on its dredged island in Biscayne Bay, with the MacArthur Causeway sailing route and the downtown waterfront in frame. Weekend sailaways are the show.`,
    placeholder: "Search Miami cameras…",
  },
  {
    key: "honolulu",
    scopeKey: "port-honolulu",
    heading: "Honolulu Harbor, Hawaii",
    blurb: (n) =>
      `${n} cameras within 8 km of Honolulu Harbor — the working waterfront an island state lives by: inter-island freight, cruise calls and the Aloha Tower district, with Waikiki's shore in the same wall's reach.`,
    placeholder: "Search Honolulu cameras…",
  },
  {
    key: "sydney",
    scopeKey: "port-sydney",
    heading: "Sydney Harbour, Australia",
    blurb: (n) =>
      `${n} cameras within 10 km of Sydney Harbour's centre — ferries stitching the bays, the cruise terminal at Circular Quay and the bridge that ties the shores together. The harbour is the city; the wall reads like one.`,
    placeholder: "Search Sydney Harbour cameras…",
  },
  {
    key: "new-york",
    scopeKey: "port-new-york",
    heading: "New York Harbor",
    blurb: (n) =>
      `${n} cameras within 10 km of the harbour centre — the Upper Bay, the Narrows approaches and the waterfronts of three boroughs and the New Jersey shore: the harbour the Verrazzano watches over, with the container terminals of Newark Bay just beyond the wall's edge.`,
    placeholder: "Search New York Harbor cameras…",
  },
  {
    key: "long-beach",
    scopeKey: "port-long-beach",
    heading: "Long Beach & Los Angeles — the San Pedro Bay ports",
    blurb: (n) =>
      `${n} cameras within 12 km of the Long Beach port centre — the twin San Pedro Bay harbours that together form America's busiest container gateway: gantry rows, the Gerald Desmond crossing and the queue of ships that feeds a continent.`,
    placeholder: "Search Long Beach cameras…",
  },
  {
    key: "rotterdam",
    scopeKey: "port-rotterdam",
    heading: "Rotterdam — Europe's gateway, an honest thin wall",
    blurb: (n) =>
      `Just ${n} cameras within 15 km of Rotterdam's centre — the thinnest wall on this page, stated as it is. Europe's largest port runs its cameras for operations, not the public, and the Dutch feeds in the directory are few. What is here is real: the city's waterfront and river roads. What is not here, this page will not fake.`,
    placeholder: "Search Rotterdam cameras…",
  },
];

export default async function PortWebcamsPage() {
  const counts = new Map<string, number>();
  for (const w of WALLS) {
    counts.set(w.key, await countForDef(EXPLORE_SCOPES[w.scopeKey]));
  }
  const fmt = (n: number) => n.toLocaleString("en-US");
  const total = WALLS.reduce((s, w) => s + (counts.get(w.key) ?? 0), 0);
  const hongKong = counts.get("hong-kong") ?? 0;
  const tampa = counts.get("tampa") ?? 0;

  const intro = [
    `Ports are where the world's machinery shows. Container ships the length of four football fields thread harbour channels on schedules written months ahead; cruise fleets sail out in late-afternoon parades; ferries stitch harbour cities together all day. This page collects the harbour districts of the world on live public cameras — ${fmt(total)} catalogue cameras across ${WALLS.length} port walls, from Victoria Harbour's ${fmt(hongKong)} to Tampa Bay's ${fmt(tampa)} — every feed free to watch, no account, no signup.`,
    "Each wall is a stated geographic rule, the same discipline as everywhere else in this directory: every catalogue camera within a named radius of the port's centre, nearest first. That means a wall is a harbour district on camera — the port's own waterfront feeds, yes, and also its bridge approaches, marina roads and city waterfront. Nobody here will call a road camera a berth camera. What the walls give you is the port as a place, live: weather arriving, queues forming, the waterfront waking up as a ship comes in.",
    "The pairing that makes this page more than a wall collection is WorldEye's live ship tracker. Cameras show you the harbour; the tracker names the ships. Find a vessel on AIS, watch its approach with real course and speed, then pick it up on the port wall as the tugs take it. Container ship or cruise ship, that two-step — tracker first, camera second — is how the regulars watch arrivals, and both halves are free.",
    "And the gaps, stated plainly because this directory's rule is that a place with no real cameras gets no wall: Hamburg, Antwerp, Southampton, Liverpool, Cape Town and Piraeus have no public feeds in the catalogue within reach of their ports, and Singapore has two. They are listed in the FAQ as what they are — gaps, awaiting open feeds — while Rotterdam, Europe's greatest port, carries this page's thinnest honest wall.",
  ];

  return (
    <PageShell>
      <JsonLd data={jsonLd} />
      <FaqJsonLd faqs={FAQS} />
      <Breadcrumb
        trail={[
          { label: "Home", href: "/" },
          { label: "Live webcams", href: "/live-webcams" },
          { label: "Port webcams" },
        ]}
      />
      <Hero
        h1="Port Webcams — the World's Harbours, Live"
        sub="Harbour-district camera walls for the great ports — Hong Kong, Tampa Bay, Busan, Miami, New York Harbor and more — paired with the live ship tracker. Free, no signup."
      />
      <StatRow
        stats={[
          { value: fmt(total), label: "cameras across the 13 port walls" },
          { value: fmt(hongKong), label: "around Victoria Harbour, Hong Kong" },
          { value: "13", label: "ports with real catalogue walls" },
        ]}
      />
      <Intro paragraphs={intro} />

      {WALLS.map((w) => (
        <section key={w.key} className="mt-12">
          <h2 className="text-xl md:text-2xl font-bold mb-3">{w.heading}</h2>
          <p className="text-sm text-white/55 leading-relaxed max-w-3xl mb-5">
            {w.blurb(fmt(counts.get(w.key) ?? 0))}
          </p>
          <DirectoryExplorer
            scopeKey={w.scopeKey}
            scopeLabel={EXPLORE_SCOPES[w.scopeKey].label}
            groupBy="none"
            searchPlaceholder={w.placeholder}
            explorerId={`port-${w.key}`}
          />
        </section>
      ))}

      <HowTo
        title="How to watch a ship come in"
        steps={[
          "Pick the ship first: open the live ship tracker, search the vessel by name, and read its course, speed and destination.",
          "Watch the approach on AIS until the ship is inside the harbour's approaches — then switch to that port's wall on this page.",
          "Start with the harbour-mouth and bridge cameras in the wall; arrivals pass them before they reach a berth.",
          "For cruise sailaways, the rhythm is late afternoon local time: Fort Lauderdale's inlet and Miami's causeway walls are the front row.",
          "Confirm the timestamp on any feed before reading it — harbour weather and a paused camera can look deceptively alike.",
        ]}
      />

      <FaqSection title="Port webcams — FAQ" faqs={FAQS} />

      <RelatedLinks
        title="More live WorldEye"
        links={[
          { label: "Live ship tracker (AIS)", href: "/ship-tracker" },
          { label: "New York City webcams — the harbour's city", href: "/city-webcams/new-york-city" },
          { label: "Beach & coast webcams", href: "/beach-webcams" },
          { label: "Japan webcams — the national hub", href: "/japan-webcams" },
          { label: "What is AIS?", href: "/what-is-ais" },
          { label: "Live webcams worldwide", href: "/live-webcams" },
        ]}
      />

      <TrialCtaSection utmSource="port-webcams" />

      <CtaRow backHref="/live-webcams" backLabel="All live webcams" />
    </PageShell>
  );
}
