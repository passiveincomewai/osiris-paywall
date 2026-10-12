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
  title: "Beach Webcams — Live Coastal Cameras Worldwide | WorldEye",
  description:
    "Watch live beach webcams worldwide: surf and swell, sunrises, coastal weather and harbor views — free on the WorldEye map, no signup needed.",
  alternates: { canonical: `${BASE}/beach-webcams` },
  openGraph: {
    title: "Beach Webcams — Live Coastal Cameras Worldwide",
    description:
      "Live beach webcams: surf, sunrises, coastal weather and harbor views. Free on the WorldEye map.",
    url: "/beach-webcams",
    type: "website",
  },
};

const INTRO = [
  "Coastal cameras are some of the most-watched feeds on the planet — and not just by surfers. A live beach camera shows the surf, the crowd, the cloud cover and the mood of the coast as it is right now, which is something no brochure photo or forecast icon can do.",
  "WorldEye's camera directory includes beach, boardwalk, harbor and marina feeds from coastlines around the world. They're plotted on the same globe as the weather layer, so you can watch a sunrise over the Atlantic, check the swell before a surf session, or see whether the coast you're visiting is sunny or socked in — all in one view.",
  "Every coastal feed opens free on the WorldEye map — no account, no signup. Zoom to any coastline, look for the camera markers near the water, and start watching.",
];

const CATEGORIES = [
  {
    title: "Surf and swell",
    body: "Beach-facing cameras near known breaks show wave size, wind texture and crowd levels in real time. Check the swell before you wax up — or watch the sets roll in from your desk when you can't be there.",
  },
  {
    title: "Sunrises and sunsets",
    body: "East-facing coasts catch the sunrise, west-facing coasts the sunset. Coastal cameras pointed at the horizon turn the globe into a perpetual golden-hour machine — pick a timezone and watch the light change.",
  },
  {
    title: "Harbor and marina views",
    body: "Marina and harbor cameras show boat traffic, water conditions and fog rolling in off the sea. They're the practical check for sailors and the relaxing one for everyone else.",
  },
  {
    title: "Beach weather, visually",
    body: "A forecast says 'partly cloudy.' A beach camera shows you exactly how cloudy, whether the beach is packed or empty, and whether that 'chance of rain' is a drizzle or a wall of gray. Pack — or cancel — from live conditions.",
  },
];

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "CollectionPage",
  name: "Beach Webcams — Live Coastal Cameras Worldwide",
  description:
    "Directory of live beach and coastal webcams worldwide: surf, sunrises, coastal weather and harbor views.",
  url: `${BASE}/beach-webcams`,
  isPartOf: { "@type": "WebSite", name: "WorldEye", url: "https://worldeye.app" },
};

const FAQS = [
  {
    q: "Are beach webcams free to watch?",
    a: "Yes. Every coastal camera in the directory is free to watch — no account, no signup, no paywall. Open the WorldEye map, zoom to any coastline, and tap a camera marker near the water.",
  },
  {
    q: "Can I check surf conditions on a beach webcam?",
    a: "Often. Beach-facing cameras near surf breaks show wave size, wind on the water and how crowded the lineup is. They won't replace a dedicated surf report, but they're the fastest visual check before you head out.",
  },
  {
    q: "Do beach cameras show the weather at the coast?",
    a: "Yes — that's one of their best uses. A camera shows cloud cover, fog, rain and light conditions exactly as they are. Check the coast you're visiting before you pack the beach bag.",
  },
  {
    q: "Can I watch sunrises and sunsets on beach cameras?",
    a: "Yes. East-facing beaches catch sunrise, west-facing beaches catch sunset. Pick a coast in the right timezone, find a camera pointed at the horizon, and watch it happen live.",
  },
];

export default function BeachWebcamsPage() {
  return (
    <PageShell>
      <JsonLd data={jsonLd} />
      <FaqJsonLd faqs={FAQS} />
      <Breadcrumb
        trail={[
          { label: "Home", href: "/" },
          { label: "Live webcams", href: "/live-webcams" },
          { label: "Beach webcams" },
        ]}
      />
      <Hero
        h1="Beach Webcams — Live Coastal Cameras"
        sub="Surf, sunrises, coastal weather and harbor views — live, free, no signup."
      />
      <Intro paragraphs={INTRO} />

      <section className="mt-12">
        <h2 className="text-xl md:text-2xl font-bold mb-5">What coastal cameras show</h2>
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
        title="How to watch beach webcams"
        steps={[
          "Open the free WorldEye map — no account or download needed.",
          "Zoom to any coastline and look for camera markers near the water.",
          "Tap a beach, boardwalk or harbor marker to open that coastal camera's live feed.",
        ]}
      />

      <FaqSection title="Beach webcams — FAQ" faqs={FAQS} />

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
