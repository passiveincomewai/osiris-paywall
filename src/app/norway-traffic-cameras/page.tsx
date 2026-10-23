import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Car, CheckCircle2 } from "lucide-react";
import SiteFooter from "@/components/SiteFooter";
import BreadcrumbLd from "@/components/BreadcrumbLd";
import UpdatedStamp from "@/components/UpdatedStamp";
import DirectoryExplorer from "@/components/DirectoryExplorer";
import DirectorySearch from "@/components/DirectorySearch";
import {
  CATALOGUE_GENERATED_AT,
  COUNTRY_INDEX,
  EXPLORE_SCOPES,
  areasForDef,
  countForDef,
} from "@/lib/explore-data";

// Counts: camera-directory.json snapshot (48 NO cameras, 2026-10-11) plus the
// October 2026 harvest (+698 probe-verified Statens vegvesen road cameras).
// Union, deduplicated: 746.
const NO_COUNT = "740+";

export const metadata: Metadata = {
  title: "Norway Traffic Cameras — Live Road & Mountain Pass Cams",
  description:
    "Watch 740+ live road cameras across Norway — Statens vegvesen feeds on mountain passes, fjord roads and the E6 on one map. Free, no signup.",
  alternates: { canonical: "https://worldeye.app/norway-traffic-cameras" },
  openGraph: {
    title: "Norway Traffic Cameras — Live Road & Mountain Pass Cams | WorldEye",
    description:
      "740+ live road cameras across Norway — passes, fjords and highways on one map, free to watch with no signup.",
    url: "https://worldeye.app/norway-traffic-cameras",
    type: "website",
  },
};

const STEPS = [
  {
    title: "Open the WorldEye map",
    desc: "Head to the live map and enable the camera layer. Every public feed appears as a marker on the globe.",
  },
  {
    title: "Zoom to your pass or fjord road",
    desc: "Search a town, a pass or a stretch of the E6 — the map flies there and loads the nearest road cameras.",
  },
  {
    title: "Click a feed to watch",
    desc: "Click any marker to open the camera. Check snow, ice, closures and conditions before you leave.",
  },
];

const FAQS = [
  {
    q: "Where do these Norwegian road cameras come from?",
    a: "They are the public feeds of Statens vegvesen, the Norwegian Public Roads Administration — the cameras Norway itself uses to monitor passes, tunnels and highways. WorldEye collects them into one map alongside its 74,229 cameras worldwide.",
  },
  {
    q: "How many live cameras are there in Norway?",
    a: `WorldEye indexes ${NO_COUNT} cameras in Norway — the E6 spine from Oslo to the North Cape, the fjord roads of the west, mountain passes and the approaches to Bergen, Trondheim and Tromsø.`,
  },
  {
    q: "Can I check a mountain pass before driving it?",
    a: "Yes — this is the classic use. Pass cameras show snow depth on the road, visibility and whether traffic is moving in convoy (kolonnekjøring) or stopped. In a Norwegian winter, the camera is the forecast that matters.",
  },
  {
    q: "Do the cameras show live video or still images?",
    a: "Vegvesen cameras publish still images that refresh at intervals rather than continuous video. For road-state decisions — snow, ice, standing water, queues — a fresh still is exactly what you need.",
  },
  {
    q: "Can I watch the famous scenic roads?",
    a: "Several covered routes are destinations in themselves: the Atlantic Road, the Trollstigen approaches and the Lofoten corridors all have cameras nearby. The road-state check and the view come in the same feed.",
  },
  {
    q: "Is there a cost or account needed?",
    a: "No. The cameras are free to watch with no account and no signup. Open the map, zoom to Norway, and click any marker.",
  },
  {
    q: "What is convoy driving (kolonnekjøring) and can I see it?",
    a: "When weather turns severe on a mountain pass, traffic may cross only in escorted convoys behind a snowplow, at set times. The approach cameras show the waiting queue and the weather that caused it — if you see a stationary line at a pass in a storm, that is often exactly what you are looking at, and the right move is to wait it out somewhere warm.",
  },
  {
    q: "Can I check ferry approach roads?",
    a: "Several fjord-road feeds cover the corridors serving ferry terminals, so you can read both the road state and the queue building at the approach. In peak summer season, that check saves real time on the classic west-coast routes.",
  },
];

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "CollectionPage",
    name: "Norway Traffic Cameras — Live Road & Mountain Pass Cams",
    description:
      "Directory of 740+ live road cameras across Norway from Statens vegvesen public sources.",
    url: "https://worldeye.app/norway-traffic-cameras",
    isPartOf: { "@type": "WebSite", name: "WorldEye", url: "https://worldeye.app" },
    dateModified: CATALOGUE_GENERATED_AT,
    },
    {
      "@type": "FAQPage",
      mainEntity: FAQS.map((f) => ({
        "@type": "Question",
        name: f.q,
        acceptedAnswer: { "@type": "Answer", text: f.a },
      })),
    },
  ],
};

export default async function NorwayTrafficCamerasPage() {
  /* The explorer serves Norway's traffic set: cameras that are road
     feeds by name or by road-authority source (lib/explore-scopes),
     counted live from the served records. */
  const trafficTotal = await countForDef(EXPLORE_SCOPES["traffic-norway"]);
  const trafficAreas = await areasForDef(EXPLORE_SCOPES["traffic-norway"], 400);
  const countryTotal =
    COUNTRY_INDEX.find((c) => c.slug === "norway")?.count ?? 0;
  const fmt = (n: number) => n.toLocaleString("en-US");

  return (
    <main className="docs-root min-h-screen bg-[#05070d] text-zinc-100">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="max-w-4xl mx-auto px-6 py-10 md:py-16">
        <div className="flex items-center justify-between mb-10">
          <Link href="/cameras" className="flex items-center gap-2 text-sm text-white/50 hover:text-white transition">
            <Car className="w-4 h-4" /> Cameras
          </Link>
          <span className="text-[11px] font-mono tracking-[0.3em] text-[#D4AF37]">WORLDEYE</span>
        </div>

        <BreadcrumbLd trail={[{ label: "Cameras", href: "/cameras" }, { label: "Norway Traffic Cameras" }]} />
        <UpdatedStamp at={CATALOGUE_GENERATED_AT} label="Camera index updated" source="WorldEye camera catalogue" className="mb-8" />

        <div className="max-w-3xl">
          <p className="inline-flex items-center gap-2 text-xs font-semibold tracking-[0.25em] text-[#D4AF37] border border-[#D4AF37]/30 rounded-full px-4 py-1.5 mb-6">
            <Car className="w-3.5 h-3.5" /> NORWAY · VEGVESEN NETWORK
          </p>
          <h1 className="text-3xl md:text-5xl font-bold tracking-tight">
            Live Norway Road Cameras, <span className="text-[#D4AF37]">Passes &amp; Fjords</span>
          </h1>
          <p className="text-white/55 mt-5 text-base md:text-lg leading-relaxed">
            WorldEye tracks {NO_COUNT} live road cameras across Norway — the
            Statens vegvesen network that watches the E6 from Oslo to Nordkapp,
            the high passes and the fjord roads of the west. In a country where
            weather decides whether a road exists today, these are the feeds
            drivers actually plan by — now on one map, in English.
          </p>
          <p className="text-white/55 mt-4 text-base md:text-lg leading-relaxed">
            Check a pass before the crossing, snow over the mountains, or the
            road into Bergen in the rain — every feed is free to watch, with no
            account and no signup.
          </p>
        </div>

        <DirectorySearch
          label="Norway traffic areas"
          options={trafficAreas}
          placeholder="Search Norway traffic by area…"
          emptyText={'No Norway traffic areas match "{value}".'}
          targetId="norway-traffic-explorer"
        />

        <div className="mt-14">
          <h2 className="text-2xl md:text-3xl font-bold">What you can check</h2>
          <div className="mt-6 grid md:grid-cols-2 gap-5">
            {[
              {
                t: "Mountain passes",
                d: "Cameras on the great crossings — Dovrefjell, Hardangervidda, Sognefjellet approaches and more — showing snow, ice and convoy traffic as it happens.",
              },
              {
                t: "The E6 spine",
                d: "Norway's north–south artery from Oslo through Trondheim to Tromsø and beyond — junctions, tunnels and ferry approaches along the way.",
              },
              {
                t: "Fjord & coastal roads",
                d: "The Atlantic Road, Lofoten and the western fjord corridors — where wind, spray and closures are part of the driving year.",
              },
              {
                t: "City approaches",
                d: "Oslo, Bergen, Trondheim and Stavanger approaches for the commute check — plus the tunnels everyone queues for.",
              },
            ].map((c) => (
              <div key={c.t} className="rounded-2xl border border-white/10 bg-white/[0.02] p-7">
                <h3 className="font-bold">{c.t}</h3>
                <p className="text-sm text-white/55 leading-relaxed mt-2">{c.d}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-16">
          <h2 className="text-2xl md:text-3xl font-bold">Driving Norway: passes, fjords and the long dark</h2>
          <div className="mt-6 space-y-4 text-white/60 leading-relaxed max-w-3xl">
            <p>
              In Norway the road camera is not a traffic tool so much as a
              weather instrument. The E6 runs the country&rsquo;s whole
              length — Oslo to the North Cape — and in winter its northern
              and mountain sections live or die by conditions that change
              inside an hour. Statens vegvesen&rsquo;s feeds sit exactly
              where the decisions are: the passes, the fjord roads, the
              exposed coastal stretches where wind closes bridges. Some
              mountain crossings run kolonnekjøring in bad weather — escorted
              convoy driving behind a plow — and the approach cameras show
              you whether the queue is forming before you are in it.
            </p>
            <p>
              Season flips the use, not the value. In the dark months the
              cameras show lit roads through the polar night — snow state,
              ice shine, blowing drifts. In summer the same network serves
              the touring routes: ferry approaches, the Atlantic Road
              country, the long evening light on the fjord corridors. Either
              way, the Norwegian rule holds: the forecast tells you the
              region; the camera tells you the road.
            </p>
          </div>
        </div>

        <div className="mt-16">
          <h2 className="text-2xl md:text-3xl font-bold">How to watch</h2>
          <div className="mt-8 grid md:grid-cols-3 gap-5">
            {STEPS.map((s, i) => (
              <div key={s.title} className="rounded-2xl border border-white/10 bg-white/[0.02] p-7">
                <span className="w-9 h-9 rounded-xl bg-[#D4AF37]/15 border border-[#D4AF37]/30 flex items-center justify-center text-[#D4AF37] font-bold">
                  {i + 1}
                </span>
                <h3 className="font-bold mt-4">{s.title}</h3>
                <p className="text-sm text-white/55 leading-relaxed mt-2">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-16">
          <h2 className="text-2xl md:text-3xl font-bold">Live Norway road cameras</h2>
          <p className="text-white/50 mt-2 text-sm md:text-base max-w-3xl">
            {fmt(trafficTotal)} of Norway&apos;s {fmt(countryTotal)} indexed cameras
            are road feeds — named as roads or published by road authorities —
            and every one is below, live. Search by road or city; what the
            camera shows is the condition report.
          </p>
          <div className="mt-6">
            <DirectoryExplorer
              scopeKey="traffic-norway"
              scopeLabel="Norway traffic"
              groupBy="city"
              searchPlaceholder="Search Norway traffic cameras — a road, a junction, a city…"
              explorerId="norway-traffic-explorer"
            />
          </div>
        </div>

        <div className="mt-16">
          <h2 className="text-2xl md:text-3xl font-bold">Norway road camera FAQs</h2>
          <div className="mt-6 space-y-4">
            {FAQS.map((f) => (
              <details
                key={f.q}
                className="rounded-2xl border border-white/10 bg-white/[0.02] px-6 py-5 group"
              >
                <summary className="font-semibold cursor-pointer list-none flex items-center gap-3">
                  <CheckCircle2 className="w-4 h-4 text-[#D4AF37] shrink-0" />
                  {f.q}
                </summary>
                <p className="text-sm text-white/55 leading-relaxed mt-3 pl-7">{f.a}</p>
              </details>
            ))}
          </div>
        </div>

        <div className="mt-16 text-center rounded-3xl border border-[#D4AF37]/30 bg-gradient-to-b from-[#D4AF37]/[0.08] to-transparent p-10 md:p-14">
          <h2 className="text-2xl md:text-4xl font-bold tracking-tight">
            Look at the pass <span className="text-[#D4AF37]">before you climb it.</span>
          </h2>
          <p className="text-white/55 mt-4 max-w-xl mx-auto">
            Open the globe, zoom to your route, and see the road as it is now.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl bg-gradient-to-b from-[#e8c55a] to-[#D4AF37] text-black font-bold text-lg tracking-wide hover:brightness-110 transition shadow-[0_8px_32px_rgba(212,175,55,0.35)]"
            >
              Watch Norway live <ArrowRight className="w-5 h-5" />
            </Link>
            <Link
              href="/cameras/countries/norway"
              className="inline-flex items-center gap-2 px-6 py-4 rounded-2xl border border-white/15 text-white/75 hover:text-white hover:border-white/30 transition font-semibold"
            >
              Browse Norway cameras
            </Link>
          </div>
          <p className="text-xs text-white/35 mt-6">
            More networks: <Link href="/sweden-traffic-cameras" className="text-[#D4AF37] hover:underline">Sweden traffic cameras</Link> · <Link href="/europe-live-cameras" className="text-[#D4AF37] hover:underline">Europe live cameras</Link> · <Link href="/ski-webcams" className="text-[#D4AF37] hover:underline">Ski webcams</Link>
          </p>
        </div>
      </div>
      <SiteFooter />
    </main>
  );
}
