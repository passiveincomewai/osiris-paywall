import type { Metadata } from "next";
import Link from "next/link";
import {
  BASE,
  JsonLd,
  Breadcrumb,
  Hero,
  Intro,
  HowTo,
  FaqSection,
  FaqJsonLd,
  RelatedLinks,
  CtaRow,
  PageShell,
  StatRow,
} from "@/components/directory-page";
import SkiCameraGrid from "@/components/SkiCameraGrid";
import SkiResortDirectory from "@/components/SkiResortDirectory";
import { plural } from "@/lib/country-page-content";
import {
  loadCountryChunk,
  selectResortCameras,
  SKI_RESORTS,
} from "@/lib/ski-resorts";
import type { SkiResortLogoMap } from "@/lib/ski-directory";
import skiLogosData from "@/data/ski-logos.json";
import type { CountryCamera } from "@/lib/country-cameras";
import VoiceQA from "@/components/seo/VoiceQA";
import { voiceFaqs } from "@/lib/voice-questions";

/* Verified resort logos (src/data/ski-logos.json): slug → the icon
   fetched from the resort's own official site. Resorts without an
   entry render a monogram tile instead — never a guessed logo. */
const SKI_LOGOS = skiLogosData as SkiResortLogoMap;

const VOICE_QA_IDS = [
  "ski-is-it-snowing-at-the-resort",
  "ski-check-the-drive-up",
  "ski-see-lift-lines",
  "ski-regions-with-most-cameras",
];

export const metadata: Metadata = {
  title: "Ski Webcams — Live Mountain & Resort Cameras",
  description:
    "Watch live ski resort webcams before you drive up: resort feeds, nearby traffic cameras, official alerts and every camera on your route — free on WorldEye, no signup.",
  alternates: { canonical: `${BASE}/ski-webcams` },
  openGraph: {
    title: "Ski Webcams — Live Mountain & Resort Cameras",
    description:
      "Live ski resort webcams: snowfall, lift lines, visibility and mountain weather. Free on the WorldEye map.",
    url: "/ski-webcams",
    type: "website",
  },
};

const INTRO = [
  "A ski day lives or dies on conditions — and conditions change faster than any forecast update. Mountain webcams are the skier's reality check: fresh snow on the slopes, lift lines at the base, fog on the ridgeline, and the drive up the access road.",
  "Every resort below has its own page with its live feeds, the traffic cameras on the roads around it, and a route tool that lines up every camera along your drive. The resorts listed are the ones the live WorldEye catalogue actually covers — each page's counts are counted from the same camera index that powers the globe, never estimated.",
  "The overnight snowfall number is only the start of the story. A resort can report six inches while the wind scoured the ridgeline bare — or report two while a sheltered bowl skis like a foot. Slope cameras show the actual surface: wind texture, groomed corduroy, tracked-out traverses, and whether the sun has hit the east-facing runs yet.",
  "Timing matters as much as snow. Base-area cameras at 7 AM show empty parking lots and spinning lifts; at 9:30 on a powder Saturday they show the line you are about to join. The camera habit that pays off: check the night before for the storm total, check the morning of for lines and visibility, and check the access-road cameras before you leave the driveway.",
  "Choosing between resorts is where the camera habit pays for itself. On a storm morning, three nearby mountains can have three different days: one socked in with lifts on hold, one snowing with the road chained up, one above the clouds in the sun. Ten minutes across the slope, base and road cameras of each tells you which drive is worth it — something no single-resort report or regional forecast will ever say out loud.",
];

const CATEGORIES = [
  {
    title: "Slope and snowfall checks",
    body: "Cameras aimed at the slopes show fresh snow, grooming, and how the runs look right now — far more honest than a resort's overnight snowfall number. Check the base and the ridgeline before you choose which mountain to drive to.",
  },
  {
    title: "Lift lines and base areas",
    body: "Base-area cameras show lift queues, parking lots filling up, and the general Saturday-morning energy. Leave early or sleep in — the camera will tell you which one was right.",
  },
  {
    title: "Visibility and mountain weather",
    body: "Fog, whiteout, blowing snow, bluebird: summit cameras show visibility as it actually is. If the ridgeline camera is a white wall, you know the upper lifts are marginal before you buy the lift ticket.",
  },
  {
    title: "The drive up",
    body: "The access road is half the battle. Traffic and road cameras along mountain corridors show chain controls, plowed lanes, and accident backups — check them before the canyon, not in it. Each resort page's route tool lines up the cameras on your exact drive.",
  },
  {
    title: "Terrain parks and base facilities",
    body: "Park cameras show feature conditions and crowd levels for freestyle riders, while village and base-lodge feeds show the aprés scene, rental lines, and whether the deck is in the sun — useful for mixed-ability groups planning the day.",
  },
  {
    title: "Backcountry and pass conditions",
    body: "Cameras near mountain passes and backcountry access points show snowpack, wind loading on ridgelines, and road status at trailheads. They are a visual input for trip planning — always pair them with the avalanche forecast, never replace it.",
  },
];

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "CollectionPage",
  name: "Ski Webcams — Live Mountain & Resort Cameras",
  description:
    "Directory of live ski resort and mountain webcams: snowfall, lift lines, visibility and mountain weather.",
  url: `${BASE}/ski-webcams`,
  isPartOf: { "@type": "WebSite", name: "WorldEye", url: "https://worldeye.app" },
};

const FAQS = [
  {
    q: "Can I check snowfall before driving to the resort?",
    a: "Yes — that's the best use of mountain cameras. Slope-facing feeds show fresh snow and grooming in real time, which complements the resort's reported overnight total. Check the base and summit cameras before you commit to the drive.",
  },
  {
    q: "Are ski webcams free to watch?",
    a: "Yes. Every mountain camera in the directory is free to watch — no account, no signup. Open a resort page below, or find the mountain on the WorldEye map.",
  },
  {
    q: "Can I see the cameras along my drive to the resort?",
    a: "Yes — every resort page has a route tool. Enter your starting address (the destination is already the resort) and it plans the drive and lists every live camera along the route, in the order you'll pass them.",
  },
  {
    q: "Can I see lift lines on these cameras?",
    a: "Base-area cameras often show lift queues and parking lots, so you can gauge how busy the resort is before you go. Weekends and powder days show up clearly.",
  },
  {
    q: "Do mountain webcams show visibility conditions?",
    a: "Yes. Summit and ridgeline cameras show fog, blowing snow and whiteout conditions as they are right now — a far better visibility check than a forecast icon.",
  },
  {
    q: "When should I check the cameras — night before or morning of?",
    a: "Both. Check the night before for the storm total and grooming, then the morning of for lift lines, visibility, and the access road. Conditions at 7 AM and 10 AM on a storm day can be completely different mountains.",
  },
  {
    q: "Can cameras tell me if lifts are on wind hold?",
    a: "Indirectly but reliably: a summit camera showing a white wall of blowing snow, or visibly empty upper-mountain chairs, usually means the upper lifts are marginal or stopped. Pair it with the resort's lift-status page for confirmation.",
  },
  {
    q: "Are the access-road cameras the same as the resort cameras?",
    a: "They are different feeds on the same map. Resort cameras watch slopes and base areas; highway and traffic cameras watch the access corridors. Each resort page lists both — the mountain can be perfect while the canyon road is a mess, or vice versa.",
  },
  {
    q: "Which ski resorts have pages on WorldEye?",
    a: "The resorts the live camera catalogue actually covers — at least one camera at the mountain and a working set of road cameras around it. The directory below is the current list; it grows as the catalogue does, and a resort without real coverage doesn't get a page rather than getting an empty one.",
  },
  {
    q: "Can I use mountain cameras for backcountry planning?",
    a: "As one input among several. Cameras near passes and trailheads show snowpack and wind on ridgelines, which helps with route choice — but always pair them with the official avalanche forecast and never treat a camera as a safety clearance.",
  },
  {
    q: "Can I watch summer conditions on ski cameras?",
    a: "Yes — most mountain feeds run year-round. In summer they show hiking weather, thunderstorms building over the ridges, wildfire smoke in bad years, and the general state of the high country. The access-road cameras stay useful in every season.",
  },
];

/* One country's chunks load once for all its resorts; a failed chunk
   degrades that country's samples to none rather than breaking the hub. */
async function loadSamples(): Promise<Map<string, CountryCamera[]>> {
  const byCountry = new Map<string, CountryCamera[]>();
  const byResort = new Map<string, CountryCamera[]>();
  for (const r of SKI_RESORTS) {
    if (!byCountry.has(r.countrySlug)) {
      try {
        byCountry.set(r.countrySlug, await loadCountryChunk(r.countrySlug));
      } catch {
        byCountry.set(r.countrySlug, []);
      }
    }
  }
  for (const r of SKI_RESORTS) {
    try {
      byResort.set(r.slug, selectResortCameras(byCountry.get(r.countrySlug) ?? [], r).resort.slice(0, 6));
    } catch {
      byResort.set(r.slug, []);
    }
  }
  return byResort;
}

export default async function SkiWebcamsPage() {
  const samples = await loadSamples();
  const totalCameras = SKI_RESORTS.reduce((n, r) => n + r.resortCameraCount + r.nearbyCameraCount, 0);
  const featured = [...SKI_RESORTS]
    .sort((a, b) => b.resortCameraCount - a.resortCameraCount)
    .slice(0, 8)
    .filter(r => (samples.get(r.slug) ?? []).length > 0);

  return (
    <PageShell>
      <JsonLd data={jsonLd} />
      <FaqJsonLd faqs={[...FAQS, ...voiceFaqs(VOICE_QA_IDS)]} />
      <Breadcrumb
        trail={[
          { label: "Home", href: "/" },
          { label: "Live webcams", href: "/live-webcams" },
          { label: "Ski webcams" },
        ]}
      />
      <Hero
        h1="Ski Webcams — Live Mountain Cameras"
        sub="Snowfall, lift lines, visibility and the drive up — live feeds by resort, free, no signup."
      />
      <StatRow
        stats={[
          { value: String(SKI_RESORTS.length), label: "resorts with live pages" },
          { value: totalCameras.toLocaleString("en-US"), label: "resort & road cameras" },
          { value: String(new Set(SKI_RESORTS.map(r => r.country)).size), label: "countries covered" },
        ]}
      />
      <Intro paragraphs={INTRO} />

      {/* Resort directory — every resort the catalogue covers, grouped
          by country, with its counted cameras. The directory component
          renders the full list server-side and adds search, country
          filters and sorting on the client. */}
      <section className="mt-12">
        <h2 className="text-xl md:text-2xl font-bold mb-2">Ski resorts with live cameras</h2>
        <p className="text-sm text-white/50 mb-5 max-w-3xl">
          Each resort page carries its own live feeds, the traffic cameras on the roads around it,
          official weather alerts where WorldEye has them, and the route tool for your drive.
        </p>
        <SkiResortDirectory resorts={SKI_RESORTS} logos={SKI_LOGOS} />
      </section>

      {/* Live feeds, grouped by resort — the country pages' feed cards,
          a first serving per resort; each resort page has the full set. */}
      {featured.map(r => (
        <section key={r.slug} className="mt-12">
          <div className="flex items-baseline justify-between gap-4 mb-5">
            <h2 className="text-xl md:text-2xl font-bold">
              <Link href={`/ski-webcams/${r.slug}`} className="hover:text-[#D4AF37] transition">
                {r.name} — live now
              </Link>
            </h2>
            <Link
              href={`/ski-webcams/${r.slug}`}
              className="shrink-0 text-sm text-[#00E5FF] hover:underline"
            >
              All {plural(r.resortCameraCount + r.nearbyCameraCount, "camera")} &rarr;
            </Link>
          </div>
          <SkiCameraGrid cameras={samples.get(r.slug) ?? []} initial={6} />
        </section>
      ))}

      <section className="mt-12">
        <h2 className="text-xl md:text-2xl font-bold mb-5">What mountain cameras show</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          {CATEGORIES.map((c) => (
            <div
              key={c.title}
              className="rounded-2xl border border-white/10 bg-white/[0.03] p-6"
            >
              <h3 className="font-semibold text-white/90">{c.title}</h3>
              <p className="text-sm text-white/55 mt-2 leading-relaxed">{c.body}</p>
            </div>
          ))}
        </div>
      </section>

      <HowTo
        title="How to check ski conditions"
        steps={[
          "Pick a resort from the directory above — no account or download needed.",
          "Check the resort cameras for snow surface and grooming, the summit feeds for visibility, and the base cameras for lift lines.",
          "Read the conditions panel for official weather alerts at the resort (U.S. resorts), and the road cameras for the state of the drive.",
          "Use the route tool on the resort page: enter your starting address and line up every camera on your drive, in passing order.",
          "Recheck the morning of: overnight totals set expectations, but the 7 AM camera shows the mountain you will actually ski.",
        ]}
      />

      <FaqSection title="Ski webcams — FAQ" faqs={FAQS} />

      <VoiceQA ids={VOICE_QA_IDS} />

      <RelatedLinks
        title="More webcam directories"
        links={[
          { label: "Live webcams worldwide", href: "/live-webcams" },
          { label: "Top 25 camera regions", href: "/world-city-webcams" },
          { label: "Cameras by country", href: "/cameras/countries" },
          { label: "Cameras overview", href: "/cameras" },
        ]}
      />

      <CtaRow backHref="/live-webcams" backLabel="All live webcams" />
    </PageShell>
  );
}
