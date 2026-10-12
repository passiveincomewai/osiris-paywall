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
  title: "Ski Webcams — Live Mountain & Resort Cameras | WorldEye",
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
