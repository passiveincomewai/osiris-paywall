/**
 * Shared collection-feed resolution for the three public doors (token
 * feed, API, embed) and the dashboard's item list: items → catalogue
 * records → the rights-filtered payload (lib/enterprise/payload).
 */
import { db } from "@/lib/db";
import { enterpriseCatalogueById } from "./catalogue";
import { buildCollectionPayload, type CollectionPayload } from "./payload";
import { feedEligibility } from "./rights";

export interface CollectionRow {
  id: string;
  userId: string;
  name: string;
  feedTokenHash: string | null;
  feedHits: number;
  createdAt: Date;
  updatedAt: Date;
}

export type PayloadResult =
  | { ok: true; payload: CollectionPayload }
  | { ok: false; reason: "catalogue-unavailable" };

/** Resolve one collection's feed payload against the live catalogue. */
export async function collectionPayload(
  collectionId: string,
  origin: string,
): Promise<PayloadResult> {
  const items = await db.cameraCollectionItem.findMany({
    where: { collectionId },
    orderBy: { createdAt: "asc" },
    select: { cameraId: true },
  });
  if (!items.length) return { ok: true, payload: { cameras: [], excluded: [] } };
  const byId = await enterpriseCatalogueById();
  if (!byId) return { ok: false, reason: "catalogue-unavailable" };
  const records = new Map(items.map((i) => [i.cameraId, byId.get(i.cameraId)]));
  return { ok: true, payload: buildCollectionPayload(items, records, origin) };
}

export interface DashboardItem {
  cameraId: string;
  name: string;
  city: string;
  country: string;
  source: string;
  inCatalogue: boolean;
  eligible: boolean;
  /** Clearance basis (eligible) or exclusion reason (not eligible). */
  reason: string;
}

/**
 * The dashboard's honest per-item view: every pick stays listed, with
 * its live rights verdict — eligible picks say on what basis, excluded
 * picks say why, and they are never silently dropped here either.
 */
export async function dashboardItems(collectionId: string): Promise<DashboardItem[] | null> {
  const items = await db.cameraCollectionItem.findMany({
    where: { collectionId },
    orderBy: { createdAt: "asc" },
    select: { cameraId: true },
  });
  if (!items.length) return [];
  const byId = await enterpriseCatalogueById();
  if (!byId) return null;
  return items.map((item) => {
    const raw = byId.get(item.cameraId);
    if (!raw) {
      return {
        cameraId: item.cameraId,
        name: item.cameraId,
        city: "",
        country: "",
        source: "",
        inCatalogue: false,
        eligible: false,
        reason: "This camera is no longer in the WorldEye catalogue.",
      };
    }
    const verdict = feedEligibility(raw);
    return {
      cameraId: item.cameraId,
      name: raw.name ?? raw.id,
      city: raw.city ?? "",
      country: raw.country ?? "",
      source: raw.source ?? "",
      inCatalogue: true,
      eligible: verdict.eligible,
      reason: verdict.basis,
    };
  });
}

/** Find a collection by its feed token hash (the token feed + embed). */
export async function collectionByTokenHash(hash: string): Promise<CollectionRow | null> {
  return db.cameraCollection.findUnique({ where: { feedTokenHash: hash } });
}

/** Count a feed/embed hit without ever failing the read over it. */
export async function recordFeedHit(collectionId: string): Promise<void> {
  await db.cameraCollection
    .update({ where: { id: collectionId }, data: { feedHits: { increment: 1 } } })
    .catch(() => undefined);
}
