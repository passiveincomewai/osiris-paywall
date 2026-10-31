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
  camerasWithinKm,
  distanceKm,
  type GeoAnchor,
} from "@/lib/event-page-cameras";
import { buildEventSchema } from "@/lib/event-schema";

export const metadata: Metadata = {
  title: "Starship Flight 15 — Live Launch Watch & Launch-Site Cameras",
  description:
    "Starship Flight 15 from Starbase, Texas — currently targeted for no earlier than November 8, 2026 — with live public cameras around Starbase, Cape Canaveral, Vandenberg and Wallops, on the WorldEye map. Free, no signup.",
  alternates: { canonical: `${BASE}/starship-flight-15` },
  openGraph: {
    title: "Starship Flight 15 — Live Launch Watch",
    description:
      "The launch hub: Starbase-area cameras plus the other launch coasts WorldEye covers. Free on WorldEye.",
    url: "/starship-flight-15",
    type: "website",
  },
};

const STARBASE: GeoAnchor = { lat: 25.997, lng: -97.155 };
const CAPE: GeoAnchor = { lat: 28.572, lng: -80.649 };
const VANDENBERG: GeoAnchor = { lat: 34.632, lng: -120.611 };
const WALLOPS: GeoAnchor = { lat: 37.94, lng: -75.475 };

const FAQS = [
  {
    q: "When is Starship Flight 15?",
    a: "Currently targeted for no earlier than (NET) November 8, 2026, per FAA planning information — and 'targeted' is the operative word. Starship dates move with testing, weather and range availability, sometimes by days at a time. Treat November 8 as the date to watch around, and confirm against SpaceX and the FAA as the window nears.",
  },
  {
    q: "What is the 'double catch' Flight 15 is attempting?",
    a: "SpaceX lands its returning hardware by catching it with the launch tower's arms. Earlier flights have caught the Super Heavy booster; Flight 15 is planned as the first attempt to catch both the booster and the Starship upper stage on the same flight. No orbital rocket has ever been fully recovered this way — which is why this flight, whenever it lifts, is a historic-moment event.",
  },
  {
    q: "Can I watch the launch itself on these cameras?",
    a: "Not in close-up, and this page will not pretend otherwise. The catalogue has no public camera on the Starbase pad: the nearest public feeds stand about 10 km away on South Padre Island, with six more covering the Brownsville highways. On a clear day a Starship ascent is a sky-filling event from that distance, and the coastal cameras are worth watching through the window — but the launch close-up belongs to SpaceX's and the space media's own streams. What this page adds is the living coast around the event, and the tracking layers below.",
  },
  {
    q: "Which other launch sites does WorldEye cover?",
    a: "The directory's launch-coast coverage, counted from the pads: Cape Canaveral and Kennedy Space Center in Florida — 68 public cameras within 30 km, on the coast Flight 16 is tentatively planned to fly from in December; Vandenberg Space Force Base in California — 11 within 30 km; and Wallops Island in Virginia — 2 within 30 km, the thinnest of the four, stated as it is.",
  },
  {
    q: "Are the launch-site cameras free to watch?",
    a: "Yes. Every camera on this page is a public feed, free to open on WorldEye — no account, no signup.",
  },
];

export default async function StarshipFlight15Page() {
  const records = await loadCountryChunk("united-states");

  const starbase = camerasWithinKm(records, STARBASE, 45);
  const starbaseCaptions: Record<string, string> = {};
  for (const c of starbase) {
    starbaseCaptions[c.id] = `${distanceKm(c, STARBASE).toFixed(0)} km from Starbase`;
  }
  const cape = camerasWithinKm(records, CAPE, 30);
  const vandenberg = camerasWithinKm(records, VANDENBERG, 30);
  const wallops = camerasWithinKm(records, WALLOPS, 30);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Starship Flight 15 — Live Launch Watch & Launch-Site Cameras",
    description:
      "Public cameras around Starbase, Texas and the other US launch coasts for Starship Flight 15, currently targeted NET November 8, 2026.",
    url: `${BASE}/starship-flight-15`,
    isPartOf: { "@type": "WebSite", name: "WorldEye", url: "https://worldeye.app" },
  };

  // R67 sweep: this Event carried no endDate. A launch is a
  // single-day event, so endDate is the start date — the page's own
  // stated NET target, November 8, 2026; the description keeps the
  // page's "no earlier than … subject to change" caveat verbatim.
  const eventLd = buildEventSchema({
    sport: false,
    name: "SpaceX Starship Flight 15",
    startDate: "2026-11-08",
    endDate: "2026-11-08",
    locationName: "Starbase, Texas",
    url: `${BASE}/starship-flight-15`,
    description:
      "Starship Flight 15 from Starbase, Texas — the first planned double-catch attempt (booster and ship). Currently targeted for no earlier than November 8, 2026 per FAA planning; subject to change.",
  });

  return (
    <PageShell>
      <JsonLd data={jsonLd} />
      <JsonLd data={eventLd} />
      <FaqJsonLd faqs={FAQS} />
      <Breadcrumb
        trail={[
          { label: "Home", href: "/" },
          { label: "Live events", href: "/live-events" },
          { label: "Starship Flight 15" },
        ]}
      />
      <Hero
        h1="Starship Flight 15 — Live Launch Watch"
        sub="Starbase, Texas — currently targeted for no earlier than November 8, 2026, and subject to change. The first-ever double-catch attempt, and the launch coasts, live. Free, no signup."
      />
      <StatRow
        stats={[
          { value: String(starbase.length), label: "Public cameras within 45 km of Starbase" },
          { value: String(cape.length), label: "Public cameras within 30 km of Cape Canaveral" },
          { value: "4", label: "US launch coasts covered below" },
        ]}
      />
      <Intro
        paragraphs={[
          "Starship Flight 15 is currently targeted for no earlier than November 8, 2026, from Starbase, Texas — FAA planning information carries the date, and Starship dates are famously movable, so hold it as a window, not an appointment. The flight's ambition is fixed even if its date is not: for the first time, SpaceX plans to catch both the Super Heavy booster and the returning Ship with the tower arms. Nothing orbital has ever been recovered whole. When it flies, it is one of the biggest live events on Earth.",
          "This page is WorldEye's launch hub, built to outlive the one flight: the public cameras around Starbase and the South Texas coast first, then the other launch coasts the directory covers — Cape Canaveral, Vandenberg and Wallops — each with its real camera count, stated plainly. South Texas coverage is honestly thin: eight public cameras within 45 km of the pad, the nearest about 10 km away on South Padre Island. There is no pad close-up in the public catalogue, and the page says so rather than dressing up distant highway feeds as one.",
          "The cameras are half the watch. The other half is the map itself: WorldEye's globe carries a live launch layer fed by launch-library data, plus the flight and satellite layers that fill the sky on launch day. Open the globe during the window and the whole event — pad, coast, airspace and orbit — is one view.",
        ]}
      />

      <section className="mt-12 rounded-2xl border border-[#D4AF37]/25 bg-[#D4AF37]/[0.04] p-6">
        <h2 className="font-semibold text-white/90">Track the flight on the globe</h2>
        <p className="text-sm text-white/55 mt-2 leading-relaxed">
          The{" "}
          <Link href="/" className="text-[#D4AF37] hover:underline">
            WorldEye globe
          </Link>{" "}
          plots the world's launch pads with their upcoming missions, and the same map carries live{" "}
          <Link href="/live-flight-tracker" className="text-[#D4AF37] hover:underline">
            flights
          </Link>{" "}
          and{" "}
          <Link href="/satellite-tracker" className="text-[#D4AF37] hover:underline">
            satellites
          </Link>{" "}
          — on launch day, the airspace closures, the chase planes and the growing orbital train
          are all in the same picture as the coast below.
        </p>
      </section>

      <section className="mt-12">
        <h2 className="text-xl md:text-2xl font-bold mb-2">Starbase & the South Texas coast</h2>
        <p className="text-sm text-white/55 leading-relaxed max-w-3xl mb-5">
          Every public camera within 45 km of the Starbase pad: {starbase.length}. The two nearest
          stand on South Padre Island's PR 100, roughly 10 km north of the pad across the water;
          the rest cover Brownsville's IH-69E corridors, the roads the launch crowds drive. Thin —
          and on a clear launch day, still worth watching: a Starship ascent lights up the whole
          coast.
        </p>
        <SkiCameraGrid
          cameras={starbase}
          captions={starbaseCaptions}
          initial={12}
          emptyNote="No public cameras in the directory currently cover the Starbase area."
        />
      </section>

      <section className="mt-12">
        <h2 className="text-xl md:text-2xl font-bold mb-2">Cape Canaveral & Kennedy — the Florida coast</h2>
        <p className="text-sm text-white/55 leading-relaxed max-w-3xl mb-5">
          The Space Coast is the directory's richest launch landscape: {cape.length} public cameras
          within 30 km of Kennedy Space Center — Titusville, Cocoa Beach and the SR-528 corridor
          facing the pads across the water. Flight 16 is tentatively planned as the first Starship
          launch from Florida's LC-39A, in December; whenever Starship comes east, this wall is
          where it will be watched from.
        </p>
        <SkiCameraGrid
          cameras={cape}
          initial={12}
          emptyNote="No public cameras in the directory currently cover the Cape Canaveral area."
        />
      </section>

      <section className="mt-12">
        <h2 className="text-xl md:text-2xl font-bold mb-2">Vandenberg — the California coast</h2>
        <p className="text-sm text-white/55 leading-relaxed max-w-3xl mb-5">
          Vandenberg Space Force Base flies the polar missions from the cliffs above Lompoc.{" "}
          {vandenberg.length} public cameras stand within 30 km — the Lompoc and Santa Maria
          corridor feeds that watch the base's approaches and the coast its rockets climb over.
        </p>
        <SkiCameraGrid
          cameras={vandenberg}
          initial={12}
          emptyNote="No public cameras in the directory currently cover the Vandenberg area."
        />
      </section>

      <section className="mt-12">
        <h2 className="text-xl md:text-2xl font-bold mb-2">Wallops Island — the Virginia coast</h2>
        <p className="text-sm text-white/55 leading-relaxed max-w-3xl mb-5">
          NASA's Wallops Flight Facility, on Virginia's Eastern Shore, is the quietest of the four
          ranges — and its public camera coverage is the thinnest: {wallops.length} cameras within
          30 km, around Chincoteague. They are listed because they are what honestly exists; when
          an Antares or a sounding rocket flies from Wallops, the Eastern Shore sky is the show
          and these are its windows.
        </p>
        <SkiCameraGrid
          cameras={wallops}
          initial={12}
          emptyNote="No public cameras in the directory currently cover the Wallops area."
        />
      </section>

      <AreaTable
        title="Launch coasts — camera counts"
        rows={[
          { name: "Starbase, Texas (45 km)", count: starbase.length },
          { name: "Cape Canaveral / Kennedy, Florida (30 km)", count: cape.length },
          { name: "Vandenberg, California (30 km)", count: vandenberg.length },
          { name: "Wallops Island, Virginia (30 km)", count: wallops.length },
        ]}
        note="Counts are public cameras in the WorldEye directory within the stated radius of each launch site. Starbase's radius is wider because its coverage is sparser — the honest comparison is the count, not the circle."
      />

      <HowTo
        title="How to follow Flight 15 on WorldEye"
        steps={[
          "In the run-up, check the Starbase wall: the South Padre and Brownsville cameras show the coast's weather and the launch crowds gathering on PR 100.",
          "Before the window, open the globe's launch layer for the mission's current status — Starship dates move, and the planning data moves with them.",
          "During the window, split your attention: the coastal cameras for the ascent's light over the water, the flight layer for the airspace, the satellite layer for what the flight leaves in orbit.",
          "After Flight 15, this page stays as the launch hub — the Cape wall is already watching the coast Flight 16 is tentatively planned to fly from.",
        ]}
      />

      <FaqSection title="Starship Flight 15 — FAQ" faqs={FAQS} />

      <RelatedLinks
        title="More sky, live"
        links={[
          { label: "Space station tracker", href: "/space-station-tracker" },
          { label: "Satellite tracker", href: "/satellite-tracker" },
          { label: "Live flight tracker", href: "/live-flight-tracker" },
          { label: "Thanksgiving travel rush — live", href: "/thanksgiving-travel-2026" },
          { label: "All live events", href: "/live-events" },
        ]}
      />

      <CtaRow backHref="/live-events" backLabel="All live events" />
    </PageShell>
  );
}
