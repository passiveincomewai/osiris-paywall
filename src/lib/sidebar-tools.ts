// ── Sidebar tool strip: canonical tools + preference merge logic ────
// The globe's right tool strip (Dashboard.tsx) is a fixed set of tools.
// Account settings (AccountSections) lets a signed-in user reorder and
// hide them; the choices persist on the UserPreference row
// (sidebarToolOrder / sidebarToolHidden) and the strip renders through
// the helpers here. This module is pure — no React, no DB — so the
// preferences validator, the settings UI and the strip all share one
// merge implementation, and corrupted stored values fall back to the
// canonical defaults instead of breaking the globe.

export const SIDEBAR_TOOL_IDS = [
  "recon",
  "space",
  "alerts",
  "draw",
  "oi",
  "search",
  "arcgis",
] as const;

export type SidebarToolId = (typeof SIDEBAR_TOOL_IDS)[number];

export interface SidebarToolDef {
  id: SidebarToolId;
  /** Strip tooltip / aria-label wording. */
  label: string;
  /** One-line description shown in the settings list. */
  description: string;
}

export const SIDEBAR_TOOLS: readonly SidebarToolDef[] = [
  { id: "recon", label: "OSINT Recon", description: "IP lookup, network sweep and geolocation tools." },
  { id: "space", label: "Live from Space", description: "24/7 video downlink from the ISS." },
  { id: "alerts", label: "Live Alerts", description: "Earthquakes, conflicts and breaking news." },
  { id: "draw", label: "Draw", description: "Measure areas of interest on the map." },
  { id: "oi", label: "OI", description: "Talk to OI and it works the map for you, or run a forecast." },
  { id: "search", label: "Search & Route", description: "Find places and plan routes." },
  { id: "arcgis", label: "ArcGIS", description: "Search and import geospatial intel layers." },
];

const KNOWN: ReadonlySet<string> = new Set(SIDEBAR_TOOL_IDS);

export function isSidebarToolId(v: unknown): v is SidebarToolId {
  return typeof v === "string" && KNOWN.has(v);
}

/**
 * Normalize a stored/client-supplied id list: non-arrays become [],
 * unknown ids and duplicates drop out. Never throws — a corrupted
 * preference must degrade to defaults, not break the page.
 */
export function sanitizeSidebarToolIds(v: unknown): SidebarToolId[] {
  if (!Array.isArray(v)) return [];
  const out: SidebarToolId[] = [];
  for (const x of v) {
    if (isSidebarToolId(x) && !out.includes(x)) out.push(x);
  }
  return out;
}

/**
 * The full display order: the user's saved order first (sanitized),
 * then any canonical tools they never ordered, in canonical order.
 * Always returns every tool exactly once.
 */
export function resolveSidebarToolOrder(order: unknown): SidebarToolId[] {
  const saved = sanitizeSidebarToolIds(order);
  const rest = SIDEBAR_TOOL_IDS.filter((id) => !saved.includes(id));
  return [...saved, ...rest];
}

/** Visible tools in display order (order applied, hidden removed). */
export function resolveVisibleSidebarTools(
  order: unknown,
  hidden: unknown,
): SidebarToolId[] {
  const hiddenSet = new Set(sanitizeSidebarToolIds(hidden));
  return resolveSidebarToolOrder(order).filter((id) => !hiddenSet.has(id));
}

export interface SidebarToolLayout {
  /** 0-based display position per tool (canonical order breaks ties). */
  orderIndex: Record<SidebarToolId, number>;
  hiddenIds: ReadonlySet<SidebarToolId>;
}

/**
 * Layout for the strip's flex column: each tool wrapper gets
 * style={{ order: orderIndex[id] }} and display:none when hidden.
 * Hidden tools keep their order slot so un-hiding restores position.
 */
export function layoutSidebarTools(order: unknown, hidden: unknown): SidebarToolLayout {
  const resolved = resolveSidebarToolOrder(order);
  const orderIndex = {} as Record<SidebarToolId, number>;
  resolved.forEach((id, i) => {
    orderIndex[id] = i;
  });
  return { orderIndex, hiddenIds: new Set(sanitizeSidebarToolIds(hidden)) };
}
