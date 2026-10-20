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
  title: "Dark-Sky Cameras — Meteor Showers & Night Sky Live",
  description:
    "Find the live sky cameras pointed up from dark-sky sites: watch meteor showers, the Milky Way and satellites on public webcams. Free on the WorldEye map, no signup.",
  alternates: { canonical: `${BASE}/dark-sky-cameras` },
  openGraph: {
    title: "Dark-Sky Cameras — Meteor Showers & Night Sky Live",
    description:
      "Live sky cameras from dark-sky sites for meteor showers, aurora and satellite watching. Free on the WorldEye map.",
    url: "/dark-sky-cameras",
    type: "website",
  },
};

const INTRO = [
  "Most webcams point at the world. A scattered few point above it — sky cameras mounted at dark-sky reserves, observatories, desert sites and mountain locations, streaming the night itself. On those feeds the frame is genuinely black, stars register, and the sky's traffic becomes visible: bright meteors striking through, the Milky Way's core wheeling over in season, satellites crossing in slow, steady lines. WorldEye's camera directory includes these upward feeds among its 74,229 public cameras; this page is about finding them and reading them well.",
  "The immediate occasion is the year's autumn meteor calendar. The Orionids — debris from Halley's Comet — peak on the night of October 21-22, 2026, best watched in the pre-dawn hours after moonset. The Leonids follow around November 17-18, and the Geminids, the strongest reliable shower of the year, peak around December 13-14, with the Quadrantids opening 2027 around January 3-4. Each shower night sends the same question around the world — is it clear and dark anywhere I can watch? — and a circuit of sky cameras across longitudes is the practical answer: when it's cloudy or dawn where you are, it's midnight and clear somewhere in the directory.",
  "Reading a sky camera is a small discipline. Start with the timestamp, as with any feed. Then judge the darkness honestly: a useful night frame shows a black sky, stars when the sensor allows, and ground that reads as dim shapes rather than lit scenery. Then learn the two speeds of the night sky. A meteor is a streak gone in under a second, sometimes leaving a fading train. A satellite — or the space station — is a bright point crossing steadily over minutes. Confusing the two is the beginner's rite of passage; the station, brightest of all, is worth its own watch.",
  "The same feeds multitask across the night-sky calendar. At high latitudes they become aurora cameras on storm nights. In Milky Way season — roughly February to October, with the galactic core best placed in northern-hemisphere spring and summer evenings — dark desert and mountain feeds show the band standing over landscapes no city dweller ever sees from home. All of it is free on the map — no account, no signup.",
];

const CATEGORIES = [
  {
    title: "Meteor showers",
    body: "Sky cameras earn their keep on shower nights: a bright fireball crossing a genuinely dark frame is unmistakable, and a circuit across time zones lets you chase clear skies around the planet. Orionids in October, Leonids in November, Geminids in December — the calendar below is the watching schedule.",
  },
  {
    title: "Aurora crossover",
    body: "Northern sky and landscape cameras do double duty: on geomagnetic storm nights the same dark feeds that catch meteors fill with aurora. The aurora-belt circuit — Iceland, Lapland, Norway, Alaska, Canada — has its own page and its own season, September to March.",
  },
  {
    title: "Satellites and the space station",
    body: "The slow movers. Satellites cross dark frames as steady bright points taking minutes to traverse; the International Space Station outshines everything else in the sky except the Moon. Dawn and dusk passes are the visible ones, when the station is sunlit against a dark sky.",
  },
  {
    title: "The Milky Way and deep darkness",
    body: "In season, dark-sky feeds in deserts and mountains show the galactic core standing over the landscape — the view light pollution erased from most of the developed world. These are the feeds to leave open on a summer night: nothing happens, beautifully, for hours.",
  },
];

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "CollectionPage",
  name: "Dark-Sky Cameras — Meteor Showers & Night Sky Live",
  description:
    "Guide to the live sky cameras in the WorldEye directory: meteor showers, aurora crossovers, satellites and the Milky Way.",
  url: `${BASE}/dark-sky-cameras`,
  isPartOf: { "@type": "WebSite", name: "WorldEye", url: "https://worldeye.app" },
};

const FAQS = [
  {
    q: "When is the next meteor shower to watch on sky cameras?",
    a: "The Orionids peak on the night of October 21-22, 2026 — right now — with the best window after moonset in the pre-dawn hours. After that: the Leonids around November 17-18, the Geminids (the year's strongest reliable shower) around December 13-14, and the Quadrantids around January 3-4, 2027.",
  },
  {
    q: "Can a webcam really show meteors?",
    a: "Yes, with honest limits. A camera at a genuinely dark site registers bright meteors and fireballs as fast streaks, sometimes with lingering trains. Faint meteors fall below most sensors, so a webcam count will always understate what your eyes would see from the same spot — the feeds trade sensitivity for geography: they can be somewhere dark and clear when you can't.",
  },
  {
    q: "How do I tell a meteor from a satellite on a feed?",
    a: "Speed. A meteor crosses in under a second and is gone, often with a brightening head and a fading train. A satellite or the space station crosses steadily over minutes as a constant bright point. If it blinks rhythmically, it's an aircraft — the night sky's third, least welcome actor.",
  },
  {
    q: "How do I find the darkest feeds?",
    a: "Start from remote geography: desert, mountain and island cameras far from city markers, then judge the frame itself — black sky, visible stars, ground reading as dim shapes. If the frame looks like a lit parking lot, the site isn't dark enough for sky watching whatever the map says. Rotate through several longitudes to dodge cloud and dawn.",
  },
  {
    q: "Are dark-sky cameras free to watch?",
    a: "Yes. Every feed in the directory is a public stream, and the WorldEye camera layer is free with no account or signup. Open the map, find a remote camera, and check whether its night frame is truly dark.",
  },
];

export default function DarkSkyCamerasPage() {
  return (
    <PageShell>
      <JsonLd data={jsonLd} />
      <FaqJsonLd faqs={FAQS} />
      <Breadcrumb
        trail={[
          { label: "Home", href: "/" },
          { label: "Live webcams", href: "/live-webcams" },
          { label: "Dark-sky cameras" },
        ]}
      />
      <Hero
        h1="Dark-Sky Cameras — The Night Sky, Live"
        sub="Sky cameras from dark-sky sites: meteor showers, the Milky Way, satellites — free, no signup."
      />
      <Intro paragraphs={INTRO} />

      <section className="mt-12">
        <h2 className="text-xl md:text-2xl font-bold mb-5">What the night feeds show</h2>
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
        title="How to watch a meteor shower on webcams"
        steps={[
          "Pick your night from the shower calendar: Orionids Oct 21-22, Leonids Nov 17-18, Geminids Dec 13-14, Quadrantids Jan 3-4.",
          "Open the free WorldEye map and head for remote cameras — deserts, mountains, islands, far-northern sites.",
          "Verify each feed: timestamp current, frame genuinely dark, sky black rather than town-lit.",
          "Build a circuit of three to five dark feeds across different longitudes, so cloud or dawn in one place doesn't end your night.",
          "Watch for the fast signature — a streak gone in under a second. Slow, steady bright points are satellites; enjoy those too, but log them honestly.",
          "Recheck feeds across the peak hours; shower rates climb after midnight local time at the camera, when its side of Earth turns into the debris stream.",
        ]}
      />

      <FaqSection title="Dark-sky cameras — FAQ" faqs={FAQS} />

      <RelatedLinks
        title="More night watching"
        links={[
          { label: "Watch the Orionid meteor shower live (guide)", href: "/blog/watch-the-orionid-meteor-shower-live" },
          { label: "Northern lights webcams", href: "/northern-lights-webcams" },
          { label: "How to watch the ISS live (guide)", href: "/blog/how-to-watch-the-iss-live" },
          { label: "ISS tracker", href: "/space-station-tracker" },
        ]}
      />

      <CtaRow backHref="/live-webcams" backLabel="All live webcams" />
    </PageShell>
  );
}
