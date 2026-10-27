// ── Globe view share links ───────────────────────────────────────────
// The view link the globe's Share panel has always produced:
//
//   /?lat=<4dp>&lon=<4dp>&zoom=<2dp>[&layers=<csv>]
//
// page.tsx restores the view (and the layers param) from it on
// landing. Extracted from components/SharePanel so the panel's copy
// action, its QR code and the tests all build the one canonical
// string — the QR encodes exactly what the copy button copies.

import { appBaseUrl } from "../app-url";

export interface GlobeViewShareState {
  lat: number;
  lng: number;
  zoom: number;
  /** Active layer keys, in link order. Empty → no layers param. */
  layers?: readonly string[];
}

function defaultBase(): string {
  if (typeof window !== "undefined" && window.location?.origin) return window.location.origin;
  return appBaseUrl();
}

/** The canonical shareable link for a globe view. */
export function buildViewShareUrl(view: GlobeViewShareState, base?: string): string {
  const params = new URLSearchParams();
  params.set("lat", view.lat.toFixed(4));
  params.set("lon", view.lng.toFixed(4));
  params.set("zoom", view.zoom.toFixed(2));
  const layers = (view.layers ?? []).filter(k => !!k);
  if (layers.length) params.set("layers", layers.join(","));
  const root = (base ?? defaultBase()).replace(/\/+$/, "");
  return `${root}/?${params.toString()}`;
}
