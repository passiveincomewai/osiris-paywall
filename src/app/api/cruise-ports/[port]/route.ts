import { NextResponse } from "next/server";
import { getLiveShipsForTracking } from "../../maritime/route";
import { cruisePortBySlug, shipsInPort } from "@/lib/cruise-ports";

/**
 * Narrow public endpoint for one cruise port's LIVE PRESENCE board.
 * /api/maritime stays VIP-gated (the full firehose); this route
 * returns ONLY the AIS passenger-type vessels inside this port's
 * board radius (see src/lib/cruise-ports.ts) — the ships physically
 * in port right now, labelled as presence, never as a schedule.
 * An empty ships list is a truthful state: no cruise ship is
 * reporting inside the port area right now.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ port: string }> },
) {
  const { port: slug } = await params;
  const port = cruisePortBySlug(slug);
  if (!port) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  const now = Date.now();
  let ships: ReturnType<typeof shipsInPort> = [];
  try {
    ships = shipsInPort(port, getLiveShipsForTracking(now), now);
  } catch {
    ships = [];
  }
  return NextResponse.json(
    {
      slug: port.slug,
      name: port.name,
      ships,
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
