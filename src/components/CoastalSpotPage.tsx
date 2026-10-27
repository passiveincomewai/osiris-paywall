/**
 * The per-spot page shared by /surf-webcams/[spot] and
 * /beach-webcams/[spot] (lib/surf-spots). A spot page is one wall:
 * every catalogue camera within the spot's stated radius of its
 * centre, nearest first, served by its EXPLORE_SCOPES entry — the
 * counts below come from that scope (countForDef / recordsForDef),
 * so the page cannot quote a number its own grid disagrees with.
 *
 * Honesty contract (the family's rule): WorldEye shows cameras; it
 * does not publish surf reports, forecasts or swell data, and this
 * page never promises them. Where the wall holds beach-named feeds
 * the page says how many; where the wall is the town's road and
 * corridor network, the page says that instead.
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
import { siblingSpots, spotPath, type CoastalSpot } from "@/lib/surf-spots";

const fmt = (n: number) => n.toLocaleString("en-US");

function distLabel(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${km.toFixed(1)} km`;
}

export default async function CoastalSpotPage({ spot }: { spot: CoastalSpot }) {
  const def = EXPLORE_SCOPES[spot.scopeKey];
  const records = await recordsForDef(def);
  const total = records.length;
  const coastCount = await countForDef({ ...def, theme: "coast" });
  const withCoords = records.filter(
    (r) => typeof r.lat === "number" && typeof r.lng === "number",
  );
  const nearest = withCoords.slice(0, 6).map((r) => ({
    name: r.name,
    city: r.city ?? "",
    d: haversineKm(spot.lat, spot.lng, r.lat as number, r.lng as number),
  }));
  const nearestD = nearest.length > 0 ? nearest[0].d : null;
  const sources = new Set(records.map((r) => r.source).filter(Boolean)).size;

  const hubPath = spot.family === "surf" ? "/surf-webcams" : "/beach-webcams";
  const hubLabel = spot.family === "surf" ? "Surf webcams" : "Beach webcams";
  const familyWord = spot.family === "surf" ? "break" : "beach";
  const globe = buildGeoUrl({
    lat: spot.lat,
    lng: spot.lng,
    radiusM: spot.radiusKm * 1000,
  });
  const globePath = globe ? `${new URL(globe).pathname}${new URL(globe).search}` : "/";

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: `${spot.name} ${spot.family === "surf" ? "Surf" : "Beach"} Webcams — Live Cameras`,
    description: `${fmt(total)} live public cameras within ${spot.radiusKm} km of ${spot.name} (${spot.place}), nearest first — the town's beach-named feeds and road cameras, free on WorldEye.`,
    url: `${BASE}${spotPath(spot)}`,
    isPartOf: { "@type": "WebSite", name: "WorldEye", url: "https://worldeye.app" },
  };

  const faqs = [
    {
      q: `Can I check the surf at ${spot.shortName} on these cameras?`,
      a:
        spot.family === "surf"
          ? `You can see ${spot.shortName} live — the sky over the break, the light, the wind in the trees and, where a feed faces the water, the surface itself. What WorldEye does not give you is a surf report: no swell height, period or direction data, and no forecast. Use the wall as the visual check before you go; use a dedicated surf report for the numbers.`
          : `You can see ${spot.shortName} live — the sky, the light, the weather arriving and how busy the town is. WorldEye shows cameras only: it does not publish beach or surf forecasts, so read the wall as the visual check, not a prediction.`,
    },
    {
      q: `How many cameras are near ${spot.shortName}?`,
      a: `${fmt(total)} catalogue cameras fall within ${spot.radiusKm} km of ${spot.shortName}'s centre, and every one of them is in the wall below, nearest first. ${coastCount > 0 ? `${fmt(coastCount)} of them name a beach, coast, shore, bay, pier or harbour in their title.` : `None of them is a dedicated beach camera — the wall is the town's public road and corridor network, and this page labels it that way.`} The counts are computed from the catalogue the same way everywhere in this directory, so the number here is the number the grid serves.`,
    },
    {
      q: `Are these dedicated ${familyWord} cameras?`,
      a: `Some walls hold beach-named feeds; most are the networks that happen to cover a surf town — municipal cameras, state road feeds, harbour and street cameras within the radius. ${spot.watchNotes[0]} Each wall on WorldEye states its rule and describes its actual mix rather than dressing a road camera up as something it is not.`,
    },
    {
      q: `Does WorldEye publish a surf forecast for ${spot.shortName}?`,
      a: `No. WorldEye is a camera directory with live layers (weather radar, buoys on the map, storm tracking), not a forecasting service — there is no swell model, no surf report and no conditions rating here, for ${spot.shortName} or anywhere else. What you get is the live picture itself, which for a lot of surfers is the check that matters: is the coast sunny or socked in, calm-looking or wind-torn, empty or crowded — right now, not in a model run.`,
    },
    {
      q: `Are the ${spot.shortName} cameras free to watch?`,
      a: `Yes. Every camera in the wall is free to watch — no account, no signup. Open any card to jump to the same spot on the globe, where the camera plays alongside the weather and buoy layers.`,
    },
  ];

  const related: RelatedLink[] = [
    { label: `${spot.shortName} on the 3D globe`, href: globePath },
    { label: `${spot.countryName} camera directory`, href: `/cameras/countries/${spot.countrySlug}` },
    ...(spot.cityPage
      ? [{ label: spot.cityPage.label, href: `/city-webcams/${spot.cityPage.slug}` }]
      : []),
    ...(spot.stateHub
      ? [{ label: spot.stateHub.label, href: `/us-traffic-cameras/${spot.stateHub.slug}` }]
      : []),
    ...siblingSpots(spot).map((s) => ({
      label: `${s.name} ${s.family === "surf" ? "surf" : "beach"} webcams`,
      href: spotPath(s),
    })),
    { label: hubLabel, href: hubPath },
    ...(spot.family === "surf"
      ? [{ label: "Beach webcams worldwide", href: "/beach-webcams" }]
      : [{ label: "Surf webcams — see the break live", href: "/surf-webcams" }]),
  ];

  return (
    <PageShell>
      <JsonLd data={jsonLd} />
      <FaqJsonLd faqs={faqs} />
      <Breadcrumb
        trail={[
          { label: "Home", href: "/" },
          { label: "Live webcams", href: "/live-webcams" },
          { label: hubLabel, href: hubPath },
          { label: spot.shortName },
        ]}
      />
      <Hero
        h1={`${spot.name} ${spot.family === "surf" ? "Surf" : "Beach"} Webcams`}
        sub={`${fmt(total)} live cameras within ${spot.radiusKm} km of ${spot.shortName} — see the ${familyWord} live before you go. Free, no signup.`}
      />
      <StatRow
        stats={[
          { value: fmt(total), label: `cameras within ${spot.radiusKm} km of the centre` },
          { value: fmt(coastCount), label: "name a beach, coast, bay or pier" },
          {
            value: nearestD !== null ? distLabel(nearestD) : "—",
            label: "to the closest camera in the wall",
          },
          { value: fmt(sources), label: "public networks feeding the wall" },
        ]}
      />
      <Intro paragraphs={spot.about} />

      <section className="mt-12">
        <h2 className="text-xl md:text-2xl font-bold mb-3">The wall — every camera, nearest first</h2>
        <p className="text-sm text-white/55 leading-relaxed max-w-3xl mb-5">
          The rule for this page is the rule for the whole family: every catalogue
          camera within {spot.radiusKm} km of {spot.shortName}&rsquo;s centre
          ({spot.lat.toFixed(4)}, {spot.lng.toFixed(4)}), ordered nearest first.
          Known for: {spot.knownFor}
        </p>
        <DirectoryExplorer
          scopeKey={spot.scopeKey}
          scopeLabel={EXPLORE_SCOPES[spot.scopeKey].label}
          groupBy="none"
          searchPlaceholder={`Search cameras near ${spot.shortName}…`}
          explorerId={`spot-${spot.family}-${spot.slug}`}
        />
      </section>

      <section className="mt-12">
        <h2 className="text-xl md:text-2xl font-bold mb-3">What this wall actually shows</h2>
        <div className="space-y-3 max-w-3xl">
          {spot.watchNotes.map((note, i) => (
            <p key={i} className="text-sm text-white/55 leading-relaxed">
              {note}
            </p>
          ))}
        </div>
        {nearest.length > 0 && (
          <>
            <h3 className="font-semibold text-white/90 mt-6 mb-3">
              Closest cameras to the centre
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
          {spot.shortName} in the directory
        </h2>
        <p className="text-sm text-white/55 leading-relaxed max-w-3xl">
          This wall is one place in a directory of them. Open{" "}
          <Link href={globePath} className="text-sky-300 hover:underline">
            {spot.shortName} on the 3D globe
          </Link>{" "}
          to watch its cameras with the weather layer on, browse the{" "}
          <Link
            href={`/cameras/countries/${spot.countrySlug}`}
            className="text-sky-300 hover:underline"
          >
            {spot.countryName} camera directory
          </Link>
          {spot.cityPage && (
            <>
              {" "}
              or the{" "}
              <Link
                href={`/city-webcams/${spot.cityPage.slug}`}
                className="text-sky-300 hover:underline"
              >
                {spot.cityPage.label}
              </Link>
            </>
          )}
          {spot.stateHub && (
            <>
              {" "}
              and the{" "}
              <Link
                href={`/us-traffic-cameras/${spot.stateHub.slug}`}
                className="text-sky-300 hover:underline"
              >
                {spot.stateHub.label}
              </Link>
            </>
          )}
          .
        </p>
      </section>

      <HowTo
        title={`How to check ${spot.shortName} before you go`}
        steps={[
          `Start with the closest cameras in the wall above — the feeds nearest the centre are the ones that read the ${familyWord}'s weather best.`,
          "Read the sky and the surface, not a forecast: cloud cover, light, wind texture where a feed faces open ground or water, and how busy the town looks.",
          "Check the timestamp on any feed before trusting it — a paused camera and a calm morning can look alike.",
          `For swell height, period and a real surf forecast, use a dedicated surf report — WorldEye doesn't publish one. The camera is the visual half of the check; the report is the numbers half.`,
        ]}
      />

      <FaqSection title={`${spot.shortName} cameras — FAQ`} faqs={faqs} />

      <RelatedLinks title="More live WorldEye" links={related} />

      <TrialCtaSection utmSource={`${spot.family}-webcams-${spot.slug}`} />

      <CtaRow backHref={hubPath} backLabel={hubLabel} />
    </PageShell>
  );
}
