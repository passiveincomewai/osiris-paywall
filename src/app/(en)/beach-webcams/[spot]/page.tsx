import type { Metadata } from "next";
import { notFound } from "next/navigation";
import CoastalSpotPage from "@/components/CoastalSpotPage";
import { BASE } from "@/components/directory-page";
import { EXPLORE_SCOPES, countForDef } from "@/lib/explore-data";
import { BEACH_SPOTS, getSpot } from "@/lib/surf-spots";

export function generateStaticParams() {
  return BEACH_SPOTS.map((s) => ({ spot: s.slug }));
}

/* Metadata is composed from the count the scope actually returns, so
   the meta text can never promise cameras the wall doesn't have. */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ spot: string }>;
}): Promise<Metadata> {
  const { spot: slug } = await params;
  const spot = getSpot("beach", slug);
  if (!spot) return {};
  const total = await countForDef(EXPLORE_SCOPES[spot.scopeKey]);
  const title = `${spot.name} Beach Webcams — Live Cameras on the Coast`;
  const description = `Watch ${spot.shortName} live: ${total} public cameras within ${spot.radiusKm} km of the beach — the town's waterfront and road cameras, nearest first. Free on WorldEye, no signup.`;
  return {
    title,
    description,
    alternates: { canonical: `${BASE}/beach-webcams/${spot.slug}` },
    openGraph: {
      title,
      description,
      url: `/beach-webcams/${spot.slug}`,
      type: "website",
    },
  };
}

export default async function BeachSpotPage({
  params,
}: {
  params: Promise<{ spot: string }>;
}) {
  const { spot: slug } = await params;
  const spot = getSpot("beach", slug);
  if (!spot) notFound();
  return <CoastalSpotPage spot={spot} />;
}
