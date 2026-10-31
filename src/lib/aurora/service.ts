/**
 * Aurora alerts — subscription storage.
 *
 * Why a dedicated table (AuroraAlertSubscription) instead of the
 * existing alert machinery — investigated before building:
 *   - AlertRule (camera alerts) is bound to a catalogue cameraId and a
 *     vision-checked condition; it cannot express "a place tonight".
 *   - EventAlertRule (VIP event alerts) is kind-locked to quake /
 *     launch / iss, gated on the owner's VIP tier resolving live at
 *     check time, and its checker is a separate workstream. Aurora
 *     alerts are for ANY signed-in user.
 *   - UserPreference is a single-row bag of scalars — no place list.
 * A one-purpose table keeps the feature self-contained and the
 * once-per-night claim atomic (see claimAlertNight).
 *
 * The derived fields (magLat, requiredKp) are snapshotted at subscribe
 * time: if the banding ever changes, existing subscribers keep the
 * level they signed up under until they re-subscribe.
 */
import { db } from "@/lib/db";
import { auroraPlace } from "./places";
import { geomagneticLatitude, requiredKpForMagLat } from "./logic";

/** Places per user — enough for a circuit of favourites, small enough to mean it. */
export const MAX_AURORA_SUBSCRIPTIONS = 6;

export type SubscribeResult =
  | { ok: true; subscription: Awaited<ReturnType<typeof listSubscriptions>>[number] }
  | { ok: false; error: "unknown-place" | "cap" };

export async function listSubscriptions(userId: string) {
  return db.auroraAlertSubscription.findMany({
    where: { userId },
    orderBy: { createdAt: "asc" },
  });
}

export async function subscribeToPlace(userId: string, placeSlug: string): Promise<SubscribeResult> {
  const place = auroraPlace(placeSlug);
  if (!place) return { ok: false, error: "unknown-place" };

  const existing = await db.auroraAlertSubscription.findUnique({
    where: { userId_placeSlug: { userId, placeSlug } },
  });
  if (!existing) {
    const count = await db.auroraAlertSubscription.count({ where: { userId } });
    if (count >= MAX_AURORA_SUBSCRIPTIONS) return { ok: false, error: "cap" };
  }

  const magLat = geomagneticLatitude(place.lat, place.lng);
  const subscription = await db.auroraAlertSubscription.upsert({
    where: { userId_placeSlug: { userId, placeSlug } },
    create: {
      userId,
      placeSlug: place.slug,
      placeName: place.name,
      lat: place.lat,
      lng: place.lng,
      timeZone: place.timeZone,
      magLat,
      requiredKp: requiredKpForMagLat(magLat),
      active: true,
    },
    update: { active: true },
  });
  return { ok: true, subscription };
}

/** Unsubscribe = delete the row (the user can re-add the place any time). */
export async function unsubscribe(userId: string, subscriptionId: string): Promise<boolean> {
  const res = await db.auroraAlertSubscription.deleteMany({
    where: { id: subscriptionId, userId },
  });
  return res.count === 1;
}

export async function listActiveSubscriptionsForRun() {
  return db.auroraAlertSubscription.findMany({
    where: { active: true },
    include: {
      user: { select: { id: true, email: true, name: true, emailOptOut: true } },
    },
    orderBy: { createdAt: "asc" },
  });
}

/**
 * Atomically claim one subscription's night. Returns true for exactly
 * one caller per (subscription, nightKey) — the one who may send.
 */
export async function claimAlertNight(subscriptionId: string, nightKey: string): Promise<boolean> {
  const res = await db.auroraAlertSubscription.updateMany({
    where: {
      id: subscriptionId,
      OR: [{ lastAlertNight: null }, { lastAlertNight: { not: nightKey } }],
    },
    data: { lastAlertNight: nightKey, lastAlertedAt: new Date() },
  });
  return res.count === 1;
}

/** Release a claim after a failed send so a later run can retry the same night. */
export async function releaseAlertNight(subscriptionId: string, nightKey: string): Promise<void> {
  await db.auroraAlertSubscription.updateMany({
    where: { id: subscriptionId, lastAlertNight: nightKey },
    data: { lastAlertNight: null },
  });
}
