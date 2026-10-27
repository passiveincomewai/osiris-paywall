import type { Metadata } from "next";
import {
  BASE,
  JsonLd,
  Breadcrumb,
  Hero,
  Intro,
  AreaTable,
  HowTo,
  FaqSection,
  FaqJsonLd,
  RelatedLinks,
  CtaRow,
  PageShell,
  type Faq,
} from "@/components/directory-page";
import DirectoryExplorer from "@/components/DirectoryExplorer";
import DirectorySearch from "@/components/DirectorySearch";
import { EXPLORE_SCOPES, areasForDef, countForDef } from "@/lib/explore-data";
import Link from "next/link";
import { AIRPORT_PAGES } from "@/lib/airport-pages";
import VoiceQA from "@/components/seo/VoiceQA";
import { voiceFaqs } from "@/lib/voice-questions";

const VOICE_QA_IDS = [
  "airport-watch-planes-land",
  "airport-check-weather-before-flight",
  "airport-terminal-traffic",
  "airport-who-operates-the-cameras",
];

export const metadata: Metadata = {
  title: "Airport Webcams — Watch Airports Live",
  description:
    "Watch airport-area webcams live: runway views, approach paths and airport weather checks before you fly. Free, no signup, on the WorldEye globe.",
  alternates: { canonical: `${BASE}/airport-webcams` },
  openGraph: {
    title: "Airport Webcams — Watch Airports Live | WorldEye",
    description:
      "Live airport-area webcams: runway views, approach paths and weather checks before you fly. Free, no signup.",
    url: `${BASE}/airport-webcams`,
    type: "website",
  },
};

const INTRO = [
  "Airports are some of the most-watched places on the public camera network. Transport agencies, airport authorities and nearby businesses point live cameras at runways, terminals, approach corridors and the surrounding roads — and WorldEye's camera directory puts them on the globe so you can find the ones near any airport.",
  "People use airport webcams for very practical reasons: checking the weather over the field before a flight, watching departures climb out or arrivals line up on final, seeing whether the roads around the terminal are moving, or just enjoying the rhythm of a busy hub from across the world.",
  "On the live map, airport cameras sit in their real locations — around the airfield and along the routes that serve it — so you can pair what you see on the ground with the live flight layer overhead.",
  "The pre-flight weather check is the standout use. Forecasts describe the airport's weather in words; a camera shows the actual sky over the field — low scud, fog banks, the leading edge of a storm line. Pilots and frequent flyers check the field camera the way sailors check the harbor: it will not replace official aviation weather, but it grounds the forecast in something you can see.",
  "Planespotters get a different value. Approach-corridor and perimeter cameras catch arrivals on final and departures rotating — and paired with the live flight layer, you can match the aircraft overhead to the flight number, origin, and aircraft type in real time. It turns passive watching into something closer to air-traffic awareness.",
  "Then there is the pure logistics use: terminal approach roads, parking structures, and rental-car return loops. Leaving for the airport during rush hour? A camera on the terminal roadway shows whether the departures curb is flowing or gridlocked — more actionable than any traffic app's colored line.",
  "Airport cameras also reward the patient watcher. Hubs run in banks — waves of arrivals and departures — and the airfield cameras show the rhythm: the morning push queuing at the runway, the midday lull, the evening bank stacking up on final. Pair that with the flight layer and a busy airport becomes a system you can read: where the queue forms, how the weather slows it, and when it clears.",
];

const HOW_TO = [
  "Open the live map and search for the airport or city you're interested in.",
  "Zoom into the airfield — camera markers cluster around airports, terminals and the surrounding highway interchanges.",
  "Click a camera marker to open its live feed and see current conditions at or near the airport.",
  "Turn on the flight layer to watch live aircraft on the same view — departures, arrivals and the traffic the camera is showing.",
  "Check the weather layer alongside to see the systems affecting the airport right now.",
];

const FAQS: Faq[] = [
  {
    q: "Are airport webcams really live?",
    a: "The directory indexes live public feeds. Individual cameras can go offline for maintenance or be replaced by their operators, so a specific feed may occasionally be dark — but airports tend to be well covered, with multiple cameras in the area.",
  },
  {
    q: "Can I see the runways?",
    a: "Many airport-area cameras face the airfield, terminals or approach paths, though exact views depend on each camera's placement and operator. Cameras around the airport — roads, parking, nearby landmarks — are useful even when they don't show the tarmac itself.",
  },
  {
    q: "Can I use these to check weather before flying?",
    a: "They're a great supplement: seeing the actual sky, cloud cover and ground conditions near the airport is genuinely useful. For aviation decisions, always use official aviation weather sources too — cameras show what it looks like, not what it's going to do.",
  },
  {
    q: "Do I need an account to watch?",
    a: "No. Every camera in the WorldEye directory is free to watch with no account and no signup — airport cameras included.",
  },
  {
    q: "Are these cameras operated by WorldEye?",
    a: "No. WorldEye collects and maps public feeds that their operators — transport agencies, airports, municipalities and businesses — already publish openly. It doesn't operate its own camera network.",
  },
  {
    q: "Can I match planes I see on camera to flights?",
    a: "Yes — that's one of the best combinations on the site. Turn on the live flight layer on the same map view: aircraft overhead appear with flight number, origin, destination, and aircraft type, so you can identify what the camera is showing in real time.",
  },
  {
    q: "Which airports have the most camera coverage?",
    a: "Major hubs in regions with dense public camera networks — the US, Europe, Taiwan, Japan — tend to have the most feeds around them. Search the airport on the live map and zoom in to see what's actually there.",
  },
  {
    q: "Can airport cameras help me time my drive to the terminal?",
    a: "Yes. Cameras on terminal approach roads, departures curbs, and parking structures show whether traffic is flowing or gridlocked — check them before leaving during rush hour or bad weather.",
  },
  {
    q: "Do the cameras show delays or cancellations?",
    a: "Not directly — cameras show conditions, not schedules. But a camera showing fog over the field or gridlock at the curb explains the delay board better than any status message. Pair the view with the flight layer for the full picture.",
  },
  {
    q: "How do I find the cameras for a specific airport?",
    a: "Search the airport's name or city on the live map and zoom into the airfield. Airport-area cameras cluster around terminals, approach corridors and the highway interchanges serving the airport — the dedicated airport page in the camera directory is a good starting point too.",
  },
  {
    q: "Why do some airport cameras look away from the runway?",
    a: "Because most airport-area feeds weren't installed for planespotters — they're road, parking and perimeter cameras operated by transport agencies and businesses near the field. They're still useful: terminal roadways, weather over the field and approach corridors are often exactly what travelers and spotters need.",
  },
];

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "CollectionPage",
  name: "Airport Webcams — Watch Airports Live",
  description:
    "Live public webcams around airports: runway views, approach paths and airport weather checks before you fly.",
  url: `${BASE}/airport-webcams`,
  isPartOf: { "@type": "WebSite", name: "WorldEye", url: BASE },
};

export default async function AirportWebcamsPage() {
  /* The airport set is a defined rule over the catalogue, not a hand
     list: cameras whose name identifies an airport, airfield or
     runway (lib/explore-scopes). The catalogue carries no structured
     airport inventory — a camera's airport exists only as free text
     in its name — so this page groups the set by the city each camera
     is listed under and searches by name, rather than inventing
     per-airport entities the data can't support. */
  const total = await countForDef(EXPLORE_SCOPES.airport);
  const areas = await areasForDef(EXPLORE_SCOPES.airport, 400);
  const fmt = (n: number) => n.toLocaleString("en-US");

  return (
    <PageShell>
      <JsonLd data={jsonLd} />
      <FaqJsonLd faqs={[...FAQS, ...voiceFaqs(VOICE_QA_IDS)]} />
      <Breadcrumb
        trail={[
          { label: "Cameras", href: "/cameras" },
          { label: "Airport webcams" },
        ]}
      />
      <Hero
        h1="Airport Webcams, Live"
        sub="Watch airport areas in real time — runway and airfield views, approach corridors, and the roads and weather around the world's airports."
      />
      <DirectorySearch
        label="airport areas"
        options={areas}
        placeholder="Search airport cameras by city…"
        emptyText={'No airport areas match "{value}".'}
        targetId="airport-explorer"
      />
      <Intro paragraphs={INTRO} />
      <section className="mt-12">
        <h2 className="text-xl md:text-2xl font-bold mb-3">Live airport cameras</h2>
        <p className="text-sm text-white/55 leading-relaxed max-w-3xl mb-5">
          {fmt(total)} cameras in the live index name an airport, airfield or runway
          in their title — every one of them is below, as its real live feed,
          grouped by the country and city it serves. Looking for one field in
          particular? Type its name into the explorer&apos;s search — airport
          names live in the camera titles themselves.
        </p>
        <DirectoryExplorer
          scopeKey="airport"
          scopeLabel="airports"
          groupBy="country"
          searchPlaceholder="Search airport cameras — an airport, a city, a runway…"
          explorerId="airport-explorer"
        />
      </section>
      <AreaTable
        title="Cities with the most airport cameras"
        rows={areas.slice(0, 12)}
        note="Counted from the cameras above: the city each airport camera is listed under in the index."
      />
      <section className="mt-12">
        <h2 className="text-xl md:text-2xl font-bold mb-3">One page per airport</h2>
        <p className="text-sm text-white/55 leading-relaxed max-w-3xl mb-5">
          Fifty-one airports earn their own page — the ones where the
          catalogue holds a real camera wall nearby. Each page is a radius
          rule, stated on the page: every catalogue camera within 15 km of
          the airport (25 km for Denver, whose field sits far out on the
          plains), nearest first, with the live flight layer over the
          field. Airports with only a handful of distant feeds were left
          off rather than padded — Chicago O&apos;Hare, for all its size,
          has just 41 catalogue cameras within 15 km.
        </p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {AIRPORT_PAGES.map((a) => (
            <Link
              key={a.slug}
              href={`/airport-webcams/${a.slug}`}
              className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 hover:bg-white/[0.06] transition"
            >
              <span className="block font-semibold text-sm">
                {a.city} ({a.iata})
              </span>
              <span className="block text-xs text-white/45 mt-0.5">
                {a.count} cameras within {a.radiusKm} km
              </span>
            </Link>
          ))}
        </div>
      </section>
      <HowTo title="How to watch airport cameras" steps={HOW_TO} />
      <FaqSection title="Airport webcam FAQs" faqs={FAQS} />
      <VoiceQA ids={VOICE_QA_IDS} />
      <RelatedLinks
        title="More camera directories"
        links={[
          { label: "Live webcams hub", href: "/live-webcams" },
          { label: "Top 25 camera regions", href: "/world-city-webcams" },
          { label: "Camera overview", href: "/cameras" },
        ]}
      />
      <CtaRow backHref="/cameras" backLabel="Camera overview" />
    </PageShell>
  );
}
