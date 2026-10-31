import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { AURORA_PLACES } from "@/lib/aurora/places";
import { getKpSeries } from "@/lib/aurora/noaa";
import {
  geomagneticLatitude,
  outlookFor,
  requiredKpForMagLat,
  type PlaceOutlook,
} from "@/lib/aurora/logic";
import {
  MAX_AURORA_SUBSCRIPTIONS,
  listSubscriptions,
  subscribeToPlace,
  unsubscribe,
} from "@/lib/aurora/service";

export const runtime = "nodejs";

/**
 * Aurora alerts — a signed-in user's place subscriptions, plus the
 * place catalogue with tonight's outlook for each (shared by the
 * northern-lights page card). Any signed-in user; no tier gate —
 * aurora alerts are a free feature, unlike the VIP camera/event rules.
 */

async function userId(): Promise<string | null> {
  const session = await auth().catch(() => null);
  return (session?.user as { id?: string } | undefined)?.id ?? null;
}

function outlookJson(outlook: PlaceOutlook | null) {
  if (!outlook) return null;
  return {
    nightKey: outlook.night.nightKey,
    inProgress: outlook.night.inProgress,
    maxKp: outlook.maxKp,
    meets: outlook.meets,
  };
}

export async function GET() {
  const uid = await userId();
  if (!uid) return NextResponse.json({ error: "signin" }, { status: 401 });

  const [subs, points] = await Promise.all([listSubscriptions(uid), getKpSeries()]);
  const now = new Date();

  const places = AURORA_PLACES.map((place) => {
    const requiredKp = requiredKpForMagLat(geomagneticLatitude(place.lat, place.lng));
    return {
      slug: place.slug,
      name: place.name,
      area: place.area,
      requiredKp,
      tonight: points ? outlookJson(outlookFor(place, requiredKp, points, now)) : null,
    };
  });

  const subscriptions = subs.map((sub) => ({
    id: sub.id,
    placeSlug: sub.placeSlug,
    placeName: sub.placeName,
    requiredKp: sub.requiredKp,
    active: sub.active,
    lastAlertNight: sub.lastAlertNight,
    tonight: points
      ? outlookJson(
          outlookFor(
            { lat: sub.lat, lng: sub.lng, timeZone: sub.timeZone },
            sub.requiredKp,
            points,
            now,
          ),
        )
      : null,
  }));

  return NextResponse.json({ max: MAX_AURORA_SUBSCRIPTIONS, places, subscriptions });
}

export async function POST(req: NextRequest) {
  const uid = await userId();
  if (!uid) return NextResponse.json({ error: "signin" }, { status: 401 });

  let placeSlug: unknown;
  try {
    placeSlug = ((await req.json()) as { placeSlug?: unknown })?.placeSlug;
  } catch {
    return NextResponse.json({ error: "bad-request" }, { status: 400 });
  }
  if (typeof placeSlug !== "string") {
    return NextResponse.json({ error: "bad-request" }, { status: 400 });
  }

  const result = await subscribeToPlace(uid, placeSlug);
  if (!result.ok) {
    return NextResponse.json(
      { error: result.error },
      { status: result.error === "cap" ? 409 : 400 },
    );
  }
  return NextResponse.json({ ok: true, subscription: result.subscription });
}

export async function DELETE(req: NextRequest) {
  const uid = await userId();
  if (!uid) return NextResponse.json({ error: "signin" }, { status: 401 });

  let id: unknown;
  try {
    id = ((await req.json()) as { id?: unknown })?.id;
  } catch {
    return NextResponse.json({ error: "bad-request" }, { status: 400 });
  }
  if (typeof id !== "string") {
    return NextResponse.json({ error: "bad-request" }, { status: 400 });
  }
  const removed = await unsubscribe(uid, id);
  return NextResponse.json({ ok: removed }, { status: removed ? 200 : 404 });
}
