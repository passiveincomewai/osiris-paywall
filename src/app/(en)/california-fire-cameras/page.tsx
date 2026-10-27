import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Camera, ChevronRight, Flame, MapPin, ShieldAlert } from "lucide-react";
import SiteFooter from "@/components/SiteFooter";
import TrialCtaSection from "@/components/TrialCtaSection";
import CaliforniaFireCameraExplorer from "@/components/CaliforniaFireCameraExplorer";
import {
  californiaCameras,
  countyDisplayName,
  countyGroups,
  getAlertCameras,
  type AlertCam,
} from "@/lib/alert-cameras";

const BASE = "https://worldeye.app";
const URL = "/california-fire-cameras";

/* The set is live data (the ALERTCalifornia feed, re-read through the
   10-minute source cache), so the page re-renders on the same cadence:
   the counts in the copy below are the feed's counts at render time,
   and the explorer re-syncs the stat tiles from the live response. */
export const revalidate = 600;

async function loadCameras(): Promise<AlertCam[]> {
  try {
    return californiaCameras(await getAlertCameras());
  } catch {
    return [];
  }
}

function plural(n: number, noun: string): string {
  return `${n.toLocaleString("en-US")} ${noun}${n === 1 ? "" : "s"}`;
}

function pageTitle(count: number): string {
  const t =
    count > 0
      ? `California Fire Cameras — ${count.toLocaleString("en-US")} Live ALERTCalifornia Feeds`
      : "California Fire Cameras — Live ALERTCalifornia Feeds";
  if (t.length <= 60) return t;
  return count > 0
    ? `California Fire Cameras — ${count.toLocaleString("en-US")} Live Feeds`
    : "California Fire Cameras — Live Feeds";
}

function metaDescription(count: number, topCounties: string[]): string {
  const where =
    topCounties.length > 0 ? `, including ${topCounties.join(", ")}` : "";
  const lead =
    count > 0
      ? `Watch ${plural(count, "live fire camera")} across California${where}.`
      : "Watch California's live fire cameras.";
  return `${lead} The ALERTCalifornia fire-watch network, free on WorldEye — live snapshots refreshed every ~15 seconds, no signup to browse.`;
}

export async function generateMetadata(): Promise<Metadata> {
  const cams = await loadCameras();
  const top = countyGroups(cams).slice(0, 3).map((g) => `${g.name} County`);
  const title = pageTitle(cams.length);
  const description = metaDescription(cams.length, top);
  return {
    title,
    description,
    alternates: { canonical: `${BASE}${URL}` },
    openGraph: { title, description, url: URL, type: "website" },
  };
}

export default async function CaliforniaFireCamerasPage() {
  const cams = await loadCameras();
  const total = cams.length;
  const online = cams.filter((c) => c.online).length;
  const groups = countyGroups(cams);
  const topCounties = groups.slice(0, 10);
  const topNames = groups.slice(0, 3).map((g) => g.name);

  const title = pageTitle(total);
  const description = metaDescription(total, topNames.map((n) => `${n} County`));

  const faqs: Array<{ q: string; a: string }> = [
    {
      q: "How many live fire cameras are there in California on WorldEye?",
      a:
        total > 0
          ? `${total.toLocaleString("en-US")} — every California camera in the live ALERTCalifornia feed, listed in the grid on this page. The count comes from the feed itself each time the page renders, never estimated, and the grid shows exactly that many cameras.`
          : "Every California camera in the live ALERTCalifornia feed is listed in the grid on this page; the count comes from the feed itself, never estimated.",
    },
    {
      q: "Are these live video streams?",
      a: "No — and the page doesn't pretend otherwise. ALERTCalifornia cameras publish a still frame about every 15 seconds; the cards show that frame and re-request it on the same cadence. For wildfire watching that is usually what matters: a smoke column shows up in the stills long before most video would tell you more.",
    },
    {
      q: "Who operates these cameras?",
      a: "The ALERTCalifornia network — fire-watch cameras on peaks, ridges and towers across the state, run with fire agencies, utilities, universities and other partners, and published openly by the network. WorldEye shows the same public feed; each camera card links to its own ALERTCalifornia page.",
    },
    {
      q: "Which California counties have the most fire cameras?",
      a:
        topCounties.length > 0
          ? `${topCounties[0].name} County has the most, with ${plural(topCounties[0].count, "camera")}${topCounties[1] ? `, followed by ${topCounties[1].name} County (${plural(topCounties[1].count, "camera")})` : ""}. Use the county filters above the grid to browse one county at a time.`
          : "The cameras are spread across California's fire country; the grid groups them by county, largest first.",
    },
    {
      q: "Can I use these cameras to decide whether to evacuate?",
      a: "No — please don't. A camera shows one ridge, not your neighbourhood, and evacuation orders come from local emergency authorities (fire departments, sheriff's offices, emergency management), not from any camera or map site. Use these cameras for situational awareness; use official channels for decisions about your safety.",
    },
    {
      q: "Is it free to watch California fire cameras?",
      a: "Yes — this page and the cameras on it are free to browse with no account. The frames belong to the ALERTCalifornia network and its partners; a camera the network reports offline keeps its card with its last frame, labelled offline.",
    },
  ];

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "CollectionPage",
        name: title,
        description,
        url: `${BASE}${URL}`,
        mainEntity: {
          "@type": "ItemList",
          numberOfItems: total,
          itemListElement: cams.slice(0, 50).map((s, i) => ({
            "@type": "ListItem",
            position: i + 1,
            name: `${s.name} — ${s.county ? `${countyDisplayName(s.county)} County` : "California"}`,
            url: s.url || `${BASE}${URL}`,
          })),
        },
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: `${BASE}/` },
          { "@type": "ListItem", position: 2, name: "Cameras", item: `${BASE}/cameras` },
          { "@type": "ListItem", position: 3, name: "California Fire Cameras", item: `${BASE}${URL}` },
        ],
      },
      {
        "@type": "FAQPage",
        mainEntity: faqs.map((f) => ({
          "@type": "Question",
          name: f.q,
          acceptedAnswer: { "@type": "Answer", text: f.a },
        })),
      },
    ],
  };

  return (
    <main className="docs-root min-h-screen bg-[#05070d] text-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="max-w-4xl mx-auto px-6 py-10 md:py-16">
        {/* Breadcrumb */}
        <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-sm text-white/45 mb-10">
          <Link href="/" className="hover:text-white transition">Home</Link>
          <ChevronRight className="w-3.5 h-3.5" />
          <Link href="/cameras" className="hover:text-white transition">Cameras</Link>
          <ChevronRight className="w-3.5 h-3.5" />
          <span className="text-white/80">California Fire Cameras</span>
        </nav>

        {/* Hero */}
        <div className="text-center max-w-3xl mx-auto">
          <p className="inline-flex items-center gap-2 text-xs font-semibold tracking-[0.25em] text-[#ff8c5a] border border-[#ff8c5a]/30 rounded-full px-4 py-1.5 mb-6">
            <Flame className="w-3.5 h-3.5" /> LIVE FIRE CAMERA NETWORK
          </p>
          <h1 className="text-3xl md:text-5xl font-bold tracking-tight">
            California Live Fire Cameras
          </h1>
          <p className="mt-4 text-white/55">
            Watch {total > 0 ? plural(total, "live fire camera") : "California's live fire cameras"}{" "}
            across California — the ALERTCalifornia fire-watch network, free on WorldEye.
          </p>
        </div>

        {/* Stat row — re-synced by the explorer from the live feed */}
        <div className="mt-10 grid grid-cols-3 gap-3 max-w-2xl mx-auto text-center">
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <div className="text-2xl md:text-3xl font-bold text-[#D4AF37]" data-ca-fire-total>
              {total.toLocaleString("en-US")}
            </div>
            <div className="text-xs text-white/45 mt-1">fire cameras</div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <div className="text-2xl md:text-3xl font-bold text-[#D4AF37]" data-ca-fire-counties>
              {groups.length.toLocaleString("en-US")}
            </div>
            <div className="text-xs text-white/45 mt-1">counties covered</div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <div className="text-2xl md:text-3xl font-bold text-[#D4AF37]" data-ca-fire-online>
              {online.toLocaleString("en-US")}
            </div>
            <div className="text-xs text-white/45 mt-1">online right now</div>
          </div>
        </div>
        <p className="text-center text-xs text-white/30 mt-4">
          Counts come from the live ALERTCalifornia feed — refreshed every 10 minutes.
        </p>

        {/* Intro */}
        <div className="mt-10 space-y-4 text-white/70 leading-relaxed max-w-3xl mx-auto">
          <p>
            California watches its fire country with cameras. The ALERTCalifornia network
            keeps fire-watch cameras on peaks, ridges and towers across the state — many of
            them pan-tilt-zoom units that dispatchers swing toward a smoke report within
            minutes — and publishes every camera&apos;s latest frame openly. This page gathers
            the whole California network in one grid:{" "}
            {total > 0 ? plural(total, "camera") : "every camera in the feed"}
            {topNames.length > 0 ? `, with the largest clusters in ${topNames.join(", ")}` : ""},
            grouped by county with the largest first.
          </p>
          <p>
            One honest note about what &ldquo;live&rdquo; means here: these are live
            snapshots, not video streams. Each camera&apos;s frame is republished about
            every 15 seconds, and every card below re-requests on that cadence — open a
            camera and you are watching its ridge in near-real time, one frame at a time.
            The same cameras appear on the WorldEye globe; this page is the whole network
            without the trip to the map.
          </p>
        </div>

        {/* Active-fire context — a separate data source, labelled as such */}
        <section className="mt-12 rounded-2xl border border-[#ff6b35]/40 bg-[#ff6b35]/[0.06] p-6 md:p-7 max-w-3xl mx-auto">
          <h2 className="text-lg md:text-xl font-bold flex items-center gap-2.5">
            <ShieldAlert className="w-5 h-5 text-[#ff8c5a] shrink-0" />
            Looking for fires burning right now?
          </h2>
          <div className="mt-3 space-y-3 text-sm text-white/65 leading-relaxed">
            <p>
              Cameras and fires are different data. The cameras on this page watch
              California around the clock, fire or no fire — the count above is cameras,
              not incidents. Active-fire detections come from satellites and live on the{" "}
              <Link href="/wildfire-tracker" className="text-[#00E5FF] hover:underline">
                Wildfire Tracker
              </Link>
              , plotted on the globe as they arrive. Use the two together: the tracker
              shows where heat is, these cameras show what the ridge actually looks like.
            </p>
            <p>
              And if a fire is near you: never use a camera or a map to decide whether to
              evacuate. Evacuation orders come from your local fire department,
              sheriff&apos;s office or emergency management agency — get those from
              official channels first, then come back here for the bigger picture.
            </p>
          </div>
        </section>

        {/* The grid */}
        <section className="mt-12">
          <h2 className="text-xl md:text-2xl font-bold mb-2">Watch California fire cameras live</h2>
          <p className="text-sm text-white/50 mb-5 max-w-3xl">
            Every California camera in the live ALERTCalifornia feed. Search by camera name
            or county, filter by county, and open any camera to watch its frames refresh
            here — no trip to the map required.
          </p>
          <CaliforniaFireCameraExplorer />
        </section>

        {/* Top counties */}
        {topCounties.length > 0 && (
          <section className="mt-12">
            <h2 className="text-xl md:text-2xl font-bold mb-5">Top counties for fire cameras</h2>
            <div className="rounded-2xl border border-white/10 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wider text-white/40 border-b border-white/10 bg-white/[0.02]">
                    <th className="px-5 py-3 font-semibold">County</th>
                    <th className="px-5 py-3 font-semibold text-right">Cameras</th>
                  </tr>
                </thead>
                <tbody>
                  {topCounties.map((g) => (
                    <tr key={g.key} className="border-b border-white/5 last:border-0 hover:bg-white/[0.02]">
                      <td className="px-5 py-3">{g.name}</td>
                      <td className="px-5 py-3 text-right font-mono text-[#D4AF37]">{g.count.toLocaleString("en-US")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* How to watch */}
        <section className="mt-12">
          <h2 className="text-xl md:text-2xl font-bold mb-5">How to watch California fire cameras</h2>
          <ol className="space-y-3">
            {[
              "Search or pick a county above — fire country is grouped first, biggest networks at the top.",
              "Read the frame like a lookout: smoke shows as a column or a haze layer on the ridge the camera names.",
              "Open a camera to watch its frames refresh, and compare neighbouring peaks — ALERTCalifornia cameras overlap on purpose, so one fire is often visible from two or three of them.",
            ].map((s, i) => (
              <li key={i} className="flex gap-4 items-start rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <span className="w-7 h-7 rounded-full bg-[#D4AF37]/15 border border-[#D4AF37]/40 text-[#D4AF37] font-bold text-sm flex items-center justify-center shrink-0">
                  {i + 1}
                </span>
                <span className="text-white/70 text-sm pt-1">{s}</span>
              </li>
            ))}
          </ol>
        </section>

        {/* FAQ */}
        <section className="mt-12">
          <h2 className="text-xl md:text-2xl font-bold mb-5">California fire cameras — FAQ</h2>
          <div className="space-y-3">
            {faqs.map((f, i) => (
              <details
                key={i}
                className="group rounded-2xl border border-white/10 bg-white/[0.03] overflow-hidden"
              >
                <summary className="cursor-pointer list-none px-5 py-4 flex items-center justify-between gap-4 font-semibold text-sm hover:bg-white/[0.03]">
                  {f.q}
                  <span className="text-[#D4AF37] group-open:rotate-45 transition-transform text-xl leading-none shrink-0">+</span>
                </summary>
                <div className="px-5 pb-5 text-sm text-white/60 leading-relaxed">{f.a}</div>
              </details>
            ))}
          </div>
        </section>

        {/* More live cameras */}
        <section className="mt-12">
          <h2 className="text-xl md:text-2xl font-bold mb-2">More live cameras</h2>
          <p className="text-sm text-white/50 mb-5 max-w-3xl">
            Fire cameras are one network among many on WorldEye. The same stills appear as
            the fire-camera layer on the{" "}
            <Link href="/" className="text-[#00E5FF] hover:underline">
              live globe
            </Link>
            , alongside satellite fire detections.
          </p>
          <ul className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <li>
              <Link
                href="/wildfire-tracker"
                className="block rounded-2xl border border-white/10 bg-white/[0.03] p-4 hover:bg-white/[0.05] transition"
              >
                <span className="font-semibold text-sm inline-flex items-center gap-2">
                  <Flame className="w-4 h-4 text-[#ff8c5a]" /> Wildfire Tracker
                </span>
                <span className="block text-xs text-white/45 mt-1">
                  Active fire detections and smoke drift on the globe — a different data source from these cameras.
                </span>
              </Link>
            </li>
            <li>
              <Link
                href="/cameras/countries/united-states"
                className="block rounded-2xl border border-white/10 bg-white/[0.03] p-4 hover:bg-white/[0.05] transition"
              >
                <span className="font-semibold text-sm inline-flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-[#00E5FF]" /> United States cameras
                </span>
                <span className="block text-xs text-white/45 mt-1">
                  The full US camera index — traffic, city, weather and resort feeds by area.
                </span>
              </Link>
            </li>
            <li>
              <Link
                href="/cameras"
                className="block rounded-2xl border border-white/10 bg-white/[0.03] p-4 hover:bg-white/[0.05] transition"
              >
                <span className="font-semibold text-sm inline-flex items-center gap-2">
                  <Camera className="w-4 h-4 text-[#00E5FF]" /> All live cameras
                </span>
                <span className="block text-xs text-white/45 mt-1">
                  The camera hub: 74,229 public cameras by country, city and kind.
                </span>
              </Link>
            </li>
          </ul>
        </section>

        <TrialCtaSection utmSource="california-fire-cameras" />

        {/* Back links */}
        <div className="mt-12 flex flex-wrap gap-3">
          <Link
            href="/wildfire-tracker"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-white/15 text-sm font-semibold text-white/80 hover:bg-white/5 transition"
          >
            <ArrowLeft className="w-4 h-4" /> Wildfire Tracker
          </Link>
          <a
            href={BASE}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-b from-[#e8c55a] to-[#D4AF37] text-black text-sm font-bold hover:brightness-110 transition"
          >
            <Camera className="w-4 h-4" /> Open the live map
          </a>
        </div>
      </div>
      <SiteFooter />
    </main>
  );
}
