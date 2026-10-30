// ── "How did you find out about us?" ────────────────────────────────
// The acquisition channels offered in account settings (Referred by a
// friend? section). Keys are what we store on User.discoverySource;
// labels are what the user sees. Real channels only — this list feeds
// signup-source reporting, so a channel we don't actually run on
// doesn't belong here.

export const DISCOVERY_SOURCES = [
  { key: "instagram", label: "Instagram" },
  { key: "google", label: "Google / web search" },
  { key: "ai_chat", label: "ChatGPT or another AI chat" },
  { key: "youtube", label: "YouTube" },
  { key: "friend", label: "A friend told me" },
  { key: "reddit", label: "Reddit" },
  { key: "other", label: "Other" },
] as const;

export type DiscoverySourceKey = (typeof DISCOVERY_SOURCES)[number]["key"];

export const DISCOVERY_SOURCE_KEYS: readonly string[] = DISCOVERY_SOURCES.map((s) => s.key);

export function isDiscoverySourceKey(v: unknown): v is DiscoverySourceKey {
  return typeof v === "string" && DISCOVERY_SOURCE_KEYS.includes(v);
}

export function discoverySourceLabel(key: string | null | undefined): string | null {
  if (!key) return null;
  return DISCOVERY_SOURCES.find((s) => s.key === key)?.label ?? key;
}
