"use client";
/**
 * WorldEye Companion — Site bridge (Phase 1). Additive only.
 *
 * Implements the OI assist `Site` interface for the companion page:
 * - Map commands (flyTo, setLayers, …) go out over a BroadcastChannel.
 * - If the main globe tab is open, its Phase-3 listener executes them and
 *   posts results back. Otherwise the call resolves with a graceful note.
 * - Read-only context (view/layers/data) reports companion defaults.
 */
import type { Site, Place, Depth, Highlight, WorkspaceView } from "@/lib/oi/assist/tools";

const CH = "worldeye-companion";

type CmdMsg = { kind: "cmd"; id: string; cmd: string; args: Record<string, unknown> };
type ResMsg = { kind: "res"; id: string; ok: boolean; summary?: string; error?: string };
type HelloMsg = { kind: "hello" };

const pending = new Map<string, { resolve: (v: { ok: boolean; summary?: string; error?: string }) => void; timer: ReturnType<typeof setTimeout> }>();
let ch: BroadcastChannel | null = null;
let globePresent = false;

function channel(): BroadcastChannel | null {
  if (typeof window === "undefined") return null;
  if (!ch) {
    try {
      ch = new BroadcastChannel(CH);
      ch.onmessage = (e: MessageEvent) => {
        const m = e.data as ResMsg | HelloMsg;
        if (!m || typeof m !== "object") return;
        if (m.kind === "hello") { globePresent = true; return; }
        if (m.kind === "res") {
          const p = pending.get(m.id);
          if (p) { clearTimeout(p.timer); pending.delete(m.id); p.resolve(m); }
        }
      };
      // ping for a globe tab
      ch.postMessage({ kind: "ping" });
      setTimeout(() => { globePresent = false; }, 1500);
    } catch { ch = null; }
  }
  return ch;
}

function sendCmd(cmd: string, args: Record<string, unknown>): Promise<{ ok: boolean; summary?: string; error?: string }> {
  const c = channel();
  if (!c) return Promise.resolve({ ok: false, error: "command channel unavailable" });
  const id = Math.random().toString(36).slice(2);
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      pending.delete(id);
      resolve({ ok: false, error: "Main globe tab isn't open — open worldeye.app in another tab and I'll drive it." });
    }, 4000);
    pending.set(id, { resolve, timer });
    c.postMessage({ kind: "cmd", id, cmd, args } satisfies CmdMsg);
  });
}

async function geocodeLocal(query: string): Promise<Place | null> {
  // Free-form geocode via the site's own API surface would need the map;
  // use the public Nominatim endpoint as a neutral fallback.
  try {
    const r = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(query)}`, {
      headers: { Accept: "application/json" },
    });
    const j = await r.json();
    if (Array.isArray(j) && j[0]) {
      return { name: String(j[0].display_name).split(",").slice(0, 2).join(","), lat: Number(j[0].lat), lng: Number(j[0].lon) };
    }
  } catch {}
  return null;
}

/** Site implementation for the companion page. */
export function companionSite(): Site {
  return {
    data: () => ({}),
    view: () => ({ lat: 20, lng: 0, zoom: 2, projection: "globe" as const, style: "dark" }),
    layers: () => ({}),
    flyTo: (lat, lng, zoom) => { void sendCmd("flyTo", { lat, lng, zoom }); },
    setLayers: (on, off) => { void sendCmd("setLayers", { on, off }); },
    highlight: (h: Highlight | null) => { void sendCmd("highlight", { h }); },
    openPanel: (panel: string) => { void sendCmd("openPanel", { panel }); },
    setView: (v: { projection?: "globe" | "mercator"; style?: "dark" | "satellite" }) => { void sendCmd("setView", v as Record<string, unknown>); },
    geocode: (q: string) => geocodeLocal(q),
    forecast: async () => ({ ok: false as const, error: "Forecasts need the main workspace — ask me there." }),
  };
}

/** Fire-and-forget variant used when we only need the side effect. */
export function sendMapCmd(cmd: string, args: Record<string, unknown>) {
  void sendCmd(cmd, args);
}

export function isGlobeLinked(): boolean {
  channel();
  return globePresent;
}

export type { Depth, Highlight, WorkspaceView };
