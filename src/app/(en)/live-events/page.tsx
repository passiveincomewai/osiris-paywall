import type { Metadata } from "next";
import Link from "next/link";
import {
  BASE,
  JsonLd,
  Breadcrumb,
  Hero,
  Intro,
  FaqSection,
  FaqJsonLd,
  RelatedLinks,
  CtaRow,
  PageShell,
} from "@/components/directory-page";
import { EVENT_WALLS } from "@/data/event-walls";
import { resolveEventWallCameras } from "@/lib/event-wall-cameras";
import { wallStatusAt, wallStatusLine } from "@/lib/event-walls";

/* Card status lines are date-driven — hourly ISR keeps them honest. */
export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Live Event Cameras — Times Square, Aurora, Launches & Hurricane Watch",
  description:
    "Live camera walls for the moments people gather to watch: Times Square on New Year's Eve, the northern lights in season, Space Coast rocket launches and the hurricane coasts. Free, no signup.",
  alternates: { canonical: `${BASE}/live-events` },
  openGraph: {
    title: "Live Event Cameras — WorldEye Event Walls",
    description:
      "Fixed walls of live cameras for the big moments: New Year's Eve at Times Square, aurora season, launch day on the Space Coast, hurricane season on the coasts.",
    url: "/live-events",
    type: "website",
  },
};

const INTRO = [
  "Some cameras matter most at a moment: the street corner on New Year's Eve, the dark field in aurora season, the causeway on launch day, the beach as a hurricane comes in. Event walls are WorldEye's way of gathering those cameras in advance — a fixed, hand-checked set of live feeds for each moment, so when the moment arrives the watching is already arranged.",
  "Every wall is built the same honest way: the cameras are resolved from the catalogue's own place data — the town, road and coordinates each record carries — and the wall says exactly what its cameras are, including what they are not. There is no camera inside Times Square in this network, so that wall gathers the closest street cameras and labels them as such. No wall presents an off-season place as a live event: outside its window, a wall says so and names the date it returns.",
  "The cameras themselves stream around the clock, in season and out — an event wall out of season is still a wall of live coastline, Lapland darkness or Midtown traffic. Browsing a wall never starts a stream; each card is a poster until you open it, under the same free viewing allowance as everywhere else on WorldEye.",
];

const FAQS = [
  {
    q: "What is a live event wall?",
    a: "A fixed set of live cameras gathered around one place and moment — Times Square at New Year, the aurora belt in season, the Space Coast on launch day, the hurricane coasts in season. Unlike the map, a wall is curated: every camera on it was picked against the catalogue's own place data and is labelled with what it actually is.",
  },
  {
    q: "Are the cameras live outside the event?",
    a: "Yes. Every camera on every wall is a public stream that runs around the clock. The event framing is seasonal — a wall is 'in season' during its window and says 'off-season', with the date it returns, outside it. The feeds themselves never stop.",
  },
  {
    q: "Does browsing a wall use up my free camera views?",
    a: "No. Wall cards are still posters — no stream starts until you open a camera, and opening one counts exactly as it does anywhere else on WorldEye, under the same free allowance. A wall with a dozen cameras costs nothing to look at.",
  },
  {
    q: "Is it free to watch?",
    a: "Yes — every camera on every wall is a public stream, free on WorldEye with no account or signup.",
  },
];

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "CollectionPage",
  name: "Live Event Cameras — WorldEye Event Walls",
  description:
    "Live camera walls for Times Square, the northern lights, Space Coast rocket launches and hurricane season.",
  url: `${BASE}/live-events`,
  isPartOf: { "@type": "WebSite", name: "WorldEye", url: "https://worldeye.app" },
  mainEntity: {
    "@type": "ItemList",
    itemListElement: EVENT_WALLS.map((w, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: w.title,
      url: `${BASE}/live-events/${w.slug}`,
    })),
  },
};

export default async function LiveEventsHubPage() {
  const now = new Date();
  const counts = await Promise.all(
    EVENT_WALLS.map(async (w) => (await resolveEventWallCameras(w)).length),
  );

  return (
    <PageShell>
      <JsonLd data={jsonLd} />
      <FaqJsonLd faqs={FAQS} />
      <Breadcrumb
        trail={[{ label: "Home", href: "/" }, { label: "Live events" }]}
      />
      <Hero
        h1="Live Event Cameras"
        sub="Camera walls for the moments people gather to watch — gathered in advance, labelled honestly, free to watch."
      />
      <Intro paragraphs={INTRO} />

      <section className="mt-12">
        <h2 className="text-xl md:text-2xl font-bold mb-5">The walls</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          {EVENT_WALLS.map((wall, i) => {
            const status = wallStatusAt(wall, now);
            return (
              <Link
                key={wall.slug}
                href={`/live-events/${wall.slug}`}
                className="group rounded-2xl border border-white/10 bg-white/[0.03] p-6 hover:bg-white/[0.05] transition"
              >
                <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider">
                  <span
                    className={`inline-block h-2 w-2 rounded-full ${
                      status.state === "live" ? "bg-emerald-400" : "bg-amber-300"
                    }`}
                  />
                  <span
                    className={
                      status.state === "live" ? "text-emerald-300" : "text-amber-200"
                    }
                  >
                    {wallStatusLine(wall, now)}
                  </span>
                </p>
                <h3 className="mt-3 text-lg font-semibold text-white/90 group-hover:text-white">
                  {wall.shortTitle}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-white/55">
                  {wall.tagline}
                </p>
                <p className="mt-4 text-xs text-white/40">
                  {counts[i]} live cameras · {wall.placeLabel}
                </p>
              </Link>
            );
          })}
        </div>
      </section>

      <FaqSection title="Live event walls — FAQ" faqs={FAQS} />

      <RelatedLinks
        title="More ways to watch"
        links={[
          { label: "Live webcams worldwide", href: "/live-webcams" },
          { label: "Northern lights webcams — the full guide", href: "/northern-lights-webcams" },
          { label: "Hurricane tracker", href: "/hurricane-tracker" },
          { label: "Space station tracker", href: "/space-station-tracker" },
          { label: "Ski webcams", href: "/ski-webcams" },
        ]}
      />

      <CtaRow backHref="/live-webcams" backLabel="All live webcams" />
    </PageShell>
  );
}
