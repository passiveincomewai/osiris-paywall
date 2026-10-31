import type { Metadata } from "next";
import Link from "next/link";
import { Scale } from "lucide-react";
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
import EmailCaptureCard from "@/components/EmailCaptureCard";
import SkiSidebar from "@/components/SkiSidebar";
import SkiTripReminderForm from "@/components/SkiTripReminderForm";
import { powderPassEnabled } from "@/lib/ski/access";
import { plural } from "@/lib/country-page-content";
import {
  loadCountryChunk,
  selectResortCameras,
  getSkiResort,
  SKI_RESORTS,
} from "@/lib/ski-resorts";
import { POPULAR_PAIRS, pairSlug } from "@/lib/ski-compare";
import { FOLDED_RESORT_SLUGS, RESORT_PAGE_COUNT } from "@/lib/indexation-gates";
import type {
  SkiGroupBy,
  SkiPassFilter,
  SkiResortLogoMap,
} from "@/lib/ski-directory";
import { parseSkiPassParam } from "@/lib/ski-resort-passes";
import skiLogosData from "@/data/ski-logos.json";
import type { CountryCamera } from "@/lib/country-cameras";
import { previewMedia } from "@/lib/camera-preview";
import {
  parseHourlySnowfall,
  trailing24hSnowfallCm,
  formatCm,
} from "@/lib/ski/openmeteo";
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

/* Shortened in the W3 design wave: the hub's job is to get a skier to a
   resort page, so the intro is the two factual paragraphs — what the
   cameras settle, and that every count is counted from the live index,
   never estimated. The longer essays live on the resort pages. */
const INTRO = [
  "A ski day lives or dies on conditions — and conditions change faster than any forecast update. Mountain webcams are the skier's reality check: fresh snow on the slopes, lift lines at the base, fog on the ridgeline, and the drive up the access road.",
  "Every resort below has its own page with its live feeds, the traffic cameras on the roads around it, and a route tool that lines up every camera along your drive. The resorts listed are the ones the live WorldEye catalogue actually covers — each page's counts are counted from the same camera index that powers the globe, never estimated.",
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
   degrades that country's samples to none rather than breaking the hub.
   The per-country loads run in PARALLEL: awaiting them one by one made
   the hub's server render wait for the SUM of ~17 sequential chunk
   loads before any HTML could be sent. Promise.all preserves the
   first-seen country order, each load still fails soft to [], and the
   selection loop below is untouched — the rendered output is identical,
   it just arrives after the SLOWEST single chunk instead of the sum. */
async function loadSamples(): Promise<Map<string, CountryCamera[]>> {
  const byCountry = new Map<string, CountryCamera[]>();
  const byResort = new Map<string, CountryCamera[]>();
  const countrySlugs: string[] = [];
  for (const r of SKI_RESORTS) {
    if (!countrySlugs.includes(r.countrySlug)) countrySlugs.push(r.countrySlug);
  }
  const chunks = await Promise.all(
    countrySlugs.map(async (slug) => {
      try {
        return await loadCountryChunk(slug);
      } catch {
        return [] as CountryCamera[];
      }
    }),
  );
  countrySlugs.forEach((slug, i) => byCountry.set(slug, chunks[i] ?? []));
  for (const r of SKI_RESORTS) {
    try {
      byResort.set(r.slug, selectResortCameras(byCountry.get(r.countrySlug) ?? [], r).resort.slice(0, 6));
    } catch {
      byResort.set(r.slug, []);
    }
  }
  return byResort;
}

/* One still frame per resort for the directory cards (W3): the first
   sample camera whose preview is an <img>-renderable still (snapshot
   or MJPEG). Video-kind cameras are skipped — a hundred autoplaying
   clips in a directory grid is a frame budget the page doesn't have.
   A resort with no still-able sample simply renders no thumbnail. */
function buildThumbs(samples: Map<string, CountryCamera[]>): Record<string, string> {
  const thumbs: Record<string, string> = {};
  for (const r of SKI_RESORTS) {
    for (const cam of samples.get(r.slug) ?? []) {
      const media = previewMedia(cam);
      if (media && (media.kind === "jpg" || media.kind === "mjpeg")) {
        thumbs[r.slug] = media.url;
        break;
      }
    }
  }
  return thumbs;
}

interface SnowNowHit {
  slug: string;
  name: string;
  cm: number;
  hasPage: boolean;
}

/* "Where it's snowing" (W3) — resorts whose MODELLED snowfall over the
   trailing 24 complete hours (Open-Meteo hourly, the dawn-patrol
   measure in lib/ski/openmeteo) reached 1 cm. One multi-location
   request for the whole directory, cached 30 minutes; any failure
   resolves to an empty list and the strip simply doesn't render —
   modelled data is labelled modelled, and absence is never dressed
   up as "no snow anywhere". */
async function loadSnowNow(): Promise<SnowNowHit[]> {
  try {
    const qs = new URLSearchParams({
      latitude: SKI_RESORTS.map((r) => r.lat).join(","),
      longitude: SKI_RESORTS.map((r) => r.lng).join(","),
      hourly: "snowfall",
      past_days: "2",
      forecast_days: "1",
      timezone: "auto",
    });
    const res = await fetch(`https://api.open-meteo.com/v1/forecast?${qs.toString()}`, {
      next: { revalidate: 1800 },
      signal: AbortSignal.timeout(8000),
      headers: { "User-Agent": "WorldEye-PowderPass/1.0" },
    });
    if (!res.ok) return [];
    const json: unknown = await res.json();
    const rows: unknown[] = Array.isArray(json) ? json : [json];
    const now = new Date();
    const hits: SnowNowHit[] = [];
    SKI_RESORTS.forEach((r, i) => {
      const row = rows[i];
      if (!row || typeof row !== "object") return;
      const rec = row as Record<string, unknown>;
      const offset =
        typeof rec.utc_offset_seconds === "number" ? rec.utc_offset_seconds : null;
      const cm = trailing24hSnowfallCm(parseHourlySnowfall(rec), now, offset);
      if (cm !== null && cm >= 1) {
        hits.push({
          slug: r.slug,
          name: r.name,
          cm,
          hasPage: !FOLDED_RESORT_SLUGS.has(r.slug),
        });
      }
    });
    return hits.sort((a, b) => b.cm - a.cm).slice(0, 10);
  } catch {
    return [];
  }
}

export default async function SkiWebcamsPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; pass?: string; group?: string }>;
}) {
  const params = await searchParams;
  const initialSearch = typeof params.search === "string" ? params.search : "";
  // "?pass=none" (any case) selects the independent-resorts filter.
  // Any other value goes through the tolerant parser: canonical names
  // in any case plus unambiguous short forms ("ikon", "epic", …) —
  // the sidebar's exact full-name links resolve exactly as before,
  // and an unrecognised value stays null → unfiltered, as before.
  const initialPass: SkiPassFilter =
    typeof params.pass === "string" && params.pass.trim().toLowerCase() === "none"
      ? "none"
      : parseSkiPassParam(params.pass);
  const initialGroupBy: SkiGroupBy =
    params.group === "region" || params.group === "pass" ? params.group : "country";
  const powder = powderPassEnabled(process.env);
  const samples = await loadSamples();
  const thumbs = buildThumbs(samples);
  const snowNow = await loadSnowNow();
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
          { value: String(RESORT_PAGE_COUNT), label: "resorts with live pages" },
          { value: totalCameras.toLocaleString("en-US"), label: "resort & road cameras" },
          { value: String(new Set(SKI_RESORTS.map(r => r.country)).size), label: "countries covered" },
        ]}
      />
      <Intro paragraphs={INTRO} />

      {/* Where it's snowing — modelled trailing-24h snowfall
          (Open-Meteo), labelled as modelled. Renders only when at
          least one resort clears 1 cm; the cameras linked from each
          chip are the ground truth. */}
      {snowNow.length > 0 && (
        <section className="mt-10" aria-label="Where it's snowing">
          <h2 className="text-xl md:text-2xl font-bold mb-2">Where it&apos;s snowing</h2>
          <p className="text-sm text-white/50 mb-4 max-w-3xl">
            Modelled snowfall in the last 24 hours (Open-Meteo) — a weather model, not a
            measurement on the mountain. Open a resort and check its cameras to see the
            snow on the ground.
          </p>
          <ul className="flex flex-wrap gap-2">
            {snowNow.map((h) => {
              const chip = (
                <>
                  {h.name}{" "}
                  <span className="text-[#D4AF37] font-semibold">
                    {formatCm(h.cm)} in 24h
                  </span>
                </>
              );
              return (
                <li key={h.slug}>
                  {h.hasPage ? (
                    <Link
                      href={`/ski-webcams/${h.slug}`}
                      className="inline-flex items-center rounded-full border border-white/10 bg-white/[0.03] px-3.5 py-1.5 text-xs font-medium text-white/80 hover:border-[#D4AF37]/50 hover:text-white transition"
                    >
                      {chip}
                    </Link>
                  ) : (
                    <span className="inline-flex items-center rounded-full border border-white/10 bg-white/[0.03] px-3.5 py-1.5 text-xs font-medium text-white/80">
                      {chip}
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {/* Directory + ski sidebar. The Powder Pass promo lives in the
          sidebar rail (rendered only once the owner has lit the
          product — POWDER_PASS_ENABLED); while the flag is off the ski
          pages carry no Powder Pass mention at all. */}
      <section className="mt-12">
        <h2 className="text-xl md:text-2xl font-bold mb-2">Ski resorts with live cameras</h2>
        <p className="text-sm text-white/50 mb-5 max-w-3xl">
          Each resort page carries its own live feeds, the traffic cameras on the roads around it,
          official weather alerts where WorldEye has them, and the route tool for your drive.
          The smallest resorts are listed here without a page of their own until their coverage grows.
        </p>
        <div className="lg:grid lg:grid-cols-[280px_minmax(0,1fr)] lg:gap-8 lg:items-start">
          <div className="mb-8 lg:mb-0">
            <SkiSidebar resorts={SKI_RESORTS} showPowder={powder} />
          </div>
          <SkiResortDirectory
            key={`${initialSearch}|${initialPass ?? ""}|${initialGroupBy}`}
            resorts={SKI_RESORTS}
            logos={SKI_LOGOS}
            thumbs={thumbs}
            noPageSlugs={[...FOLDED_RESORT_SLUGS]}
            initialSearch={initialSearch}
            initialPass={initialPass}
            initialGroupBy={initialGroupBy}
          />
        </div>
      </section>

      {/* Trip reminders (P9a) — pick a resort + dates, get two
          book-ahead email nudges. Reminders only, no booking. */}
      <section className="mt-12">
        <h2 className="text-xl md:text-2xl font-bold mb-5">Planning a ski trip?</h2>
        <SkiTripReminderForm
          resorts={SKI_RESORTS.filter((r) => !FOLDED_RESORT_SLUGS.has(r.slug)).map((r) => ({
            slug: r.slug,
            name: r.name,
          }))}
        />
      </section>

      {/* Compare tool — side-by-side terrain, cameras and official
          links for any two resorts, plus the pre-built popular pairs. */}
      <section className="mt-12">
        <h2 className="text-xl md:text-2xl font-bold mb-2">Compare ski resorts side by side</h2>
        <p className="text-sm text-white/50 mb-5 max-w-3xl">
          Choosing between two mountains? Put them next to each other: elevation, vertical,
          terrain, lifts, runs, live camera counts and the verified official links for lift
          tickets, trail maps and lodging.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/ski-webcams/compare"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-b from-[#e8c55a] to-[#D4AF37] text-black text-sm font-bold hover:brightness-110 transition"
          >
            <Scale className="w-4 h-4" /> Open the compare tool
          </Link>
          {POPULAR_PAIRS.slice(0, 4).map(([a, b]) => {
            const ra = getSkiResort(a);
            const rb = getSkiResort(b);
            if (!ra || !rb) return null;
            return (
              <Link
                key={pairSlug(a, b)}
                href={`/ski-webcams/compare/${pairSlug(a, b)}`}
                className="inline-flex items-center px-4 py-2.5 rounded-xl border border-white/15 text-sm font-semibold text-white/80 hover:bg-white/5 transition"
              >
                {ra.name} vs {rb.name}
              </Link>
            );
          })}
        </div>
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

      {/* Newsletter — end-of-page capture (the one list) */}
      <div className="mt-12">
        <EmailCaptureCard placement="page" variant="inline" />
      </div>

      <CtaRow backHref="/live-webcams" backLabel="All live webcams" />
    </PageShell>
  );
}
