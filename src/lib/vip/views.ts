/**
 * Saved globe views (VIP Pro).
 *
 * A view is a named layer stack plus an optional camera. It restores
 * through the globe's OWN url contract — the globe reads `?layers=a,b`
 * and `?camera=<catalogue id>` on load and keeps `layers` updated in
 * the address bar as the user works — so capture is honest too: paste
 * the globe URL you copied while looking at the view, and the layers +
 * camera are read back out of it. The globe has no camera-position URL
 * param, so views deliberately do not store coordinates the globe
 * could not honour.
 *
 * Note on gating: a view stores layer KEYS, not access. When a view
 * opens, the globe applies the viewer's own plan gates to those layers
 * (e.g. traffic/intel layers still require their tiers) — the URL is a
 * request, the globe decides.
 */
import { db } from "@/lib/db";
import { isKnownLayer } from "./layers";

export { KNOWN_LAYERS, isKnownLayer } from "./layers";

export const MAX_VIEWS = 25;
export const MAX_VIEW_LAYERS = 60;

/** Keep only known layer keys, deduped, order preserved. */
export function sanitizeLayers(input: unknown): string[] {
  const raw = Array.isArray(input)
    ? input.filter((x): x is string => typeof x === "string")
    : typeof input === "string"
      ? input.split(",")
      : [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const key of raw) {
    const k = key.trim();
    if (k && isKnownLayer(k) && !seen.has(k)) {
      seen.add(k);
      out.push(k);
      if (out.length >= MAX_VIEW_LAYERS) break;
    }
  }
  return out;
}

/** The globe URL that restores this view. */
export function buildViewUrl(view: {
  layers: string;
  cameraId?: string | null;
}): string {
  const params = new URLSearchParams();
  const layers = sanitizeLayers(view.layers);
  if (layers.length) params.set("layers", layers.join(","));
  if (view.cameraId) params.set("camera", view.cameraId);
  const qs = params.toString();
  return qs ? `/?${qs}` : "/";
}

/**
 * Capture: read layers + camera out of a pasted globe URL (full URL or
 * just a query string). Returns null when nothing restorable is in it.
 */
export function parseGlobeUrl(
  input: string,
): { layers: string[]; cameraId: string | null } | null {
  if (typeof input !== "string" || !input.trim()) return null;
  let params: URLSearchParams | null = null;
  try {
    params = new URL(input.trim()).searchParams;
  } catch {
    const q = input.includes("?") ? input.slice(input.indexOf("?") + 1) : input;
    try {
      params = new URLSearchParams(q);
    } catch {
      params = null;
    }
  }
  if (!params) return null;
  const layers = sanitizeLayers(params.get("layers") ?? "");
  const cameraId = params.get("camera")?.trim() || null;
  if (!layers.length && !cameraId) return null;
  return { layers, cameraId };
}

export interface ViewView {
  id: string;
  name: string;
  layers: string[];
  cameraId: string | null;
  cameraName: string | null;
  url: string;
  createdAt: string;
}

export type ViewResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: string; status: number };

function toView(v: {
  id: string;
  name: string;
  layers: string;
  cameraId: string | null;
  cameraName: string | null;
  createdAt: Date;
}): ViewView {
  const layers = sanitizeLayers(v.layers);
  return {
    id: v.id,
    name: v.name,
    layers,
    cameraId: v.cameraId,
    cameraName: v.cameraName,
    url: buildViewUrl({ layers: layers.join(","), cameraId: v.cameraId }),
    createdAt: v.createdAt.toISOString(),
  };
}

function validateViewBody(
  body: Record<string, unknown>,
): ViewResult<{
  name: string;
  layers: string[];
  cameraId: string | null;
  cameraName: string | null;
}> {
  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!name) return { ok: false, error: "name_required", status: 400 };
  if (name.length > 80) return { ok: false, error: "name_too_long", status: 400 };
  // Capture path: a pasted globe URL supplies layers/camera.
  let layers = sanitizeLayers(body.layers);
  let cameraId =
    typeof body.cameraId === "string" && body.cameraId.trim()
      ? body.cameraId.trim()
      : null;
  if (typeof body.fromUrl === "string" && body.fromUrl.trim()) {
    const parsed = parseGlobeUrl(body.fromUrl);
    if (!parsed) return { ok: false, error: "url_unreadable", status: 400 };
    if (!layers.length) layers = parsed.layers;
    if (!cameraId) cameraId = parsed.cameraId;
  }
  if (!layers.length && !cameraId) {
    return { ok: false, error: "view_empty", status: 400 };
  }
  const cameraName =
    typeof body.cameraName === "string" && body.cameraName.trim()
      ? body.cameraName.trim().slice(0, 120)
      : null;
  return { ok: true, value: { name, layers, cameraId, cameraName } };
}

export async function listViews(userId: string): Promise<ViewView[]> {
  const rows = await db.savedView.findMany({
    where: { userId },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });
  return rows.map(toView);
}

export async function createView(
  userId: string,
  body: Record<string, unknown>,
): Promise<ViewResult<ViewView>> {
  const v = validateViewBody(body);
  if (!v.ok) return v;
  const count = await db.savedView.count({ where: { userId } });
  if (count >= MAX_VIEWS) return { ok: false, error: "view_limit", status: 409 };
  const row = await db.savedView.create({
    data: {
      userId,
      name: v.value.name,
      layers: v.value.layers.join(","),
      cameraId: v.value.cameraId,
      cameraName: v.value.cameraName,
      sortOrder: count,
    },
  });
  return { ok: true, value: toView(row) };
}

export async function updateView(
  userId: string,
  id: string,
  body: Record<string, unknown>,
): Promise<ViewResult<ViewView>> {
  const existing = await db.savedView.findFirst({ where: { id, userId } });
  if (!existing) return { ok: false, error: "not_found", status: 404 };
  const v = validateViewBody({
    name: body.name ?? existing.name,
    layers: body.layers ?? existing.layers,
    cameraId: body.cameraId ?? existing.cameraId,
    cameraName: body.cameraName ?? existing.cameraName,
    fromUrl: body.fromUrl,
  });
  if (!v.ok) return v;
  const row = await db.savedView.update({
    where: { id },
    data: {
      name: v.value.name,
      layers: v.value.layers.join(","),
      cameraId: v.value.cameraId,
      cameraName: v.value.cameraName,
    },
  });
  return { ok: true, value: toView(row) };
}

export async function deleteView(
  userId: string,
  id: string,
): Promise<ViewResult<{ deleted: true }>> {
  const existing = await db.savedView.findFirst({ where: { id, userId } });
  if (!existing) return { ok: false, error: "not_found", status: 404 };
  await db.savedView.delete({ where: { id } });
  return { ok: true, value: { deleted: true } };
}
