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
  title: "New York City Webcams — Live Cameras in All Five Boroughs",
  description:
    "Watch New York City live: 279 public cameras within 25 km of Midtown — Manhattan, Brooklyn, Queens, the Bronx and Staten Island, mostly NYSDOT 511NY feeds. Free, no signup.",
  alternates: { canonical: `${BASE}/city-webcams/new-york-city` },
  openGraph: {
    title: "New York City Webcams — Live Cameras in All Five Boroughs",
    description:
      "Live public cameras across New York City — the five boroughs, the harbour and the bridges — free on WorldEye.",
    url: "/city-webcams/new-york-city",
    type: "website",
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "CollectionPage",
  name: "New York City Webcams — Live Cameras in All Five Boroughs",
  description:
    "Live public cameras across New York City: borough walls for Manhattan, Brooklyn, Queens, the Bronx and Staten Island, drawn mostly from NYSDOT's 511NY network.",
  url: `${BASE}/city-webcams/new-york-city`,
  isPartOf: { "@type": "WebSite", name: "WorldEye", url: "https://worldeye.app" },
};

const FAQS = [
  {
    q: "Where can I watch live webcams in New York City for free?",
    a: "Here. This page gathers New York City's public cameras into one wall per borough — 279 feeds within 25 km of Midtown Manhattan, most of them NYSDOT's 511NY cameras — and every one opens free, with no account and no signup. For the city on the map itself, open the WorldEye globe and zoom to New York.",
  },
  {
    q: "Can I watch Times Square live on WorldEye?",
    a: "Not the famous scenic view — honesty first. The celebrated Times Square camera is EarthCam's, and WorldEye doesn't carry it. What the directory does hold around Midtown is the working city: 511NY street and avenue cameras near Times Square and across Manhattan, plus harbour and bridge feeds. For checking the city as it actually moves — traffic, weather, crowds on the avenues — those are the feeds that tell the truth.",
  },
  {
    q: "Are these traffic cameras or scenic cameras?",
    a: "Mostly traffic and street cameras, and the page says so plainly: 274 of the 279 feeds in the whole-city wall come from NYSDOT's 511NY network, which exists to watch roads, bridges and tunnels. Scenic value rides along — harbour views, bridge spans and skyline angles appear across the borough walls — but these are working cameras first.",
  },
  {
    q: "Which borough has the most cameras?",
    a: "Queens, on this page's radius rule: 102 catalogue cameras within 10 km of the borough's centre, ahead of the Bronx (73 within 7 km) and Brooklyn (53 within 8 km). The counts follow each wall's stated radius, so they measure the catalogue's coverage around each centre rather than the boroughs' land areas.",
  },
  {
    q: "Can I check the airports and harbour too?",
    a: "Yes. The airport wall on WorldEye's airport webcams page covers the region's airport-area feeds, and the New York Harbor wall on the port webcams page collects the harbour, bridge and waterfront cameras. Pair them with the live ship tracker to watch harbour traffic arrive.",
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
    key: "all",
    scopeKey: "nyc",
    heading: "The whole city — every borough on one wall",
    blurb: (n) =>
      `${n} cameras within 25 km of Midtown Manhattan — the full New York wall, nearest first. 511NY feeds dominate, with harbour, bridge and airport-area cameras in the mix. Start here for the citywide picture: rush hour building, a storm arriving, the bridges backing up.`,
    placeholder: "Search New York City cameras…",
  },
  {
    key: "manhattan",
    scopeKey: "nyc-manhattan",
    heading: "Manhattan",
    blurb: (n) =>
      `${n} cameras within 6 km of Midtown — the avenue grid, the FDR and West Side corridors, and the streets around Times Square. These are working street cameras, not the EarthCam scenic view (see the FAQ), and they show Manhattan the way it actually runs.`,
    placeholder: "Search Manhattan cameras…",
  },
  {
    key: "brooklyn",
    scopeKey: "nyc-brooklyn",
    heading: "Brooklyn",
    blurb: (n) =>
      `${n} cameras within 8 km of Downtown Brooklyn — the BQE corridor, the bridge approaches, Atlantic Avenue and the waterfront. The bridge queues form here first; this wall shows them before the traffic reports do.`,
    placeholder: "Search Brooklyn cameras…",
  },
  {
    key: "queens",
    scopeKey: "nyc-queens",
    heading: "Queens — the fullest borough wall",
    blurb: (n) =>
      `${n} cameras within 10 km of central Queens — the densest borough wall in the directory: the LIE and Grand Central corridors, the Van Wyck toward JFK, Flushing and Astoria. Queens also has its own full directory page, linked below.`,
    placeholder: "Search Queens cameras…",
  },
  {
    key: "bronx",
    scopeKey: "nyc-bronx",
    heading: "The Bronx",
    blurb: (n) =>
      `${n} cameras within 7 km of central Bronx — the Cross Bronx and Major Deegan corridors, the Harlem River crossings and the approaches to Yankee Stadium. The Bronx has its own full directory page too, linked below.`,
    placeholder: "Search Bronx cameras…",
  },
  {
    key: "staten-island",
    scopeKey: "nyc-staten-island",
    heading: "Staten Island",
    blurb: (n) =>
      `${n} cameras within 8 km of central Staten Island — the thinnest borough wall, stated as it is: the expressway corridor, the Verrazzano approaches and the ferry side of the island. A keyhole rather than a panorama, but a real one.`,
    placeholder: "Search Staten Island cameras…",
  },
];

export default async function NewYorkCityPage() {
  const counts = new Map<string, number>();
  for (const w of WALLS) {
    counts.set(w.key, await countForDef(EXPLORE_SCOPES[w.scopeKey]));
  }
  const fmt = (n: number) => n.toLocaleString("en-US");
  const all = counts.get("all") ?? 0;
  const queens = counts.get("queens") ?? 0;
  const bronx = counts.get("bronx") ?? 0;

  const intro = [
    `New York runs more public cameras than almost any city on Earth, and this is the page that gathers them properly: ${fmt(all)} catalogue cameras within 25 km of Midtown Manhattan, organised into a wall for the whole city and a wall for each borough — Manhattan, Brooklyn, Queens (${fmt(queens)}), the Bronx (${fmt(bronx)}) and Staten Island. Every feed is free to watch, no account, no signup.`,
    "The honest shape of the coverage: this is NYSDOT's city. 274 of the whole-city wall's 279 feeds come from the state's 511NY network — working cameras that watch avenues, expressways, bridge approaches and tunnels so drivers can see conditions before they commit. That makes this page a truth machine for the questions New Yorkers actually ask: Is the BQE moving? What's the Cross Bronx doing? Is the storm over the harbour yet? Scenic angles ride along — bridges, waterfront, skyline edges — but nobody here will dress a traffic camera up as a postcard.",
    "One famous view is deliberately not promised: the Times Square scenic camera belongs to EarthCam, and it isn't in this directory. What Midtown's wall offers instead is the streets around it, live. The FAQ below says it plainly, because a page that is straight about the one view it lacks is a page whose counts you can trust.",
    "The borough walls use stated radii from each borough's centre, nearest first — the counts are each rule's real yield over the catalogue, computed, not asserted. Queens and the Bronx also keep their own full directory pages (linked below), where their complete city listings live; this hub is the front door to all five.",
  ];

  return (
    <PageShell>
      <JsonLd data={jsonLd} />
      <FaqJsonLd faqs={FAQS} />
      <Breadcrumb
        trail={[
          { label: "Home", href: "/" },
          { label: "City webcams", href: "/city-webcams" },
          { label: "New York City" },
        ]}
      />
      <Hero
        h1="New York City Webcams — All Five Boroughs, Live"
        sub="279 public cameras within 25 km of Midtown — 511NY street, bridge and harbour feeds across Manhattan, Brooklyn, Queens, the Bronx and Staten Island. Free, no signup."
      />
      <StatRow
        stats={[
          { value: fmt(all), label: "cameras within 25 km of Midtown" },
          { value: "5", label: "boroughs, one wall each" },
          { value: "274", label: "of the feeds are NYSDOT 511NY" },
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
            explorerId={`nyc-${w.key}`}
          />
        </section>
      ))}

      <HowTo
        title="How to use New York's cameras"
        steps={[
          "Start with the whole-city wall for the pattern of the day — where rush hour, weather or an event is bending the city's flow.",
          "Drop to your borough wall before driving: the bridge and expressway cameras show the queue itself, not a coloured line's opinion of it.",
          "Check the harbour wall on the port webcams page (linked below) for bridge and waterfront angles, and pair it with the live ship tracker for harbour traffic.",
          "On event days — the Marathon, the Macy's Parade — the Midtown and Central Park–edge feeds show closures and crowds hours before they peak.",
          "Confirm the timestamp before trusting a feed; a frozen frame is a camera having a bad day, not a quiet street.",
        ]}
      />

      <FaqSection title="New York City webcams — FAQ" faqs={FAQS} />

      <RelatedLinks
        title="More New York, more live WorldEye"
        links={[
          { label: "Queens webcams — the full borough page", href: "/city-webcams/queens" },
          { label: "Bronx webcams — the full borough page", href: "/city-webcams/bronx" },
          { label: "Port webcams — the New York Harbor wall", href: "/port-webcams" },
          { label: "Airport webcams — JFK, LaGuardia & Newark area", href: "/airport-webcams" },
          { label: "NYC Marathon 2026", href: "/nyc-marathon-2026" },
          { label: "Macy's Thanksgiving Parade 2026", href: "/macys-thanksgiving-parade-2026" },
          { label: "US traffic cameras", href: "/us-traffic-cameras" },
          { label: "City webcams index", href: "/city-webcams" },
        ]}
      />

      <TrialCtaSection utmSource="city-webcams-new-york-city" />

      <CtaRow backHref="/city-webcams" backLabel="All city webcams" />
    </PageShell>
  );
}
