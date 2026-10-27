import type { Metadata } from "next";
import { notFound } from "next/navigation";
import CoastalSpotPage from "@/components/CoastalSpotPage";
import { BASE } from "@/components/directory-page";
import { EXPLORE_SCOPES, countForDef } from "@/lib/explore-data";
import { SURF_SPOTS, getSpot } from "@/lib/surf-spots";

export function generateStaticParams() {
  return SURF_SPOTS.map((s) => ({ spot: s.slug }));
}

/* Metadata is composed from the count the scope actually returns, so
   the meta text can never promise cameras the wall doesn't have. */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ spot: string }>;
}): Promise<Metadata> {
  const { spot: slug } = await params;
  const spot = getSpot("surf", slug);
  if (!spot) return {};
  const total = await countForDef(EXPLORE_SCOPES[spot.scopeKey]);
  const title = `${spot.name} Surf Webcams — Live Cameras at the Break`;
  const description = `See ${spot.shortName} live before you go: ${total} public cameras within ${spot.radiusKm} km of the break — beach-named feeds and the town's live road cameras, nearest first. Free on WorldEye, no signup.`;
  return {
    title,
    description,
    alternates: { canonical: `${BASE}/surf-webcams/${spot.slug}` },
    openGraph: {
      title,
      description,
      url: `/surf-webcams/${spot.slug}`,
      type: "website",
    },
  };
}

export default async function SurfSpotPage({
  params,
}: {
  params: Promise<{ spot: string }>;
}) {
  const { spot: slug } = await params;
  const spot = getSpot("surf", slug);
  if (!spot) notFound();
  return <CoastalSpotPage spot={spot} />;
}
