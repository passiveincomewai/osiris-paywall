import type { Metadata } from "next";
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
} from "@/components/directory-page";

export const metadata: Metadata = {
  title: "Ski Webcams — Live Mountain & Resort Cameras",
  description:
    "Check live ski resort webcams before you drive up: snowfall, lift lines, visibility and mountain weather — free on the WorldEye map, no signup.",
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
  "WorldEye's camera directory includes mountain and resort-area feeds from ski regions around the world. They're plotted on the same globe as the weather layer, so you can check snowfall, visibility and road conditions in one view before committing to the drive.",
  "Every mountain feed opens free on the WorldEye map — no account, no signup. Zoom to the ranges, look for the camera markers, and see the mountain as it is right now.",
  "The overnight snowfall number is only the start of the story. A resort can report six inches while the wind scoured the ridgeline bare — or report two while a sheltered bowl skis like a foot. Slope cameras show the actual surface: wind texture, groomed corduroy, tracked-out traverses, and whether the sun has hit the east-facing runs yet.",
  "Timing matters as much as snow. Base-area cameras at 7 AM show empty parking lots and spinning lifts; at 9:30 on a powder Saturday they show the line you are about to join. The camera habit that pays off: check the night before for the storm total, check the morning of for lines and visibility, and check the access-road cameras before you leave the driveway.",
  "Mountain weather deserves its own check because resorts sit in microclimates. Valley forecasts routinely miss ridgeline fog, summit whiteouts, and the wind holds that stop upper lifts. A summit camera pointed at the ridgeline is the most honest lift-status indicator there is — if it shows a white wall, plan for lower-mountain laps.",
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
    body: "The access road is half the battle. Traffic and road cameras along mountain corridors show chain controls, plowed lanes, and accident backups — check them before the canyon, not in it.",
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
    a: "Yes. Every mountain camera in the directory is free to watch — no account, no signup. Open the WorldEye map, zoom to the ski regions, and tap a camera marker.",
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
    a: "They are different feeds on the same map. Resort cameras watch slopes and base areas; highway and traffic cameras watch the access corridors. For a storm-day trip, check both — the mountain can be perfect while the canyon road is a mess, or vice versa.",
  },
  {
    q: "Can I use mountain cameras for backcountry planning?",
    a: "As one input among several. Cameras near passes and trailheads show snowpack and wind on ridgelines, which helps with route choice — but always pair them with the official avalanche forecast and never treat a camera as a safety clearance.",
  },
  {
    q: "Which ski regions have the most cameras?",
    a: "Coverage follows resort and highway infrastructure: the US Rockies and Sierra, the Alps, and Japan's snow country are the densest in the directory, with access-road DOT cameras often outnumbering the resorts' own slope feeds. Search the range or the resort town on the map to see what is actually there before you rely on it.",
  },
  {
    q: "Can I watch summer conditions on ski cameras?",
    a: "Yes — most mountain feeds run year-round. In summer they show hiking weather, thunderstorms building over the ridges, wildfire smoke in bad years, and the general state of the high country. The access-road cameras stay useful in every season.",
  },
];

export default function SkiWebcamsPage() {
  return (
    <PageShell>
      <JsonLd data={jsonLd} />
      <FaqJsonLd faqs={FAQS} />
      <Breadcrumb
        trail={[
          { label: "Home", href: "/" },
          { label: "Live webcams", href: "/live-webcams" },
          { label: "Ski webcams" },
        ]}
      />
      <Hero
        h1="Ski Webcams — Live Mountain Cameras"
        sub="Snowfall, lift lines, visibility and the drive up — live, free, no signup."
      />
      <Intro paragraphs={INTRO} />

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
          "Open the free WorldEye map — no account or download needed.",
          "Zoom to the mountain ranges and look for camera markers at resorts and along access roads.",
          "Tap a slope, base-area or road marker to open that mountain camera's live feed.",
          "Check slope cameras for snow surface and grooming, summit cameras for visibility, and base cameras for lift lines.",
          "Before a storm-day trip, check the access-road cameras too — the canyon drive is half the battle.",
          "Recheck the morning of: overnight totals set expectations, but the 7 AM camera shows the mountain you will actually ski.",
        ]}
      />

      <FaqSection title="Ski webcams — FAQ" faqs={FAQS} />

      <RelatedLinks
        title="More webcam directories"
        links={[
          { label: "Live webcams worldwide", href: "/live-webcams" },
          { label: "Top 25 camera regions", href: "/world-city-webcams" },
          { label: "Cameras overview", href: "/cameras" },
        ]}
      />

      <CtaRow backHref="/live-webcams" backLabel="All live webcams" />
    </PageShell>
  );
}
