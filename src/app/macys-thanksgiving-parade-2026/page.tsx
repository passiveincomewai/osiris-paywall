import type { Metadata } from "next";
import {
  BASE,
  JsonLd,
  Breadcrumb,
  Hero,
  StatRow,
  Intro,
  AreaTable,
  HowTo,
  FaqSection,
  FaqJsonLd,
  RelatedLinks,
  CtaRow,
  PageShell,
} from "@/components/directory-page";
import SkiCameraGrid from "@/components/SkiCameraGrid";
import { loadCountryChunk } from "@/lib/ski-resorts";
import {
  camerasNearAnchors,
  camerasWithinKm,
  type GeoAnchor,
} from "@/lib/event-page-cameras";

export const metadata: Metadata = {
  title: "Macy's Thanksgiving Day Parade 2026 — Live Cameras",
  description:
    "The 100th Macy's Thanksgiving Day Parade, Thursday, November 26, 2026 — live public cameras around the Central Park West and Sixth Avenue route and the balloon-inflation streets, on the WorldEye map. Free, no signup.",
  alternates: { canonical: `${BASE}/macys-thanksgiving-parade-2026` },
  openGraph: {
    title: "Macy's Thanksgiving Day Parade 2026 — Live Cameras",
    description:
      "Public cameras around the parade route, the inflation-night streets and the bridges and tunnels into Manhattan. Free on WorldEye.",
    url: "/macys-thanksgiving-parade-2026",
    type: "website",
  },
};

const MUSEUM: GeoAnchor = { lat: 40.782, lng: -73.972 };
const COLUMBUS_CIRCLE: GeoAnchor = { lat: 40.765, lng: -73.982 };
const HERALD_SQUARE: GeoAnchor = { lat: 40.749, lng: -73.988 };

const CROSSINGS: { name: string; anchor: GeoAnchor }[] = [
  { name: "George Washington Bridge", anchor: { lat: 40.851, lng: -73.958 } },
  { name: "Lincoln Tunnel approaches", anchor: { lat: 40.771, lng: -74.021 } },
  { name: "Holland Tunnel approaches", anchor: { lat: 40.727, lng: -74.011 } },
  { name: "Queensboro Bridge", anchor: { lat: 40.757, lng: -73.953 } },
  { name: "Brooklyn Bridge", anchor: { lat: 40.707, lng: -73.996 } },
  { name: "Williamsburg Bridge", anchor: { lat: 40.713, lng: -73.972 } },
];

const FAQS = [
  {
    q: "When is the 2026 Macy's Thanksgiving Day Parade?",
    a: "Thursday morning, November 26, 2026 — Thanksgiving Day. It is the parade's 100th edition: the first Macy's parade marched in 1924, and the centennial running steps off from Central Park West at 81st Street, turns at Columbus Circle, crosses Central Park South to Sixth Avenue, and marches down Sixth Avenue to Herald Square at 34th Street.",
  },
  {
    q: "What is balloon inflation night, and when is it?",
    a: "The night before the parade — Wednesday, November 25, 2026 — the giant balloons are inflated in the streets around the American Museum of Natural History, on the Upper West Side between 77th and 81st Streets. It is a public event in its own right and one of the week's great New York spectacles: the balloons rise under their nets through the afternoon and evening while crowds circle the blocks.",
  },
  {
    q: "Can I watch the balloons and the parade on these cameras?",
    a: "You can watch the streets the parade owns, from street level. These are New York's public street and traffic cameras around the inflation blocks, the route and the river crossings — they show the crowds gathering, the closures going in, and the city's Thanksgiving morning as it happens. They are not the broadcast: for the balloons in close-up and the performances at Herald Square, the television coverage is the view. This page is the next best thing to standing on the avenue — and the only view of inflation night and the approaches.",
  },
  {
    q: "Which areas do the cameras cover?",
    a: "Three views: the Upper West Side streets around the museum where the balloons inflate; Midtown around Columbus Circle, Central Park South, Sixth Avenue and Herald Square, which the route passes through; and the bridges and tunnels into Manhattan — the George Washington Bridge, the Lincoln and Holland Tunnels, and the Queensboro, Brooklyn and Williamsburg Bridges — for the trip into the city.",
  },
  {
    q: "Are the parade cameras free to watch?",
    a: "Yes. Every camera on this page is a public feed, free to open on WorldEye — no account, no signup.",
  },
];

export default async function MacysParade2026Page() {
  const records = await loadCountryChunk("united-states");

  const inflation = camerasWithinKm(records, MUSEUM, 4);
  const route = camerasNearAnchors(records, [
    { anchor: COLUMBUS_CIRCLE, km: 3 },
    { anchor: HERALD_SQUARE, km: 3 },
  ]);
  const crossings = camerasNearAnchors(
    records,
    CROSSINGS.map((c) => ({ anchor: c.anchor, km: 2 })),
  );

  const all = new Set<string>();
  for (const c of [...inflation, ...route, ...crossings]) all.add(c.id);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Macy's Thanksgiving Day Parade 2026 — Live Cameras",
    description:
      "Public cameras around the 100th Macy's Thanksgiving Day Parade route, the balloon-inflation streets and the crossings into Manhattan.",
    url: `${BASE}/macys-thanksgiving-parade-2026`,
    isPartOf: { "@type": "WebSite", name: "WorldEye", url: "https://worldeye.app" },
  };

  const eventLd = {
    "@context": "https://schema.org",
    "@type": "Event",
    name: "Macy's Thanksgiving Day Parade 2026 (100th edition)",
    startDate: "2026-11-26",
    location: { "@type": "Place", name: "Central Park West & Sixth Avenue, New York City" },
    description:
      "The 100th Macy's Thanksgiving Day Parade runs the morning of Thursday, November 26, 2026, down Central Park West and Sixth Avenue to Herald Square, with public balloon inflation the night before on the Upper West Side.",
  };

  return (
    <PageShell>
      <JsonLd data={jsonLd} />
      <JsonLd data={eventLd} />
      <FaqJsonLd faqs={FAQS} />
      <Breadcrumb
        trail={[
          { label: "Home", href: "/" },
          { label: "Live events", href: "/live-events" },
          { label: "Macy's Parade 2026" },
        ]}
      />
      <Hero
        h1="Macy's Thanksgiving Day Parade 2026 — Live Cameras"
        sub="Thursday, November 26, 2026: the 100th parade. Watch the inflation streets, the route and the crossings into Manhattan, live — free, no signup."
      />
      <StatRow
        stats={[
          { value: "100th", label: "Edition of the parade" },
          { value: String(all.size), label: "Public cameras across the three views below" },
          { value: "Nov 25", label: "Balloon inflation night, Upper West Side" },
        ]}
      />
      <Intro
        paragraphs={[
          "The Macy's Thanksgiving Day Parade reaches its 100th edition on Thanksgiving morning, Thursday, November 26, 2026 — down Central Park West from 81st Street, around Columbus Circle, across Central Park South and down Sixth Avenue to Herald Square. And the night before, Wednesday, November 25, the giant balloons inflate in the streets around the American Museum of Natural History, an Upper West Side ritual that draws its own crowds.",
          "This page gathers the public cameras that watch those streets the rest of the year — New York's street and traffic feeds around the inflation blocks, along the Midtown route, and at the bridges and tunnels everyone crosses to get there. The honest framing, as with every event page here: these are the city's cameras, not the parade broadcast. They show Thanksgiving in New York at street level — the closures, the crowds, the avenue filling before the first balloon turns the corner.",
          "Start Wednesday evening with the inflation wall, when the balloons rise under their nets around the museum. On Thursday morning, work from the Upper West Side down to Herald Square, and check the crossings if you are driving in — parade-day Manhattan closes early and fills fast.",
        ]}
      />

      <section className="mt-12">
        <h2 className="text-xl md:text-2xl font-bold mb-2">Balloon inflation night — the Upper West Side</h2>
        <p className="text-sm text-white/55 leading-relaxed max-w-3xl mb-5">
          The balloons inflate on Wednesday, November 25, in the blocks around the American Museum of
          Natural History, between 77th and 81st Streets at Central Park West and Columbus Avenue.
          Public camera coverage of the museum blocks themselves is a handful of street feeds — the
          wall below is every public camera within 4 km of the museum, which takes in the park edge,
          the avenues feeding the inflation zone, and the crowds arriving.
        </p>
        <SkiCameraGrid
          cameras={inflation}
          initial={12}
          emptyNote="No public cameras in the directory currently cover the Upper West Side."
        />
      </section>

      <section className="mt-12">
        <h2 className="text-xl md:text-2xl font-bold mb-2">The route — Columbus Circle to Herald Square</h2>
        <p className="text-sm text-white/55 leading-relaxed max-w-3xl mb-5">
          The parade turns at Columbus Circle, crosses Central Park South to Sixth Avenue and
          marches south to Herald Square at 34th Street. Midtown's public feeds are spaced along the
          avenues rather than packed on the route itself — this wall gathers the cameras within
          3 km of Columbus Circle and Herald Square, the two ends of the Midtown leg.
        </p>
        <SkiCameraGrid
          cameras={route}
          initial={12}
          emptyNote="No public cameras in the directory currently cover the Midtown route."
        />
      </section>

      <section className="mt-12">
        <h2 className="text-xl md:text-2xl font-bold mb-2">Getting there — bridges and tunnels</h2>
        <p className="text-sm text-white/55 leading-relaxed max-w-3xl mb-5">
          Thanksgiving morning is one of the year's great drives into Manhattan. These are the
          public cameras within 2 km of the six crossings most parade-goers use — check the
          approaches before you leave, because the avenues around the route close hours before
          step-off.
        </p>
        <SkiCameraGrid
          cameras={crossings}
          initial={12}
          emptyNote="No public cameras in the directory currently cover the crossings."
        />
      </section>

      <AreaTable
        title="The three views — camera counts"
        rows={[
          { name: "Balloon inflation area (Upper West Side, 4 km)", count: inflation.length },
          { name: "Route & Midtown (Columbus Circle + Herald Square, 3 km)", count: route.length },
          { name: "Bridges & tunnels (six crossings, 2 km each)", count: crossings.length },
        ]}
        note="Counts are public cameras in the WorldEye directory per selection; a camera near two selections is counted in each, and the page total counts it once."
      />

      <HowTo
        title="How to watch parade week on the cameras"
        steps={[
          "Wednesday evening, open the inflation wall: the balloons rise under their nets around the museum through the afternoon and evening of November 25.",
          "Thursday morning, start at the top of the route — the Upper West Side and Columbus Circle cameras show the avenue filling before the 100th parade steps off.",
          "Follow the Midtown wall down to Herald Square as the parade moves south along Sixth Avenue.",
          "Driving in? Check the bridges and tunnels wall first — and remember the route's streets close long before the parade arrives.",
          "After the parade, the same crossings show the getaway: the city's Thanksgiving exodus in real time.",
        ]}
      />

      <FaqSection title="Macy's Parade 2026 cameras — FAQ" faqs={FAQS} />

      <RelatedLinks
        title="More Thanksgiving week, live"
        links={[
          { label: "Thanksgiving travel rush — live", href: "/thanksgiving-travel-2026" },
          { label: "NYC Marathon 2026 — cameras along the course", href: "/nyc-marathon-2026" },
          { label: "Live webcams in New York City", href: "/city-webcams/new-york-city" },
          { label: "Airport webcams", href: "/airport-webcams" },
          { label: "All live events", href: "/live-events" },
        ]}
      />

      <CtaRow backHref="/live-events" backLabel="All live events" />
    </PageShell>
  );
}
