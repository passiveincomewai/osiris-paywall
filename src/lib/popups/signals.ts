// ── Popup system signals: the tiny DOM event bus ────────────────────
// Popups whose trigger lives inside another component (a camera
// opening on the globe, a tool finishing) communicate with the popup
// manager through two window CustomEvents. Dispatchers are one-liners
// at the existing call sites; the manager subscribes once. Everything
// is fire-and-forget: a missing listener changes nothing for the
// dispatching surface.

/** A camera started (detail set) or stopped (detail null) playing. */
export const CAMERA_STATE_EVENT = "worldeye:camera-state";
/** A free tool delivered a result. Detail: { tool: string }. */
export const TOOL_COMPLETE_EVENT = "worldeye:tool-complete";
/** A popup (any system) claimed this session. Detail: { id: string }. */
export const POPUP_CLAIMED_EVENT = "worldeye:popup-claimed";

export interface CameraStateDetail {
  /** Stable camera key (catalogue id / share id) — never a name. */
  key: string;
  name: string | null;
}

export function signalCameraState(detail: CameraStateDetail | null): void {
  try {
    window.dispatchEvent(new CustomEvent(CAMERA_STATE_EVENT, { detail }));
  } catch {
    /* no window / no listeners — the signal is a nicety */
  }
}

export function onCameraState(
  handler: (detail: CameraStateDetail | null) => void,
): () => void {
  const fn = (e: Event) =>
    handler((e as CustomEvent<CameraStateDetail | null>).detail ?? null);
  try {
    window.addEventListener(CAMERA_STATE_EVENT, fn);
    return () => window.removeEventListener(CAMERA_STATE_EVENT, fn);
  } catch {
    return () => {};
  }
}

export function signalToolComplete(tool: string): void {
  try {
    window.dispatchEvent(new CustomEvent(TOOL_COMPLETE_EVENT, { detail: { tool } }));
  } catch {
    /* fire-and-forget */
  }
}

export function onToolComplete(handler: (tool: string) => void): () => void {
  const fn = (e: Event) => {
    const tool = (e as CustomEvent<{ tool?: unknown }>).detail?.tool;
    if (typeof tool === "string") handler(tool);
  };
  try {
    window.addEventListener(TOOL_COMPLETE_EVENT, fn);
    return () => window.removeEventListener(TOOL_COMPLETE_EVENT, fn);
  } catch {
    return () => {};
  }
}

export function signalPopupClaimed(id: string): void {
  try {
    window.dispatchEvent(new CustomEvent(POPUP_CLAIMED_EVENT, { detail: { id } }));
  } catch {
    /* fire-and-forget */
  }
}

export function onPopupClaimed(handler: (id: string) => void): () => void {
  const fn = (e: Event) => {
    const id = (e as CustomEvent<{ id?: unknown }>).detail?.id;
    if (typeof id === "string") handler(id);
  };
  try {
    window.addEventListener(POPUP_CLAIMED_EVENT, fn);
    return () => window.removeEventListener(POPUP_CLAIMED_EVENT, fn);
  } catch {
    return () => {};
  }
}

// ── tool_completion registry (batch-2 popup #11) ────────────────────
// Tools whose completion may raise the tool_completion popup, keyed by
// the signal name, with the account benefit the popup may claim.
//
// AUDIT 2026-10-29 (both candidate tools checked in code):
//  - photo-geolocation (Geo-Sleuth): "Processed in memory, never
//    stored" — results are NEVER persisted for anyone, account or not
//    (src/app/(en)/tools/photo-geolocation/page.tsx). An account saves
//    nothing.
//  - sensing (WiFi Link / Camera / RavenScope): "no account, nothing
//    uploaded" — sessions live on the visitor's own device/RavenScope
//    (src/components/sensing/SensingTool.tsx). An account saves
//    nothing.
//  - camera-distance: computes a distance between two points; nothing
//    is persisted for anyone.
// Claiming "an account saves your results" for any of these would be
// false, so the registry is EMPTY and the popup never fires today.
// When a tool gains real account persistence, add its entry here with
// the true benefit and the popup lights up with no other change.
export const TOOL_COMPLETION_BENEFITS: Readonly<Record<string, string>> =
  Object.freeze({});
