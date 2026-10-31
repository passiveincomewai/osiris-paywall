import type { Metadata } from "next";
import { notFound } from "next/navigation";
import RailPlacePage from "@/components/RailPlacePage";
import { BASE } from "@/components/directory-page";
import { EXPLORE_SCOPES, countForDef } from "@/lib/explore-data";
import { RAIL_PLACES, getRailPlace } from "@/lib/railfan-places";
import { trainSpokeNoindex } from "@/lib/indexation-gates";

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

export default async function TrainPlacePage({
  params,
}: {
  params: Promise<{ place: string }>;
}) {
  const { place: slug } = await params;
  const place = getRailPlace(slug);
  if (!place) notFound();
  return <RailPlacePage place={place} />;
}
