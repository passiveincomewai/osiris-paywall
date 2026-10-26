import type { Metadata } from "next";
import { notFound } from "next/navigation";
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
  StatRow,
} from "@/components/directory-page";
import SkiCameraGrid from "@/components/SkiCameraGrid";
import { getEventWall, EVENT_WALLS, type EventWall } from "@/data/event-walls";
import {
  eventWallCaptions,
  resolveEventWallCameras,
} from "@/lib/event-wall-cameras";
import {
  formatWallDate,
  wallStateLabel,
  wallStatusAt,
} from "@/lib/event-walls";

/* Status lines are date-driven; hourly ISR keeps "in season" honest
   without rebuilding the site (same cadence src/lib/event-walls.ts
   promises). */
export const revalidate = 3600;

export function generateStaticParams() {
  return EVENT_WALLS.map((w) => ({ slug: w.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const wall = getEventWall(slug);
  if (!wall) return { title: "Not found" };
  const url = `/live-events/${slug}`;
  return {
    title: wall.title,
    description: wall.description,
    alternates: { canonical: `${BASE}${url}` },
    openGraph: {
      title: wall.title,
      description: wall.description,
      url,
      type: "website",
    },
  };
}

function windowLabel(wall: EventWall): string | null {
  if (wall.schedule.kind !== "annual") return null;
  const fmt = (m: number, d: number) =>
    new Date(Date.UTC(2026, m - 1, d)).toLocaleDateString("en-US", {
      timeZone: "UTC",
      month: "short",
      day: "numeric",
    });
  return `${fmt(wall.schedule.start.month, wall.schedule.start.day)} – ${fmt(wall.schedule.end.month, wall.schedule.end.day)}`;
}

export default async function EventWallPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const wall = getEventWall(slug);
  if (!wall) notFound();

  const now = new Date();
  const status = wallStatusAt(wall, now);
  const cameras = await resolveEventWallCameras(wall);
  const season = windowLabel(wall);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: wall.title,
    description: wall.description,
    url: `${BASE}/live-events/${wall.slug}`,
    isPartOf: { "@type": "WebSite", name: "WorldEye", url: "https://worldeye.app" },
  };

  return (
    <PageShell>
      <JsonLd data={jsonLd} />
      <FaqJsonLd faqs={wall.faqs} />
      <Breadcrumb
        trail={[
          { label: "Home", href: "/" },
          { label: "Live events", href: "/live-events" },
          { label: wall.shortTitle },
        ]}
      />
      <Hero h1={wall.title} sub={wall.tagline} />

      <div
        className={`mt-8 rounded-2xl border p-5 ${
          status.state === "live"
            ? "border-emerald-400/25 bg-emerald-400/[0.06]"
            : "border-amber-300/25 bg-amber-300/[0.05]"
        }`}
      >
        <p className="flex items-center gap-2 text-sm font-semibold text-white/90">
          <span
            className={`inline-block h-2 w-2 rounded-full ${
              status.state === "live" ? "bg-emerald-400" : "bg-amber-300"
            }`}
          />
          {wallStateLabel(wall, status)} — {wall.eventLabel}
          {status.state === "off-season" && status.nextStart && (
            <span className="font-normal text-white/55">
              · returns {formatWallDate(status.nextStart)}
            </span>
          )}
        </p>
        <p className="mt-2 text-sm leading-relaxed text-white/65">
          {status.state === "live" ? wall.liveNote : wall.offSeasonNote}
        </p>
      </div>

      <div className="mt-8">
        <StatRow
          stats={[
            { value: String(cameras.length), label: "Live cameras on this wall" },
            { value: wall.placeLabel, label: "Where the cameras are" },
            ...(season
              ? [{ value: season, label: "Event window, each year" }]
              : [{ value: "Year-round", label: "Event window" }]),
          ]}
        />
      </div>

      <Intro paragraphs={wall.intro} />

      <section className="mt-12">
        <h2 className="text-xl md:text-2xl font-bold mb-5">
          The cameras — {wall.placeLabel}
        </h2>
        <SkiCameraGrid
          cameras={cameras}
          captions={eventWallCaptions(wall)}
          emptyNote="These cameras are temporarily unavailable from the catalogue — please check back shortly."
        />
        <p className="mt-4 text-xs leading-relaxed text-white/40">
          Every card is a still poster until you open it — browsing this wall
          never starts a stream. Opening a camera works exactly as it does
          everywhere on WorldEye, under the same free viewing allowance.
        </p>
      </section>

      <section className="mt-12">
        <h2 className="text-xl md:text-2xl font-bold mb-4">About these cameras</h2>
        {wall.about.map((p) => (
          <p key={p.slice(0, 24)} className="text-white/65 leading-relaxed mb-4">
            {p}
          </p>
        ))}
      </section>

      <FaqSection title={`${wall.shortTitle} — FAQ`} faqs={wall.faqs} />

      <RelatedLinks title="Keep watching" links={wall.related} />

      <CtaRow backHref="/live-events" backLabel="All live event walls" />
    </PageShell>
  );
}
