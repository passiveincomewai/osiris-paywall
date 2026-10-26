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
import SunriseExperience from "@/components/SunriseExperience";
import { loadSunriseSelection } from "@/lib/sunrise-server";
import { appBaseUrl } from "@/lib/app-url";

/* A living page: the selection is computed for the moment of the request,
 * so it is rendered per-visit, never baked at build time. */
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Sunrise Around the World — Live Cameras on the Dawn Line",
  description:
    "Watch sunrise happen live, right now, on public cameras positioned exactly where the sun is rising — a page that rides the dawn line westward around the planet, with a sunset mode for the dusk line. Free, no signup.",
  alternates: { canonical: `${BASE}/sunrise-around-the-world` },
  openGraph: {
    title: "Sunrise Around the World — Live Cameras on the Dawn Line",
    description:
      "Live public cameras where the sun is rising at this moment, recomputed every minute from the real position of the sun. Plus a sunset mode for the other side of the day.",
    url: "/sunrise-around-the-world",
    type: "website",
  },
};

const INTRO = [
  "Somewhere on Earth, the sun is rising right now — and it never stops. As the planet turns, the dawn line sweeps westward at 15 degrees of longitude an hour, crossing a new coastline, city and mountain range every few minutes. This page rides that line: it computes the sun's real position for the moment you open it, finds the public cameras standing in the sunrise — close enough that the light is still low and golden — and puts them on one stage, closest to the moment first.",
  "Nothing here is a fixed list or a recording. The selection is recomputed every minute from the same served camera catalogue as the WorldEye globe — 74,229 public cameras — using the same solar model the globe draws its own day-and-night shading with. A camera qualifies when today's sunrise at its coordinates falls within 45 minutes either side of now: near enough that you catch the glow before, the first direct light, or the long shadows after. The featured camera rotates through the line-up so the whole line gets its moment.",
  "Flip the toggle and the page crosses to the other side of the day: sunset mode runs the identical geometry against the dusk line, where the sun is setting right now. Between the two, at any instant, this page can show you the exact seams of the planet's day — the places where night is becoming morning, and the places where evening is closing in.",
  "An honest caveat, because the feeds deserve one: these are public cameras run by transport agencies, towns, resorts and weather services, not sunrise observatories. A camera inside the window may still show cloud, a valley in shadow, or the grey minutes before the light arrives — that is what dawn actually looks like from most of the world. The geometry is exact; the weather is its own business.",
];

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "CollectionPage",
  name: "Sunrise Around the World — Live Cameras on the Dawn Line",
  description:
    "Live public cameras selected in real time by computed solar position: the cameras where the sun is rising (or setting) at this moment.",
  url: `${BASE}/sunrise-around-the-world`,
  isPartOf: { "@type": "WebSite", name: "WorldEye", url: "https://worldeye.app" },
};

const FAQS = [
  {
    q: "How are the cameras on this page chosen?",
    a: "By geometry, not by an editor. For the moment you load the page, the sun's position is computed with the same solar model the WorldEye globe uses for its day-and-night shading. For every camera in the served catalogue, the time of today's sunrise (or sunset) at its exact coordinates is calculated, and the cameras whose event falls within 45 minutes either side of now make the page — nearest to the moment first.",
  },
  {
    q: "Is this really live? How often does it change?",
    a: "Yes. The selection is recomputed every minute, because the dawn line moves a quarter of a degree of longitude per minute. The featured camera also rotates every 20 seconds, and still-image feeds refresh their frames in place. Leave the page open and the line-up genuinely travels west with the sun.",
  },
  {
    q: "Why does a camera in the list still look dark?",
    a: "Sunrise is a process, not a switch. A camera 30 minutes before its sunrise is in twilight — the sky is brightening but the sun has not cleared the horizon, and terrain or buildings can hold a valley in shadow well after. Cloud does the rest. The listed time is the computed moment for that camera's coordinates; what the light does with it is local.",
  },
  {
    q: "How accurate are the sunrise times shown?",
    a: "They are computed live from a standard solar-position approximation — the same one the globe's night shading uses — and are typically within a few minutes of an almanac for the same place. They are honest working times for watching the light change, not survey-grade astronomy.",
  },
  {
    q: "What is the difference between sunrise and sunset mode?",
    a: "Only which line the page rides. Sunrise mode follows the dawn terminator, where night is turning into day; sunset mode follows the dusk terminator on the opposite side of the planet, where day is turning into night. Both recompute every minute from the same catalogue and the same solar model.",
  },
  {
    q: "Why is the list sometimes empty?",
    a: "When the line crosses a wide stretch of ocean or a region with few public cameras, no catalogue camera falls inside the window for a while. The page says so rather than padding the list with cameras that are not really on the line — and the line reaches land again within the hour at most. Sunset mode shows the other side of the planet in the meantime.",
  },
  {
    q: "Is it free to watch?",
    a: "Yes. Every feed is a public stream and this page is free with no account or signup. Any camera can be opened on the full globe for the complete live view.",
  },
];

export default async function SunriseAroundTheWorldPage() {
  const initial = await loadSunriseSelection("sunrise", new Date(), appBaseUrl());
  return (
    <PageShell>
      <JsonLd data={jsonLd} />
      <FaqJsonLd faqs={FAQS} />
      <Breadcrumb
        trail={[
          { label: "Home", href: "/" },
          { label: "Live webcams", href: "/live-webcams" },
          { label: "Sunrise around the world" },
        ]}
      />
      <Hero
        h1="Sunrise Around the World — Live Cameras on the Dawn Line"
        sub="The sun is rising somewhere right now. These are the cameras standing in it — chosen by the real position of the sun, refreshed every minute."
      />

      <SunriseExperience initial={initial} />

      <Intro paragraphs={INTRO} />

      <HowTo
        title="How to ride the dawn line"
        steps={[
          "Open the page and look at the featured camera: it is the one nearest its sunrise at this minute, with the event time shown in your own timezone.",
          "Watch the strip: every camera there has its sunrise (or sunset) within 45 minutes of now, ordered by closeness to the moment.",
          "Give a camera a minute. Dawn light changes slowly, then all at once — recheck a dark feed after five minutes before judging it.",
          "Flip to sunset mode to cross the planet: the same geometry, run against the dusk line where evening is arriving.",
          "Tap any camera's Watch live button to open it on the full globe, with every other layer — flights, weather, satellites — around it.",
          "Leave the page open over a coffee: the selection recomputes every minute and the line-up visibly migrates west.",
        ]}
      />

      <FaqSection title="Sunrise around the world — FAQ" faqs={FAQS} />

      <RelatedLinks
        title="Keep watching the sky"
        links={[
          { label: "Live webcams worldwide", href: "/live-webcams" },
          { label: "Northern lights webcams: the aurora belt live", href: "/northern-lights-webcams" },
          { label: "Dark-sky cameras: meteors and the night sky", href: "/dark-sky-cameras" },
          { label: "Live weather tracker", href: "/weather-tracker" },
          { label: "Beach webcams: coasts and surf, live", href: "/beach-webcams" },
        ]}
      />

      <CtaRow backHref="/live-webcams" backLabel="All live webcams" />
    </PageShell>
  );
}
