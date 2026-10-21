/**
 * Watched places — the shared VIP substrate.
 *
 * A place is a name + coordinates + a watch radius. Event alerts use it
 * for "near me" quake rules and ISS-pass rules; the personal brief uses
 * it for "near your places" sections. Places are deliberately dumb data:
 * no geocoding happens here (the client resolves a searched place to
 * coordinates via the site's existing geosearch before posting).
 */
import { db } from "@/lib/db";

export const MAX_PLACES = 10;
export const MIN_RADIUS_KM = 25;
export const MAX_RADIUS_KM = 2000;

export interface PlaceView {
  id: string;
  name: string;
  lat: number;
  lng: number;
  radiusKm: number;
  createdAt: string;
}

export type PlaceResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: string; status: number };

function toView(p: {
  id: string;
  name: string;
  lat: number;
  lng: number;
  radiusKm: number;
  createdAt: Date;
}): PlaceView {
  return {
    id: p.id,
    name: p.name,
    lat: p.lat,
    lng: p.lng,
    radiusKm: p.radiusKm,
    createdAt: p.createdAt.toISOString(),
  };
}

/** Pure validation of a place payload — shared by create and update. */
export function validatePlaceInput(
  body: Record<string, unknown>,
): PlaceResult<{ name: string; lat: number; lng: number; radiusKm: number }> {
  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!name) return { ok: false, error: "name_required", status: 400 };
  if (name.length > 80) return { ok: false, error: "name_too_long", status: 400 };
  const lat = typeof body.lat === "number" ? body.lat : NaN;
  const lng = typeof body.lng === "number" ? body.lng : NaN;
  if (!Number.isFinite(lat) || lat < -90 || lat > 90) {
    return { ok: false, error: "lat_invalid", status: 400 };
  }
  if (!Number.isFinite(lng) || lng < -180 || lng > 180) {
    return { ok: false, error: "lng_invalid", status: 400 };
  }
  let radiusKm = typeof body.radiusKm === "number" ? Math.round(body.radiusKm) : 250;
  if (!Number.isFinite(radiusKm)) radiusKm = 250;
  radiusKm = Math.min(MAX_RADIUS_KM, Math.max(MIN_RADIUS_KM, radiusKm));
  return { ok: true, value: { name, lat, lng, radiusKm } };
}

export async function listPlaces(userId: string): Promise<PlaceView[]> {
  const rows = await db.vipPlace.findMany({
    where: { userId },
    orderBy: { createdAt: "asc" },
  });
  return rows.map(toView);
}

export async function createPlace(
  userId: string,
  body: Record<string, unknown>,
): Promise<PlaceResult<PlaceView>> {
  const v = validatePlaceInput(body);
  if (!v.ok) return v;
  const count = await db.vipPlace.count({ where: { userId } });
  if (count >= MAX_PLACES) {
    return { ok: false, error: "place_limit", status: 409 };
  }
  const row = await db.vipPlace.create({ data: { userId, ...v.value } });
  return { ok: true, value: toView(row) };
}

export async function updatePlace(
  userId: string,
  id: string,
  body: Record<string, unknown>,
): Promise<PlaceResult<PlaceView>> {
  const existing = await db.vipPlace.findFirst({ where: { id, userId } });
  if (!existing) return { ok: false, error: "not_found", status: 404 };
  const v = validatePlaceInput({
    name: body.name ?? existing.name,
    lat: body.lat ?? existing.lat,
    lng: body.lng ?? existing.lng,
    radiusKm: body.radiusKm ?? existing.radiusKm,
  });
  if (!v.ok) return v;
  const row = await db.vipPlace.update({ where: { id }, data: v.value });
  return { ok: true, value: toView(row) };
}

export async function deletePlace(
  userId: string,
  id: string,
): Promise<PlaceResult<{ deleted: true }>> {
  const existing = await db.vipPlace.findFirst({ where: { id, userId } });
  if (!existing) return { ok: false, error: "not_found", status: 404 };
  await db.vipPlace.delete({ where: { id } });
  return { ok: true, value: { deleted: true } };
}
