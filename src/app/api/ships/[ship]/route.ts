import { NextResponse } from "next/server";
import { getLiveShipsForTracking } from "@/app/api/maritime/route";
import { getShip } from "@/lib/ships/registry";
import {
  matchShipToFeed,
  NOT_REPORTING,
  type FeedShip,
  type ShipLiveView,
} from "@/lib/ships/match";

/**
 * Public live position for ONE tracked cruise ship (src/lib/ships).
 *
 * Deliberately narrow: the full maritime feed (every vessel, ports,
 * chokepoints) stays behind its VIP gate in middleware — this route
 * only ever returns the single registry vessel named in the URL, and
 * only the fields that vessel itself broadcasts on AIS (position,
 * speed, heading, destination, report time). A ship that is not in the
 * feed right now gets `{ status: "not-reporting" }` and no position —
 * never a guessed or last-known location dressed up as live.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ ship: string }> },
) {
  const { ship: slug } = await params;
  const ship = getShip(slug);
  if (!ship) {
    return NextResponse.json({ error: "unknown ship" }, { status: 404 });
  }

  let view: ShipLiveView = NOT_REPORTING;
  try {
    const now = Date.now();
    const feed = getLiveShipsForTracking(now) as FeedShip[];
    view = matchShipToFeed(ship, feed, now);
  } catch {
    view = NOT_REPORTING;
  }

  return NextResponse.json(
    { slug: ship.slug, name: ship.name, mmsi: ship.mmsi, ...view },
    {
      headers: {
        "Cache-Control":
          "public, max-age=30, s-maxage=30, stale-while-revalidate=60",
      },
    },
  );
}
