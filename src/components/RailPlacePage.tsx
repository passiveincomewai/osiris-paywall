/**
 * The per-place page behind /train-webcams/[place]
 * (lib/railfan-places). A place page is one wall: every catalogue
 * camera within the place's stated radius of its rail anchor point,
 * nearest first, served by its EXPLORE_SCOPES entry — the counts
 * below come from that scope (countForDef / recordsForDef), so the
 * page cannot quote a number its own grid disagrees with.
 *
 * Honesty contract (the family's rule): WorldEye shows cameras; it
 * does not track trains — no positions, no schedules, no arrival
 * boards, no Amtrak status. Where the wall holds rail-named feeds
 * the page counts them (the 'rail' theme, lib/explore-scopes); where
 * the wall is the town's river, road and municipal networks, the
 * page says that instead.
 */

import Link from "next/link";
import {
  BASE,
  JsonLd,
  Breadcrumb,
  Hero,
  Intro,
  StatRow,
  HowTo,
  FaqSection,
  FaqJsonLd,
  RelatedLinks,
  CtaRow,
  PageShell,
  type RelatedLink,
} from "@/components/directory-page";
import DirectoryExplorer from "@/components/DirectoryExplorer";
import TrialCtaSection from "@/components/TrialCtaSection";
import { EXPLORE_SCOPES, countForDef, recordsForDef } from "@/lib/explore-data";
import { haversineKm } from "@/lib/ski-resorts";
import { buildGeoUrl } from "@/lib/share/links";
import {
  railPlacePath,
  siblingPlaces,
  type RailPlace,
} from "@/lib/railfan-places";

const fmt = (n: number) => n.toLocaleString("en-US");

function distLabel(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${km.toFixed(1)} km`;
}

export default async function RailPlacePage({ place }: { place: RailPlace }) {
  const def = EXPLORE_SCOPES[place.scopeKey];
  const records = await recordsForDef(def);
  const total = records.length;
  const railCount = await countForDef({ ...def, theme: "rail" });
  const withCoords = records.filter(
    (r) => typeof r.lat === "number" && typeof r.lng === "number",
  );
  const nearest = withCoords.slice(0, 6).map((r) => ({
    name: r.name,
    city: r.city ?? "",
    d: haversineKm(place.lat, place.lng, r.lat as number, r.lng as number),
  }));
  const nearestD = nearest.length > 0 ? nearest[0].d : null;
  const sources = new Set(records.map((r) => r.source).filter(Boolean)).size;

  const globe = buildGeoUrl({
    lat: place.lat,
    lng: place.lng,
    radiusM: place.radiusKm * 1000,
  });
  const globePath = globe ? `${new URL(globe).pathname}${new URL(globe).search}` : "/";

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: `${place.name} Train Webcams — Live Rail Cameras`,
    description: `${fmt(total)} live public cameras within ${place.radiusKm} km of ${place.name} (${place.place}), nearest first — the place's rail-named feeds and the networks around them, free on WorldEye.`,
    url: `${BASE}${railPlacePath(place)}`,
    isPartOf: { "@type": "WebSite", name: "WorldEye", url: "https://worldeye.app" },
  };

  const faqs = [
    {
      q: `Can I watch trains at ${place.shortName} on these cameras?`,
      a: `You can watch ${place.shortName}'s rail places live — the station area, the crossings and the town around them — and where a feed frames the line itself, the trains that pass. What WorldEye does not give you is train tracking: no live positions, no timetables, no arrival boards and no service status for ${place.shortName} or anywhere else. The wall is the place on camera, not a departure board; pair it with the operator's own live information for times.`,
    },
    {
      q: `How many cameras are near ${place.shortName}?`,
      a: `${fmt(total)} catalogue cameras fall within ${place.radiusKm} km of ${place.shortName}'s rail anchor point, and every one of them is in the wall below, nearest first. ${railCount > 0 ? `${fmt(railCount)} of them name a railway, a station, a line or a depot in their own title.` : `None of them names the railway in its title — the wall is the town's public network around its rail anchor, and this page labels it that way.`} The counts are computed from the catalogue the same way everywhere in this directory, so the number here is the number the grid serves.`,
    },
    {
      q: `Are these dedicated railfan cameras?`,
      a: `A few walls in this family hold dedicated rail cameras — a station concourse feed, a railyard camera, a cam named for the Shinkansen. Most walls are the networks that happen to cover a rail place: municipal cameras, river cameras that frame railway bridges, road feeds on the corridor. ${place.watchNotes[0]} Each wall states its rule and describes its actual mix rather than dressing a road camera up as a train cam.`,
    },
    {
      q: `Does WorldEye show live train positions or Amtrak status for ${place.shortName}?`,
      a: `No. These pages are camera walls. WorldEye does not publish train positions, schedules, delays or operator status — for ${place.shortName}, for Amtrak, or for any railway. If you need to know when a train runs, the operator's own timetable and status pages are the source; come back here for the part they can't give you: the place itself, live.`,
    },
    {
      q: `Are the ${place.shortName} cameras free to watch?`,
      a: `Yes. Every camera in the wall is free to watch — no account, no signup. Open any card to jump to the same spot on the globe, where the camera plays alongside the weather layer.`,
    },
  ];

  const related: RelatedLink[] = [
    { label: `${place.shortName} on the 3D globe`, href: globePath },
    { label: `${place.countryName} camera directory`, href: `/cameras/countries/${place.countrySlug}` },
    ...(place.cityPage
      ? [{ label: place.cityPage.label, href: `/city-webcams/${place.cityPage.slug}` }]
      : []),
    ...(place.stateHub
      ? [{ label: place.stateHub.label, href: `/us-traffic-cameras/${place.stateHub.slug}` }]
      : []),
    ...siblingPlaces(place).map((p) => ({
      label: `${p.name} train webcams`,
      href: railPlacePath(p),
    })),
    { label: "Train webcams — the railfan hub", href: "/train-webcams" },
    { label: "Airport webcams — plane-spotting walls", href: "/airport-webcams" },
  ];

  return (
    <PageShell>
      <JsonLd data={jsonLd} />
      <FaqJsonLd faqs={faqs} />
      <Breadcrumb
        trail={[
          { label: "Home", href: "/" },
          { label: "Live webcams", href: "/live-webcams" },
          { label: "Train webcams", href: "/train-webcams" },
          { label: place.shortName },
        ]}
      />
      <Hero
        h1={`${place.name} Train Webcams`}
        sub={`${fmt(total)} live cameras within ${place.radiusKm} km of ${place.shortName} — the station, the line and the town around them, live. Free, no signup.`}
      />
      <StatRow
        stats={[
          { value: fmt(total), label: `cameras within ${place.radiusKm} km of the anchor` },
          { value: fmt(railCount), label: "name a railway, station or line" },
          {
            value: nearestD !== null ? distLabel(nearestD) : "—",
            label: "to the closest camera in the wall",
          },
          { value: fmt(sources), label: "public networks feeding the wall" },
        ]}
      />
      <Intro paragraphs={place.about} />

      <section className="mt-12">
        <h2 className="text-xl md:text-2xl font-bold mb-3">The wall — every camera, nearest first</h2>
        <p className="text-sm text-white/55 leading-relaxed max-w-3xl mb-5">
          The rule for this page is the rule for the whole family: every catalogue
          camera within {place.radiusKm} km of {place.shortName}&rsquo;s rail anchor
          ({place.lat.toFixed(4)}, {place.lng.toFixed(4)}), ordered nearest first.
          Known for: {place.knownFor}
        </p>
        <DirectoryExplorer
          scopeKey={place.scopeKey}
          scopeLabel={EXPLORE_SCOPES[place.scopeKey].label}
          groupBy="none"
          searchPlaceholder={`Search cameras near ${place.shortName}…`}
          explorerId={`rail-${place.slug}`}
        />
      </section>

      <section className="mt-12">
        <h2 className="text-xl md:text-2xl font-bold mb-3">What this wall actually shows</h2>
        <div className="space-y-3 max-w-3xl">
          {place.watchNotes.map((note, i) => (
            <p key={i} className="text-sm text-white/55 leading-relaxed">
              {note}
            </p>
          ))}
        </div>
        {nearest.length > 0 && (
          <>
            <h3 className="font-semibold text-white/90 mt-6 mb-3">
              Closest cameras to the anchor
            </h3>
            <ul className="space-y-2 max-w-3xl">
              {nearest.map((n, i) => (
                <li
                  key={`${n.name}-${i}`}
                  className="flex items-baseline justify-between gap-4 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3"
                >
                  <span className="text-sm text-white/80">{n.name}</span>
                  <span className="text-xs text-white/45 whitespace-nowrap">
                    {distLabel(n.d)} away
                  </span>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>

      <section className="mt-12">
        <h2 className="text-xl md:text-2xl font-bold mb-3">
          {place.shortName} in the directory
        </h2>
        <p className="text-sm text-white/55 leading-relaxed max-w-3xl">
          This wall is one place in a directory of them. Open{" "}
          <Link href={globePath} className="text-sky-300 hover:underline">
            {place.shortName} on the 3D globe
          </Link>{" "}
          to watch its cameras with the weather layer on, browse the{" "}
          <Link
            href={`/cameras/countries/${place.countrySlug}`}
            className="text-sky-300 hover:underline"
          >
            {place.countryName} camera directory
          </Link>
          {place.cityPage && (
            <>
              {" "}
              or the{" "}
              <Link
                href={`/city-webcams/${place.cityPage.slug}`}
                className="text-sky-300 hover:underline"
              >
                {place.cityPage.label}
              </Link>
            </>
          )}
          {place.stateHub && (
            <>
              {" "}
              and the{" "}
              <Link
                href={`/us-traffic-cameras/${place.stateHub.slug}`}
                className="text-sky-300 hover:underline"
              >
                {place.stateHub.label}
              </Link>
            </>
          )}
          , or head back to the{" "}
          <Link href="/train-webcams" className="text-sky-300 hover:underline">
            train webcams hub
          </Link>{" "}
          for the worldwide rail wall and the other thirteen places.
        </p>
      </section>

      <HowTo
        title="How to use a rail wall"
        steps={[
          "Start with the closest cameras to the anchor — the station and corridor feeds read the place best, and the rail-named feeds are counted at the top of this page.",
          "Read the picture for what it is: weather over the corridor, light on the station square, how busy the town is. A camera shows the scene; it does not announce the next train.",
          "Check the timestamp on any feed before reading it — a paused camera and a quiet railway can look alike.",
          "For times, positions and service status, use the railway operator's own live information. Then come back to the wall for the place itself.",
        ]}
      />

      <FaqSection title={`Train webcams at ${place.shortName} — FAQ`} faqs={faqs} />

      <RelatedLinks title="More live WorldEye" links={related} />

      <TrialCtaSection utmSource={`train-webcams-${place.slug}`} />

      <CtaRow backHref="/train-webcams" backLabel="All train webcams" />
    </PageShell>
  );
}
