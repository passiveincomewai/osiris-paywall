import type { Metadata } from "next";
import Link from "next/link";
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
  countWithinKm,
  type GeoAnchor,
} from "@/lib/event-page-cameras";
import type { CountryCamera } from "@/lib/country-cameras";

export const metadata: Metadata = {
  title: "Thanksgiving Travel 2026 — Live Airport & Highway Cameras",
  description:
    "Check the Thanksgiving rush before you leave: live public cameras around America's busiest airports and on the interstates home, November 24–29, 2026, on the WorldEye map. Free, no signup.",
  alternates: { canonical: `${BASE}/thanksgiving-travel-2026` },
  openGraph: {
    title: "Thanksgiving Travel 2026 — Live Airport & Highway Cameras",
    description:
      "Airport-area and interstate cameras for the busiest travel week of the year, live on one map. Free on WorldEye.",
    url: "/thanksgiving-travel-2026",
    type: "website",
  },
};

interface AirportWall {
  title: string;
  anchor: GeoAnchor;
  km: number;
  body: string;
  gridCap: number;
}

const AIRPORTS: AirportWall[] = [
  {
    title: "Atlanta — Hartsfield-Jackson (ATL)",
    anchor: { lat: 33.641, lng: -84.428 },
    km: 8,
    body: "The busiest airport in the country sits inside the densest state camera network in the directory — Georgia DOT feeds blanket the interstates that feed it, I-75, I-85 and I-285. This wall is every public camera within 8 km of the field: the airport's own approaches and the first miles of the drive in every direction.",
    gridCap: 60,
  },
  {
    title: "Dallas–Fort Worth (DFW)",
    anchor: { lat: 32.899, lng: -97.04 },
    km: 8,
    body: "DFW's cameras watch the airport's spine roads and the SH-114 / SH-121 / International Parkway corridors that carry the whole Metroplex to the terminals. Within 8 km of the field, this is the check before a holiday pickup or drop-off run.",
    gridCap: 60,
  },
  {
    title: "Los Angeles (LAX)",
    anchor: { lat: 33.942, lng: -118.244 },
    km: 8,
    body: "The LAX wall gathers the public cameras around the airport and its approaches — Sepulveda, the 405 and the 105 — the roads where Los Angeles' Thanksgiving getaway is won or lost. Thirty public cameras stand within 8 km of the terminals.",
    gridCap: 36,
  },
  {
    title: "Chicago — O'Hare (ORD)",
    anchor: { lat: 41.975, lng: -87.908 },
    km: 10,
    body: "O'Hare is the honest thin spot of the five hubs: the directory's cameras here are the Kennedy Expressway corridor — I-90 and I-190 — rather than a blanket around the field. Eleven public cameras within 10 km still answer the only question that matters on getaway day: is the Kennedy moving?",
    gridCap: 24,
  },
];

const NYC_AIRPORTS: { anchor: GeoAnchor; km: number }[] = [
  { anchor: { lat: 40.641, lng: -73.778 }, km: 8 }, // JFK
  { anchor: { lat: 40.776, lng: -73.874 }, km: 6 }, // LaGuardia
  { anchor: { lat: 40.69, lng: -74.174 }, km: 8 }, // Newark
];

const DENVER: GeoAnchor = { lat: 39.856, lng: -104.674 };
const METROS: { name: string; anchor: GeoAnchor }[] = [
  { name: "Atlanta", anchor: AIRPORTS[0].anchor },
  { name: "Dallas–Fort Worth", anchor: AIRPORTS[1].anchor },
  { name: "Los Angeles", anchor: AIRPORTS[2].anchor },
  { name: "Chicago", anchor: AIRPORTS[3].anchor },
  { name: "Denver", anchor: DENVER },
];

const FAQS = [
  {
    q: "What are the busiest Thanksgiving travel days in 2026?",
    a: "Thanksgiving falls on Thursday, November 26, 2026. The Tuesday and Wednesday before it — November 24 and 25 — and the Sunday after, November 29, are reliably the busiest travel days of the American year: the Wednesday getaway and the Sunday return are the two peaks, and both are when these cameras earn their keep.",
  },
  {
    q: "What do the airport cameras actually show?",
    a: "The public camera networks around the airports — state DOT and airport-area feeds covering the approach roads, the interstates and the terminal-area traffic. They are not inside the terminals and they do not show security lines; they answer the traveler's real first question, which is whether the drive to the airport is moving. Pair them with the live flight tracker for the air side of the same trip.",
  },
  {
    q: "Why is there no Denver airport wall?",
    a: "Honesty about coverage: Denver International sits far out on the plains, and the directory's nearest public cameras are the metro highway network — none stands within 12 km of the field. Rather than dress up distant cameras as an airport wall, Denver appears below in the drive section, where its 25 km metro network genuinely helps: it is the network you drive to DIA on.",
  },
  {
    q: "How should I use this page before a trip?",
    a: "Check your airport's wall for the approach roads, then your interstate in the drive section, then — if you are flying — the live flight tracker for your flight's world: the same traffic, seen from the map. A five-minute look on Wednesday afternoon or Sunday morning is the difference between leaving at the right hour and sitting in the getaway you could have watched forming.",
  },
  {
    q: "Are the Thanksgiving travel cameras free?",
    a: "Yes. Every camera on this page is a public feed, free to open on WorldEye — no account, no signup.",
  },
];

export default async function ThanksgivingTravel2026Page() {
  const records = await loadCountryChunk("united-states");

  const walls = AIRPORTS.map((a) => {
    const cams = camerasWithinKm(records, a.anchor, a.km);
    return { ...a, cams, shown: cams.slice(0, a.gridCap) as CountryCamera[] };
  });
  const nyc = camerasNearAnchors(records, NYC_AIRPORTS);
  const denverDrive = camerasWithinKm(records, DENVER, 25);
  const metroRows = METROS.map((m) => ({
    name: m.name,
    count: countWithinKm(records, m.anchor, 25),
  }));

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Thanksgiving Travel 2026 — Live Airport & Highway Cameras",
    description:
      "Public cameras around America's busiest airports and on the interstate networks for the Thanksgiving travel rush, November 24–29, 2026.",
    url: `${BASE}/thanksgiving-travel-2026`,
    isPartOf: { "@type": "WebSite", name: "WorldEye", url: "https://worldeye.app" },
  };

  return (
    <PageShell>
      <JsonLd data={jsonLd} />
      <FaqJsonLd faqs={FAQS} />
      <Breadcrumb
        trail={[
          { label: "Home", href: "/" },
          { label: "Live events", href: "/live-events" },
          { label: "Thanksgiving Travel 2026" },
        ]}
      />
      <Hero
        h1="Thanksgiving Travel 2026 — Airports & Highways, Live"
        sub="The busiest travel week of the year, watched as it happens: airport approaches and interstate cameras for November 24–29. Free, no signup."
      />
      <StatRow
        stats={[
          { value: String(records.length), label: "Public cameras in the US directory" },
          { value: "5", label: "Airport walls — ATL, DFW, LAX, ORD, NYC" },
          { value: "Nov 24–29", label: "Peak days: Wed getaway, Sun return" },
        ]}
      />
      <Intro
        paragraphs={[
          "Thanksgiving week is the American travel year in miniature: the Tuesday and Wednesday before the holiday (November 24–25, 2026) and the Sunday after (November 29) are reliably the busiest travel days of the year, on the roads and in the air at once. This page is the traveler's dashboard for that week — the public cameras around the country's biggest airports and across the interstate networks of its biggest metros, live on one map.",
          "The walls below are geographic and honest. Each airport section is every public camera within a stated radius of the field — Atlanta's wall is dense because Georgia's DOT network is dense; Chicago's is the slimmest of the four, and says so. These are the approach roads and the first miles out of town, not terminal interiors: the view that tells you whether to leave now or in an hour.",
          "Flying? Pair the drive with the sky. WorldEye's live flight tracker follows the same week's air traffic on the globe — departures stacking out of the hubs on Wednesday, the great return on Sunday — and the airport webcams page gathers the directory's airport-area feeds year-round.",
        ]}
      />

      <section className="mt-12 rounded-2xl border border-[#D4AF37]/25 bg-[#D4AF37]/[0.04] p-6">
        <h2 className="font-semibold text-white/90">The air side: flight tracker & airport cameras</h2>
        <p className="text-sm text-white/55 mt-2 leading-relaxed">
          The cameras below watch the roads. For the runways, open the{" "}
          <Link href="/live-flight-tracker" className="text-[#D4AF37] hover:underline">
            live flight tracker
          </Link>{" "}
          — the same Thanksgiving traffic, airborne — and the{" "}
          <Link href="/airport-webcams" className="text-[#D4AF37] hover:underline">
            airport webcams
          </Link>{" "}
          directory for airport-area feeds across the country. Checking both before you leave is the
          whole trick: the road to the airport, and the sky beyond it.
        </p>
      </section>

      {walls.map((w) => (
        <section key={w.title} className="mt-12">
          <h2 className="text-xl md:text-2xl font-bold mb-2">{w.title}</h2>
          <p className="text-sm text-white/55 leading-relaxed max-w-3xl mb-5">{w.body}</p>
          <p className="text-xs text-white/35 mb-4">
            {w.cams.length} public cameras within {w.km} km of the airport
            {w.shown.length < w.cams.length ? ` — showing the first ${w.shown.length}` : ""}.
          </p>
          <SkiCameraGrid
            cameras={w.shown}
            initial={12}
            emptyNote="No public cameras in the directory currently cover this airport."
          />
        </section>
      ))}

      <section className="mt-12">
        <h2 className="text-xl md:text-2xl font-bold mb-2">New York — JFK, LaGuardia & Newark</h2>
        <p className="text-sm text-white/55 leading-relaxed max-w-3xl mb-5">
          Three airports, one metro, and the parade on top of it: Thanksgiving week is New York's
          biggest movement of the year. This wall gathers the public cameras around JFK (8 km),
          LaGuardia (6 km) and Newark (8 km) — {nyc.length} feeds across the three fields and their
          approach roads.
        </p>
        <SkiCameraGrid
          cameras={nyc.slice(0, 60)}
          initial={12}
          emptyNote="No public cameras in the directory currently cover New York's airports."
        />
      </section>

      <section className="mt-12">
        <h2 className="text-xl md:text-2xl font-bold mb-2">On the road — the drive home</h2>
        <p className="text-sm text-white/55 leading-relaxed max-w-3xl mb-5">
          Most Thanksgiving trips never leave the ground. The table below counts the public highway
          and street cameras within 25 km of each hub — the network you actually drive. Denver
          stands here rather than in the airport walls: its airport sits far out on the plains with
          no public camera within 12 km, but its metro network — {denverDrive.length} cameras within
          25 km — covers the Peña Boulevard run and the interstates home.
        </p>
        <SkiCameraGrid
          cameras={denverDrive.slice(0, 36)}
          initial={12}
          emptyNote="No public cameras in the directory currently cover metro Denver."
        />
      </section>

      <AreaTable
        title="Cameras within 25 km of each hub — the drive network"
        rows={metroRows}
        note="Counts are public cameras in the WorldEye directory (US chunk) within 25 km of each airport anchor — the metro highway and street networks Thanksgiving traffic drives on."
      />

      <HowTo
        title="How to use the travel walls"
        steps={[
          "Wednesday and Sunday are the peaks: check your airport's wall before you set out for the approach roads' real state, not the prediction.",
          "Flying out? Open the flight tracker alongside — watch your hub's departures bank up and read the day's rhythm before you commit to a departure time.",
          "Picking someone up? The airport walls show the terminal-area roads as they are; time the run to the cameras, not the schedule.",
          "Driving long distance? The 25 km metro counts tell you which cities you can watch your way through — and the state traffic pages carry the same networks between cities.",
          "In New York for the parade? The marathon and parade pages cover the city's own Thanksgiving week, street by street.",
        ]}
      />

      <FaqSection title="Thanksgiving travel 2026 cameras — FAQ" faqs={FAQS} />

      <RelatedLinks
        title="More Thanksgiving week, live"
        links={[
          { label: "Macy's Thanksgiving Day Parade 2026", href: "/macys-thanksgiving-parade-2026" },
          { label: "NYC Marathon 2026 — cameras along the course", href: "/nyc-marathon-2026" },
          { label: "Live flight tracker", href: "/live-flight-tracker" },
          { label: "Airport webcams", href: "/airport-webcams" },
          { label: "Live webcams in New York City", href: "/city-webcams/new-york-city" },
          { label: "All live events", href: "/live-events" },
        ]}
      />

      <CtaRow backHref="/live-events" backLabel="All live events" />
    </PageShell>
  );
}
