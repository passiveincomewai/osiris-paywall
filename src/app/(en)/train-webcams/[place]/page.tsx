import type { Metadata } from "next";
import { notFound } from "next/navigation";
import RailPlacePage from "@/components/RailPlacePage";
import {
  BASE,
  AreaTable,
  OperatorTable,
  MixStrip,
} from "@/components/directory-page";
import { EXPLORE_SCOPES, countForDef, recordsForDef } from "@/lib/explore-data";
import { RAIL_PLACES, getRailPlace } from "@/lib/railfan-places";
import { trainSpokeNoindex } from "@/lib/indexation-gates";
import {
  computePlaceBreakdown,
  operatorRows,
  parseCorridor,
} from "@/lib/place-breakdown";
import type { CountryCamera } from "@/lib/country-cameras";

export function generateStaticParams() {
  return RAIL_PLACES.map((p) => ({ place: p.slug }));
}

/* Metadata is composed from the count the scope actually returns, so
   the meta text can never promise cameras the wall doesn't have. */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ place: string }>;
}): Promise<Metadata> {
  const { place: slug } = await params;
  const place = getRailPlace(slug);
  if (!place) return {};
  const total = await countForDef(EXPLORE_SCOPES[place.scopeKey]);
  const title = `${place.name} Train Webcams — Live Rail Cameras`;
  const description = `Watch ${place.shortName} live: ${total} public cameras within ${place.radiusKm} km of its rail anchor — the station, the line and the town around them, nearest first. Free on WorldEye, no signup.`;
  return {
    title,
    description,
    // R38 thin-wall tiering: a spoke under the shared gate's camera
    // line stays live but noindexed (the sitemap applies the same
    // predicate to the same count — lib/indexation-gates).
    ...(trainSpokeNoindex(total) ? { robots: { index: false, follow: true } } : {}),
    alternates: { canonical: `${BASE}/train-webcams/${place.slug}` },
    openGraph: {
      title,
      description,
      url: `/train-webcams/${place.slug}`,
      type: "website",
    },
  };
}

function haversineKm(
  aLat: number,
  aLng: number,
  bLat: number,
  bLng: number,
): number {
  const R = 6371;
  const t = (x: number) => (x * Math.PI) / 180;
  const h =
    Math.sin(t(bLat - aLat) / 2) ** 2 +
    Math.cos(t(aLat)) * Math.cos(t(bLat)) * Math.sin(t(bLng - aLng) / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

type CameraGroup = { name: string; count: number; examples: string[] };

/** Group one wall's records by a record field, in size order, keeping a
 *  spread of real example camera names per group (nearest, middle and
 *  farthest of the group) — the coverage section's raw material. */
function groupRecords(
  records: readonly CountryCamera[],
  key: (r: CountryCamera) => string | null,
  limit: number,
): CameraGroup[] {
  const map = new Map<string, CountryCamera[]>();
  for (const r of records) {
    const k = key(r)?.trim();
    if (!k) continue;
    const arr = map.get(k) ?? [];
    arr.push(r);
    map.set(k, arr);
  }
  return [...map.entries()]
    .map(([name, arr]) => {
      const picks = [arr[0], arr[Math.floor(arr.length / 2)], arr[arr.length - 1]]
        .filter((x, i, xs) => x && xs.indexOf(x) === i)
        .map((x) => x.name);
      return { name, count: arr.length, examples: picks };
    })
    .sort((x, y) => y.count - x.count || x.name.localeCompare(y.name))
    .slice(0, limit);
}

const fmt = (n: number) => n.toLocaleString("en-US");

export default async function TrainPlacePage({
  params,
}: {
  params: Promise<{ place: string }>;
}) {
  const { place: slug } = await params;
  const place = getRailPlace(slug);
  if (!place) notFound();

  /* Coverage breakdown — composed in this route file from the same
     records the wall serves (the shared RailPlacePage component is
     untouched), so every number and name is this place's own. */
  const def = EXPLORE_SCOPES[place.scopeKey];
  const records = await recordsForDef(def);
  const total = records.length;
  const railCount = await countForDef({ ...def, theme: "rail" });
  const breakdown = computePlaceBreakdown(records);
  const sourceGroupsAll = groupRecords(records, (r) => r.source ?? null, 1000);
  const sourceGroups = sourceGroupsAll.slice(0, 6);
  const areaGroupsAll = groupRecords(records, (r) => r.city ?? null, 1000);
  const areaGroups = areaGroupsAll.slice(0, 8);
  const corridorGroups = groupRecords(
    records,
    (r) => parseCorridor(r.name ?? "", r.id),
    6,
  );
  const placed = records.filter(
    (r) => typeof r.lat === "number" && typeof r.lng === "number",
  );
  const dists = placed
    .map((r) => haversineKm(place.lat, place.lng, r.lat as number, r.lng as number))
    .sort((x, y) => x - y);
  const within = (km: number) => dists.filter((d) => d <= km).length;
  const bandRows = [
    { name: "Within 2 km of the rail anchor", count: within(2) },
    { name: "2–5 km out", count: within(5) - within(2) },
    { name: "5–10 km out", count: within(10) - within(5) },
    { name: `10–${place.radiusKm} km out`, count: dists.length - within(10) },
  ].filter((b) => b.count > 0);
  const nearestRec = placed[0] ?? null;
  const nearestKm = dists.length > 0 ? dists[0] : null;
  const topCorridor = corridorGroups[0] ?? null;
  const share = (n: number) =>
    total > 0 ? `${Math.round((n / total) * 100)}%` : "0%";

  return (
    <>
      <RailPlacePage place={place} />
      <div className="bg-[#05070d] text-white">
        <div className="max-w-4xl mx-auto px-6 pb-16">
          <section className="mt-4">
            <h2 className="text-xl md:text-2xl font-bold mb-3">
              Coverage breakdown — the {place.shortName} wall by publisher, area and distance
            </h2>
            <div className="space-y-4 text-white/70 leading-relaxed max-w-3xl">
              <p>
                The {fmt(total)} cameras within {place.radiusKm} km of{" "}
                {place.shortName}&rsquo;s rail anchor ({place.lat.toFixed(4)},{" "}
                {place.lng.toFixed(4)}) come from {fmt(sourceGroupsAll.length)}{" "}
                publisher{sourceGroupsAll.length === 1 ? "" : "s"}
                {sourceGroups[0] &&
                  ` — ${sourceGroups[0].name} supplies the largest share, ${fmt(sourceGroups[0].count)} feeds (${share(sourceGroups[0].count)})`}
                {sourceGroups[1] &&
                  `, with ${sourceGroups[1].name} next at ${fmt(sourceGroups[1].count)}`}
                . {fmt(railCount)} of the {fmt(total)} camera names name a
                railway, a station, a line or a depot in their own title; the
                rest are the public networks of {place.place} that happen to
                cover its rail places.
              </p>
              <p>
                By the area field each record carries,{" "}
                {fmt(areaGroupsAll.length)} area{areaGroupsAll.length === 1 ? " appears" : "s appear"}
                {areaGroups[0] &&
                  ` — ${areaGroups[0].name} accounts for ${fmt(areaGroups[0].count)} of the feeds (${share(areaGroups[0].count)})`}
                . {fmt(within(5))} cameras sit within 5 km of the anchor
                {nearestRec && nearestKm !== null &&
                  `, and the closest of all, ${nearestRec.name}, is ${nearestKm < 1 ? `${Math.round(nearestKm * 1000)} m` : `${nearestKm.toFixed(1)} km`} away`}
                .
                {topCorridor
                  ? ` Where camera names carry a road designation, ${topCorridor.name} leads with ${fmt(topCorridor.count)} feeds${corridorGroups[1] ? `, ahead of ${corridorGroups[1].name} at ${fmt(corridorGroups[1].count)}` : ""} — the corridors that feed the station.`
                  : ` Few of these camera names carry a parseable road designation, so this wall reads by publisher and district rather than by corridor.`}
                {breakdown.mix[0] &&
                  ` By what the names say they watch, the biggest kind is ${breakdown.mix[0].name.toLowerCase()} (${fmt(breakdown.mix[0].count)})${breakdown.mix[1] ? `, ahead of ${breakdown.mix[1].name.toLowerCase()} (${fmt(breakdown.mix[1].count)})` : ""}.`}
              </p>
            </div>
          </section>

          {sourceGroups.length >= 2 && (
            <OperatorTable
              title={`Publishers of the cameras near ${place.shortName}`}
              rows={operatorRows(breakdown.sources, 6)}
              note="Counts are the wall's own records, grouped by the publisher named in each record's source field."
            />
          )}

          {areaGroups.length >= 2 && (
            <AreaTable
              title={`Where the ${place.shortName} cameras cluster — by area`}
              rows={areaGroups.map((g) => ({ name: g.name, count: g.count }))}
              note="Areas are the city/area field each catalogue record carries, counted over the same records the wall above serves."
            />
          )}

          {corridorGroups.length >= 2 && (
            <AreaTable
              title={`The ${place.shortName} wall by road corridor`}
              rows={corridorGroups.map((g) => ({ name: g.name, count: g.count }))}
              note="Corridors are read from the road designation each camera's own name carries first; cameras whose names carry none are not counted here."
            />
          )}

          {bandRows.length >= 2 && (
            <AreaTable
              title={`How far the ${place.shortName} wall reaches`}
              rows={bandRows}
              note={`Distances are measured from the rail anchor (${place.lat.toFixed(4)}, ${place.lng.toFixed(4)}) to the coordinates each record carries; ${fmt(placed.length)} of the ${fmt(total)} records carry coordinates.`}
            />
          )}

          {breakdown.mix.length >= 2 && (
            <MixStrip
              title={`What the cameras near ${place.shortName} watch`}
              rows={breakdown.mix}
              note="Kinds are read from the cameras' own names — each camera counted once, under the first kind its name matches."
            />
          )}

          <section className="mt-12">
            <h2 className="text-xl md:text-2xl font-bold mb-3">
              Example cameras in the {place.shortName} wall
            </h2>
            <div className="space-y-5 max-w-3xl">
              <div>
                <h3 className="font-semibold text-white/90 mb-2">By publisher</h3>
                <ul className="space-y-2">
                  {sourceGroups.slice(0, 4).map((g) => (
                    <li key={g.name} className="text-sm text-white/60 leading-relaxed">
                      <span className="text-white/85 font-medium">{g.name}</span> (
                      {fmt(g.count)}) — e.g. {g.examples.join("; ")}.
                    </li>
                  ))}
                </ul>
              </div>
              {areaGroups.length >= 2 && (
                <div>
                  <h3 className="font-semibold text-white/90 mb-2">By area</h3>
                  <ul className="space-y-2">
                    {areaGroups.slice(0, 4).map((g) => (
                      <li key={g.name} className="text-sm text-white/60 leading-relaxed">
                        <span className="text-white/85 font-medium">{g.name}</span> (
                        {fmt(g.count)}) — e.g. {g.examples.join("; ")}.
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </>
  );
}
