/**
 * First-camera assist — the shortest honest path from globe arrival to a
 * first camera open.
 *
 * Why this exists (DB-measured, 2026-10-19): of sessions that reach the
 * globe, only ~26% ever open a camera, and the median session is seconds
 * long. Telling a new visitor "tap a glowing dot" and waiting is how the
 * other ~74% leave. So the welcome panel and the tour's camera step offer
 * ONE tap that opens a real camera for them.
 *
 * The camera comes from /api/cctv/showcase — the curated featured set the
 * landing gallery already uses, resolved server-side against cameras the
 * app's own preview machinery can actually play. Nothing is invented
 * here: no id is minted, no feed is promised beyond what showcase serves.
 *
 * The open itself goes through a window CustomEvent, the same fenced
 * pattern OsirisMap already uses to talk to onboarding
 * (we:flight-selected / we:satellite-selected — here the direction is
 * reversed). The homepage listens, resolves the id against the loaded
 * catalogue with findCameraById, and opens it through handleEntityClick —
 * the exact gated, counted path a map click or a ?camera= share link
 * takes. If the id never resolves (stale showcase, region not loaded),
 * nothing opens and the visitor simply keeps the globe: no error, no
 * dead viewer, exactly like an unresolved share link.
 */

export const OPEN_CAMERA_EVENT = "we:open-camera";

export interface FirstCamera {
  id: string;
  name: string | null;
  city: string | null;
  country: string | null;
}

function cleanString(v: unknown): string | null {
  return typeof v === "string" && v.trim() ? v.trim() : null;
}

/**
 * Sanitize a /api/cctv/showcase payload into the cameras this module can
 * offer. Defensive by design: the showcase shape is server-controlled,
 * but a malformed entry must degrade to "no suggestion", never a crash
 * or a broken id handed to the globe.
 */
export function parseShowcaseCameras(json: unknown): FirstCamera[] {
  const list = (json as { cameras?: unknown } | null)?.cameras;
  if (!Array.isArray(list)) return [];
  const out: FirstCamera[] = [];
  for (const raw of list) {
    if (!raw || typeof raw !== "object") continue;
    const rec = raw as Record<string, unknown>;
    const idRaw = rec.id;
    if (typeof idRaw !== "string" && typeof idRaw !== "number") continue;
    const id = String(idRaw).trim();
    if (!id) continue;
    out.push({
      id,
      name: cleanString(rec.name),
      city: cleanString(rec.city),
      country: cleanString(rec.country),
    });
  }
  return out;
}

/**
 * The featured set is curated and ordered server-side; the first playable
 * entry is the suggestion. Deliberately NOT randomized — the same first
 * camera for every visitor keeps the offer (and its measurement) stable.
 */
export function pickFirstCamera(cameras: FirstCamera[]): FirstCamera | null {
  return cameras[0] ?? null;
}

/** Short place label for the offer button ("Watch a live camera — Tokyo"). */
export function firstCameraPlace(cam: FirstCamera | null): string | null {
  if (!cam) return null;
  return cam.city ?? cam.name;
}

/**
 * Ask the homepage to open a camera by catalogue id. Returns false when
 * there is no window to hear it (SSR, tests) — callers treat the offer as
 * best-effort and leave the visitor with the ordinary globe either way.
 */
export function dispatchOpenCamera(id: string): boolean {
  if (typeof window === "undefined" || !id) return false;
  try {
    window.dispatchEvent(new CustomEvent(OPEN_CAMERA_EVENT, { detail: { id } }));
    return true;
  } catch {
    return false;
  }
}

type FetchLike = (input: string) => Promise<{
  ok: boolean;
  json: () => Promise<unknown>;
}>;

/** Fetch + sanitize + pick in one call; any failure resolves to null. */
export async function fetchFirstCamera(
  fetchImpl: FetchLike = fetch as unknown as FetchLike,
): Promise<FirstCamera | null> {
  try {
    const res = await fetchImpl("/api/cctv/showcase");
    if (!res.ok) return null;
    return pickFirstCamera(parseShowcaseCameras(await res.json()));
  } catch {
    return null;
  }
}
