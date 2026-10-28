import { NextResponse } from "next/server";
import { getLiveShipsForTracking } from "../../maritime/route";
import { ferrySystemBySlug, matchFerryVessels } from "@/lib/ferries";

/**
 * Narrow public endpoint for one ferry system's live panel.
 * /api/maritime stays VIP-gated (the full firehose); this route
 * returns ONLY the vessels matched as this system's ferries by the
 * registry rule (broadcast fleet name ∩ service geofence ∩ not a
 * known non-passenger type — see src/lib/ferries.ts), each as the
 * fields the vessel itself broadcasts. An empty vessels list is a
 * truthful state: no ferry of this system is reporting right now.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ system: string }> },
) {
  const { system: slug } = await params;
  const system = ferrySystemBySlug(slug);
  if (!system) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  const now = Date.now();
  let vessels: ReturnType<typeof matchFerryVessels> = [];
  try {
    vessels = matchFerryVessels(system, getLiveShipsForTracking(now), now);
  } catch {
    vessels = [];
  }
  return NextResponse.json(
    {
      slug: system.slug,
      name: system.name,
      vessels,
      generatedAt: new Date(now).toISOString(),
    },
    {
      headers: {
        "Cache-Control":
          "public, max-age=15, s-maxage=15, stale-while-revalidate=60",
      },
    },
  );
}
